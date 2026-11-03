// Small living details. Positions are in layer coordinates
// (x in world units across the layer, y 0..1 down the panorama).
import { Rng, noise1 } from '../core/rng.js';

const KIND = { mote: 0, leaf: 1, koi: 2, smoke: 3, firefly: 4, flake: 5 };

class System {
  constructor(cfg, lw, density) {
    this.cfg = cfg;
    this.lw = lw;
    this.rng = new Rng(cfg.seed || 7);
    this.n = Math.max(1, Math.round((cfg.count || 20) * density));
    this.p = [];
    this.t = 0;
  }
  // each particle: x,y,size,rot,r,g,b,a,kind,aspect,seed
  push(out, i, x, y, size, rot, col, a, kind, aspect = 1, seed = 0) {
    const o = i * 12;
    out[o] = x; out[o + 1] = y; out[o + 2] = size; out[o + 3] = rot;
    out[o + 4] = col[0]; out[o + 5] = col[1]; out[o + 6] = col[2]; out[o + 7] = a;
    out[o + 8] = kind; out[o + 9] = aspect; out[o + 10] = seed; out[o + 11] = 0;
  }
}

/** Dust and pollen drifting in light. */
class Motes extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    const [x0, x1] = cfg.x || [0, lw];
    const [y0, y1] = cfg.y || [0.2, 0.9];
    for (let i = 0; i < this.n; i++) {
      this.p.push({ x: this.rng.range(x0, x1), y: this.rng.range(y0, y1), s: this.rng.range(0.6, 1.4), ph: this.rng.f() * 100 });
    }
    this.box = [x0, x1, y0, y1];
  }
  update(dt, env) {
    this.t += dt;
    const [x0, x1, y0, y1] = this.box;
    for (const p of this.p) {
      p.x += (noise1(this.t * 0.1 + p.ph) - 0.5) * 0.004 * dt * env.speed + 0.002 * dt * env.speed * env.wind;
      p.y += (noise1(this.t * 0.13 + p.ph * 2) - 0.5) * 0.004 * dt * env.speed;
      if (p.x > x1) p.x = x0;
      if (p.x < x0) p.x = x1;
      if (p.y < y0) p.y = y1;
      if (p.y > y1) p.y = y0;
    }
  }
  write(out, off, env) {
    const vis = (this.cfg.light ? env.daylight * 0.9 + 0.05 : 0.6) * (env.rain ? 0.2 : 1);
    if (vis < 0.03) return 0;
    let i = 0;
    for (const p of this.p) {
      const tw = 0.6 + 0.4 * Math.sin(this.t * 0.8 + p.ph);
      this.push(out, off + i++, p.x, p.y, 0.004 * p.s, 0, this.cfg.color || [1, 0.96, 0.82], 0.55 * vis * tw, KIND.mote);
    }
    return i;
  }
}

/** Leaves or petals drifting down and across. */
class Leaves extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    for (let i = 0; i < this.n; i++) this.p.push(this.spawn(true));
  }
  spawn(initial) {
    const [x0, x1] = this.cfg.x || [0, this.lw];
    const cols = this.cfg.colors || [[0.62, 0.72, 0.32], [0.75, 0.78, 0.4]];
    return {
      x: this.rng.range(x0, x1), y: initial ? this.rng.range(0, 1) : this.rng.range(-0.1, 0.05),
      vy: this.rng.range(0.03, 0.06), s: this.rng.range(0.006, 0.01), ph: this.rng.f() * 100,
      rot: this.rng.f() * 6, col: this.rng.pick(cols),
    };
  }
  update(dt, env) {
    this.t += dt;
    const floor = this.cfg.floor || 1.05;
    for (let i = 0; i < this.p.length; i++) {
      const p = this.p[i];
      p.y += p.vy * dt * env.speed;
      p.x += (Math.sin(this.t * 1.3 + p.ph) * 0.02 + env.wind * 0.03) * dt * env.speed;
      p.rot += Math.sin(this.t + p.ph) * dt * 1.5 * env.speed;
      if (p.y > floor) this.p[i] = this.spawn(false);
    }
  }
  write(out, off) {
    let i = 0;
    for (const p of this.p) this.push(out, off + i++, p.x, p.y, p.s, p.rot, p.col, 0.9, KIND.leaf, 1.6);
    return i;
  }
}

