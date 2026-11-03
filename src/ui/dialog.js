// Calm text panel with optional choices. say() resolves with the chosen id.
import { h, trapFocus } from './dom.js';

export class Dialog {
  constructor(root) {
    this.wrap = h('div', { class: 'dialog-wrap' });
    root.append(this.wrap);
    this.open = false;
  }
  say({ title, text, quote, note, choices }) {
    return new Promise((resolve) => {
      this.open = true;
      this.wrap.innerHTML = '';
      const list = choices && choices.length ? choices : [{ id: 'ok', label: 'Continue' }];
      let release;
      const done = (id) => {
        release?.();
        this.wrap.innerHTML = '';
        this.open = false;
        resolve(id);
      };
      const box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'false', 'aria-label': title || 'Moment' },
        title ? h('h2', {}, title) : null,
        text ? h('p', {}, text) : null,
        quote ? h('blockquote', {}, quote) : null,
        note ? h('p', { class: 'note' }, note) : null,
        h('div', { class: 'choices' }, list.map((c) => h('button', { onclick: () => done(c.id) }, c.label))),
      );
      this.wrap.append(box);
      // Escape picks the last, gentlest option (usually "leave" / "continue")
      release = trapFocus(box, () => done(list[list.length - 1].id));
    });
  }
}
