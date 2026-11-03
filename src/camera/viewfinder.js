// The viewfinder overlay: frame, zoom, focus, shutter.
import { h, icon } from '../ui/dom.js';
import { ROLL_SIZE } from '../core/state.js';

export class Viewfinder {
  constructor(root, handlers) {
    this.handlers = handlers;
    this.active = false;
    this.zoom = 1;
    this.fy = 0.5;
    this.focus = null;
    this.el = h('div', { class: 'viewfinder', hidden: true, role: 'region', 'aria-label': 'Camera viewfinder' });
    this.masks = [0, 1, 2, 3].map(() => h('div', { class: 'vf-mask' }));
    this.frame = h('div', { class: 'vf-frame', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
    this.ring = h('div', { class: 'vf-focus', 'aria-hidden': 'true' });
    this.info = h('div', { class: 'vf-info', 'aria-live': 'polite' });
    this.promptEl = h('div', { class: 'vf-prompt' });
    this.zoomInput = h('input', { type: 'range', min: 1, max: 3, step: 0.01, value: 1, 'aria-label': 'Zoom', oninput: (e) => this.setZoom(+e.target.value) });
    this.shutterBtn = h('button', { class: 'shutter', 'aria-label': 'Take photograph (Space)', onclick: () => handlers.shutter() });
    this.el.append(...this.masks, this.frame, this.ring, this.info, this.promptEl,
      h('div', { class: 'vf-side' },
        h('button', { class: 'icon-btn', 'aria-label': 'Lower camera (Esc)', onclick: () => handlers.close() }, icon('close')),
        h('button', { class: 'icon-btn', 'aria-label': 'Change focus: near, middle, far (F)', onclick: () => this.cycleFocus() }, icon('focus')),
      ),
      h('div', { class: 'vf-controls' },
        h('div', { class: 'zoom' }, h('span', { 'aria-hidden': 'true' }, '−'), this.zoomInput, h('span', { 'aria-hidden': 'true' }, '+')),
        this.shutterBtn,
      ));
    root.append(this.el);
  }

  open(prompt) {
    this.active = true;
    this.el.hidden = false;
    this.zoom = 1;
    this.fy = 0.5;
    this.focus = null;
    this.zoomInput.value = 1;
    this.promptEl.textContent = prompt ? `Keeping in mind: ${prompt}` : '';
    this.layout();
    setTimeout(() => this.shutterBtn.focus(), 50);
  }
  close() {
    this.active = false;
    this.el.hidden = true;
  }
  setZoom(z) {
    this.zoom = Math.max(1, Math.min(3, z));
    this.zoomInput.value = this.zoom;
    this.clampPan();
    this.updateInfo();
  }
  pan(dy) {
    this.fy += dy / this.zoom;
    this.clampPan();
  }
  clampPan() {
    const half = 0.5 / this.zoom;
    this.fy = Math.max(half, Math.min(1 - half, this.fy));
  }
  cycleFocus() {
    const seq = [null, 0.85, 0.5, 0.15];
    const i = seq.indexOf(this.focus);
    this.focus = seq[(i + 1) % seq.length];
    this.updateInfo();
    this.handlers.focusChanged?.();
  }
  setFocusAt(depth, px, py) {
    this.focus = depth;
    this.ring.style.left = `${px}px`;
    this.ring.style.top = `${py}px`;
    this.ring.classList.add('show');
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this.ring.classList.remove('show'), 900);
    this.updateInfo();
  }
  /** Visible sub-rect of the base view after zooming. */
  get zoomSub() {
    const w = 1 / this.zoom;
    return { x: 0.5 - w / 2, y: this.fy - w / 2, w, h: w };
  }
  /** The capture rectangle as a fraction of the screen. */
  get frameSub() {
    const r = this.rect;
    return { x: r.x / innerWidth, y: r.y / innerHeight, w: r.w / innerWidth, h: r.h / innerHeight };
  }
  get portrait() { return innerHeight > innerWidth; }
  layout() {
    const W = innerWidth, H = innerHeight;
    const top = 50, bottom = 110, side = W < 600 ? 12 : 70;
    const aw = W - side * 2, ah = H - top - bottom;
    const ratio = this.portrait ? 2 / 3 : 3 / 2;
    let w = aw, hh = aw / ratio;
    if (hh > ah) { hh = ah; w = hh * ratio; }
    const x = (W - w) / 2, y = top + (ah - hh) / 2;
    this.rect = { x, y, w, h: hh };
    const [m0, m1, m2, m3] = this.masks;
    Object.assign(m0.style, { left: 0, top: 0, width: '100%', height: `${y}px` });
    Object.assign(m1.style, { left: 0, top: `${y + hh}px`, width: '100%', bottom: 0 });
    Object.assign(m2.style, { left: 0, top: `${y}px`, width: `${x}px`, height: `${hh}px` });
    Object.assign(m3.style, { left: `${x + w}px`, top: `${y}px`, right: 0, height: `${hh}px` });
    Object.assign(this.frame.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hh}px` });
    this.updateInfo();
  }
  updateInfo(shots) {
    if (shots != null) this._shots = shots;
    const left = ROLL_SIZE - (this._shots ?? 0);
    const f = this.focus == null ? 'auto focus' : this.focus > 0.7 ? 'focus: near' : this.focus > 0.3 ? 'focus: middle' : 'focus: far';
    this.info.textContent = left > 0
      ? `${left} ${left === 1 ? 'frame' : 'frames'} left · ${this.zoom.toFixed(1)}× · ${f}`
      : 'Roll finished · a fresh roll waits for you tomorrow';
  }
}
