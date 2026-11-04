// Small things in the valley that change from day to day, and respond to
// what you do: plum seedlings you can water, a lotus bud that opens and
// fades, a child's pebble-meditation bag left on a bench.
import * as THREE from 'three';
import { colorize, merge, radialNormals } from './geo.js';
import { paint } from './materials.js';
import { groundAt } from './terrain.js';
import { WATER_Y } from './layout.js';

export const SEEDLING_SPOT = { x: -20, z: 29.2 };
export const LOTUS_SPOT = { x: 2.6, z: 13.4 };

/** Stage of the single lotus bud, by day: bud → opening → open → falling → pod → (pod and a new bud). */
export function lotusStage(day) { return (day - 1) % 6; }

/** Seedling growth: they grow a little each day, and a little more when watered. */
export function seedlingStage(cond) {
  const watered = (cond.flags.seedWater || []).length;
  return Math.min(4, Math.floor((cond.day - 1) / 2) + watered);
}

function petal(len, wid, col) {
  const g = new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(wid, len, wid * 0.45);
  return g;
}

function lotusGeo(stage) {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.012, 0.016, 0.55, 5).translate(0, 0.275, 0);
  parts.push(colorize(stem, '#5f7a3a'));
  const top = 0.55;
  const pink = (y) => new THREE.Color('#f6d3dc').lerp(new THREE.Color('#d8648a'), Math.min(1, y * 5));
  if (stage === 0 || stage === 5) {
    // a closed bud (stage 5 shows a new small bud beside the pod)
    const b = new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1.7, 1).translate(stage === 5 ? 0.18 : 0, top + 0.08, 0);
    parts.push(colorize(b, (x, y) => pink(y - top)));
    if (stage === 5) parts.push(colorize(new THREE.CylinderGeometry(0.01, 0.012, 0.5, 4).translate(0.18, 0.25, 0), '#5f7a3a'));
  }
  if (stage >= 1 && stage <= 3) {
    const n = stage === 3 ? 4 : 8;
    const open = stage === 1 ? 0.35 : 0.95;
    for (let i = 0; i < n; i++) {
      const g = petal(0.12, 0.05);
      g.rotateX(-open);
      g.translate(0, 0, 0.02);
      g.rotateY((i / n) * Math.PI * 2);
      g.translate(0, top, 0);
      radialNormals(g, 0, top - 0.05, 0);
      parts.push(colorize(g, (x, y) => pink(y - top)));
    }
    parts.push(colorize(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 10).translate(0, top + 0.03, 0), '#e2c44a'));
  }
  if (stage >= 3) {
    // the seed pod: flat-topped, green turning brown
    const pod = new THREE.CylinderGeometry(0.06, 0.035, 0.07, 12).translate(0, top + 0.06, 0);
    parts.push(colorize(pod, stage >= 4 ? '#7d7a4a' : '#9ab055'));
  }
  return merge(parts);
}

function seedlingGeo() {
  const parts = [];
  parts.push(colorize(new THREE.CylinderGeometry(0.15, 0.2, 0.05, 10).translate(0, 0.02, 0), '#5c4630'));
  parts.push(colorize(new THREE.CylinderGeometry(0.012, 0.018, 0.6, 5).translate(0, 0.3, 0), '#5b4434'));
  parts.push(colorize(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 4).translate(0.07, 0.37, 0), '#b39a6a')); // bamboo stake
  for (let i = 0; i < 6; i++) {
    const g = new THREE.OctahedronGeometry(0.05, 0).scale(1.6, 0.35, 0.9);
    g.rotateY(i * 1.1);
    g.translate(Math.cos(i * 1.1) * 0.06, 0.32 + i * 0.05, Math.sin(i * 1.1) * 0.06);
    parts.push(colorize(g, '#6f9a48'));
  }
  return merge(parts);
}

