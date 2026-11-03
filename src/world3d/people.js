// People of the practice centre: monastics in brown robes and lay friends,
// seen at a gentle distance. They follow simple daily routines and all
// stop where they are when the bell sounds.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { colorize, merge, radialNormals } from './geo.js';
import { paint } from './materials.js';
import { groundAt } from './terrain.js';
import { POND } from './layout.js';

const SKIN = ['#e6c4a4', '#c99a76', '#a87556', '#7a5038', '#f0d2b8'];
const LAY = [['#6f8597', '#3f4a58'], ['#d9d2c2', '#5a5248'], ['#8a9a6a', '#4c4a40'], ['#b87a5a', '#3f3a36'], ['#5d6f7a', '#2f3640'], ['#c9b48a', '#4a4036']];

function robeGeo(seated) {
  const prof = seated
    ? [[0, 0], [0.42, 0.02], [0.44, 0.12], [0.3, 0.3], [0.2, 0.62], [0.16, 0.78], [0.08, 0.84], [0, 0.85]]
    : [[0, 0], [0.3, 0.02], [0.28, 0.4], [0.24, 0.9], [0.22, 1.25], [0.2, 1.4], [0.09, 1.48], [0, 1.49]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  radialNormals(g, 0, seated ? 0.4 : 0.8, 0, 0.5);
  return g;
}

/** Build one figure. kind: 'monastic' | 'lay'. */
export function figure(seed, { kind = 'monastic', seated = false, hat = false } = {}) {
  const rng = new Rng(`person${seed}`);
  const skin = rng.pick(SKIN);
  const group = new THREE.Group();
  const parts = [];
  let sleeve = '#79543e';
  if (kind === 'monastic') {
    const robe = robeGeo(seated);
    parts.push(colorize(robe, (x, y, z, c) => c.set('#7a5236').lerp(new THREE.Color('#9a6c48'), Math.max(0, z) * 0.6 + y * 0.08)));
    // the outer sash over one shoulder
    const sash = new THREE.TorusGeometry(seated ? 0.2 : 0.23, 0.035, 5, 14, Math.PI * 1.2);
    sash.rotateZ(0.9).rotateY(0.3);
    sash.translate(0, seated ? 0.62 : 1.18, 0.02);
    parts.push(colorize(sash, '#5e3e28'));
  } else {
    const [top, bottom] = rng.pick(LAY);
    sleeve = top;
    if (seated) {
      const legs = new THREE.CapsuleGeometry(0.13, 0.42, 4, 8).rotateZ(Math.PI / 2).translate(0, 0.14, 0.12);
      parts.push(colorize(legs, bottom));
      const torso = new THREE.CapsuleGeometry(0.2, 0.35, 4, 10).translate(0, 0.55, 0);
      parts.push(colorize(torso, top));
    } else {
      for (const s of [-1, 1]) {
        const leg = new THREE.CapsuleGeometry(0.075, 0.68, 4, 6).translate(s * 0.1, 0.42, 0);
        parts.push(colorize(leg, bottom));
      }
      const torso = new THREE.CapsuleGeometry(0.19, 0.42, 4, 10).translate(0, 1.12, 0);
      parts.push(colorize(torso, top));
    }
  }
  // Shoulders, sleeves and hands break up the old peg-shaped silhouette.
  // These are fictional people: quiet everyday poses, no symbolic attributes.
  for (const side of [-1, 1]) {
    const arm = new THREE.CapsuleGeometry(kind === 'monastic' ? 0.10 : 0.075, seated ? 0.24 : 0.38, 3, 7);
    arm.rotateZ(side * (seated ? 0.55 : 0.16));
    arm.rotateX(seated ? -0.75 : -0.18);
    arm.translate(side * (seated ? 0.23 : 0.25), seated ? 0.57 : 1.12, seated ? 0.19 : 0.06);
    parts.push(colorize(arm, sleeve));
    const hand = new THREE.SphereGeometry(0.055, 7, 5).scale(0.8, 1.2, 1);
    hand.translate(side * (seated ? 0.15 : 0.20), seated ? 0.40 : 0.85, seated ? 0.31 : 0.14);
    parts.push(colorize(hand, skin));
    if (!seated) {
      const foot = new THREE.SphereGeometry(0.085, 7, 5).scale(0.75, 0.5, 1.8);
      foot.translate(side * 0.12, 0.04, 0.065 + side * 0.025);
      parts.push(colorize(foot, '#3f342e'));
    }
  }
  const headY = seated ? 0.98 : 1.6;
  parts.push(colorize(new THREE.CylinderGeometry(0.065, 0.075, 0.15, 7).translate(0, headY - 0.14, 0), skin));
  const head = new THREE.SphereGeometry(0.14, 12, 10).scale(0.9, 1.12, 1);
  head.translate(0, headY, 0);
  parts.push(colorize(head, skin));
  // A nose and ears make the facing direction readable at walking distance.
  parts.push(colorize(new THREE.SphereGeometry(0.035, 6, 5).scale(0.7, 0.8, 1.2).translate(0, headY - 0.015, 0.13), skin));
  for (const side of [-1, 1]) parts.push(colorize(new THREE.SphereGeometry(0.033, 6, 5).scale(0.6, 1.1, 0.8).translate(side * 0.126, headY - 0.015, 0), skin));
  if (kind === 'lay' && rng.f() < 0.85) {
    const hair = new THREE.SphereGeometry(0.147, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, headY + 0.01, -0.01);
    parts.push(colorize(hair, rng.pick(['#2a221c', '#4a3626', '#8a6a4a', '#b8b0a4'])));
  }
  if (hat) {
    const h = new THREE.ConeGeometry(0.3, 0.2, 14).translate(0, headY + 0.21, 0);
    parts.push(colorize(h, '#d9c79a'));
  }
  const body = new THREE.Mesh(merge(parts), paint({}));
  body.castShadow = true;
  group.add(body);
  group.userData.body = body;
  group.userData.seated = seated;
  group.scale.set(rng.range(0.94, 1.07), rng.range(0.94, 1.06), rng.range(0.95, 1.05));
  return group;
}

/** A loop around the pond for walking meditation. */
function pondLoop() {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push([POND.x + Math.cos(a) * (POND.rx + 3.4), POND.z + Math.sin(a) * (POND.rz + 3.2)]);
  }
  pts.push(pts[0]);
  return pts;
}