/** Koi gliding beneath the pond surface. */
class Koi extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    this.n = cfg.count || 5;
    const cols = [[0.92, 0.45, 0.16], [0.95, 0.6, 0.2], [0.9, 0.9, 0.86], [0.85, 0.3, 0.12], [0.3, 0.28, 0.26]];
    for (let i = 0; i < this.n; i++) {
      this.p.push({ ph: this.rng.f() * 100, sp: this.rng.range(0.025, 0.05), s: this.rng.range(0.022, 0.034), col: cols[i % cols.length], seed: this.rng.f() });
    }
  }
  pos(p, t) {
    const [x0, x1, y0, y1] = this.cfg.area;
    const u = noise1(t * p.sp + p.ph) , v = noise1(t * p.sp * 1.3 + p.ph * 3 + 50);
    return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v];
  }
  update(dt, env) { this.t += dt * env.speed; }
  write(out, off) {
    let i = 0;
    for (const p of this.p) {
      const [x, y] = this.pos(p, this.t);
      const [x2, y2] = this.pos(p, this.t + 0.2);
      const ang = Math.atan2((y2 - y) * 2.5, x2 - x);
      // perspective: fish further back look smaller and squashed
      const [, , y0, y1] = this.cfg.area;
      const k = 0.6 + 0.4 * ((y - y0) / (y1 - y0));
      this.push(out, off + i++, x, y, p.s * k, ang, p.col, 0.75, KIND.koi, 2.6, p.seed);
    }
    return i;
  }
}

/** Incense smoke rising from a point. */
class Smoke extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    this.n = Math.round((cfg.count || 26) * Math.max(0.6, d));
    for (let i = 0; i < this.n; i++) this.p.push({ age: (i / this.n) * 6, ph: this.rng.f() * 10 });
  }
  update(dt, env) {
    this.t += dt;
    for (const p of this.p) {
      p.age += dt * env.speed;
      if (p.age > 6) { p.age -= 6; p.ph = this.rng.f() * 10; }
    }
  }
  write(out, off) {
    const [sx, sy] = this.cfg.at;
    let i = 0;
    for (const p of this.p) {
      const k = p.age / 6;
      const x = sx + Math.sin(p.age * 1.1 + p.ph) * 0.004 * (1 + k * 4) + k * 0.01;
      const y = sy - k * (this.cfg.rise || 0.16);
      this.push(out, off + i++, x, y, 0.006 + k * 0.03, 0, [0.85, 0.85, 0.88], 0.22 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k), KIND.smoke, 1, p.ph);
    }
    return i;
  }
}

/** Fireflies on early-summer evenings. */
class Fireflies extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    const [x0, x1, y0, y1] = cfg.area;
    for (let i = 0; i < this.n; i++) this.p.push({ x: this.rng.range(x0, x1), y: this.rng.range(y0, y1), ph: this.rng.f() * 100 });
  }
  update(dt, env) {
    this.t += dt;
    const [x0, x1, y0, y1] = this.cfg.area;
    for (const p of this.p) {
      p.x += (noise1(this.t * 0.2 + p.ph) - 0.5) * 0.01 * dt * env.speed;
      p.y += (noise1(this.t * 0.17 + p.ph * 2) - 0.5) * 0.008 * dt * env.speed;
      p.x = Math.min(x1, Math.max(x0, p.x));
      p.y = Math.min(y1, Math.max(y0, p.y));
    }
  }
  write(out, off, env) {
    const vis = (1 - env.daylight) * (env.rain ? 0 : 1) * (env.night ? 1 : 0);
    if (vis < 0.05) return 0;
    let i = 0;
    for (const p of this.p) {
      const blink = Math.max(0, Math.sin(this.t * 0.9 + p.ph) * 1.6 - 0.6);
      if (blink <= 0.01) continue;
      this.push(out, off + i++, p.x, p.y, 0.014, 0, [0.85, 1.0, 0.45], blink * vis, KIND.firefly);
    }
    return i;
  }
}

/** A single leaf floating slowly across the pond. Exposes its position. */
class FloatLeaf extends System {
  constructor(cfg, lw, d) {
    super(cfg, lw, d);
    this.x = cfg.area[0] + 0.2;
  }
  update(dt, env) {
    this.t += dt;
    const [x0, x1] = this.cfg.area;
    this.x += 0.006 * dt * env.speed;
    if (this.x > x1) this.x = x0;
  }
  get position() {
    const [x0, x1, y0, y1] = this.cfg.area;
    const u = (this.x - x0) / (x1 - x0);
    return [this.x, y0 + (y1 - y0) * (0.5 + 0.35 * Math.sin(u * 5 + 1))];
  }
  write(out, off) {
    const [x, y] = this.position;
    this.push(out, off, x, y, 0.012, 0.4 + Math.sin(this.t * 0.2) * 0.3, [0.55, 0.3, 0.16], 0.95, KIND.leaf, 1.7);
    return 1;
  }
}

const TYPES = { motes: Motes, leaves: Leaves, koi: Koi, smoke: Smoke, fireflies: Fireflies, floatleaf: FloatLeaf };

export function makeSystem(cfg, lw, density) {
  const T = TYPES[cfg.type];
  return T ? new T(cfg, lw, density) : null;
}
