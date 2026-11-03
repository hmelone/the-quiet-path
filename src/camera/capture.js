// Expose a photograph of exactly the framed part of the view. The scene is
// rendered offscreen with depth; one film pass adds focus blur (from the
// focus distance you chose), tone, halation, vignette and grain.
import * as THREE from 'three';

const FILM_FS = /* glsl */ `
#include <packing>
varying vec2 vUv;
uniform sampler2D tColor, tDepth;
uniform float uNear, uFar, uFocus, uAperture, uExposure, uSeed, uGrain;
uniform vec2 uRes;
uniform vec3 uStock;
float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, uNear, uFar);
}
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 color) {
  const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = O * RRTAndODTFit(I * color);
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  if (uFocus > 0.0) {
    float z = viewZ(vUv);
    float coc = clamp(abs(z - uFocus) / max(z, 0.1) * uAperture, 0.0, 1.0);
    float r = coc * 9.0;
    if (r > 0.4) {
      vec3 acc = col; float wsum = 1.0;
      for (int i = 0; i < 16; i++) {
        float a = float(i) * 2.39996;
        float rr = sqrt(float(i) + 0.5) / 4.0 * r;
        vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
        acc += texture2D(tColor, vUv + o).rgb;
        wsum += 1.0;
      }
      col = acc / wsum;
    }
  }
  col = aces(col);
  // halation: warm glow around bright areas
  vec3 bloom = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785;
    bloom += max(aces(texture2D(tColor, vUv + vec2(cos(a), sin(a)) * 6.0 / uRes).rgb) - 0.88, 0.0);
  }
  col += bloom / 8.0 * vec3(1.0, 0.45, 0.25) * 0.5;
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);
  col = col * 0.97 + 0.012;
  col *= uStock;
  float d = length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 0.8);
  col *= 1.0 - 0.3 * smoothstep(0.3, 0.9, d);
  col = toSRGB(col);
  float g = hash(vUv * uRes + uSeed) + hash(vUv * uRes * 0.5 + uSeed * 1.7) - 1.0;
  col += g * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

let film = null;
function filmScene() {
  if (film) return film;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null }, tDepth: { value: null }, uNear: { value: 0.1 }, uFar: { value: 1000 },
      uFocus: { value: 0 }, uAperture: { value: 0 }, uExposure: { value: 1 }, uSeed: { value: 0 }, uGrain: { value: 0.05 },
      uRes: { value: new THREE.Vector2() }, uStock: { value: new THREE.Vector3(1.04, 1.0, 0.93) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FILM_FS,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);
  film = { scene, mat, cam: new THREE.Camera() };
  return film;
}

function toBlob(canvas, q = 0.88) {
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
}

/**
 * frame: { x, y, w, h } in CSS pixels of the full view (W x H).
 * focus: distance in metres (0 = everything sharp).
 */
export async function exposeFrame({ renderer, scene, camera, W, H, frame, focus, photoW, portrait }) {
  const w = portrait ? Math.round((photoW * 2) / 3) : photoW;
  const h = portrait ? photoW : Math.round((photoW * 2) / 3);
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h) });
  const out = new THREE.WebGLRenderTarget(w, h);
  const cam = camera.clone();
  // render exactly the framed rectangle at photo resolution
  const sx = w / frame.w;
  cam.setViewOffset(W * sx, H * sx, frame.x * sx, frame.y * sx, w, h);
  cam.updateProjectionMatrix();
  const prevTM = renderer.toneMapping;
  const exposure = renderer.toneMappingExposure;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.toneMapping = prevTM;
  const f = filmScene();
  const u = f.mat.uniforms;
  u.tColor.value = rt.texture;
  u.tDepth.value = rt.depthTexture;
  u.uNear.value = cam.near;
  u.uFar.value = cam.far;
  u.uFocus.value = focus || 0;
  u.uAperture.value = focus ? 0.9 * (62 / cam.fov) : 0;
  u.uExposure.value = exposure;
  u.uSeed.value = Math.random() * 100;
  u.uRes.value.set(w, h);
  renderer.setRenderTarget(out);
  renderer.render(f.scene, f.cam);
  const px = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(out, 0, 0, w, h, px);
  renderer.setRenderTarget(null);
  rt.dispose();
  rt.depthTexture.dispose();
  out.dispose();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const row = w * 4;
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  ctx.putImageData(img, 0, 0);
  const thumb = document.createElement('canvas');
  const tw = 360;
  thumb.width = portrait ? Math.round((tw * 2) / 3) : tw;
  thumb.height = portrait ? tw : Math.round((tw * 2) / 3);
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  const [full, small] = await Promise.all([toBlob(canvas), toBlob(thumb, 0.8)]);
  return { full, small };
}

/** Name what is meaningfully in frame: tagged things, people and animals. */
export function subjectsInFrame({ camera, W, H, frame, things, raycastBlockers }) {
  const v = new THREE.Vector3();
  const found = [];
  const ray = new THREE.Raycaster();
  for (const t of things) {
    v.set(t.x, t.y, t.z).project(camera);
    if (v.z > 1) continue;
    const px = (v.x * 0.5 + 0.5) * W, py = (1 - (v.y * 0.5 + 0.5)) * H;
    if (px < frame.x || px > frame.x + frame.w || py < frame.y || py > frame.y + frame.h) continue;
    const dist = camera.position.distanceTo(new THREE.Vector3(t.x, t.y, t.z));
    if (dist > (t.range || 40)) continue;
    // size on screen relative to the frame
    const fovRad = (camera.fov * Math.PI) / 180;
    const sizePx = ((t.r || 0.5) / (dist * Math.tan(fovRad / 2))) * (H / 2);
    if (sizePx / frame.h < 0.03) continue;
    if (raycastBlockers?.length) {
      const dir = new THREE.Vector3(t.x, t.y, t.z).sub(camera.position).normalize();
      ray.set(camera.position, dir);
      ray.far = dist - 0.6;
      if (ray.intersectObjects(raycastBlockers, false).length) continue;
    }
    const cx = (px - frame.x) / frame.w - 0.5, cy = (py - frame.y) / frame.h - 0.5;
    found.push({ label: t.label, score: 1 - Math.hypot(cx, cy) + Math.min(1, sizePx / frame.h) });
  }
  const seen = new Set();
  return found.sort((a, b) => b.score - a.score).filter((f) => !seen.has(f.label) && seen.add(f.label)).slice(0, 3).map((f) => f.label);
}
