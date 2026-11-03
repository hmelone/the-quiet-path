// Trees, bushes, grass, ferns, flowers and stones: instanced, wind-swayed,
// shaded softly so crowns read as painted masses rather than polygons.
import * as THREE from 'three';
import { Rng, fbm2, smoothstep } from '../core/rng.js';
import { colorize, jitter, radialNormals, merge, vary } from './geo.js';
import { paint } from './materials.js';
import { heightAt, polyDist, onBridge } from './terrain.js';
import { PATHS, PADS, pondDist, STREAM, BUILDINGS, BOUNDS } from './layout.js';
import { inBuilding } from './terrain.js';

const C = (h) => new THREE.Color(h);

// --- geometries ---------------------------------------------------------------

function trunkGeo(h, r0, r1, col, lean = 0) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 7, 3);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) + lean * (y / h) * (y / h));
  }
  return colorize(g, (x, y, z, c) => vary(col, 0.06, x * 4, y, z * 4));
}

export function cedarGeo(seed = 1) {
  const rng = new Rng(`cedar${seed}`);
  const parts = [trunkGeo(4, 0.3, 0.18, C('#6b4532'))];
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = 2.0 * (1 - t * 0.78) + rng.range(-0.15, 0.15);
    const h = 3.2 - t * 1.2;
    const y = 2.6 + t * 9.5;
    const g = new THREE.ConeGeometry(r, h, 9, 2, true);
    g.translate(rng.g() * 0.15, y + h / 2, rng.g() * 0.15);
    jitter(g, 0.35, 1.3, seed + i);
    radialNormals(g, 0, y + h * 0.15, 0, 0.6);
    parts.push(colorize(g, (x, yy, z, c) => {
      const tip = (yy - y) / h;
      return vary(C('#24402f').lerp(C('#4d7148'), 0.25 + tip * 0.35 + (x + z) * 0.03), 0.07, x, yy, z, seed);
    }));
  }
  return merge(parts);
}

export function broadTreeGeo(seed, palette, { height = 6, spread = 3.2, trunkCol = '#5a4334' } = {}) {
  const rng = new Rng(`broad${seed}`);
  const lean = rng.g() * 0.6;
  const parts = [trunkGeo(height * 0.6, 0.28, 0.14, C(trunkCol), lean)];
  const blobs = 7;
  const cy = height * 0.72;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rng.f();
    const rr = i === 0 ? 0 : spread * rng.range(0.35, 0.6);
    const r = spread * rng.range(0.42, 0.6) * (i === 0 ? 1.2 : 1);
    const g = new THREE.IcosahedronGeometry(r, 2);
    g.scale(1, rng.range(0.7, 0.85), 1);
    const bx = Math.cos(a) * rr + lean, bz = Math.sin(a) * rr, by = cy + rng.range(-0.4, 0.8) + (i === 0 ? 0.6 : 0);
    g.translate(bx, by, bz);
    jitter(g, 0.5, 1.1, seed * 3 + i);
    radialNormals(g, lean, cy, 0, 0.8);
    const base = C(rng.pick(palette));
    parts.push(colorize(g, (x, y, z) => {
      const lit = (y - cy) / (spread * 1.2) + (x + z) * 0.05;
      return vary(base.clone().multiplyScalar(0.82 + lit * 0.28), 0.09, x * 1.5, y * 1.5, z * 1.5, seed);
    }));
  }
  return merge(parts);
}

function bushGeo(seed, col, flowers) {
  const rng = new Rng(`bush${seed}`);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.IcosahedronGeometry(rng.range(0.5, 0.8), 1);
    g.scale(1, 0.7, 1);
    g.translate(rng.g() * 0.5, 0.45 + rng.f() * 0.2, rng.g() * 0.5);
    jitter(g, 0.3, 2, seed + i);
    radialNormals(g, 0, 0.3, 0, 0.8);
    parts.push(colorize(g, (x, y, z) => {
      const f = flowers && y > 0.55 && fbm2(x * 4, z * 4 + y * 3, seed) > 0.55;
      return f ? vary(C(flowers), 0.08, x, y, z) : vary(C(col).multiplyScalar(0.8 + y * 0.3), 0.1, x * 3, y * 3, z * 3);
    }));
  }
  return merge(parts);
}

function grassGeo() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI + 0.3;
    const g = new THREE.BufferGeometry();
    const w = 0.06, h = 0.38 + (i % 3) * 0.1, lean = 0.08;
    const cx = Math.cos(a), cz = Math.sin(a);
    const pos = [-w * cx, 0, -w * cz, w * cx, 0, w * cz, lean * cz, h, -lean * cx];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    parts.push(colorize(g, (x, y) => C('#3d5a28').lerp(C('#8fa452'), Math.min(1, y / h))));
  }
  return merge(parts);
}

