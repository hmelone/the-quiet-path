// The thought line: a brief, unobtrusive first-person thought near the bottom
// of the screen. You can keep walking and looking while it's there. If you do
// nothing it fades on its own; two quiet responses are offered.
import { h, wait } from './dom.js';
import { settings } from '../core/settings.js';

export class ThoughtView {
  constructor(root, { onRespond, onDone }) {
    this.onRespond = onRespond;
    this.onDone = onDone;
    this.text = h('p', { class: 'thought-text' });
    this.buttons = h('div', { class: 'thought-actions' });
    this.el = h('div', { class: 'thought-line', role: 'status', 'aria-live': 'polite', hidden: true }, this.text, this.buttons);
    root.append(this.el);
    this.current = null;
    // pause the fade while the pointer or keyboard focus is on it
    this.el.addEventListener('pointerenter', () => { this.hold = true; });
    this.el.addEventListener('pointerleave', () => { this.hold = false; });
    this.el.addEventListener('focusin', () => { this.hold = true; });
    this.el.addEventListener('focusout', () => { this.hold = false; });
  }

  get visible() { return !this.el.hidden; }

  show(t) {
    this.current = t;
    this.el.classList.remove('responded');
    this.text.textContent = t.text;
    this.buttons.innerHTML = '';
    const choices = t.kind === 'kind'
      ? [['linger', 'Linger with this'], ['pass', 'Let it pass']]
      : [['pass', 'Let it pass'], ['stay', 'Stay with it a moment']];
    for (const [id, label] of choices) {
      this.buttons.append(h('button', { class: `thought-btn t-${id}`, onclick: (e) => { e.stopPropagation(); this.respond(id); } }, label));
    }
    this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add('show'));
    // fade on its own if nothing is chosen (measured in real seconds)
    this._life = (7 + t.text.length * 0.045) * (settings.reducedMotion ? 1.2 : 1);
    this._last = performance.now();
    this._phase = 'thought';
  }

  async respond(id) {
    const t = this.current;
    if (!t || this._phase !== 'thought') return;
    this._phase = 'response';
    const line = id === 'linger' ? t.linger : id === 'stay' ? t.stay : t.pass;
    this.onRespond?.(t, id);
    this.el.classList.add('responded');
    this.buttons.innerHTML = '';
    this.text.textContent = line;
    this._life = id === 'pass' ? 5 : 9 + line.length * 0.03;
    this._last = performance.now();
  }

  /** Call every frame. */
  update() {
    const now = performance.now();
    const real = (now - (this._last || now)) / 1000;
    this._last = now;
    if (!this.current || this.hold) return;
    this._life -= real;
    if (this._life <= 0) this.fade();
  }

  async fade() {
    if (!this.current) return;
    const t = this.current;
    this.current = null;
    this.el.classList.remove('show');
    await wait(settings.reducedMotion ? 200 : 1600);
    if (!this.current) this.el.hidden = true;
    this.onDone?.(t);
  }

  /** Hide immediately (e.g. the camera is raised). */
  hideNow() {
    if (!this.current && this.el.hidden) return;
    const t = this.current;
    this.current = null;
    this.el.classList.remove('show');
    this.el.hidden = true;
    if (t) this.onDone?.(t);
  }
}
