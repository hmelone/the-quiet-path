// Architecture: the mountain gate, bell tower, meditation hall (walk-in),
// stone farmhouse tea house, your hut, the pond bridge, benches and lamps.
// Each building is merged into a few meshes; walls become nav colliders.
import * as THREE from 'three';
import { colorize, merge, vary, radialNormals } from './geo.js';
import { paint } from './materials.js';
import { PADS, BUILDINGS, BRIDGE, FOOTBRIDGE } from './layout.js';
import { heightAt, bridgeHeight } from './terrain.js';
import { Rng, fbm2 } from '../core/rng.js';

const C = (h) => new THREE.Color(h);
const WOOD = '#6e4f38', WOOD_D = '#4a3426', WOOD_L = '#9a7656', PLASTER = '#e2d7c0', TILE = '#9a5236';
// Vietnamese temple colours: warm ochre walls, red-brown lacquered wood.
const OCHRE = '#e2c48c', LACQUER = '#7a3224', LACQUER_D = '#55241b';
const STONE = '#a49a86', TERRACOTTA = '#b8643f', SHUTTER = '#7f97a6', BRONZE = '#7a5a2a';

/** Collects coloured boxes etc. in a local frame, then emits one merged mesh. */
class Kit {
  constructor() { this.parts = []; this.colliders = []; }
  box(w, h, d, x, y, z, col, { rotY = 0, rough = 0.05, collide = false, noise = 0 } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rotY) g.rotateY(rotY);
    g.translate(x, y + h / 2, z);
    this.parts.push(colorize(g, (px, py, pz) => {
      const c = vary(C(col), rough, px * 1.7, py * 1.7, pz * 1.7);
      if (noise) c.multiplyScalar(1 + (fbm2(px * 1.3 + py, pz * 1.3 - py, 3) - 0.5) * noise);
      return c;
    }));
    if (collide) this.colliders.push({ x, z, w, d, rot: rotY });
    return this;
  }
  cyl(r0, r1, h, x, y, z, col, seg = 8) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg);
    g.translate(x, y + h / 2, z);
    this.parts.push(colorize(g, (px, py, pz) => vary(C(col), 0.05, px * 3, py * 3, pz * 3)));
    return this;
  }
  geo(g, col) { this.parts.push(colorize(g, typeof col === 'function' ? col : (x, y, z) => vary(C(col), 0.05, x, y, z))); return this; }
  mesh(mat) {
    const m = new THREE.Mesh(merge(this.parts), mat || paint({ side: THREE.DoubleSide }));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

// Small reusable details are baked into each building's mesh, keeping draw calls
// low. Board edges, repairs and tea rings remain visible without image textures.
function floorboards(k, w, d, y, cx = 0, cz = 0) {
  const count = Math.ceil(w / 0.34), bw = w / count;
  for (let i = 0; i < count; i++) {
    const x = cx - w / 2 + (i + 0.5) * bw;
    const col = ['#a67d56', '#95704e', '#af865f', '#9e7955'][i % 4];
    k.box(bw - 0.012, 0.025, d, x, y, cz, col, { rough: 0.08 });
    // Staggered end joints and fine grain marks; no raised collision edges.
    const z = cz + ((i * 1.37) % Math.max(0.1, d - 0.4)) - (d - 0.4) / 2;
    k.box(bw - 0.02, 0.003, 0.012, x, y + 0.026, z, '#6e553e');
    if (i % 3 === 0) k.box(0.012, 0.003, Math.min(d * 0.65, 1.8), x + bw * 0.19, y + 0.026, cz, '#806246');
  }
}

function shoes(k, x, y, z, col = '#5c5146') {
  for (const side of [-1, 1]) {
    k.geo(new THREE.SphereGeometry(0.12, 7, 5).scale(0.6, 0.45, 1.5).translate(x + side * 0.095, y + 0.055, z), col);
    k.box(0.10, 0.02, 0.08, x + side * 0.095, y + 0.09, z - 0.025, '#292c28');
  }
}

function teaSet(k, x, y, z) {
  // A squat kettle, lid, arched handle and spout with several ordinary cups.
  k.geo(new THREE.SphereGeometry(0.15, 12, 8).scale(1, 0.8, 1).translate(x, y + 0.12, z), '#536b66');
  k.cyl(0.09, 0.07, 0.035, x, y + 0.235, z, '#3f534e', 10);
  k.cyl(0.025, 0.025, 0.035, x, y + 0.27, z, '#7c6044', 7);
  k.geo(new THREE.TorusGeometry(0.15, 0.018, 5, 12, Math.PI).translate(x, y + 0.20, z), '#64543e');
  k.geo(new THREE.CylinderGeometry(0.035, 0.045, 0.19, 7).rotateZ(-0.85).translate(x + 0.18, y + 0.16, z), '#536b66');
  for (const [dx, dz] of [[-0.32, 0.10], [0.31, 0.20], [0.20, -0.24]]) {
    k.cyl(0.06, 0.065, 0.09, x + dx, y, z + dz, '#e2d2b4', 10);
    k.cyl(0.051, 0.051, 0.002, x + dx, y + 0.091, z + dz, '#68583e', 10);
  }
}

/** Hip roof with gently upturned corners (fictional retreat architecture). */
function hipRoof(W, D, H, lift, col, seg = 10) {
  const pos = [];
  const rw = Math.max(0.2, (W - D) / 2);
  const eaveY = (t) => lift * Math.pow(Math.abs(t * 2 - 1), 3);
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (const sgn of [1, -1]) {
    // long faces
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg;
      const e0 = [-W / 2 + W * t0, eaveY(t0), (sgn * D) / 2], e1 = [-W / 2 + W * t1, eaveY(t1), (sgn * D) / 2];
      const r0 = [-rw + 2 * rw * t0, H, 0], r1 = [-rw + 2 * rw * t1, H, 0];
      if (sgn > 0) { tri(e0, e1, r1); tri(e0, r1, r0); } else { tri(e1, e0, r0); tri(e1, r0, r1); }
    }
    // short faces
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg;
      const e0 = [(sgn * W) / 2, eaveY(t0), -D / 2 + D * t0], e1 = [(sgn * W) / 2, eaveY(t1), -D / 2 + D * t1];
      const r = [sgn * rw, H, 0];
      if (sgn > 0) tri(e1, e0, r); else tri(e0, e1, r);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return colorize(g, (x, y, z) => {
    const c = vary(C(col), 0.06, x * 2, y, z * 2);
    // tile rows
    const rows = Math.sin((Math.abs(z) + Math.abs(x) * 0.15) * 14) * 0.04;
    return c.multiplyScalar(0.92 + rows + y * 0.03);
  });
}

/** Simple gable roof (farmhouse / hut). Ridge along x. */
function gableRoof(W, D, H, col, overhang = 0.4) {
  const w = W / 2 + overhang, d = D / 2 + overhang;
  const pos = [
    -w, 0, d, w, 0, d, w, H, 0, -w, 0, d, w, H, 0, -w, H, 0,
    w, 0, -d, -w, 0, -d, -w, H, 0, w, 0, -d, -w, H, 0, w, H, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return colorize(g, (x, y, z) => vary(C(col), 0.08, x * 3, y * 3, z * 3).multiplyScalar(0.9 + Math.sin(x * 9) * 0.05));
}

/** Gable end triangles (walls under a gable roof). */
function gableEnds(W, D, H, y0, col) {
  const pos = [];
  for (const s of [-1, 1]) pos.push(s * W / 2, y0, -D / 2, s * W / 2, y0, D / 2, s * W / 2, y0 + H, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return colorize(g, col);
}

/** Brush-written phrase on a paper or wood board, painted on a canvas. */
/**
 * Gable roof seated on walls of depth D whose tops are at y = top. The roof
 * plane is lowered by its overhang's rise so it rests on the wall plates,
 * with no gap between wall and roof.
 */
function seatedGable(k, W, D, Hr, top, roofCol, endCol, oh) {
  const drop = Hr * oh / (D / 2 + oh);
  k.geo(gableEnds(W, D, Hr - drop, top, endCol));
  k.geo((() => { const g = gableRoof(W, D, Hr, roofCol, oh); g.translate(0, top - drop, 0); return g; })(),
    (x, y, z) => vary(C(roofCol), 0.08, x * 3, y * 3, z * 3).multiplyScalar(0.9 + Math.sin(x * 10) * 0.05));
}

export function calligraphy(text, { w = 512, h = 160, paper = '#efe6d2', ink = '#2a2420', vertical = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = paper;
  g.fillRect(0, 0, w, h);
  const rng = new Rng(text);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(120,100,70,${rng.range(0.02, 0.06)})`;
    g.fillRect(rng.f() * w, rng.f() * h, rng.range(2, 30), rng.range(1, 3));
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = vertical ? w * 0.42 : Math.min(h * 0.5, (w * 1.6) / Math.max(8, text.length));
  g.font = `italic 600 ${size}px 'Cormorant Garamond', Georgia, serif`;
  // several offset passes give a soft, inky brush edge
  for (let k = 0; k < 6; k++) {
    g.fillStyle = `rgba(42,36,32,${k === 5 ? 0.95 : 0.12})`;
    g.fillText(text, w / 2 + rng.g() * 2, h / 2 + rng.g() * 2);
  }
  g.fillStyle = ink;
  g.fillText(text, w / 2, h / 2);
  // a small red seal
  g.fillStyle = 'rgba(170,40,36,0.85)';
  g.fillRect(w - h * 0.32, h - h * 0.34, h * 0.16, h * 0.16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function board(text, bw, bh, opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshToonMaterial({ map: calligraphy(text, opts), side: THREE.DoubleSide }));
  m.castShadow = false;
  return m;
}

// Shared glowing materials (windows, lamps), dimmed by daylight
export const glow = {
  window: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd79a'), side: THREE.DoubleSide, toneMapped: false }),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf88'), toneMapped: false }),
  candle: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a8'), toneMapped: false }),
};

function place(obj, x, z, rot, y) {
  obj.position.set(x, y, z);
  obj.rotation.y = rot;
  return obj;
}

function worldColliders(list, x, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return list.map((b) => ({ x: x + b.x * c + b.z * s, z: z - b.x * s + b.z * c, w: b.w, d: b.d, rot: (b.rot || 0) + rot }));
}

// --- the gate --------------------------------------------------------------------

function buildGate() {
  const k = new Kit();
  const p = PADS.gate;
  for (const s of [-1, 1]) {
    k.box(0.9, 3.6, 0.9, s * 2.2, 0, 0, PLASTER, { collide: true, noise: 0.15 });
    k.box(1.05, 0.25, 1.05, s * 2.2, 3.6, 0, WOOD_D);
    k.box(0.5, 1.4, 4.0, s * 4.2, 0, 0.0, STONE, { collide: true, noise: 0.3, rotY: Math.PI / 2 });
  }
  k.box(5.6, 0.35, 0.45, 0, 3.0, 0, WOOD);
  k.geo((() => { const g = hipRoof(6.4, 2.4, 1.3, 0.45, TILE); g.translate(0, 3.85, 0); return g; })(), (x, y, z) => vary(C(TILE), 0.06, x, y, z));
  const g = new THREE.Group();
  g.add(k.mesh());
  const b = board('Slow down. You are here.', 2.6, 0.55, { w: 640, h: 136 });
  b.position.set(0, 3.0 + 0.17, 0.24);
  g.add(b);
  const b2 = b.clone();
  b2.position.z = -0.24;
  b2.rotation.y = Math.PI;
  g.add(b2);
  place(g, p.x, p.z, 0, p.h);
  return { group: g, colliders: worldColliders(k.colliders, p.x, p.z, 0) };
}

// --- bell tower ------------------------------------------------------------------

function bellGeo() {
  const pts = [];
  const prof = [[0.05, 1.25], [0.32, 1.2], [0.48, 1.05], [0.55, 0.7], [0.6, 0.35], [0.72, 0.08], [0.76, 0]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 20);
  g.translate(0, -1.25, 0);
  return g;
}

function buildTower() {
  const k = new Kit();
  const p = PADS.tower;
  k.box(4.6, 0.45, 4.6, 0, -0.1, 0, STONE, { noise: 0.3 });
  for (const sx of [-1.8, 1.8]) for (const sz of [-1.8, 1.8]) k.box(0.28, 4.2, 0.28, sx, 0.35, sz, WOOD, { collide: true });
  k.box(4.0, 0.22, 0.25, 0, 3.9, -1.8, WOOD_D).box(4.0, 0.22, 0.25, 0, 3.9, 1.8, WOOD_D);
  k.box(0.25, 0.22, 4.0, -1.8, 3.9, 0, WOOD_D).box(0.25, 0.22, 4.0, 1.8, 3.9, 0, WOOD_D);
  k.box(4.0, 0.2, 0.3, 0, 4.1, 0, WOOD_D);
  k.geo((() => { const g = hipRoof(5.6, 5.6, 1.9, 0.55, TILE); g.translate(0, 4.4, 0); return g; })(), (x, y, z) => vary(C(TILE), 0.06, x, y, z));
  const g = new THREE.Group();
  g.add(k.mesh());
  const bell = new THREE.Mesh(colorize(bellGeo(), (x, y, z) => vary(C(BRONZE), 0.08, x * 4, y * 4, z * 4).multiplyScalar(0.8 + (y + 1.2) * 0.2)), paint({ side: THREE.DoubleSide }));
  bell.position.set(0, 4.05, 0);
  bell.castShadow = true;
  g.add(bell);
  // the wooden striker log, hung on ropes
  const log = new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8).rotateZ(Math.PI / 2), WOOD_L), paint({}));
  log.position.set(-1.25, 3.25, 0);
  g.add(log);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), paint({ color: 0xbfae86, vertexColors: false }));
  rope.position.set(-1.6, 3.65, 0);
  g.add(rope, rope.clone().translateX(0.7));
  place(g, p.x, p.z, 0.3, p.h);
  g.userData.bell = bell;
  return { group: g, colliders: worldColliders(k.colliders, p.x, p.z, 0.3), bell, log };
}

// --- meditation hall (walk-in) -------------------------------------------------------

function cushionGeo() {
  const parts = [];
  const mat = new THREE.BoxGeometry(0.75, 0.06, 0.75);
  mat.translate(0, 0.03, 0);
  parts.push(colorize(mat, '#5b4a3a'));
  const z = new THREE.CylinderGeometry(0.2, 0.22, 0.16, 12);
  z.translate(0, 0.14, -0.1);
  parts.push(colorize(z, '#7a5a3e'));
  return merge(parts);
}

/** A glazed vase of chrysanthemums: stems, leaves and petalled flower heads. */
function vaseBouquetGeo(seed) {
  const rng = new Rng(`bouquet${seed}`);
  const parts = [];
  // a celadon vase with a narrow neck
  const vase = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.085, 0.06], [0.09, 0.14], [0.06, 0.22], [0.035, 0.27], [0.045, 0.3], [0.04, 0.3]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
  parts.push(colorize(vase, (x, y) => new THREE.Color('#9fb8a6').lerp(new THREE.Color('#c9d8c8'), y * 2.5)));
  const heads = [];
  for (let i = 0; i < 7; i++) {
    const a = rng.f() * Math.PI * 2, out = rng.range(0.05, 0.22), h = rng.range(0.42, 0.66);
    const tip = [Math.cos(a) * out, h, Math.sin(a) * out];
    // gently curving stem from the neck of the vase
    const mid = [tip[0] * 0.45, 0.3 + (h - 0.3) * 0.55, tip[2] * 0.45];
    for (const [p0, p1] of [[[0, 0.28, 0], mid], [mid, tip]]) {
      const v0 = new THREE.Vector3(...p0), v1 = new THREE.Vector3(...p1), d = v1.clone().sub(v0);
      const st = new THREE.CylinderGeometry(0.005, 0.006, d.length(), 5);
      st.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      st.translate(...v0.clone().add(v1).multiplyScalar(0.5).toArray());
      parts.push(colorize(st, '#4f6b34'));
    }
    // two leaves along the stem: deep green, lobed-looking
    for (let k = 0; k < 2; k++) {
      const t = 0.35 + k * 0.3;
      const lp = [mid[0] * t * 1.6, 0.3 + (h - 0.3) * t, mid[2] * t * 1.6];
      const lf = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      lf.scale(0.05, 0.012, 0.022);
      lf.rotateZ(0.5 * (k ? 1 : -1));
      lf.rotateY(a + k * 2.2);
      lf.translate(lp[0] + Math.cos(a + k * 2.2) * 0.04, lp[1], lp[2] + Math.sin(a + k * 2.2) * 0.04);
      parts.push(colorize(lf, k ? '#3f6a2e' : '#557a3a'));
    }
    heads.push([tip, rng.f() < 0.55 ? 'white' : 'yellow']);
  }
  for (const [[x, y, z], kind] of heads) {
    // a chrysanthemum: many narrow petals in two rings around a tight centre
    const pc = kind === 'white' ? ['#f7f3ea', '#ece6d6'] : ['#f2c84a', '#e8b43a'];
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 10 : 14;
      for (let i = 0; i < n; i++) {
        const pg = new THREE.SphereGeometry(1, 6, 4);
        pg.scale(0.008, 0.005, 0.036 - ring * 0.01);
        pg.translate(0, 0, 0.032 - ring * 0.01);
        pg.rotateX(-0.35 - ring * 0.5);
        pg.rotateY((i / n) * Math.PI * 2 + ring * 0.3);
        pg.translate(x, y, z);
        parts.push(colorize(pg, pc[ring]));
      }
    }
    parts.push(colorize(new THREE.SphereGeometry(0.014, 8, 6).scale(1, 0.7, 1).translate(x, y + 0.006, z), kind === 'white' ? '#e8d48a' : '#d89a2a'));
  }
  return merge(parts);
}

/**
 * A seated Buddha in meditation, gilded: lotus pedestal, crossed legs, hands
 * resting together in the lap, a robe over the shoulders, a head of tight
 * curls with the raised crown, long earlobes, a calm face with lowered eyes,
 * and a soft halo behind. Faces local -Z (toward the hall).
 */
function seatedBuddha() {
  const parts = [];
  const gold = '#c9a24a', goldDeep = '#a8822f', goldLight = '#dcbd6e';
  const add = (g, col, amt = 0.05) => parts.push(colorize(g, (x, y, z) => vary(C(col), amt, x * 6, y * 6, z * 6)));
  // lotus pedestal: a drum, two rings of petals, and a round seat
  add(new THREE.CylinderGeometry(0.34, 0.38, 0.1, 24).translate(0, 0.05, 0), goldDeep);
  for (const [ring, n, r, y, tilt] of [[0, 14, 0.36, 0.13, 0.9], [1, 14, 0.3, 0.2, 0.6]]) {
    for (let i = 0; i < n; i++) {
      const g = new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(0.07, 0.13, 0.03);
      g.rotateX(-tilt);
      g.translate(0, 0, r);
      g.rotateY((i / n) * Math.PI * 2 + ring * 0.22);
      g.translate(0, y, 0);
      add(g, ring ? goldLight : gold);
    }
  }
  add(new THREE.CylinderGeometry(0.3, 0.32, 0.06, 24).translate(0, 0.25, 0), gold);
  const seat = 0.28;
  // crossed legs: a broad, rounded lap with knees
  add(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12).rotateZ(Math.PI / 2).scale(1, 0.85, 1.25).translate(0, seat + 0.09, -0.04), gold);
  for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.11, 12, 8).scale(1, 0.75, 1.05).translate(sx * 0.24, seat + 0.09, -0.08), gold);
  // a fold of robe draped over the lap
  add(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.35, 0.8).translate(0, seat + 0.12, -0.04), goldDeep);
  // torso, slightly tapered, robe over both shoulders
  const torso = new THREE.LatheGeometry([[0.0, 0], [0.17, 0.02], [0.18, 0.12], [0.165, 0.26], [0.17, 0.36], [0.15, 0.42], [0.06, 0.47], [0.0, 0.48]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
  torso.scale(1.15, 1, 0.78);
  torso.translate(0, seat + 0.14, 0);
  radialNormals(torso, 0, seat + 0.38, 0, 0.6);
  parts.push(colorize(torso, (x, y, z) => {
    // a soft V-shaped robe edge on the chest
    const v = Math.abs(x) * 1.6 + (y - seat - 0.42) * -1.2;
    return vary(C(z < -0.05 && v < 0.12 && v > 0.06 ? goldDeep : gold), 0.05, x * 6, y * 6, z * 6);
  }));
  // shoulders, arms and hands meeting in the lap (the meditation gesture)
  for (const sx of [-1, 1]) {
    add(new THREE.SphereGeometry(0.075, 10, 8).translate(sx * 0.19, seat + 0.53, 0), gold);
    const upper = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8);
    upper.rotateZ(sx * 0.18);
    upper.rotateX(0.25);
    upper.translate(sx * 0.215, seat + 0.38, -0.03);
    add(upper, gold);
    const fore = new THREE.CapsuleGeometry(0.042, 0.17, 4, 8);
    fore.rotateZ(sx * 1.25);
    fore.rotateY(sx * -0.5);
    fore.translate(sx * 0.12, seat + 0.25, -0.13);
    add(fore, gold);
  }
  add(new THREE.SphereGeometry(0.075, 12, 8).scale(1.4, 0.45, 0.9).translate(0, seat + 0.21, -0.16), goldLight); // hands, one resting in the other
  // neck and head
  add(new THREE.CylinderGeometry(0.055, 0.065, 0.08, 12).translate(0, seat + 0.63, 0), gold);
  const headY = seat + 0.78;
  add(new THREE.SphereGeometry(0.11, 18, 14).scale(0.92, 1.1, 0.98).translate(0, headY, 0), goldLight);
  // tight curls over the crown, and the raised crown on top
  for (let i = 0; i < 70; i++) {
    const a = i * 2.39996, t = (i + 0.5) / 70;
    const phi = Math.acos(1 - t * 1.05); // upper part of the head
    const x = Math.sin(phi) * Math.cos(a), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(a);
    if (z < -0.35 && y < 0.55) continue; // keep the face clear
    add(new THREE.SphereGeometry(0.017, 5, 4).translate(x * 0.104, headY + 0.02 + y * 0.115, z * 0.104), goldDeep, 0.03);
  }
  add(new THREE.SphereGeometry(0.06, 12, 8).scale(1, 0.85, 1).translate(0, headY + 0.13, 0), goldDeep);
  // long earlobes, a calm face: brow, lowered eyes, nose, a small mark between the brows
  for (const sx of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.018, 0.08, 4, 6).translate(sx * 0.105, headY - 0.04, 0.01), gold);
    add(new THREE.CapsuleGeometry(0.006, 0.03, 3, 5).rotateZ(Math.PI / 2 + sx * 0.12).translate(sx * 0.038, headY + 0.005, -0.098), goldDeep, 0.0);
  }
  add(new THREE.SphereGeometry(0.014, 6, 5).scale(0.8, 1.4, 1).translate(0, headY - 0.025, -0.107), goldLight);
  add(new THREE.SphereGeometry(0.007, 5, 4).translate(0, headY + 0.045, -0.104), goldDeep, 0);
  add(new THREE.CapsuleGeometry(0.004, 0.025, 2, 4).rotateZ(Math.PI / 2).translate(0, headY - 0.07, -0.098), goldDeep, 0);
  // a soft halo behind the head
  const halo = new THREE.RingGeometry(0.15, 0.2, 32);
  halo.translate(0, headY + 0.02, 0.13);
  add(halo, goldDeep, 0.03);
  return merge(parts);
}

function seatedFigure(col = '#b59a5c', s = 1) {
  const parts = [];
  const base = new THREE.SphereGeometry(0.38 * s, 12, 8);
  base.scale(1.1, 0.45, 0.8);
  base.translate(0, 0.17 * s, 0);
  parts.push(colorize(base, col));
  const body = new THREE.SphereGeometry(0.24 * s, 12, 8);
  body.scale(1, 1.35, 0.85);
  body.translate(0, 0.52 * s, 0);
  parts.push(colorize(body, col));
  const head = new THREE.SphereGeometry(0.13 * s, 12, 8);
  head.translate(0, 0.95 * s, 0);
  parts.push(colorize(head, col));
  return merge(parts);
}

function buildHall() {
  const B = BUILDINGS.hall;
  const p = PADS.hall;
  const k = new Kit();
  const W = B.w, D = B.d, F = B.floor, H = 3.4;
  // platform and steps
  // the stone base reaches right up to the floor, and down into the slope
  k.box(W + 1.6, F + 0.6, D + 1.6, 0, -0.6, 0, STONE, { noise: 0.25 });
  for (let i = 0; i < 2; i++) k.box(B.door.w + 1, F * (0.5 - i * 0.25) + 0.05, 0.5, 0, -0.2, D / 2 + 1.05 + i * 0.5, STONE);
  // floor
  k.box(W, 0.06, D, 0, F - 0.06, 0, WOOD_L);
  floorboards(k, W - 0.15, D - 0.15, F);
  // walls: back, sides, front with a wide door opening; windows as glow strips.
  // Styled after Vietnamese temple halls: ochre walls, round red-brown lacquered
  // columns on stone bases, panelled doors and shutters, a clay-tile roof.
  const y0 = F;
  k.box(W, H, 0.22, 0, y0, -D / 2, OCHRE, { collide: true, noise: 0.12 });
  k.box(0.22, H, D, -W / 2, y0, 0, OCHRE, { collide: true, noise: 0.12 });
  k.box(0.22, H, D, W / 2, y0, 0, OCHRE, { collide: true, noise: 0.12 });
  const side = (W - B.door.w) / 2;
  k.box(side, H, 0.22, -(B.door.w / 2 + side / 2), y0, D / 2, OCHRE, { collide: true, noise: 0.12 });
  k.box(side, H, 0.22, B.door.w / 2 + side / 2, y0, D / 2, OCHRE, { collide: true, noise: 0.12 });
  k.box(B.door.w, 0.9, 0.24, 0, y0 + H - 0.9, D / 2, OCHRE);
  // a low painted dado band around the outside
  for (const sz of [-1, 1]) k.box(W + 0.02, 0.5, 0.02, 0, y0, sz * (D / 2 + 0.115), '#b9935c');
  for (const sx of [-1, 1]) k.box(0.02, 0.5, D + 0.02, sx * (W / 2 + 0.115), y0, 0, '#b9935c');
  // round columns on stone bases, and lacquered beams
  const column = (x, z, r = 0.16) => {
    k.cyl(r + 0.08, r + 0.06, 0.18, x, y0, z, STONE, 10);
    k.cyl(r, r * 0.92, H - 0.18, x, y0 + 0.18, z, LACQUER, 12);
  };
  for (const sx of [-W / 2, -W / 4, 0, W / 4, W / 2]) for (const sz of [-D / 2, D / 2]) if (!(sx === 0 && sz < 0)) column(sx, sz);
  k.box(W + 0.3, 0.3, 0.3, 0, y0 + H, D / 2, LACQUER_D).box(W + 0.3, 0.3, 0.3, 0, y0 + H, -D / 2, LACQUER_D);
  // open veranda: columns and a beam with simple bracket blocks
  for (const sx of [-W / 2, -W / 6, W / 6, W / 2]) {
    column(sx, D / 2 + 1.4, 0.14);
    k.box(0.5, 0.16, 0.2, sx, y0 + H - 0.16, D / 2 + 1.4, LACQUER_D);
  }
  k.box(W + 0.4, 0.22, 0.22, 0, y0 + H, D / 2 + 1.4, LACQUER_D);
  k.box(W + 0.4, 0.06, 1.5, 0, F - 0.06, D / 2 + 0.75, WOOD);
  floorboards(k, W + 0.3, 1.45, F, 0, D / 2 + 0.75);
  shoes(k, -3.3, F + 0.03, D / 2 + 0.9);
  shoes(k, -3.8, F + 0.03, D / 2 + 1.0, '#8f7760');
  shoes(k, 3.4, F + 0.03, D / 2 + 0.85, '#374a48');
  // Front windows with wooden shutters folded open against the wall.
  for (const x of [-4.9, 4.9]) {
    k.box(1.8, 1.3, 0.06, x, F + 1.15, D / 2 + 0.13, LACQUER_D);
    for (const dx of [-0.4, 0, 0.4]) k.box(0.04, 1.1, 0.04, x + dx, F + 1.25, D / 2 + 0.20, LACQUER);
    for (const s of [-1, 1]) {
      const sx = x + s * 1.38;
      k.box(0.88, 1.3, 0.05, sx, F + 1.15, D / 2 + 0.15, SHUTTER, { rough: 0.07 });
      for (let j = 0; j < 7; j++) k.box(0.78, 0.035, 0.03, sx, F + 1.25 + j * 0.16, D / 2 + 0.19, '#6a8090');
    }
  }
  // panelled double doors, folded back beside the wide doorway
  for (const s of [-1, 1]) for (const i of [0, 1]) {
    const dx = s * (B.door.w / 2 + 0.45 + i * 0.86);
    k.box(0.84, 2.45, 0.06, dx, F, D / 2 + 0.15, LACQUER, { rough: 0.06 });
    for (const yy of [0.25, 1.05]) k.box(0.6, 0.62, 0.03, dx, F + yy, D / 2 + 0.19, LACQUER_D);
    k.box(0.6, 0.5, 0.03, dx, F + 1.8, D / 2 + 0.19, '#c9a35c');
  }
  // roof: clay tiles, a ridge with curled ends and a lotus-bud finial
  const RW = W + 3.8, RD = D + 3.6, RH = 2.8, ry = y0 + H + 0.15;
  k.geo((() => { const g = hipRoof(RW, RD, RH, 0.45, TILE, 14); g.translate(0, ry, 0.3); return g; })(), (x, y, z) => vary(C(TILE), 0.06, x, y, z).multiplyScalar(0.92 + Math.sin((Math.abs(z - 0.3) + Math.abs(x) * 0.15) * 14) * 0.05));
  const rw = (RW - RD) / 2, top = ry + RH;
  k.box(rw * 2 + 0.3, 0.26, 0.3, 0, top - 0.06, 0.3, '#7f3f2a');
  for (const s of [-1, 1]) {
    // curled ridge ends, as on Vietnamese temple roofs
    k.geo(new THREE.TorusGeometry(0.32, 0.09, 6, 10, Math.PI * 1.2).rotateZ(-0.2).scale(s, 1, 1).translate(s * (rw + 0.05), top + 0.3, 0.3), '#7f3f2a');
    // hip ridges down to the corners
    for (const sz of [-1, 1]) {
      const a = new THREE.Vector3(s * rw, top, 0.3), b = new THREE.Vector3(s * RW / 2, ry + 0.45, 0.3 + sz * RD / 2);
      const len = a.distanceTo(b);
      const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
      const cg = new THREE.CylinderGeometry(0.09, 0.09, len, 6).rotateX(Math.PI / 2).applyMatrix4(m);
      cg.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      k.geo(cg, '#7f3f2a');
    }
  }
  const bud = new THREE.LatheGeometry([[0, 0], [0.22, 0.02], [0.26, 0.12], [0.2, 0.18], [0.12, 0.22], [0.2, 0.32], [0.24, 0.5], [0.17, 0.7], [0.07, 0.86], [0, 0.95]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
  k.geo(bud.translate(0, top + 0.06, 0.3), (x, y, z) => vary(C(y > top + 0.3 ? '#c9a24a' : '#7f3f2a'), 0.05, x, y, z));
  // ceiling with exposed lacquered beams (so the interior is enclosed)
  k.box(W, 0.08, D, 0, y0 + H, 0, '#8a6a4c');
  for (const x of [-W / 4, 0, W / 4]) k.box(0.22, 0.24, D, x, y0 + H - 0.24, 0, LACQUER_D);
  k.box(W, 0.18, 0.18, 0, y0 + H - 0.42, -D / 2 + 1.8, LACQUER_D);
  // altar
  k.box(3.2, 0.5, 0.9, 0, F, -D / 2 + 0.8, WOOD_D);
  k.box(3.6, 0.08, 1.1, 0, F + 0.5, -D / 2 + 0.8, WOOD);
  const g = new THREE.Group();
  g.add(k.mesh());

  // windows (glow strips on the side walls)
  const winGeo = [];
  for (const x of [-4.9, 4.9]) winGeo.push(new THREE.PlaneGeometry(1.6, 1.1).translate(x, F + 1.8, D / 2 + 0.17));
  for (const sx of [-1, 1]) for (const z of [-2.4, 0, 2.4]) {
    const w = new THREE.PlaneGeometry(1.6, 1.1);
    w.rotateY(sx * Math.PI / 2);
    w.translate(sx * (W / 2 + 0.12), F + 1.7, z);
    winGeo.push(w);
    const wi = w.clone();
    wi.translate(-sx * 0.25, 0, 0);
    wi.rotateY(0);
    winGeo.push(wi);
  }
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    const w = new THREE.PlaneGeometry(1.4, 1.0);
    w.translate(x, F + 1.8, -D / 2 - 0.12);
    winGeo.push(w);
    const wi = w.clone();
    wi.rotateY(Math.PI);
    wi.translate(0, 0, 0);
    winGeo.push(wi.translate(0, 0, 0.25 - (-D / 2 - 0.12) * 0 ));
  }
  const winMesh = new THREE.Mesh(merge(winGeo.map((x) => colorize(x, '#ffffff'))), glow.window);
  g.add(winMesh);

  // cushions in rows across the hall, all facing the altar, with a centre aisle
  // (as in the Plum Village tradition, the sangha sits facing the front of the hall)
  const cols = [-4.5, -3, -1.5, 1.5, 3, 4.5], rows = [-1.6, -0.3, 1.0, 2.3];
  const cushions = new THREE.InstancedMesh(cushionGeo(), paint({}), cols.length * rows.length);
  const o = new THREE.Object3D();
  let n = 0;
  g.userData.cushionSpots = [];
  for (const z of rows) for (const x of cols) {
    o.position.set(x, F, z);
    o.rotation.y = Math.PI; // the round cushion at the back, the mat in front
    o.updateMatrix();
    cushions.setMatrixAt(n++, o.matrix);
    g.userData.cushionSpots.push([x, z + 0.1, 0]); // yaw 0 = facing the altar
  }
  cushions.receiveShadow = true;
  g.add(cushions);

  // altar: a small seated figure, flowers, a candle, and the great bell bowl on its cushion
  const fig = new THREE.Mesh(seatedBuddha(), paint({ side: THREE.DoubleSide }));
  fig.position.set(0, F + 0.58, -D / 2 + 0.62);
  fig.scale.setScalar(1.15);
  fig.castShadow = true;
  g.add(fig);
  // two vases of chrysanthemums, a pair of candles and a small plate of fruit
  const altarTop = F + 0.58, az = -D / 2 + 0.88;
  const flowerMat = paint({ side: THREE.DoubleSide });
  for (const [vx, seed] of [[-0.85, 3], [0.85, 7]]) {
    const v = new THREE.Mesh(vaseBouquetGeo(seed), flowerMat);
    v.position.set(vx, altarTop, az);
    g.add(v);
  }
  for (const cx of [-0.42, 0.42]) {
    const holder = new THREE.Mesh(merge([
      colorize(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12).translate(0, 0.015, 0), BRONZE),
      colorize(new THREE.CylinderGeometry(0.012, 0.016, 0.08, 8).translate(0, 0.07, 0), BRONZE),
      colorize(new THREE.CylinderGeometry(0.026, 0.026, 0.17, 12).translate(0, 0.195, 0), '#f3ead2'),
    ]), paint({}));
    holder.position.set(cx, altarTop, az + 0.05);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6).scale(1, 2, 1), glow.candle);
    flame.position.set(cx, altarTop + 0.31, az + 0.05);
    g.add(holder, flame);
  }
  const fruit = new THREE.Mesh(merge([
    colorize(new THREE.CylinderGeometry(0.16, 0.1, 0.035, 18).translate(0, 0.02, 0), '#d8cfbf'),
    ...[[0, 0], [0.08, 0.04], [-0.07, 0.05], [0.01, -0.07], [0.0, 0.0]].map(([x, z], i) =>
      colorize(new THREE.SphereGeometry(0.048, 12, 10).translate(x, i === 4 ? 0.13 : 0.075, z), i % 2 ? '#e88a2a' : '#f0a02f')),
  ]), paint({}));
  fruit.position.set(0.0, altarTop, az + 0.18);
  g.add(fruit);
  const bowlBell = new THREE.Mesh(colorize(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).rotateX(Math.PI).translate(0, 0.3, 0), BRONZE), paint({ side: THREE.DoubleSide }));
  bowlBell.position.set(-2.2, F, -D / 2 + 1.2);
  g.add(bowlBell);
  const bellCushion = new THREE.Mesh(colorize(new THREE.CylinderGeometry(0.38, 0.4, 0.12, 12).translate(0, 0.06, 0), '#8b2f2a'), paint({}));
  bellCushion.position.copy(bowlBell.position);
  bowlBell.position.y += 0.1;
  g.add(bellCushion);

  // calligraphy boards on the inner walls
  const phrases = ['Just this breath', 'Each step is enough', 'Be still, and listen'];
  phrases.forEach((t, i) => {
    const bd = board(t, 2.2, 0.55, { w: 600, h: 150 });
    if (i === 0) { bd.position.set(0, F + 2.75, -D / 2 + 0.13); }
    else { const sx = i === 1 ? -1 : 1; bd.position.set(sx * (W / 2 - 0.13), F + 2.75, 0); bd.rotation.y = -sx * Math.PI / 2; }
    g.add(bd);
  });

  // warm light inside
  const light = new THREE.PointLight(0xffc98a, 0, 16, 1.6);
  light.position.set(0, F + 2.6, 0);
  g.add(light);
  const lamps = [];
  for (const x of [-3.5, 0, 3.5]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1.3, 1), glow.lamp);
    l.position.set(x, F + 2.8, 0.5);
    g.add(l);
    lamps.push(l);
  }
  place(g, B.x, B.z, B.rot, p.h);
  return {
    group: g, colliders: worldColliders(k.colliders, B.x, B.z, B.rot), light,
    cushionSpots: g.userData.cushionSpots.map(([x, z, r]) => ({ x: B.x + x, z: B.z + z, rot: r, y: p.h + F })),
    playerCushion: { x: B.x - 1.5, z: B.z + 2.4, rot: 0, y: p.h + F },
    altar: { x: B.x, z: B.z - D / 2 + 0.8 }, bowlBell: { x: B.x - 2.2, z: B.z - D / 2 + 1.2 },
  };
}

// --- the tea house (old stone farmhouse) -------------------------------------------

function buildTea() {
  const B = BUILDINGS.tea;
  const p = PADS.tea;
  const k = new Kit();
  const W = B.w, D = B.d, H = 3.0, T = 0.35;
  // Thick stone walls around a real kitchen. The door (front, +z) opens inward
  // before meals so you can look in from the step; you don't walk inside.
  const DX = 1.6, DW = 1.15, DH = 2.15;
  const stone = { noise: 0.45, rough: 0.09 };
  k.box(W, H, T, 0, 0, -D / 2 + T / 2, STONE, stone);
  for (const sx of [-1, 1]) k.box(T, H, D - 2 * T, sx * (W / 2 - T / 2), 0, 0, STONE, stone);
  const l0 = -W / 2, l1 = DX - DW / 2, r0 = DX + DW / 2, r1 = W / 2;
  k.box(l1 - l0, H, T, (l0 + l1) / 2, 0, D / 2 - T / 2, STONE, stone);
  k.box(r1 - r0, H, T, (r0 + r1) / 2, 0, D / 2 - T / 2, STONE, stone);
  k.box(DW, H - DH, T, DX, DH, D / 2 - T / 2, STONE, stone);
  k.box(DW + 0.3, 0.14, 0.12, DX, DH, D / 2 + 0.02, WOOD_D); // lintel beam
  k.box(DW + 0.2, 0.12, 0.5, DX, -0.06, D / 2 + 0.1, '#9d927c'); // worn stone step
  k.colliders.push({ x: 0, z: 0, w: W, d: D, rot: 0 }); // the whole house blocks walking
  k.box(W + 0.25, 0.7, D + 0.25, 0, -0.6, 0, STONE, { noise: 0.5 }); // plinth into the ground
  seatedGable(k, W, D, 1.8, H, TERRACOTTA, (x, y, z) => vary(C(STONE), 0.09, x * 2, y * 2, z * 2), 0.5);
  k.box(0.6, 1.4, 0.6, W / 2 - 1.2, H + 0.6, -0.8, STONE, { noise: 0.4 }); // chimney
  // inside: limewashed walls, a flagstone floor, beams
  const iw = W - 2 * T, id = D - 2 * T, IZ0 = -D / 2 + T;
  k.box(iw, 0.06, id, 0, 0, 0, '#a59a86', { noise: 0.4 });
  k.box(iw, 0.05, id, 0, H - 0.05, 0, '#9a8064');
  for (const x of [-2.4, 0, 2.4]) k.box(0.18, 0.2, id, x, H - 0.25, 0, WOOD_D);
  k.box(iw, H - 0.1, 0.02, 0, 0.05, IZ0 + 0.01, '#e6dcc6', { noise: 0.15 });
  for (const sx of [-1, 1]) k.box(0.02, H - 0.1, id, sx * (iw / 2 - 0.01), 0.05, 0, '#e6dcc6', { noise: 0.15 });
  // a long counter along the back wall, shelves of bowls above it
  const cz = IZ0 + 0.33;
  k.box(4.1, 0.86, 0.6, 0.35, 0, cz, '#7c5f45');
  k.box(4.2, 0.06, 0.66, 0.35, 0.86, cz, '#c4a982', { rough: 0.08 });
  for (const x of [-1.2, -0.2, 0.8, 1.8]) k.box(0.9, 0.62, 0.02, x + 0.05, 0.12, cz + 0.31, '#6a503a');
  k.box(0.8, 0.12, 0.48, -1.0, 0.82, cz, '#9aa3a2'); // stone sink
  k.box(0.7, 0.04, 0.4, -1.0, 0.9, cz, '#59625f');
  for (const y of [1.55, 2.0]) {
    k.box(2.6, 0.05, 0.3, 0.1, y, IZ0 + 0.16, WOOD);
    for (let i = 0; i < 9; i++) {
      const x = -1.05 + i * 0.29;
      if (y > 1.8 && i % 3 === 2) { k.cyl(0.07, 0.08, 0.24, x, y + 0.05, IZ0 + 0.16, i % 2 ? '#b77a4a' : '#6f7f6a', 10); continue; }
      for (let j = 0; j < 3; j++) k.cyl(0.075, 0.11, 0.05, x, y + 0.05 + j * 0.05, IZ0 + 0.16, '#e4dccb', 12); // stacked bowls
    }
  }
  // the stove: a brick range with two big pots, and a hood up to the chimney
  k.box(1.5, 0.82, 0.8, 3.25, 0, IZ0 + 0.42, '#8a563d', { noise: 0.3 });
  k.box(1.56, 0.06, 0.86, 3.25, 0.82, IZ0 + 0.42, '#4b4440');
  k.cyl(0.3, 0.3, 0.42, 2.9, 0.88, IZ0 + 0.42, '#5d6261', 14);
  k.cyl(0.31, 0.29, 0.03, 2.9, 1.3, IZ0 + 0.42, '#454a49', 14);
  k.cyl(0.22, 0.24, 0.3, 3.6, 0.88, IZ0 + 0.42, '#6b6560', 14);
  k.box(0.04, 0.6, 0.04, 3.6, 1.1, IZ0 + 0.42, WOOD_L, { rotY: 0.3 }); // a ladle in the soup
  k.box(1.6, 1.1, 0.9, 3.25, H - 1.15, IZ0 + 0.45, '#d8ccb4');
  k.box(1.7, 0.08, 0.95, 3.25, H - 1.17, IZ0 + 0.47, WOOD_D);
  // the work table in the middle, with the day's vegetables
  const tx = 1.25, tz = -0.75;
  k.box(1.9, 0.06, 0.95, tx, 0.84, tz, '#c9ad85', { rough: 0.08 });
  for (const [dx, dz] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) k.box(0.08, 0.84, 0.08, tx + dx, 0, tz + dz, WOOD_D);
  k.box(1.7, 0.04, 0.8, tx, 0.22, tz, WOOD); // lower shelf
  for (const dx of [-0.45, 0.4]) k.box(0.48, 0.03, 0.3, tx + dx, 0.9, tz - 0.12, '#d7b98a'); // cutting boards
  for (let i = 0; i < 6; i++) k.geo(new THREE.CylinderGeometry(0.018, 0.028, 0.2, 7).rotateZ(Math.PI / 2).rotateY(i * 0.2).translate(tx - 0.5 + (i % 3) * 0.07, 0.95, tz - 0.17 + Math.floor(i / 3) * 0.08), '#e0782c'); // carrots
  for (let i = 0; i < 5; i++) k.box(0.045, 0.012, 0.045, tx - 0.3 + i * 0.05, 0.93, tz - 0.05, '#e0782c'); // sliced
  for (let i = 0; i < 4; i++) k.box(0.14, 0.07, 0.1, tx + 0.28 + (i % 2) * 0.16, 0.93, tz - 0.14 + Math.floor(i / 2) * 0.11, '#f2ecd8'); // tofu
  for (let i = 0; i < 4; i++) k.geo(new THREE.SphereGeometry(0.1, 9, 6).scale(1, 0.55, 0.8).translate(tx + 0.75, 0.94 + i * 0.03, tz + 0.15 - i * 0.07), i % 2 ? '#5f8b3a' : '#79a24a'); // greens
  k.geo(new THREE.SphereGeometry(0.22, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).rotateX(Math.PI).translate(tx - 0.2, 1.1, tz + 0.25), '#d8cdb7'); // a big bowl
  for (let i = 0; i < 6; i++) k.geo(new THREE.SphereGeometry(0.04, 8, 5).scale(1, 0.6, 1).translate(tx - 0.27 + (i % 3) * 0.07, 1.02, tz + 0.2 + Math.floor(i / 3) * 0.08), '#b89a72'); // mushrooms
  // stores: rice sacks, a crate of squash, a water jar
  for (const [x, z] of [[-3.3, IZ0 + 0.5], [-2.8, IZ0 + 0.45]]) k.geo(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 10).translate(x, 0.35, z), '#d6c7a1');
  k.box(0.8, 0.35, 0.5, -3.1, 0, 0.6, WOOD);
  for (let i = 0; i < 3; i++) k.geo(new THREE.SphereGeometry(0.15, 10, 7).scale(1, 0.8, 1).translate(-3.35 + i * 0.25, 0.42, 0.6), '#d38a33');
  k.geo(new THREE.SphereGeometry(0.3, 12, 9).scale(1, 1.25, 1).translate(-1.9, 0.38, IZ0 + 0.4), '#7a5a3c');
  // a rail of hanging ladles and a basket over the table
  k.box(1.6, 0.03, 0.03, tx, 2.25, tz, '#3d3530');
  for (let i = 0; i < 4; i++) k.box(0.03, 0.4, 0.03, tx - 0.6 + i * 0.4, 1.85, tz, '#4e4842');
  // door and shutters on the front (+z) side
  for (const x of [-2.6, -0.6]) {
    k.box(0.45, 1.1, 0.06, x - 0.5, 1.1, D / 2 + 0.04, SHUTTER).box(0.45, 1.1, 0.06, x + 0.5, 1.1, D / 2 + 0.04, SHUTTER);
  }
  // terrace: paving, two tables with benches, a low stone wall
  k.box(W + 2, 0.12, 4, 0, -0.05, D / 2 + 2.2, '#b7ab93', { noise: 0.3 });
  for (const x of [-2.2, 2.0]) {
    k.box(1.2, 0.06, 0.8, x, 0.72, D / 2 + 2.3, WOOD_L, { collide: true });
    floorboards(k, 1.2, 0.8, 0.78, x, D / 2 + 2.3);
    // The pale edge is a worn repair, beside a tea-stained tabletop.
    k.box(0.08, 0.006, 0.62, x - 0.48, 0.807, D / 2 + 2.3, '#bd956b');
    k.geo(new THREE.TorusGeometry(0.09, 0.004, 3, 14).rotateX(Math.PI / 2).translate(x + 0.35, 0.81, D / 2 + 2.08), '#785b3d');
    teaSet(k, x - 0.05, 0.813, D / 2 + 2.3);
    k.box(0.1, 0.72, 0.1, x - 0.5, 0, D / 2 + 2.0, WOOD_D).box(0.1, 0.72, 0.1, x + 0.5, 0, D / 2 + 2.6, WOOD_D);
    k.box(1.2, 0.06, 0.3, x, 0.42, D / 2 + 1.6, WOOD_L).box(1.2, 0.06, 0.3, x, 0.42, D / 2 + 3.0, WOOD_L);
  }
  k.box(0.5, 0.6, 4.2, -W / 2 - 1.1, 0, D / 2 + 2.2, STONE, { collide: true, noise: 0.4 });
  const g = new THREE.Group();
  g.add(k.mesh());
  const win = [];
  for (const x of [-2.6, -0.6]) win.push(colorize(new THREE.PlaneGeometry(0.85, 1.0).translate(x, 1.65, D / 2 + 0.03), '#fff'));
  g.add(new THREE.Mesh(merge(win), glow.window));
  const sign = board('A cup of tea, a quiet friend', 2.4, 0.42, { w: 700, h: 122, paper: '#d9c9a6' });
  sign.position.set(-1.6, 2.55, D / 2 + 0.06);
  g.add(sign);
  const quiet = board('Cooks in silence', 0.62, 0.3, { w: 300, h: 140, paper: '#e6dcc4' });
  quiet.position.set(DX + DW / 2 + 0.42, 1.55, D / 2 + 0.06);
  g.add(quiet);
  // the door leaf, hinged on its right side; it swings inward, toward the stove,
  // leaving the view of the work table clear
  const dk = new Kit();
  dk.box(DW - 0.04, DH - 0.03, 0.07, -(DW - 0.04) / 2, 0, 0, WOOD_D, { rough: 0.07 });
  for (const yy of [0.2, 1.15]) dk.box(DW - 0.3, 0.75, 0.02, -(DW - 0.04) / 2, yy, 0.045, '#5a4030');
  dk.box(0.04, 0.12, 0.05, -(DW - 0.18), 1.0, 0.07, '#2e2a26');
  const door = dk.mesh();
  door.position.set(DX + DW / 2 - 0.02, 0, D / 2 - T + 0.06);
  g.add(door);
  // a warm light inside, and steam rising from the pots
  const kitchenLight = new THREE.PointLight(0xffc68a, 0, 7, 1.5);
  kitchenLight.position.set(1.4, 2.4, -0.9);
  g.add(kitchenLight);
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: 0.0, depthWrite: false });
  const steam = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), steamMat);
    m.userData = { x: i % 2 ? 2.9 : 3.6, z: IZ0 + 0.42, base: i % 2 ? 1.36 : 1.2, off: i / 8 };
    g.add(m);
    steam.push(m);
  }
  const light = new THREE.PointLight(0xffc98a, 0, 10, 1.8);
  light.position.set(-1, 2.2, D / 2 + 1.5);
  g.add(light);
  place(g, B.x, B.z, B.rot, p.h);
  const c = Math.cos(B.rot), s = Math.sin(B.rot);
  const local = (x, z) => ({ x: B.x + x * c + z * s, z: B.z - x * s + z * c });
  let open = 0, target = 0;
  const cook = (x, z, face) => ({ ...local(x, z), yaw: B.rot + face });
  return {
    group: g, colliders: worldColliders(k.colliders, B.x, B.z, B.rot), light,
    floorY: p.h + 0.06,
    spots: {
      table: local(-2.2, D / 2 + 2.3), table2: local(2.0, D / 2 + 2.3), door: local(DX, D / 2 + 0.8),
      wall: local(-W / 2 - 1.1, D / 2 + 2.2), front: local(0, D / 2 + 4.6),
      peek: { ...local(DX, D / 2 + 1.05), yaw: B.rot },
      // stirring at the stove, chopping at the table (facing the door), washing at the sink
      cooks: [cook(3.05, IZ0 + 1.15, 0), cook(tx - 0.25, tz - 0.85, Math.PI), cook(-1.0, IZ0 + 1.0, 0)],
    },
    /** Cooks are at work: open the door, light the kitchen, let the pots steam. */
    setCooking(on) { target = on ? 1 : 0; kitchenLight.intensity = on ? 3.2 : 0; steamMat.opacity = 0.22; steam.forEach((m) => { m.visible = on; }); },
    get cooking() { return target === 1; },
    update(dt, t) {
      open += (target - open) * Math.min(1, dt * 1.5);
      door.rotation.y = -open * Math.PI * 0.47;
      if (!target) return;
      for (const m of steam) {
        const u = (t * 0.25 + m.userData.off) % 1;
        m.position.set(m.userData.x + Math.sin(t + m.userData.off * 9) * 0.08 * u, m.userData.base + u * 1.0, m.userData.z + 0.1 * u);
        m.scale.setScalar(0.6 + u * 1.6);
      }
    },
  };
}

// --- your hut ------------------------------------------------------------------------------

function buildHut() {
  const B = BUILDINGS.hut;
  const p = PADS.hut;
  const k = new Kit();
  const W = B.w, D = B.d, F = B.floor, H = 2.5;
  // stone footing up to the floor (no gap under the walls), sunk into the ground
  k.box(W + 0.6, F + 0.55, D + 0.6, 0, -0.55, 0, STONE, { noise: 0.3 });
  k.box(W + 0.16, 0.12, D + 0.16, 0, F - 0.06, 0, WOOD_D); // sill beam under the walls
  k.box(W, 0.05, D, 0, F - 0.05, 0, WOOD_L);
  floorboards(k, W - 0.1, D - 0.1, F);
  k.box(W, H, 0.15, 0, F, D / 2, WOOD_L, { collide: true });
  k.box(0.15, H, D, -W / 2, F, 0, WOOD_L, { collide: true });
  k.box(0.15, H, D, W / 2, F, 0, WOOD_L, { collide: true });
  const sw = (W - B.door.w) / 2;
  k.box(sw, H, 0.15, -(B.door.w / 2 + sw / 2), F, -D / 2, WOOD_L, { collide: true });
  k.box(sw, H, 0.15, B.door.w / 2 + sw / 2, F, -D / 2, WOOD_L, { collide: true });
  k.box(B.door.w, 0.4, 0.16, 0, F + H - 0.4, -D / 2, WOOD_L);
  seatedGable(k, W, D, 1.2, F + H, '#5c4a3a', (x, y, z) => vary(C(WOOD_L), 0.06, x, y, z), 0.5);
  // a wall plate along the eaves and a ceiling, so from inside the walls meet the roof
  for (const sz of [-1, 1]) k.box(W + 0.1, 0.14, 0.22, 0, F + H - 0.1, sz * D / 2, WOOD_D);
  k.box(W, 0.06, D, 0, F + H - 0.06, 0, '#7a5c44');
  for (const x of [-W / 4, W / 4]) k.box(0.12, 0.12, D, x, F + H - 0.18, 0, WOOD_D);
  // inside: futon, desk, darkroom curtain
  k.box(1.0, 0.18, 2.0, -W / 2 + 0.7, F, 0.6, '#d9d2c2').box(1.0, 0.08, 0.5, -W / 2 + 0.7, F + 0.18, 1.3, '#4a5a7a');
  k.box(1.1, 0.35, 0.6, W / 2 - 0.8, F, 1.2, WOOD_D);
  // A partly drawn curtain lets the tiny working darkroom remain legible.
  k.box(0.05, 1.85, 0.18, W / 2 - 1.35, F, -1.70, '#4b3b42');
  // Personal everyday things: a folded quilt, notebook, cup and boots.
  k.box(0.82, 0.06, 0.48, -W / 2 + 0.7, F + 0.26, 0.28, '#87958b');
  k.box(0.25, 0.035, 0.32, W / 2 - 0.8, F + 0.35, 1.2, '#718d86', { rotY: 0.13 });
  k.box(0.21, 0.008, 0.28, W / 2 - 0.8, F + 0.386, 1.2, '#d6ceb6', { rotY: 0.13 });
  k.cyl(0.055, 0.06, 0.09, W / 2 - 1.1, F + 0.35, 1.15, '#d8c3a1', 10);
  shoes(k, -0.7, F + 0.03, -D / 2 + 0.5);
  // Bench with real equipment silhouettes: enlarger, trays, tongs and film.
  const bx = W / 2 - 0.46;
  k.box(0.72, 0.07, 1.45, bx, F + 0.73, -0.72, '#ae9781');
  for (const z of [-1.3, -0.15]) k.box(0.06, 0.73, 0.06, bx + 0.22, F, z, WOOD_D);
  k.box(0.42, 0.035, 0.42, bx - 0.05, F + 0.80, -1.1, '#373d3d');
  k.box(0.045, 0.73, 0.055, bx + 0.20, F + 0.82, -1.24, '#505a56');
  k.box(0.32, 0.24, 0.30, bx, F + 1.35, -1.14, '#343b3b');
  k.cyl(0.065, 0.07, 0.12, bx, F + 1.23, -1.14, '#1e2625', 10);
  k.box(0.28, 0.006, 0.32, bx - 0.05, F + 0.837, -1.1, '#d9cfb8');
  for (const z of [-0.62, -0.20]) {
    k.box(0.48, 0.05, 0.32, bx, F + 0.80, z, '#ded9c6');
    k.box(0.42, 0.008, 0.26, bx, F + 0.85, z, '#84958d');
  }
  for (const dx of [-0.025, 0.025]) k.box(0.012, 0.018, 0.23, bx - 0.15 + dx, F + 0.87, -0.16, '#c7b47b', { rotY: dx * 7 });
  k.box(0.65, 0.012, 0.012, bx, F + 1.96, -1.63, '#b7ad98');
  for (let i = 0; i < 3; i++) {
    const x = bx - 0.22 + i * 0.22;
    k.box(0.13, 0.4 - i * 0.035, 0.008, x, F + 1.52 + i * 0.035, -1.63, '#593a2b');
    for (let j = 0; j < 3; j++) k.box(0.09, 0.07, 0.01, x, F + 1.55 + j * 0.11, -1.62, j % 2 ? '#a58c62' : '#8b775a');
    k.box(0.035, 0.06, 0.025, x, F + 1.93, -1.63, '#b3a181');
  }
  const g = new THREE.Group();
  g.add(k.mesh());
  const win = colorize(new THREE.PlaneGeometry(0.8, 0.6).rotateY(Math.PI / 2).translate(W / 2 + 0.09, F + 1.4, -0.2), '#fff');
  g.add(new THREE.Mesh(merge([win, colorize(new THREE.PlaneGeometry(0.8, 0.6).rotateY(-Math.PI / 2).translate(-W / 2 - 0.09, F + 1.4, -0.4), '#fff')]), glow.window));
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.16), glow.lamp);
  lamp.position.set(W / 2 - 0.5, F + 0.48, 1.2);
  g.add(lamp);
  const safelight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc0302a }));
  safelight.position.set(W / 2 - 0.9, F + 2.1, -0.9);
  g.add(safelight);
  const safeGlow = new THREE.PointLight(0xff7252, 0.85, 3.2, 1.3);
  safeGlow.position.set(W / 2 - 0.6, F + 1.8, -0.8);
  g.add(safeGlow);
  const light = new THREE.PointLight(0xffc98a, 0, 7, 1.8);
  light.position.set(0, F + 1.9, 0.4);
  g.add(light);
  place(g, B.x, B.z, B.rot, p.h);
  const c = Math.cos(B.rot), s = Math.sin(B.rot);
  const local = (x, z) => ({ x: B.x + x * c + z * s, z: B.z - x * s + z * c });
  return {
    group: g, colliders: worldColliders(k.colliders, B.x, B.z, B.rot), light,
    spots: { futon: local(-W / 2 + 0.7, 0.6), desk: local(W / 2 - 0.8, 1.2), darkroom: local(W / 2 - 1.0, -0.9), door: local(0, -D / 2 - 1.2) },
  };
}

// --- bridge, benches, lamps ------------------------------------------------------------------

function buildBridge(B = BRIDGE, railCol = '#8e3b2c') {
  const { x0, z0, x1, z1, width } = B;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(z1 - z0, x1 - x0);
  const parts = [];
  const n = Math.ceil(len / 0.32);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    const y = bridgeHeight(x, z);
    const g = new THREE.BoxGeometry(0.28, 0.08, width);
    g.rotateY(-ang);
    g.translate(x, y - 0.04, z);
    parts.push(colorize(g, (px, py, pz) => vary(C(i % 3 ? WOOD_L : '#8f6d4f'), 0.06, px * 3, py, pz * 3)));
    if (i % 4 === 0) {
      for (const s of [-1, 1]) {
        const px = x + Math.sin(ang) * s * (width / 2 - 0.05) * -1, pz = z + Math.cos(ang) * s * (width / 2 - 0.05);
        const post = new THREE.BoxGeometry(0.1, 0.9, 0.1);
        post.translate(px, y + 0.45, pz);
        parts.push(colorize(post, WOOD));
        const foot = heightAt(px, pz) - 0.3;
        const leg = new THREE.BoxGeometry(0.14, Math.max(0.2, y - foot), 0.14);
        leg.translate(px, (y + foot) / 2, pz);
        parts.push(colorize(leg, WOOD_D));
      }
    }
  }
  // handrails following the arch
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1;
      const ay = bridgeHeight(ax, az) + 0.88, by = bridgeHeight(bx, bz) + 0.88;
      const off = [-Math.sin(ang) * s * (width / 2 - 0.05), Math.cos(ang) * s * (width / 2 - 0.05)];
      const seg = new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(bx - ax, by - ay, bz - az), 5);
      seg.rotateZ(Math.PI / 2);
      const pitch = Math.atan2(by - ay, Math.hypot(bx - ax, bz - az));
      seg.rotateZ(pitch);
      seg.rotateY(-ang);
      seg.translate((ax + bx) / 2 + off[0], (ay + by) / 2, (az + bz) / 2 + off[1]);
      parts.push(colorize(seg, railCol));
    }
  }
  const m = new THREE.Mesh(merge(parts), paint({}));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function bench(x, z, rot) {
  const k = new Kit();
  k.box(1.6, 0.07, 0.42, 0, 0.42, 0, WOOD_L).box(0.1, 0.42, 0.38, -0.65, 0, 0, WOOD_D).box(0.1, 0.42, 0.38, 0.65, 0, 0, WOOD_D);
  const m = k.mesh();
  place(m, x, z, rot, heightAt(x, z));
  return { mesh: m, collider: { x, z, w: 1.6, d: 0.5, rot } };
}

function pathLamp(x, z) {
  const k = new Kit();
  k.box(0.22, 0.9, 0.22, 0, 0, 0, STONE, { noise: 0.3 }).box(0.42, 0.08, 0.42, 0, 1.2, 0, STONE);
  k.geo(new THREE.ConeGeometry(0.34, 0.24, 4).rotateY(Math.PI / 4).translate(0, 1.4, 0), STONE);
  const g = new THREE.Group();
  g.add(k.mesh());
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), glow.lamp);
  l.position.y = 1.04;
  g.add(l);
  place(g, x, z, 0, heightAt(x, z));
  return g;
}

export function buildAll() {
  const group = new THREE.Group();
  const colliders = [];
  const gate = buildGate();
  const tower = buildTower();
  const hall = buildHall();
  const tea = buildTea();
  const hut = buildHut();
  for (const b of [gate, tower, hall, tea, hut]) { group.add(b.group); colliders.push(...b.colliders); }
  group.add(buildBridge());
  group.add(buildBridge(FOOTBRIDGE, '#6e4f38'));
  const benches = [[-8, 6, 1.2], [18, 20, -2.1], [6, -4.5, 0], [-12, -33, 0.6], [-6, 33, 0.8]].map(([x, z, r]) => bench(x, z, r));
  benches.forEach((b) => { group.add(b.mesh); colliders.push(b.collider); });
  const lamps = [[3, -26], [-1, -6], [-6, 4], [-5, 22], [-9, 32], [15, 32], [5, -50], [-4, -38], [21, 8]].map(([x, z]) => pathLamp(x, z));
  lamps.forEach((l) => group.add(l));
  return {
    group, colliders, tower, hall, tea, hut,
    benches: benches.map((b) => ({ x: b.collider.x, z: b.collider.z, rot: b.collider.rot })),
    lights: [hall.light, tea.light, hut.light],
  };
}

/** Night glow: windows and lamps light up as daylight fades. */
export function updateGlow(built, atm, timeName) {
  const night = timeName === 'night' ? 1 : timeName === 'evening' ? 0.75 : timeName === 'dawn' ? 0.6 : 0;
  // by day, paper windows look like pale paper; by night they glow amber
  const day = new THREE.Color('#c3b18e'), lit = new THREE.Color('#f2a24a');
  glow.window.color.copy(day).lerp(lit, night);
  glow.lamp.color.copy(new THREE.Color('#b8ab90')).lerp(new THREE.Color('#ffb860'), night);
  for (const l of built.lights) l.intensity = night * 6 + 0.4;
}