export class Changing {
  constructor(scene, built) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const mat = paint({ side: THREE.DoubleSide });
    // seedlings in a short row, with a watering can
    this.seedlings = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(seedlingGeo(), mat);
      const x = SEEDLING_SPOT.x + i * 1.1, z = SEEDLING_SPOT.z;
      m.position.set(x, groundAt(x, z), z);
      m.rotation.y = i * 1.7;
      this.group.add(m);
      this.seedlings.push(m);
    }
    this.blossoms = new THREE.Group();
    for (const m of this.seedlings) {
      const b = new THREE.Mesh(merge([0, 1, 2, 3, 4].map((k) => colorize(new THREE.OctahedronGeometry(0.03, 0).translate(Math.cos(k * 1.3) * 0.08, 0.62 + (k % 2) * 0.05, Math.sin(k * 1.3) * 0.08), '#fbeef0'))), mat);
      b.position.copy(m.position);
      this.blossoms.add(b);
    }
    this.group.add(this.blossoms);
    const can = new THREE.Mesh(merge([
      colorize(new THREE.CylinderGeometry(0.12, 0.13, 0.24, 12).translate(0, 0.12, 0), '#6f7f86'),
      colorize(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 6).rotateZ(-0.9).translate(0.2, 0.2, 0), '#6f7f86'),
      colorize(new THREE.TorusGeometry(0.09, 0.012, 5, 12, Math.PI).translate(0, 0.26, 0), '#5a666c'),
    ]), mat);
    can.position.set(SEEDLING_SPOT.x - 0.9, groundAt(SEEDLING_SPOT.x - 0.9, SEEDLING_SPOT.z + 0.3), SEEDLING_SPOT.z + 0.3);
    this.group.add(can);
    // the lotus bud, one mesh per stage
    this.lotus = [0, 1, 2, 3, 4, 5].map((st) => {
      const m = new THREE.Mesh(lotusGeo(st), mat);
      m.position.set(LOTUS_SPOT.x, WATER_Y - 0.05, LOTUS_SPOT.z);
      m.visible = false;
      this.group.add(m);
      return m;
    });
    this.fallen = new THREE.Mesh(merge([0, 1, 2, 3].map((k) => colorize(new THREE.SphereGeometry(0.06, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.15, 0.5).rotateY(k * 1.4).translate(Math.cos(k * 2) * 0.35, 0, Math.sin(k * 2) * 0.3), '#f2c6d3'))), mat);
    this.fallen.position.set(LOTUS_SPOT.x, WATER_Y + 0.02, LOTUS_SPOT.z);
    this.group.add(this.fallen);
    // a child's pebble-meditation bag on the pond bench, and the single pebble left behind
    const bench = built.benches[0];
    this.benchSpot = { x: bench.x, z: bench.z, y: groundAt(bench.x, bench.z) + 0.49 };
    this.bag = new THREE.Mesh(merge([
      colorize(new THREE.SphereGeometry(0.09, 10, 8).scale(1, 0.75, 0.85).translate(0, 0.06, 0), '#3f6a8a'),
      colorize(new THREE.TorusGeometry(0.035, 0.008, 4, 10).rotateX(Math.PI / 2).translate(0, 0.13, 0), '#d8b45a'),
    ]), mat);
    this.bag.position.set(this.benchSpot.x + 0.3, this.benchSpot.y, this.benchSpot.z);
    this.group.add(this.bag);
    this.pebble = new THREE.Mesh(colorize(new THREE.SphereGeometry(0.035, 10, 8).scale(1.3, 0.6, 1), '#9a958c'), mat);
    this.pebble.position.set(this.benchSpot.x - 0.2, this.benchSpot.y + 0.02, this.benchSpot.z);
    this.group.add(this.pebble);
  }

  /** Show each thing as it is today. */
  update(cond) {
    const ls = lotusStage(cond.day);
    this.lotus.forEach((m, i) => { m.visible = i === ls; });
    this.fallen.visible = ls === 3 || ls === 4;
    const st = seedlingStage(cond);
    const sc = 0.45 + st * 0.18;
    for (const m of this.seedlings) m.scale.setScalar(sc);
    this.blossoms.visible = st >= 4;
    this.blossoms.children.forEach((b, i) => { b.scale.setScalar(sc); b.position.copy(this.seedlings[i].position); });
    const f = cond.flags;
    // left alone, the bag stays until its owner comes back for it the next day
    this.bag.visible = cond.day >= 2 && (!f.pebbles || (f.pebbles === 'left' && cond.day <= (f.pebbleDay ?? 0)));
    this.pebble.visible = f.pebbles === 'left' && cond.day > (f.pebbleDay ?? 99) && !f.keptPebble;
  }
}
