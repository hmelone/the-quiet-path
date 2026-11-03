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
    this.route = r;
    this.onArrive = onArrive || null;
    this.faceAt = faceAt || null;
    return true;
  }

  stop() { this.route = null; this.onArrive = null; }

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
      if (d < 0.25) {
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
        if (autoTurn && !userLooking) this.lookTarget = Math.atan2(-dx, -dz);
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
    if (this.lookTarget != null && !userLooking) {
      let d = this.lookTarget - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const rate = reduced ? 1.2 : 2.0;
      this.yaw += d * Math.min(1, dt * rate);
      if (Math.abs(d) < 0.01) this.lookTarget = null;
    }
    // follow the ground smoothly (steps, bridge, floors)
    const gy = groundAt(this.x, this.z) + (this.seated ? 0.95 : EYE);
    this.y += (gy - this.y) * Math.min(1, dt * 8);
  }

  look(dYaw, dPitch) {
    this.yaw += dYaw;
    this.pitch = Math.max(-1.2, Math.min(1.1, this.pitch + dPitch));
    this.lookTarget = null;
  }

  applyTo(camera) {
    camera.position.set(this.x, this.y, this.z);
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