function fernGeo() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const g = new THREE.PlaneGeometry(0.22, 0.9, 1, 3);
    g.translate(0, 0.45, 0);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      p.setZ(k, p.getZ(k) + y * y * 0.5);
      p.setX(k, p.getX(k) * (1 - y * 0.8));
    }
    g.rotateX(-0.9);
    g.rotateY(a);
    radialNormals(g, 0, -0.3, 0);
    parts.push(colorize(g, (x, y) => C('#3f6a2c').lerp(C('#7fa64a'), y * 1.2)));
  }
  return merge(parts);
}

function stoneGeo(seed) {
  const g = new THREE.DodecahedronGeometry(1, 1);
  g.scale(1, 0.6, 0.85);
  jitter(g, 0.35, 1.5, seed);
  g.computeVertexNormals();
  return colorize(g, (x, y, z) => (y > 0.25 && fbm2(x * 3, z * 3, seed) > 0.4 ? vary(C('#5d7c3a'), 0.1, x, y, z) : vary(C('#8a877c'), 0.08, x * 2, y * 2, z * 2)));
}

function lavenderGeo() {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = 0.18 + (i % 2) * 0.12;
    const s = new THREE.CylinderGeometry(0.012, 0.012, 0.55, 3);
    s.translate(Math.cos(a) * r, 0.27, Math.sin(a) * r);
    parts.push(colorize(s, C('#5c7a4a')));
    const f = new THREE.CylinderGeometry(0.04, 0.03, 0.18, 5);
    f.translate(Math.cos(a) * r * 1.1, 0.62, Math.sin(a) * r * 1.1);
    parts.push(colorize(f, C('#7d6bb5')));
  }
  const base = new THREE.IcosahedronGeometry(0.35, 1);
  base.scale(1, 0.6, 1);
  base.translate(0, 0.18, 0);
  parts.push(colorize(base, C('#6e8a5e')));
  return merge(parts);
}

function reedGeo() {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const g = new THREE.ConeGeometry(0.03, 1.2 + (i % 3) * 0.3, 3);
    g.translate(Math.cos(i * 2.4) * 0.25, 0.6, Math.sin(i * 2.4) * 0.25);
    parts.push(colorize(g, (x, y) => C('#4e6b34').lerp(C('#9aa65c'), y * 0.6)));
  }
  // a few iris flowers
  for (let i = 0; i < 1; i++) {
    const f = new THREE.IcosahedronGeometry(0.08, 0);
    f.translate(Math.cos(i * 3) * 0.2, 1.1 + i * 0.15, Math.sin(i * 3) * 0.2);
    parts.push(colorize(f, C('#6650a8')));
  }
  return merge(parts);
}

// --- placement ------------------------------------------------------------------

function near(pts, x, z, d) { return polyDist(pts, x, z) < d; }

/** Is a spot free for planting (not a path, building, water...)? */
export function freeSpot(x, z, margin = 1) {
  if (x < BOUNDS.x0 + 2 || x > BOUNDS.x1 - 2 || z < BOUNDS.z0 + 2 || z > BOUNDS.z1 - 2) return false;
  for (const p of PATHS) if (near(p.pts, x, z, p.width / 2 + margin)) return false;
  for (const [k, p] of Object.entries(PADS)) {
    if (k === 'pond') continue;
    if (Math.hypot(x - p.x, z - p.z) < p.r * 0.75 + margin) return false;
  }
  for (const b of Object.values(BUILDINGS)) if (inBuilding(b, x, z, 2 + margin)) return false;
  if (pondDist(x, z) < 1.25) return false;
  if (near(STREAM, x, z, 1.6 + margin * 0.5)) return false;
  if (onBridge(x, z)) return false;
  return true;
}

function instanced(geo, mat, items, { shadow = true, colorJitter = 0.06 } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z);
    o.rotation.set(0, it.rot || 0, 0);
    o.scale.setScalar(it.s || 1);
    if (it.sy) o.scale.y = it.sy * (it.s || 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    const k = 1 + (Math.sin(it.x * 12.9 + it.z * 78.2) * 0.5) * colorJitter * 2;
    m.setColorAt(i, c.setRGB(k, k, k * (1 + colorJitter * 0.3)));
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
}

