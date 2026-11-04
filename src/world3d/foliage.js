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
  const height = rng.range(10.5, 14.8), width = rng.range(1.5, 2.5);
  const lean = rng.g() * 0.9;
  const parts = [trunkGeo(height * 0.9, 0.27, 0.06, C('#6b5140'), lean)];
  // Unequal, overlapping boughs give a broken edge rather than stacked cones.
  const tiers = 8;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = 2 + t * (height - 3.1);
    const r = width * (1 - t * 0.85) * rng.range(0.8, 1.2);
    const h = 2.5 - t * 0.9;
    const g = new THREE.ConeGeometry(r, h, 10, 2, true);
    g.scale(1, 1, rng.range(0.7, 1.1));
    g.rotateY(i * 1.7);
    g.translate(lean * t + rng.g() * 0.35, y + h / 2, rng.g() * 0.22);
    jitter(g, 0.38, 1.3, seed + i);
    radialNormals(g, lean * t, y + h * 0.15, 0, 0.55);
    parts.push(colorize(g, (x, yy, z) => {
      const tip = (yy - y) / h;
      return vary(C('#2d4c43').lerp(C('#6d8c70'), 0.2 + tip * 0.4 + x * 0.04), 0.07, x, yy, z, seed);
    }));
  }
  return merge(parts);
}

function branchGeo(from, to, r0, r1, seed) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), 6, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(...a.add(b).multiplyScalar(0.5).toArray());
  return colorize(g, (x, y, z) => vary(C('#604b47'), 0.07, x, y, z, seed));
}

/**
 * A plum tree, as it really looks: a short, dark, gnarled trunk; angular,
 * zig-zagging branches and many thin twigs; and small five-petalled blossoms
 * scattered close along the twigs (not puffballs). In leaf (flowering=false)
 * it carries small oval leaves and dusky plums instead.
 */
