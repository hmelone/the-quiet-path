// A painted sky dome: gradient, sun or moon, brushy clouds and stars,
// plus distant blue mountain ridges that fade into the haze.
import * as THREE from 'three';
import { Rng, fbm1 } from '../core/rng.js';

const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FS = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop, uHor, uSunCol, uCloudCol, uSunDir;
uniform float uSunVis, uCloud, uStars, uTime;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHor, uTop, smoothstep(-0.02, 0.55, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.6) * uSunVis;
  col = mix(col, uSunCol * 1.1, smoothstep(0.9988, 0.9994, sd) * uSunVis);
  // stars
  if (uStars > 0.01 && h > 0.0) {
    vec2 g = d.xz / (d.y + 0.3) * 120.0;
    vec2 cell = floor(g);
    float r = hash(cell);
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
    col += step(0.988, r) * smoothstep(0.45, 0.0, length(fract(g) - 0.5)) * tw * uStars * smoothstep(0.0, 0.25, h);
  }
  // clouds projected onto a flat layer
  if (h > 0.0) {
    vec2 cp = d.xz / (d.y + 0.12) * 1.6 + vec2(uTime * 0.004, 0.0);
    float n = fbm(cp + fbm(cp * 0.6 + 3.0) * 0.7);
    float cov = mix(0.62, 0.25, uCloud);
    float c = smoothstep(cov, cov + 0.3, n) * smoothstep(0.0, 0.18, h);
    vec3 cc = mix(uCloudCol, uSunCol, 0.25 * uSunVis * pow(sd, 3.0)) * (0.9 + 0.15 * fbm(cp * 3.0));
    col = mix(col, cc, c * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function buildSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
    uCloudCol: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunVis: { value: 1 }, uCloud: { value: 0.3 }, uStars: { value: 0 }, uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/** Rings of distant mountain silhouettes, vertex-coloured, softened by fog. */
export function buildMountains() {
  const group = new THREE.Group();
  const uniforms = { uTint: { value: new THREE.Color(1, 1, 1) }, uHaze: { value: new THREE.Color('#cfd8dc') }, uHazeAmt: { value: 0.4 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide, vertexColors: true, fog: false,
    vertexShader: `varying vec3 vC; varying float vH; void main(){ vC = color; vH = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vH; uniform vec3 uTint, uHaze; uniform float uHazeAmt;
      void main(){ float base = 1.0 - smoothstep(-20.0, 60.0, vH) * 0.5; vec3 c = mix(vC * uTint, uHaze, clamp(uHazeAmt + base * 0.35 * uHazeAmt, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  group.userData.uniforms = uniforms;
  const rng = new Rng('mountains');
  const rings = [
    { r: 330, h: 120, col: new THREE.Color('#6f86a0'), seed: 1 },
    { r: 230, h: 85, col: new THREE.Color('#587068'), seed: 2 },
  ];
  for (const ring of rings) {
    const seg = 220;
    const pos = [], col = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      let n = fbm1(i / seg * 9 + ring.seed * 5, ring.seed, 6);
      n = Math.pow(Math.max(0, (n - 0.25) / 0.6), 1.3);
      // keep the valley's south end (towards +z) lower so you can see out
      const south = Math.max(0, Math.cos(a - Math.PI / 2));
      const top = 10 + ring.h * n * (1 - south * 0.55);
      const x = Math.cos(a) * ring.r, z = Math.sin(a) * ring.r;
      pos.push(x, -20, z, x, top, z);
      const c0 = ring.col.clone().multiplyScalar(0.85), c1 = ring.col.clone().lerp(new THREE.Color('#c9d3d8'), 0.1);
      col.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
      if (i < seg) {
        const b = i * 2;
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = -5;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  void rng;
  return group;
}
