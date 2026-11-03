// Heads-up layer: place name, corner buttons, world icons (look / go / sit /
// talk / bell) with labels, a "Nearby" tray of the same things as buttons,
// whispered narration, sound captions, fades and a screen-reader live region.
import { h, icon, wait } from './dom.js';
import { settings } from '../core/settings.js';
import { KINDS } from '../world3d/interactables.js';

export class Hud {
  constructor(root, handlers) {
    this.handlers = handlers;
    root.append(h('div', { class: 'veil' }));
    this.iconLayer = h('div', { class: 'pois', 'aria-hidden': 'true' });
    this.el = h('div', { class: 'hud' });
    this.label = h('div', { class: 'place-label', 'aria-hidden': 'true' });
    this.cameraBtn = h('button', { class: 'icon-btn big', 'aria-label': 'Raise camera (C)', onclick: () => handlers.camera() }, icon('camera'));
    this.soundBtn = h('button', { class: 'icon-btn', onclick: () => handlers.sound() });
    this.nearby = h('div', { class: 'nearby', role: 'group', 'aria-label': 'Nearby' });
    this.el.append(
      this.label,
      h('div', { class: 'hud-buttons hud-tl' },
        this.soundBtn,
        h('button', { class: 'icon-btn', 'aria-label': 'Album (P)', onclick: () => handlers.album() }, icon('album')),
        h('button', { class: 'icon-btn', 'aria-label': 'Menu (Esc)', onclick: () => handlers.menu() }, icon('menu')),
      ),
      h('div', { class: 'hud-buttons hud-br' }, this.cameraBtn),
      this.nearby,
    );
    this.whispers = h('div', { class: 'whispers', 'aria-hidden': 'true' });
    this.captions = h('div', { class: 'captions', 'aria-hidden': 'true' });
    this.live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.fadeEl = h('div', { class: 'fade' });
    root.append(this.iconLayer, this.el, this.whispers, this.captions, this.live, this.fadeEl);
    this.icons = new Map();
    this.nearbyKey = '';
    this.applyHints();
    this.updateSound();
    settings.on('change', (k) => {
      if (k === 'hints') this.applyHints();
      if (k === 'muted') this.updateSound();
    });
  }

  updateSound() {
    const m = settings.get('muted');
    this.soundBtn.innerHTML = '';
    this.soundBtn.append(icon(m ? 'mute' : 'sound'));
    this.soundBtn.setAttribute('aria-label', m ? 'Sound is off — turn on' : 'Sound is on — turn off');
    this.soundBtn.setAttribute('aria-pressed', String(!m));
  }

  applyHints() {
    const v = settings.get('hints');
    this.iconLayer.classList.toggle('hints-subtle', v === 'subtle');
    this.iconLayer.classList.toggle('hints-off', v === 'off');
  }

  show(on) {
    this.el.classList.toggle('hidden', !on);
    this.iconLayer.style.display = on ? '' : 'none';
  }

  setPlace(name, sub) {
    this.label.innerHTML = '';
    this.label.append(name, h('small', {}, sub));
    this.label.style.opacity = 1;
    clearTimeout(this._lt);
    this._lt = setTimeout(() => { this.label.style.opacity = 0.4; }, 6000);
  }

  /**
   * Update world icons. items: [{ it, x, y, dist, near }] already projected (CSS px).
   * nearest: the closest item (its label always shows).
   */
  layout(items, nearest) {
    const seen = new Set();
    for (const { it, x, y, dist } of items) {
      seen.add(it.id);
      let el = this.icons.get(it.id);
      if (!el) {
        el = h('button', { class: `poi k-${it.kind}`, tabindex: '-1', onclick: () => this.handlers.use(it) },
          h('span', { class: 'mark' }, icon(KINDS[it.kind].icon)), h('span', { class: 'tip' }, it.label));
        this.iconLayer.append(el);
        this.icons.set(it.id, el);
      }
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.opacity = String(Math.max(0.35, Math.min(1, 1.4 - dist / 14)));
      el.classList.toggle('nearest', nearest && nearest.id === it.id);
    }
    for (const [id, el] of this.icons) if (!seen.has(id)) { el.remove(); this.icons.delete(id); }
  }

  /** Accessible list of nearby things as real buttons. */
  setNearby(list) {
    const key = list.map((i) => i.id).join(',');
    if (key === this.nearbyKey) return;
    this.nearbyKey = key;
    this.nearby.innerHTML = '';
    if (!list.length) return;
    this.nearby.append(h('span', { class: 'nearby-title' }, 'Nearby'));
    for (const it of list.slice(0, 5)) {
      this.nearby.append(h('button', { class: `nearby-item k-${it.kind}`, onclick: () => this.handlers.use(it), 'aria-label': `${KINDS[it.kind].verb}: ${it.label}` },
        h('span', { class: 'ni-icon' }, icon(KINDS[it.kind].icon)), h('span', {}, it.label)));
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
    await wait(settings.reducedMotion ? 150 : 700);
  }
}
