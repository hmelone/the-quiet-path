// Terrain: a procedural valley heightfield with flattened building pads,
// a carved pond and stream, and painted path surfaces.
import * as THREE from 'three';
import { fbm2, noise2, smoothstep, clamp, lerp } from '../core/rng.js';
import { BOUNDS, PADS, PATHS, POND, pondDist, STREAM, BRIDGE, FOOTBRIDGE, BUILDINGS, WATER_Y } from './layout.js';

/** Distance from point to a polyline; returns { d, t } (t = 0..1 along segment set). */
export function polyDist(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const vx = bx - ax, vz = bz - az;
    const l2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / l2);
    const px = ax + vx * t, pz = az + vz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return best;
}

function baseHeight(x, z) {
  // a gentle valley: about 10 m from the gate down to the pond
  let h = 10 * (1 - smoothstep(-84, 24, z));
  const s = Math.max(0, Math.abs(x) - 28);
  h += s * s * 0.011 + s * 0.12;
  const n = Math.max(0, -80 - z);
  h += n * n * 0.06;
  const so = Math.max(0, z - 58);
  h += so * so * 0.04;
  const amp = 1.2 + Math.min(1, s / 30) * 7;
  h += (fbm2(x * 0.025 + 3, z * 0.025, 1, 4) - 0.5) * amp * 2;
  h += (noise2(x * 0.15, z * 0.15, 4) - 0.5) * 0.35;
  return h;
}

// Pad heights come from the unflattened terrain at their centres.
for (const p of Object.values(PADS)) p.h = baseHeight(p.x, p.z);
PADS.pond.h = WATER_Y + 0.35;

export function heightAt(x, z) {
  let h = baseHeight(x, z);
  for (const p of Object.values(PADS)) {
    const d = Math.hypot(x - p.x, z - p.z);
    const k = 1 - smoothstep(p.r, p.r + 16, d);
    if (k > 0) h = lerp(h, p.h, k);
  }
  // pond basin
  const pd = pondDist(x, z);
  if (pd < 1.6) {
    const shore = WATER_Y + 0.25;
    if (pd < 1) h = WATER_Y - 1.3 * (1 - pd * pd) + 0.1;
    else h = lerp(shore, h, smoothstep(1, 1.6, pd));
  }
  // stream groove
  const sd = polyDist(STREAM, x, z);
  if (sd < 2.2) h -= 0.7 * (1 - smoothstep(0.4, 2.2, sd));
  return h;
}

function onSpan(B, x, z) {
  const { x0, z0, x1, z1, width } = B;
  const vx = x1 - x0, vz = z1 - z0, l2 = vx * vx + vz * vz;
  const t = ((x - x0) * vx + (z - z0) * vz) / l2;
  if (t < -0.02 || t > 1.02) return null;
  const px = x0 + vx * t, pz = z0 + vz * t;
  return Math.hypot(x - px, z - pz) < width / 2 ? clamp(t) : null;
}

/** Is (x,z) on a bridge deck (pond bridge or stream footbridge)? */
export function onBridge(x, z) {
  return onSpan(BRIDGE, x, z) != null || onSpan(FOOTBRIDGE, x, z) != null;
}

let footBase = null;
export function bridgeHeight(x, z) {
  const tf = onSpan(FOOTBRIDGE, x, z);
  if (tf != null) {
    if (footBase == null) footBase = Math.max(heightAt(FOOTBRIDGE.x0, FOOTBRIDGE.z0), heightAt(FOOTBRIDGE.x1, FOOTBRIDGE.z1)) + 0.12;
    return footBase + Math.sin(tf * Math.PI) * FOOTBRIDGE.arch;
  }
  const { x0, z0, x1, z1 } = BRIDGE;
  const vx = x1 - x0, vz = z1 - z0, l2 = vx * vx + vz * vz;
  const t = clamp(((x - x0) * vx + (z - z0) * vz) / l2);
  return WATER_Y + 0.55 + Math.sin(t * Math.PI) * BRIDGE.arch;
}

/** Local coordinates inside a building footprint (or null if outside). */
export function inBuilding(b, x, z, margin = 0) {
  const c = Math.cos(-b.rot), s = Math.sin(-b.rot);
  const dx = x - b.x, dz = z - b.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  if (Math.abs(lx) <= b.w / 2 + margin && Math.abs(lz) <= b.d / 2 + margin) return { lx, lz };
  return null;
}

/** Height you stand at: terrain, bridge deck or building floor. */
export function groundAt(x, z) {
  if (onBridge(x, z)) return bridgeHeight(x, z);
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (inBuilding(b, x, z, 0.4)) return PADS[id].h + b.floor;
  }
  return heightAt(x, z);
}

/** What you are walking on, for footsteps. */
export function surfaceAt(x, z) {
  if (onBridge(x, z)) return 'wood';
  for (const b of Object.values(BUILDINGS)) if (inBuilding(b, x, z, 0.4)) return 'wood';
  for (const p of PATHS) {
    if (polyDist(p.pts, x, z) < p.width / 2) return p.surface;
  }
  return 'grass';
}

const C = (h) => new THREE.Color(h);
const COL = {
  grass: C('#6d876c'), meadow: C('#98a27a'), moss: C('#526f5d'), forest: C('#3f5a4d'),
  rock: C('#7d7a70'), gravel: C('#b8ac94'), stone: C('#9a958a'), earth: C('#7a6448'),
  mud: C('#5d5340'), bed: C('#384a40'), grasspath: C('#a3a86c'),
};

export function buildTerrain(quality) {
  const W = BOUNDS.x1 - BOUNDS.x0, D = BOUNDS.z1 - BOUNDS.z0;
  const res = quality === 'low' ? 1.6 : quality === 'medium' ? 1.15 : 0.9;
  const sx = Math.round(W / res), sz = Math.round(D / res);
  const geo = new THREE.PlaneGeometry(W, D, sx, sz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    // slope from neighbouring samples
    const e = 0.8;
    const slope = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    const n = fbm2(x * 0.08, z * 0.08, 7, 3);
    const n2 = noise2(x * 0.6, z * 0.6, 9);
    // base: meadow lower down, mossier and darker toward the forested slopes
    const forest = smoothstep(26, 40, Math.abs(x)) + smoothstep(-35, -60, z) * 0.8;
    c.copy(COL.meadow).lerp(COL.grass, smoothstep(0.35, 0.65, n));
    c.lerp(COL.moss, clamp(forest * 0.8));
    c.lerp(COL.forest, clamp(forest - 0.6) * 0.8);
    c.lerp(COL.rock, smoothstep(0.55, 0.95, slope) * 0.8);
    // paths
    for (const p of PATHS) {
      const d = polyDist(p.pts, x, z);
      const half = p.width / 2;
      if (d < half + 0.6) {
        const k = 1 - smoothstep(half - 0.3, half + 0.6, d);
        const pc = p.surface === 'gravel' ? COL.gravel : p.surface === 'stone' ? COL.stone : COL.grasspath;
        c.lerp(pc, k * 0.95);
      }
    }
    // shoreline & pond bed
    const pd = pondDist(x, z);
    if (pd < 1.25) c.lerp(pd < 1 ? COL.bed : COL.mud, pd < 1 ? 0.9 : (1 - smoothstep(1, 1.25, pd)) * 0.7);
    if (polyDist(STREAM, x, z) < 1.4) c.lerp(COL.bed, 0.8);
    // small brushy variation
    const v = 0.9 + n2 * 0.2;
    colors[i * 3] = c.r * v;
    colors[i * 3 + 1] = c.g * v;
    colors[i * 3 + 2] = c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