export function plumTreeGeo(seed = 1, flowering = true) {
  const rng = new Rng(`plum-${seed}`), parts = [];
  const lean = [rng.g() * 0.35, 0, rng.g() * 0.35];
  const base = [0, 0, 0];
  const knee = [lean[0] - 0.15, 0.85, lean[2] + 0.1];
  const fork = [lean[0] * 1.6 + 0.2, 1.55, lean[2] * 1.6];
  parts.push(branchGeo(base, knee, 0.3, 0.24, seed));
  parts.push(branchGeo(knee, fork, 0.24, 0.17, seed + 1));
  for (const [j, r] of [[knee, 0.25], [fork, 0.18]]) parts.push(colorize(new THREE.SphereGeometry(r, 7, 5).translate(j[0], j[1], j[2]), (xx, yy, zz) => vary(C('#4f3d38'), 0.06, xx, yy, zz, seed)));
  // flowers: tiny pale cups along the twigs; leaves: small flat ovals
  const blossom = ['#fbf3f0', '#f6dfe3', '#efc6cf', '#fff8f2'];
  const leafCols = ['#5f7f45', '#6f8f4f', '#557343', '#7d9a58'];
  const dot = (p, size, col, flat = false) => {
    const g = new THREE.OctahedronGeometry(size, 0);
    if (flat) g.scale(1.6, 0.35, 0.9); else g.scale(1, 0.75, 1);
    g.rotateY(rng.f() * 6);
    g.translate(p[0], p[1], p[2]);
    radialNormals(g, p[0], p[1] - 0.05, p[2], 0.8);
    parts.push(colorize(g, (xx, yy, zz) => vary(C(col), 0.06, xx * 5, yy * 5, zz * 5, seed)));
  };
  const scatterAlong = (a, b, n) => {
    for (let k = 0; k < n; k++) {
      const t = 0.25 + 0.75 * rng.f();
      const p = a.map((v, i) => v + (b[i] - v) * t + rng.g() * 0.07);
      if (flowering) {
        dot(p, rng.range(0.035, 0.055), rng.pick(blossom));
        if (rng.f() < 0.25) dot([p[0], p[1] + 0.02, p[2]], 0.012, '#d8b04a'); // stamens
      } else {
        dot(p, rng.range(0.055, 0.085), rng.pick(leafCols), true);
        // young plums: small, hard and green in late spring; one or two starting to blush
        if (rng.f() < 0.16) dot([p[0], p[1] - 0.08, p[2]], 0.038, rng.f() < 0.15 ? '#b8a04a' : rng.pick(['#8fae4a', '#9cb85a', '#7f9c42']));
      }
    }
  };
  const limbs = 5 + (seed % 2);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.f() * 0.6;
    const r = rng.range(1.2, 2.2);
    // each limb zig-zags in two or three angular segments
    let prev = fork;
    let w = 0.12;
    for (let seg = 0; seg < 3; seg++) {
      const out = r * (seg + 1) / 3;
      const p = [fork[0] + Math.cos(a + rng.g() * 0.35) * out, fork[1] + 0.45 + seg * rng.range(0.35, 0.6) + rng.g() * 0.15, fork[2] + Math.sin(a + rng.g() * 0.35) * out];
      parts.push(branchGeo(prev, p, w, w * 0.62, seed + i * 7 + seg));
      // thin straight twigs ("whips") rising from each segment
      for (let k = 0; k < 3; k++) {
        const tw = [p[0] + rng.g() * 0.35, p[1] + rng.range(0.3, 0.75), p[2] + rng.g() * 0.35];
        parts.push(branchGeo(p, tw, 0.022, 0.006, seed + i + k));
        scatterAlong(p, tw, flowering ? 9 : 11);
      }
      scatterAlong(prev, p, flowering ? 5 : 6);
      // a rounded knuckle where branch segments meet (no blocky joints)
      const kn = new THREE.SphereGeometry(w * 0.7, 6, 5).translate(p[0], p[1], p[2]);
      parts.push(colorize(kn, (xx, yy, zz) => vary(C('#4f3d38'), 0.06, xx, yy, zz, seed)));
      prev = p;
      w *= 0.62;
    }
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

function grassGeo(seed = 1) {
  const parts = [], rng = new Rng(`grass-${seed}`);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, h = rng.range(0.2, 0.55), w = rng.range(0.015, 0.035);
    const g = new THREE.PlaneGeometry(w * 2, h, 1, 3);
    g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const t = p.getY(j) / h;
      p.setX(j, p.getX(j) * (1 - t * 0.9));
      p.setZ(j, t * t * h * 0.55);
    }
    g.rotateY(a).translate(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
    radialNormals(g, 0, -0.4, 0);
    parts.push(colorize(g, (x, y) => C('#637956').lerp(C('#b1bc86'), Math.min(1, y / h))));
  }
  return merge(parts);
}

function groundCoverGeo() {
  const parts = [];
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4, r = 0.1 + (i % 4) * 0.065;
    const g = new THREE.CircleGeometry(0.08, 6);
    g.rotateX(-Math.PI / 2 + 0.2).rotateY(a);
    g.translate(Math.cos(a) * r, 0.025 + (i % 3) * 0.025, Math.sin(a) * r);
    parts.push(colorize(g, i % 3 === 0 ? '#a3b38a' : '#65866b'));
  }
  return merge(parts);
}

function petalGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.CircleGeometry(0.045, 5);
    g.scale(0.7, 1, 1).rotateX(-Math.PI / 2).translate(Math.cos(i * 2.4) * (0.1 + i * 0.09), 0.018, Math.sin(i * 2.4) * (0.1 + i * 0.09));
    parts.push(colorize(g, i % 2 ? '#efd7d1' : '#ce9cae'));
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
    o.scale.set((it.s || 1) * (it.sx || 1), it.s || 1, (it.s || 1) * (it.sz || 1));
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
    cedarItems.push({ x, y: heightAt(x, z) - 0.2, z, s, rot: rng.f() * 6, sy: rng.range(0.83, 1.15) });
    if (Math.abs(x) < 40 && z > -80) obstacles.push({ x, z, r: 0.6 });
  }
  const cedarGeos = [cedarGeo(1), cedarGeo(2), cedarGeo(3)];
  const cedarMat = paint({ sway: 0.22, swayHeight: 14 });
  // only trees near the walkable valley cast shadows (much cheaper on phones)
  const nearValley = (it) => Math.abs(it.x) < 34 && it.z > -84 && it.z < 64;
  cedarGeos.forEach((g, k) => {
    const mine = cedarItems.filter((_, i) => i % cedarGeos.length === k);
    group.add(instanced(g, cedarMat, mine.filter(nearValley), { shadow: true }));
    const far = mine.filter((it) => !nearValley(it));
    if (far.length) group.add(instanced(g, cedarMat, far, { shadow: false }));
  });

  // maples & broadleaf trees around the valley floor
  const mapleGreens = ['#799568', '#91a87a', '#587d60', '#b0b88a'];
  const mapleReds = ['#a47560', '#bd9675', '#8d6c64'];
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
  // late spring: the blossom is over; plums are in leaf with small green fruit
  group.add(instanced(plumTreeGeo(7, false), broadMat, plumItems.filter((_, i) => i % 3 !== 0)));
  group.add(instanced(plumTreeGeo(11, false), broadMat, plumItems.filter((_, i) => i % 3 === 0)));

  // Landmark trees frame the walk without closing the view to the pond and hall.
  const heroPlums = [{ x: 12.5, z: 31.5, s: 1.08, rot: 0.4 }, { x: 25.7, z: 30.6, s: 1.0, rot: 2.1 }];
  for (const it of heroPlums) {
    it.y = heightAt(it.x, it.z);
    obstacles.push({ x: it.x, z: it.z, r: 0.55 });
  }
  group.add(instanced(plumTreeGeo(17, false), paint({ sway: 0.06, swayHeight: 5 }), heroPlums));
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
    grassItems.push({ x, y: heightAt(x, z) - 0.02, z, s: rng.range(0.6, 1.25), rot: rng.f() * 6 });
  }
  group.add(instanced(grassGeo(), paint({ sway: 0.35, swayHeight: 0.6, side: THREE.DoubleSide }), grassItems, { shadow: false, colorJitter: 0.10 }));


  // Low leaves, petals and worn stepping stones create a quiet, readable foreground.
  // All are batched; none obstruct the existing walkable route.
  const cover = [], petals = [], edging = [], steps = [];
  const detailRng = new Rng('hut-garden');
  for (let i = 0; i < 750 * tier.grass; i++) {
    const x = detailRng.range(8, 30), z = detailRng.range(23, 42);
    if (Object.values(BUILDINGS).some((b) => inBuilding(b, x, z, 0.7))) continue;
    const d = polyDist(PATHS.find((p) => p.id === 'toHut').pts, x, z);
    if (d < 1.05 || pondDist(x, z) < 1.1) continue;
    cover.push({ x, z, y: heightAt(x, z) + 0.015, s: detailRng.range(0.6, 1.6), rot: detailRng.f() * 6 });
    if (Math.hypot(x - 12.5, z - 31.5) < 4.8 && detailRng.f() < 0.6) {
      petals.push({ x, z, y: heightAt(x, z) + 0.025, s: detailRng.range(0.7, 1.4), rot: detailRng.f() * 6 });
    }
  }
  const hutPath = PATHS.find((p) => p.id === 'toHut').pts;
  for (let j = 0; j < hutPath.length - 1; j++) {
    const a = hutPath[j], b = hutPath[j + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    for (let d = 0.5; d < len; d += 0.9) {
      const t = d / len;
      const x = a[0] + dx * t, z = a[1] + dz * t;
      steps.push({ x, z, y: heightAt(x, z) - 0.015, s: 0.5, sy: 0.08, sx: 1.15, sz: 0.8, rot: detailRng.f() * 6 });
      if (detailRng.f() < 0.55) {
        const side = detailRng.f() < 0.5 ? -1 : 1;
        const ex = x + dz / len * 1.15 * side, ez = z - dx / len * 1.15 * side;
        edging.push({ x: ex, z: ez, y: heightAt(ex, ez) - 0.05, s: detailRng.range(0.18, 0.35), sy: 0.5, rot: detailRng.f() * 6 });
      }
    }
  }
  group.add(instanced(groundCoverGeo(), paint({ side: THREE.DoubleSide, sway: 0.03, swayHeight: 0.4 }), cover, { shadow: false }));
  group.add(instanced(petalGeo(), paint({ side: THREE.DoubleSide }), petals, { shadow: false }));
  group.add(instanced(stoneGeo(7), paint({}), edging, { shadow: false }));
  group.add(instanced(stoneGeo(11), paint({}), steps, { shadow: false }));

  return { group, obstacles };
}