/** Build all vegetation. Returns { group, obstacles: [{x,z,r}] }. */
export function buildFoliage(tier) {
  const rng = new Rng('foliage');
  const group = new THREE.Group();
  const obstacles = [];
  const dens = tier.trees;

  // cedars: forested slopes and around the gate
  const cedarItems = [];
  for (let i = 0; i < 2600 * dens; i++) {
    const x = rng.range(BOUNDS.x0, BOUNDS.x1), z = rng.range(BOUNDS.z0, BOUNDS.z1);
    const forest = smoothstep(18, 34, Math.abs(x)) + smoothstep(-28, -50, z) * smoothstep(8, 3, Math.abs(x - 2) * 0.25) + smoothstep(-30, -55, z);
    const patch = fbm2(x * 0.04, z * 0.04, 11);
    if (rng.f() > Math.min(1, forest) * (0.4 + patch)) continue;
    if (!freeSpot(x, z, 3)) continue;
    const s = rng.range(0.8, 1.35) * (1 + Math.min(1, Math.abs(x) / 90) * 0.4);
    cedarItems.push({ x, y: heightAt(x, z) - 0.2, z, s, rot: rng.f() * 6 });
    if (Math.abs(x) < 40 && z > -80) obstacles.push({ x, z, r: 0.6 });
  }
  const cedarGeos = [cedarGeo(1), cedarGeo(2)];
  const cedarMat = paint({ sway: 0.22, swayHeight: 14 });
  // only trees near the walkable valley cast shadows (much cheaper on phones)
  const nearValley = (it) => Math.abs(it.x) < 34 && it.z > -84 && it.z < 64;
  cedarGeos.forEach((g, k) => {
    const mine = cedarItems.filter((_, i) => i % 2 === k);
    group.add(instanced(g, cedarMat, mine.filter(nearValley), { shadow: true }));
    const far = mine.filter((it) => !nearValley(it));
    if (far.length) group.add(instanced(g, cedarMat, far, { shadow: false }));
  });

  // maples & broadleaf trees around the valley floor
  const mapleGreens = ['#6f9a3e', '#83a84a', '#5f8a3a', '#9ab35a'];
  const mapleReds = ['#9b3a2a', '#b2502e', '#7f3324'];
  const broadItems = [[], [], []];
  for (let i = 0; i < 700 * dens; i++) {
    const x = rng.range(-60, 60), z = rng.range(-70, 62);
    const valley = 1 - smoothstep(30, 50, Math.abs(x));
    if (rng.f() > valley * 0.6) continue;
    if (!freeSpot(x, z, 4.5)) continue;
    if (x < -20 && z > 22) continue; // orchard
    const kind = rng.f() < 0.22 ? 2 : rng.f() < 0.5 ? 1 : 0;
    broadItems[kind].push({ x, y: heightAt(x, z) - 0.1, z, s: rng.range(0.75, 1.25), rot: rng.f() * 6 });
    obstacles.push({ x, z, r: 0.5 });
  }
  const broadMat = paint({ sway: 0.3, swayHeight: 6 });
  group.add(instanced(broadTreeGeo(1, mapleGreens), broadMat, broadItems[0]));
  group.add(instanced(broadTreeGeo(2, mapleGreens, { height: 7, spread: 3.6 }), broadMat, broadItems[1]));
  group.add(instanced(broadTreeGeo(3, mapleReds, { height: 5, spread: 2.8 }), broadMat, broadItems[2]));

  // plum orchard in rows
  const plumItems = [];
  for (let gx = -46; gx <= -22; gx += 4.8) {
    for (let gz = 24; gz <= 58; gz += 5.2) {
      const x = gx + rng.g() * 0.5, z = gz + rng.g() * 0.5;
      if (!freeSpot(x, z, 1.2)) continue;
      plumItems.push({ x, y: heightAt(x, z) - 0.05, z, s: rng.range(0.85, 1.1), rot: rng.f() * 6 });
      obstacles.push({ x, z, r: 0.45 });
    }
  }
  group.add(instanced(broadTreeGeo(7, ['#7fa04c', '#91b05a', '#6c9244'], { height: 4.2, spread: 2.4, trunkCol: '#4a3a30' }), broadMat, plumItems));
  group.userData.plums = plumItems;

  // bushes (azaleas near the hall and pond, some with flowers)
  const bushItems = [[], []];
  for (let i = 0; i < 500 * dens; i++) {
    const x = rng.range(-35, 35), z = rng.range(-30, 55);
    if (!freeSpot(x, z, 0.8)) continue;
    const nearFeature = Math.min(Math.hypot(x - 3, z + 16) / 18, pondDist(x, z) / 2.2, Math.hypot(x + 16, z - 40) / 14);
    if (rng.f() > (1 - nearFeature) * 0.9) continue;
    bushItems[rng.f() < 0.4 ? 1 : 0].push({ x, y: heightAt(x, z) - 0.1, z, s: rng.range(0.7, 1.3), rot: rng.f() * 6 });
  }
  const bushMat = paint({ sway: 0.08, swayHeight: 1.2 });
  group.add(instanced(bushGeo(1, '#4d6b38', null), bushMat, bushItems[0]));
  group.add(instanced(bushGeo(2, '#4f6d3a', '#d97b93'), bushMat, bushItems[1]));

  // ferns along the forest path and stream
  const fernItems = [];
  for (let i = 0; i < 1400 * dens; i++) {
    const x = rng.range(-40, 40), z = rng.range(-80, 10);
    const by = near(PATHS[0].pts, x, z, 6) || near(STREAM, x, z, 4) || Math.abs(x) > 18;
    if (!by || !freeSpot(x, z, 0.3)) continue;
    fernItems.push({ x, y: heightAt(x, z) - 0.05, z, s: rng.range(0.7, 1.5), rot: rng.f() * 6 });
  }
  group.add(instanced(fernGeo(), paint({ sway: 0.12, swayHeight: 1, side: THREE.DoubleSide }), fernItems, { shadow: false }));

  // stones: mossy rocks scattered, and along the stream
  const stoneItems = [];
  for (let i = 0; i < 520 * dens; i++) {
    const onStream = rng.f() < 0.3;
    let x, z;
    if (onStream) {
      const p = STREAM[rng.int(0, STREAM.length - 2)], q = STREAM[STREAM.indexOf(p) + 1];
      const t = rng.f();
      x = p[0] + (q[0] - p[0]) * t + rng.g() * 2.4;
      z = p[1] + (q[1] - p[1]) * t + rng.g() * 2.4;
    } else {
      x = rng.range(-70, 70); z = rng.range(-85, 70);
    }
    if (!onStream && !freeSpot(x, z, 0.4)) continue;
    const s = rng.range(0.25, onStream ? 0.7 : 1.4);
    stoneItems.push({ x, y: heightAt(x, z) - s * 0.25, z, s, rot: rng.f() * 6 });
    if (s > 0.6) obstacles.push({ x, z, r: s * 0.9 });
  }
  group.add(instanced(stoneGeo(3), paint({}), stoneItems));

  // lavender rows by the tea house (the French farmhouse touch)
  const lavItems = [];
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 14; k++) {
      const x = -8 + k * 0.85, z = 45 + row * 1.6;
      if (!freeSpot(x, z, 0.2)) continue;
      lavItems.push({ x, y: heightAt(x, z), z, s: 0.9 + ((k * 7 + row) % 5) * 0.05, rot: k });
    }
  }
  group.add(instanced(lavenderGeo(), paint({ sway: 0.15, swayHeight: 0.8 }), lavItems, { shadow: false }));

  // reeds and irises at the pond edge
  const reedItems = [];
  for (let i = 0; i < 110; i++) {
    const a = rng.f() * Math.PI * 2;
    const d = rng.range(0.97, 1.12);
    const x = 6 + Math.cos(a) * 11 * d, z = 12 + Math.sin(a) * 8.5 * d;
    if (onBridge(x, z) || pondDist(x, z) < 0.92) continue;
    let onPath = false;
    for (const p of PATHS) if (near(p.pts, x, z, p.width / 2 + 0.3)) onPath = true;
    if (onPath) continue;
    reedItems.push({ x, y: heightAt(x, z) - 0.05, z, s: rng.range(0.7, 1.2), rot: rng.f() * 6 });
  }
  group.add(instanced(reedGeo(), paint({ sway: 0.25, swayHeight: 1.4 }), reedItems, { shadow: false }));

  // grass tufts, densest in the meadows and along paths
  const grassItems = [];
  const gcount = Math.round(16000 * tier.grass);
  for (let i = 0; i < gcount * 2.2 && grassItems.length < gcount; i++) {
    const x = rng.range(-55, 55), z = rng.range(-75, 68);
    if (!freeSpot(x, z, 0.1)) continue;
    const meadow = fbm2(x * 0.07, z * 0.07, 5);
    if (rng.f() > meadow * 1.3) continue;
    grassItems.push({ x, y: heightAt(x, z) - 0.02, z, s: rng.range(0.7, 1.6), rot: rng.f() * 6 });
  }
  group.add(instanced(grassGeo(), paint({ sway: 0.35, swayHeight: 0.6, side: THREE.DoubleSide }), grassItems, { shadow: false, colorJitter: 0.15 }));

  return { group, obstacles };
}
