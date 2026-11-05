// People of the practice centre: monastics in brown robes and lay friends,
// seen at a gentle distance. They follow simple daily routines and all
// stop where they are when the bell sounds.
import * as THREE from 'three';
import { groundAt } from './terrain.js';
import { POND } from './layout.js';
import { sculptedHuman } from './human-model.js';

export const figure = sculptedHuman;

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
        this.add(figure(seed++, { kind: i % 4 === 1 ? 'lay' : 'monastic', seated: true }), { mode: 'still', x: s.x, z: s.z, y: s.y + 0.1, yaw: s.rot, role: 'sitting' }); // facing the altar
      });
    }
    // a monastic sweeping the forest path in the morning
    if ((time === 0 || time === 1) && !rain) {
      this.add(figure(seed++, { kind: 'monastic', hat: true }), { mode: 'sweep', x: 5.5, z: -55, yaw: 1.2, role: 'sweeping' });
    }
    // tea on the terrace in the afternoon
    if (time === 2) {
      const t = b.tea.spots;
      this.add(figure(seed++, { kind: 'lay', seated: true, pose: 'tea' }), { mode: 'still', x: t.table.x - 0.1, z: t.table.z - 0.75, y: groundAt(t.table.x, t.table.z) + 0.3, yaw: Math.PI, role: 'tea' });
      this.add(figure(seed++, { kind: 'monastic', seated: true, pose: 'tea' }), { mode: 'still', x: t.table.x + 0.2, z: t.table.z + 0.75, y: groundAt(t.table.x, t.table.z) + 0.3, yaw: 0, role: 'tea' });
      this.add(figure(seed++, { kind: 'lay', seated: true, pose: 'tea' }), { mode: 'still', x: t.table2.x, z: t.table2.z + 0.75, y: groundAt(t.table2.x, t.table2.z) + 0.3, yaw: 0, role: 'tea' });
    }
    // orchard work in the morning and afternoon
    if ((time === 1 || time === 2) && !rain) {
      this.add(figure(seed++, { kind: 'lay' }), { mode: 'work', x: -32, z: 40, yaw: 0.6, role: 'working in the orchard' });
      this.add(figure(seed++, { kind: 'monastic', hat: true }), { mode: 'work', x: -38, z: 48, yaw: -1.2, role: 'working in the orchard' });
    }
    // someone reading on the bench by the pond in the afternoon
    if (time === 2 && !rain) {
      const bn = b.benches[1];
      this.add(figure(seed++, { kind: 'lay', seated: true, pose: 'reading' }), { mode: 'still', x: bn.x, z: bn.z, y: groundAt(bn.x, bn.z) + 0.3, yaw: bn.rot + Math.PI, role: 'reading' });
    }
    // cooks preparing a vegetarian meal before breakfast, lunch and dinner
    if (b.tea.cooking) {
      const fy = b.tea.floorY;
      b.tea.spots.cooks.forEach((c, i) => {
        this.add(figure(seed++, { kind: i === 1 ? 'lay' : 'monastic' }), { mode: 'cook', x: c.x, z: c.z, y: fy, yaw: c.yaw, role: 'cooking', stir: i === 0 });
      });
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
        body.rotation.z = Math.sin(p.d * 2.6) * 0.009 * go;
        const legs = p.fig.userData.legs;
        legs.forEach((leg, i) => { leg.rotation.x = Math.sin(p.d * 4 + i * Math.PI) * 0.13 * go; });
      } else if (p.mode === 'sweep') {
        body.rotation.y = Math.sin(t * 1.1 + p.phase) * 0.35 * go;
        body.rotation.x = 0.12;
      } else if (p.mode === 'cook') {
        // a slow, even rhythm: stirring at the stove, or chopping and washing
        if (p.stir) { body.rotation.y = Math.sin(t * 1.2 + p.phase) * 0.12 * go; body.rotation.x = 0.06; }
        else body.rotation.x = (0.1 + Math.abs(Math.sin(t * 2.2 + p.phase)) * 0.035) * go;
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
