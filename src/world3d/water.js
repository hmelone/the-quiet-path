// The lotus pond and the stream: a soft water shader with sky reflection,
// ripples and rain rings, plus lotus leaves and flowers.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { POND, WATER_Y, STREAM, pondDist } from './layout.js';
import { heightAt, onBridge } from './terrain.js';
import { colorize, merge, radialNormals } from './geo.js';
import { paint } from './materials.js';

const WATER_VS = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const WATER_FS = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
uniform vec3 uDeep, uShallow, uSkyTop, uSkyHor, uSunCol, uSunDir;
uniform float uTime, uRain, uSunVis, uFlow, uExposure;
#include <fog_pars_fragment>
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
vec2 rings(vec2 p) {
  vec2 off = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 g = p * 1.6 + float(k) * 7.3;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(cell + float(k) * 3.1);
    float ph = fract(uTime * 0.8 + h * 9.0);
    float r = length(f);
    float ring = sin((r - ph * 0.45) * 60.0) * smoothstep(0.05, 0.0, abs(r - ph * 0.45)) * (1.0 - ph);
    off += normalize(f + 0.0001) * ring * step(0.3, h);
  }
  return off;
}
void main() {
  vec2 p = vWorld.xz;
  vec2 flow = vec2(0.0, uTime * uFlow);
  vec2 n = vec2(vnoise(p * 0.9 + uTime * 0.15 + flow) - 0.5, vnoise(p * 0.8 - uTime * 0.12 + 5.0 + flow) - 0.5) * 0.35;
  n += vec2(vnoise(p * 3.1 + uTime * 0.4) - 0.5, vnoise(p * 2.7 - uTime * 0.35 + 9.0) - 0.5) * 0.12;
  n += rings(p) * 0.5 * uRain;
  vec3 N = normalize(vec3(n.x, 1.0, n.y));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uSkyHor, uSkyTop, smoothstep(0.0, 0.6, R.y));
  vec3 base = mix(uShallow, uDeep, 0.6 + 0.4 * vnoise(p * 0.2));
  vec3 col = mix(base, sky, 0.25 + fres * 0.65);
  float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 120.0) * uSunVis;
  col += uSunCol * spec * 1.2;
  gl_FragColor = vec4(col * uExposure, 0.92);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uDeep: { value: new THREE.Color('#1f3a3a') }, uShallow: { value: new THREE.Color('#4a6a5c') },
      uSkyTop: { value: new THREE.Color() }, uSkyHor: { value: new THREE.Color() },
      uSunCol: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uTime: { value: 0 }, uRain: { value: 0 }, uSunVis: { value: 1 }, uFlow: { value: 0 }, uExposure: { value: 1 },
    }]),
    vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true, depthWrite: true,
  });
}

function lotusPadGeo() {
  const g = new THREE.CircleGeometry(0.42, 14, 0.25, Math.PI * 2 - 0.5);
  g.rotateX(-Math.PI / 2);
  return colorize(g, (x, y, z, c) => c.set('#4f7a3a').lerp(new THREE.Color('#7fa556'), Math.hypot(x, z) * 1.6));
}
function lotusFlowerGeo() {
  const parts = [];
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 7; i++) {
      const g = new THREE.SphereGeometry(0.11, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(0.55, 1.6, 0.3);
      g.rotateX(-0.45 - ring * 0.35);
      g.translate(0, 0, 0.06 + ring * 0.04);
      g.rotateY((i / 7) * Math.PI * 2 + ring * 0.4);
      g.translate(0, 0.08, 0);
      radialNormals(g, 0, 0, 0);
      parts.push(colorize(g, (x, y, z, c) => c.set('#f3c6d2').lerp(new THREE.Color('#d9668a'), Math.min(1, y * 4))));
    }
  }
  const core = new THREE.SphereGeometry(0.06, 6, 4);
  core.translate(0, 0.13, 0);
  parts.push(colorize(core, '#e6c24a'));
  return merge(parts);
}

export function buildWater() {
  const group = new THREE.Group();
  const mat = waterMaterial();
  // pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat);
  pond.rotation.x = -Math.PI / 2;
  pond.scale.set(POND.rx * 1.3, POND.rz * 1.3, 1);
  pond.position.set(POND.x, WATER_Y, POND.z);
  pond.receiveShadow = false;
  group.add(pond);

  // stream: a ribbon following the carved groove
  const smat = waterMaterial();
  smat.uniforms.uFlow.value = 0.9;
  const pts = [];
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.2);
    for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  pts.push(STREAM[STREAM.length - 1]);
  const pos = [], idx = [], uv = [];
  pts.forEach(([x, z], i) => {
    const [nx, nz] = pts[Math.min(i + 1, pts.length - 1)];
    const [px, pz] = pts[Math.max(i - 1, 0)];
    let dx = nx - px, dz = nz - pz;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const w = 0.9;
    const y = Math.max(heightAt(x, z) + 0.4, WATER_Y);
    pos.push(x - dz * w, y, z + dx * w, x + dz * w, y, z - dx * w);
    uv.push(0, i, 1, i);
    if (i < pts.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sg.setIndex(idx);
  group.add(new THREE.Mesh(sg, smat));

  // lotus leaves and flowers, clustered at the pond's west and east sides
  const rng = new Rng('lotus');
  const pads = [], flowers = [];
  for (let i = 0; i < 140; i++) {
    const cluster = rng.f() < 0.55 ? [-1.5, 10] : [12, 16];
    const x = cluster[0] + rng.g() * 4, z = cluster[1] + rng.g() * 3;
    if (pondDist(x, z) > 0.9 || onBridge(x, z)) continue;
    pads.push({ x, z, s: rng.range(0.7, 1.4), r: rng.f() * 6 });
    if (rng.f() < 0.18) flowers.push({ x: x + 0.1, z: z + 0.1, s: rng.range(0.8, 1.2), r: rng.f() * 6 });
  }
  const mk = (geo, list, y, m) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    const o = new THREE.Object3D();
    list.forEach((it, i) => {
      o.position.set(it.x, y, it.z);
      o.rotation.set(0, it.r, 0);
      o.scale.setScalar(it.s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    return im;
  };
  group.add(mk(lotusPadGeo(), pads, WATER_Y + 0.03, paint({ side: THREE.DoubleSide })));
  group.add(mk(lotusFlowerGeo(), flowers, WATER_Y + 0.05, paint({ side: THREE.DoubleSide })));
  group.userData.materials = [mat, smat];
  group.userData.lotus = flowers;
  return group;
}

/** Keep the water's sky reflection and sun in step with the atmosphere. */
export function updateWater(group, atm, sunDir, t, exposure = 1) {
  for (const m of group.userData.materials) {
    const u = m.uniforms;
    u.uSkyTop.value.setRGB(...atm.skyTop, THREE.SRGBColorSpace);
    u.uSkyHor.value.setRGB(...atm.skyHor, THREE.SRGBColorSpace);
    u.uSunCol.value.setRGB(...atm.sunCol, THREE.SRGBColorSpace);
    if (sunDir) u.uSunDir.value.copy(sunDir);
    u.uSunVis.value = atm.sunVis;
    u.uRain.value = atm.rain;
    u.uTime.value = t;
    u.uExposure.value = exposure * (0.55 + 0.45 * Math.min(1, atm.daylight + 0.2));
    u.uDeep.value.set('#1f3a3a').multiplyScalar(0.5 + 0.5 * atm.daylight);
    u.uShallow.value.set('#4a6a5c').multiplyScalar(0.45 + 0.55 * atm.daylight);
  }
}
