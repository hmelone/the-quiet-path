// First-person walking: tap-to-walk along routed paths, WASD with gentle
// sliding, eased turning, comfortable speeds, and a pause for the bell.
import { groundAt, surfaceAt } from './terrain.js';

const EYE = 1.62;

export class Player {
  constructor(nav, { x, z, yaw }) {
    this.nav = nav;
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = -0.04;
    this.y = groundAt(x, z) + EYE;
    this.route = null;
    this.onArrive = null;
    this.speed = 1.45;
    this.pause = 0;          // 0..1, eased stop for the bell
    this.lookTarget = null;  // yaw to ease toward
    this.stepDist = 0;
    this.onStep = null;
    this.moving = false;
  }

  /** Walk to a point; calls onArrive when there (or null if no way). */
  walkTo(x, z, onArrive, faceAt) {
    const r = this.nav.route(this.x, this.z, x, z);
    if (!r) { this.route = null; return false; }
    r.shift();
    this.route = this.smooth([[this.x, this.z], ...r]).slice(1);
    this.onArrive = onArrive || null;
    this.faceAt = faceAt || null;
    return true;
  }

  stop() { this.route = null; this.onArrive = null; }

  /** Round off route corners (Chaikin), keeping only steps that stay walkable. */
  smooth(pts) {
    let out = pts;
    for (let it = 0; it < 2 && out.length >= 3; it++) {
      const next = [out[0]];
      for (let i = 0; i < out.length - 1; i++) {
        const [ax, az] = out[i], [bx, bz] = out[i + 1];
        const q = [ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25];
        const r = [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75];
        if (i > 0) next.push(this.nav.walkable(q[0], q[1]) ? q : out[i]);
        if (i < out.length - 2) next.push(this.nav.walkable(r[0], r[1]) ? r : out[i + 1]);
      }
      next.push(out[out.length - 1]);
      out = next;
    }
    return out;
  }

  /** A point a few metres ahead along the route, for a calm walking view. */
  lookAhead(dist = 3.5) {
    let px = this.x, pz = this.z, left = dist;
    for (const [x, z] of this.route) {
      const d = Math.hypot(x - px, z - pz);
      if (d >= left) return [px + ((x - px) / d) * left, pz + ((z - pz) / d) * left];
      left -= d; px = x; pz = z;
    }
    return [px, pz];
  }

  /** Free movement from keys: forward/back (f), strafe (s), in m/s scale 0..1. */
  update(dt, { f = 0, s = 0, userLooking = false, autoTurn = true, reduced = false }) {
    const pace = 1 - this.pause;
    let mx = 0, mz = 0;
    if (f || s) {
      this.route = null;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = -fz, rz = fx;
      mx = (fx * f + rx * s) * 1.9;
      mz = (fz * f + rz * s) * 1.9;
    } else if (this.route && this.route.length) {
      const [tx, tz] = this.route[0];
      const dx = tx - this.x, dz = tz - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) {
        this._lastD = Infinity;
        this.route.shift();
        if (!this.route.length) {
          this.route = null;
          const cb = this.onArrive;
          this.onArrive = null;
          if (this.faceAt) this.lookTarget = Math.atan2(-(this.faceAt[0] - this.x), -(this.faceAt[1] - this.z));
          cb?.();
        }
      } else {
        const ease = Math.min(1, d / 0.6 + 0.35);
        mx = (dx / d) * this.speed * ease;
        mz = (dz / d) * this.speed * ease;
        // face the way you're walking only if you haven't been looking around lately
        if (autoTurn && !userLooking && this.sinceLook > 5) {
          const [ax, az] = this.lookAhead();
          if (Math.hypot(ax - this.x, az - this.z) > 0.8) this.lookTarget = Math.atan2(-(ax - this.x), -(az - this.z));
        }
        // if something blocks this step for a moment, move on to the next one
        if (d < (this._lastD ?? Infinity) - 0.01) { this._lastD = d; this._stuck = 0; }
        else if ((this._stuck = (this._stuck || 0) + dt) > 1.2 && this.route.length > 1) { this.route.shift(); this._lastD = Infinity; this._stuck = 0; }
      }
    }
    mx *= pace; mz *= pace;
    const nx = this.x + mx * dt, nz = this.z + mz * dt;
    // slide along obstacles
    if (this.nav.walkable(nx, nz)) { this.x = nx; this.z = nz; }
    else if (this.nav.walkable(nx, this.z)) this.x = nx;
    else if (this.nav.walkable(this.x, nz)) this.z = nz;
    const moved = Math.hypot(mx, mz) * dt;
    this.moving = moved > 0.0005;
    this.stepDist += moved;
    if (this.stepDist > 0.72) {
      this.stepDist = 0;
      this.onStep?.(surfaceAt(this.x, this.z));
    }
    // ease the view toward the walking direction (gently)
    this.sinceLook = (this.sinceLook ?? 99) + dt;
    if (userLooking) this.sinceLook = 0;
    if (this.lookTarget != null && !userLooking) {
      let d = this.lookTarget - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const rate = reduced ? 0.7 : 1.1;
      this.yaw += d * Math.min(1, dt * rate);
      if (Math.abs(d) < 0.01) this.lookTarget = null;
    }
    // follow the ground smoothly (steps, bridge, floors)
    const gy = groundAt(this.x, this.z) + (this.seated ? 0.95 : EYE);
    this.y += (gy - this.y) * Math.min(1, dt * 8);
  }

  look(dYaw, dPitch) {
    this.sinceLook = 0;
    this.yaw += dYaw;
    this.pitch = Math.max(-1.2, Math.min(1.1, this.pitch + dPitch));
    this.lookTarget = null;
  }

  applyTo(camera) {
    camera.position.set(this.x, this.y, this.z);
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
