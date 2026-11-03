// Heads-up layer: place name, corner buttons, points of interest,
// whispered narration, sound captions, fades and a screen-reader live region.
import { h, icon, wait } from './dom.js';
import { settings } from '../core/settings.js';

export class Hud {
  constructor(root, handlers) {
    this.handlers = handlers;
    root.append(h('div', { class: 'veil' }));
    this.poiLayer = h('div', { class: 'pois', role: 'group', 'aria-label': 'Things you can approach' });
    this.el = h('div', { class: 'hud' });
    this.label = h('div', { class: 'place-label', 'aria-hidden': 'true' });
    this.cameraBtn = h('button', { class: 'icon-btn big', 'aria-label': 'Raise camera (C)', onclick: () => handlers.camera() }, icon('camera'));
    this.el.append(
      this.label,
      h('div', { class: 'hud-buttons hud-tl' },
        h('button', { class: 'icon-btn', 'aria-label': 'Album (P)', onclick: () => handlers.album() }, icon('album')),
        h('button', { class: 'icon-btn', 'aria-label': 'Menu (Esc)', onclick: () => handlers.menu() }, icon('menu')),
      ),
      h('div', { class: 'hud-buttons hud-br' }, this.cameraBtn),
    );
    this.whispers = h('div', { class: 'whispers', 'aria-hidden': 'true' });
    this.captions = h('div', { class: 'captions', 'aria-hidden': 'true' });
    this.live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.fadeEl = h('div', { class: 'fade' });
    root.append(this.poiLayer, this.el, this.whispers, this.captions, this.live, this.fadeEl);
    this.pois = [];
    this.applyHints();
    settings.on('change', (k) => k === 'hints' && this.applyHints());
  }

  applyHints() {
    const v = settings.get('hints');
    this.poiLayer.classList.toggle('hints-subtle', v === 'subtle');
    this.poiLayer.classList.toggle('hints-off', v === 'off');
  }

  show(on) {
    this.el.classList.toggle('hidden', !on);
    this.poiLayer.style.display = on ? '' : 'none';
  }

  setPlace(name, sub) {
    this.label.innerHTML = '';
    this.label.append(name, h('small', {}, sub));
    this.label.style.opacity = 1;
    clearTimeout(this._lt);
    this._lt = setTimeout(() => { this.label.style.opacity = 0.35; }, 6000);
  }

  /** Build POI buttons. defs: [{id, kind, label, ...}] */
  setPois(defs) {
    this.poiLayer.innerHTML = '';
    this.pois = defs.map((d) => {
      const b = h('button', { class: `poi ${d.kind}`, 'aria-label': d.label, onclick: () => this.handlers.poi(d) },
        h('span', { class: 'mark' }), h('span', { class: 'tip' }, d.label));
      this.poiLayer.append(b);
      return { def: d, el: b };
    });
  }

  /** Position POIs from projected screen coords (fn returns [x,y] in px or null). */
  layoutPois(project) {
    const W = innerWidth, H = innerHeight;
    for (const p of this.pois) {
      const xy = project(p.def);
      const vis = xy && xy[0] > -10 && xy[0] < W + 10 && xy[1] > 0 && xy[1] < H;
      if (!vis) {
        if (p.el.style.visibility !== 'hidden') p.el.style.visibility = 'hidden';
        continue;
      }
      p.el.style.visibility = '';
      p.el.style.left = `${xy[0]}px`;
      p.el.style.top = `${xy[1]}px`;
    }
  }

  async whisper(text, ms) {
    const dur = ms || Math.max(4500, text.length * 70);
    const el = h('p', { class: 'whisper' }, text);
    this.whispers.append(el);
    this.announce(text);
    requestAnimationFrame(() => el.classList.add('show'));
    await wait(dur);
    el.classList.remove('show');
    await wait(1300);
    el.remove();
  }

  async caption(text) {
    const el = h('span', { class: 'caption' }, text);
    this.captions.append(el, h('br'));
    requestAnimationFrame(() => el.classList.add('show'));
    await wait(4500);
    el.classList.remove('show');
    await wait(700);
    el.nextSibling?.remove();
    el.remove();
  }

  announce(text) {
    this.live.textContent = '';
    setTimeout(() => { this.live.textContent = text; }, 50);
  }

  async fade(on, color = '#cfd5d2') {
    this.fadeEl.style.background = color;
    this.fadeEl.classList.toggle('on', on);
    await wait(settings.reducedMotion ? 150 : 650);
  }
}
