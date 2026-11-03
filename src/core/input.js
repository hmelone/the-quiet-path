// Unified pointer / touch / wheel / keyboard input for looking and the camera.
import { settings } from './settings.js';

export class Input {
  constructor(canvas, handlers) {
    this.c = canvas;
    this.h = handlers;
    this.pointers = new Map();
    this.keys = new Set();
    this.vel = 0;
    this.velY = 0;
    this._pinch = null;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.keydown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(e) {
    this.c.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.vel = 0;
    this.velY = 0;
    this.c.classList.add('dragging');
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this._pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    this.h.activity?.();
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this._pinch) this.h.zoom?.(d / this._pinch);
      this._pinch = d;
      return;
    }
    const sens = settings.get('lookSensitivity') * (settings.get('invertLook') ? -1 : 1);
    const lx = (dx / innerWidth) * sens;
    const ly = (dy / innerHeight) * sens;
    this.h.look?.(lx, ly);
    this.vel = this.vel * 0.6 + lx * 0.4;
    this.velY = this.velY * 0.6 + ly * 0.4;
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this._pinch = null;
    if (!this.pointers.size) this.c.classList.remove('dragging');
    if (!p) return;
    const moved = Math.hypot(p.x - p.sx, p.y - p.sy);
    if (moved < 9 && performance.now() - p.t < 400) {
      this.vel = 0;
      this.h.tap?.(p.x, p.y);
    }
    if (!settings.get('momentum') || settings.reducedMotion) { this.vel = 0; this.velY = 0; }
  }

  wheel(e) {
    e.preventDefault();
    if (e.ctrlKey || this.h.wheelZooms?.()) {
      this.h.zoom?.(Math.exp(-e.deltaY * 0.0015));
      return;
    }
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.h.look?.((-d / innerWidth) * 0.6, 0);
  }

  keydown(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd', 'w', 's', 'arrowup', 'arrowdown'].includes(k)) {
      this.keys.add(k);
      if (k.startsWith('arrow')) e.preventDefault();
    }
    this.h.key?.(k, e);
    this.h.activity?.();
  }

  /** Called every frame: momentum and held keys. Returns { dx, dy, f, s }. */
  step(dt) {
    let dx = 0, dy = 0;
    if (!this.pointers.size) {
      dx += this.vel;
      dy += this.velY;
      const decay = Math.pow(0.0025, dt);
      this.vel *= decay;
      this.velY *= decay;
      if (Math.abs(this.vel) < 1e-5) this.vel = 0;
      if (Math.abs(this.velY) < 1e-5) this.velY = 0;
    }
    const kspeed = 0.35 * dt * settings.get('lookSensitivity');
    if (this.keys.has('arrowleft')) dx += kspeed;
    if (this.keys.has('arrowright')) dx -= kspeed;
    let f = 0, s = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
    if (this.keys.has('a')) s -= 1;
    if (this.keys.has('d')) s += 1;
    return { dx, dy, f, s };
  }

  get dragging() { return this.pointers.size > 0 && [...this.pointers.values()].some((p) => Math.hypot(p.x - p.sx, p.y - p.sy) > 9); }
}
