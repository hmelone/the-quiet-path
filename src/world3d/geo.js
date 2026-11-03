// Small geometry helpers: vertex colouring, organic jitter and merging.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise2 } from '../core/rng.js';

/** Prepare a geometry for merging: non-indexed, position + normal + color only. */
export function prep(g) {
  let out = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'color'].includes(k)) out.deleteAttribute(k);
  if (!out.attributes.color) {
    out.setAttribute('color', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 3).fill(1), 3));
  }
  return out;
}

/** Colour every vertex with fn(x, y, z) -> THREE.Color (or a fixed colour). */
export function colorize(g, fn) {
  g = prep(g);
  const p = g.attributes.position, c = g.attributes.color;
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const v = typeof fn === 'function' ? fn(p.getX(i), p.getY(i), p.getZ(i), col) : col.set(fn);
    c.setXYZ(i, v.r, v.g, v.b);
  }
  return g;
}

/** Push vertices outward/inward by low-frequency noise for an organic shape. */
export function jitter(g, amt = 0.15, freq = 1.4, seed = 0) {
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise2(v.x * freq + seed, v.z * freq + v.y * 0.7, seed) - 0.5;
    const len = v.length() || 1;
    v.multiplyScalar(1 + (n * amt * 2) / Math.max(len, 0.5));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

/** Soft "painted foliage" normals: point away from a centre, so crowns shade like one soft mass. */
export function radialNormals(g, cx = 0, cy = 0, cz = 0, squash = 1) {
  const p = g.attributes.position;
  const n = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i) - cx, (p.getY(i) - cy) * squash, p.getZ(i) - cz).normalize();
    n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

export function merge(list) {
  const g = mergeGeometries(list.map(prep), false);
  g.computeBoundingSphere();
  return g;
}

/** Brushy variation of a base colour. */
export function vary(base, amt, x, y, z, seed = 0) {
  const n = noise2(x * 2.1 + seed, z * 2.1 + y * 1.3, seed + 3) - 0.5;
  const c = new THREE.Color(base);
  c.offsetHSL(n * 0.02, n * 0.08, n * amt);
  return c;
}