function along(pts, d) {
  // position and heading at distance d along a closed polyline
  let total = 0;
  const seg = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    seg.push(l);
    total += l;
  }
  d = ((d % total) + total) % total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const t = d / seg[i];
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(-(bx - ax), -(bz - az)) };
    }
    d -= seg[i];
  }
  return { x: pts[0][0], z: pts[0][1], yaw: 0 };
}

export class People {
  constructor(scene, built) {
    this.scene = scene;
    this.built = built;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.list = [];
    this.loop = pondLoop();
    this.hien = null;
  }

  clear() {
    // Daily routines rebuild the figures; release their unique GPU resources.
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry.dispose();
      obj.material.dispose();
    });
    this.group.clear();
    this.list = [];
  }

  add(fig, o) {
    this.group.add(fig);
    const p = { fig, phase: Math.random() * 10, ...o };
    this.list.push(p);
    this.place(p, 0);
    return p;
  }

  /** Set up who is where for a time of day and weather. */
  arrange(time, weather) {
    this.clear();
    const rain = weather === 'rain';
    const b = this.built;
    let seed = 1;
    // walking meditation line around the pond (morning, and lightly in the afternoon)
    if ((time === 1 || time === 2) && !rain) {
      const n = time === 1 ? 9 : 4;
      for (let i = 0; i < n; i++) {
        const kind = i % 3 === 1 ? 'lay' : 'monastic';
        this.add(figure(seed++, { kind, hat: kind === 'monastic' && i % 2 === 0 }), { mode: 'loop', d: i * 1.6, speed: 0.32, role: 'walking line' });
      }
    }
    // people sitting in the hall at dawn and evening
    if (time === 0 || time === 3) {
      b.hall.cushionSpots.slice(0, 12).forEach((s, i) => {
        if (i % 3 === 2) return;
        this.add(figure(seed++, { kind: i % 4 === 1 ? 'lay' : 'monastic', seated: true }), { mode: 'still', x: s.x, z: s.z, y: s.y + 0.1, yaw: s.rot + Math.PI, role: 'sitting' });
      });
    }
    // a monastic sweeping the forest path in the morning
    if ((time === 0 || time === 1) && !rain) {
      this.add(figure(seed++, { kind: 'monastic', hat: true }), { mode: 'sweep', x: 5.5, z: -55, yaw: 1.2, role: 'sweeping' });
    }
    // tea on the terrace in the afternoon
    if (time === 2) {
      const t = b.tea.spots;
      this.add(figure(seed++, { kind: 'lay', seated: true }), { mode: 'still', x: t.table.x - 0.1, z: t.table.z - 0.75, y: groundAt(t.table.x, t.table.z) + 0.3, yaw: Math.PI, role: 'tea' });
      this.add(figure(seed++, { kind: 'monastic', seated: true }), { mode: 'still', x: t.table.x + 0.2, z: t.table.z + 0.75, y: groundAt(t.table.x, t.table.z) + 0.3, yaw: 0, role: 'tea' });
      this.add(figure(seed++, { kind: 'lay', seated: true }), { mode: 'still', x: t.table2.x, z: t.table2.z + 0.75, y: groundAt(t.table2.x, t.table2.z) + 0.3, yaw: 0, role: 'tea' });
    }
    // orchard work in the morning and afternoon
    if ((time === 1 || time === 2) && !rain) {
      this.add(figure(seed++, { kind: 'lay' }), { mode: 'work', x: -32, z: 40, yaw: 0.6, role: 'working in the orchard' });
      this.add(figure(seed++, { kind: 'monastic', hat: true }), { mode: 'work', x: -38, z: 48, yaw: -1.2, role: 'working in the orchard' });
    }
    // someone reading on the bench by the pond in the afternoon
    if (time === 2 && !rain) {
      const bn = b.benches[1];
      this.add(figure(seed++, { kind: 'lay', seated: true }), { mode: 'still', x: bn.x, z: bn.z, y: groundAt(bn.x, bn.z) + 0.3, yaw: bn.rot + Math.PI, role: 'reading' });
    }
    // Sister Hien
    const hienAt = { 0: [-14.5, -33.2, 2.6], 1: [-13, -32.8, 2.2], 2: [b.tea.spots.front.x, b.tea.spots.front.z, Math.PI], 3: [3, -7.5, Math.PI], 4: null }[time];
    if (hienAt) {
      const f = figure(99, { kind: 'monastic' });
      this.hien = this.add(f, { mode: 'still', x: hienAt[0], z: hienAt[1], yaw: hienAt[2], role: 'Sister Hien', hien: true });
    } else this.hien = null;
  }

  place(p, t) {
    const f = p.fig;
    if (p.mode === 'loop') {
      const a = along(this.loop, p.d);
      f.position.set(a.x, groundAt(a.x, a.z), a.z);
      f.rotation.y = a.yaw;
    } else {
      f.position.set(p.x, p.y ?? groundAt(p.x, p.z), p.z);
      f.rotation.y = p.yaw || 0;
    }
    void t;
  }

  /** pause: 0..1 (1 = everyone fully stopped for the bell). */
  update(dt, t, pause) {
    const go = 1 - pause;
    for (const p of this.list) {
      const body = p.fig.userData.body;
      if (p.mode === 'loop') {
        p.d += p.speed * dt * go;
        this.place(p, t);
        // slow, deliberate steps: a gentle rise and fall
        body.position.y = Math.abs(Math.sin(p.d * 2.6)) * 0.025 * go;
        body.rotation.z = Math.sin(p.d * 2.6) * 0.015 * go;
      } else if (p.mode === 'sweep') {
        body.rotation.y = Math.sin(t * 1.1 + p.phase) * 0.35 * go;
        body.rotation.x = 0.12;
      } else if (p.mode === 'work') {
        body.rotation.x = (0.15 + Math.sin(t * 0.5 + p.phase) * 0.12) * go;
      } else {
        // breathing
        body.scale.y = 1 + Math.sin(t * 0.8 + p.phase) * 0.006;
      }
    }
  }

  /** People near a point (for subjects in photos and descriptions). */
  near(x, z, r) {
    return this.list.filter((p) => Math.hypot(p.fig.position.x - x, p.fig.position.z - z) < r);
  }
}
