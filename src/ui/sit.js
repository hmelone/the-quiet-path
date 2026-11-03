// Sitting: the interface steps back, sound comes forward,
// and now and then a thought drifts in. Leave it, or follow it.
import { h, wait } from './dom.js';
import { settings } from '../core/settings.js';
import { THOUGHTS, thoughtFollow } from '../story/content.js';

const OPENINGS = {
  zendo: 'You bow to your cushion, sit, and settle. The hall is very quiet.',
  veranda: 'You sit on the edge of the veranda, feet above the moss. The garden goes on doing what it does.',
  pond: 'You sit on the flat stone. The water moves a little, then is still.',
};

export class Sitting {
  constructor(root, { dialog, whisper, audio }) {
    this.root = root;
    this.dialog = dialog;
    this.whisper = whisper;
    this.audio = audio;
    this.active = false;
  }

  /** Resolves 'stand' or 'bell' (stay until the next bell). */
  start(kind) {
    return new Promise((resolve) => {
      this.active = true;
      this.audio.rin();
      const breath = settings.get('breathGuide') ? h('div', { class: 'breath', 'aria-hidden': 'true' }) : null;
      const thought = h('button', { class: 'thought', tabindex: '-1', 'aria-label': 'A thought. Activate to follow it, or leave it.' });
      const end = (how) => {
        if (!this.active) return;
        this.active = false;
        clearTimeout(this._t);
        clearTimeout(this._f);
        el.remove();
        resolve(how);
      };
      const controls = h('div', { class: 'sit-controls' },
        h('button', { onclick: () => end('stand') }, 'Stand up'),
        h('button', { onclick: () => end('bell') }, 'Sit until the next bell'),
      );
      const el = h('div', { class: 'sit-layer', role: 'region', 'aria-label': 'Sitting' }, breath, thought, controls);
      this.root.append(el);
      this.whisper(OPENINGS[kind] || 'You sit.', 6000);
      setTimeout(() => controls.querySelector('button')?.focus(), 100);
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape') end('stand'); });

      let last = null;
      const schedule = () => {
        this._t = setTimeout(showThought, (25 + Math.random() * 25) * 1000);
      };
      const showThought = () => {
        if (!this.active) return;
        // sometimes the same thought returns
        const returning = last && Math.random() < 0.35;
        const text = returning ? last : THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
        last = text;
        thought.textContent = returning ? `${text} (It’s back.)` : text;
        thought.tabIndex = 0;
        thought.classList.add('show');
        thought.onclick = async () => {
          thought.classList.remove('show');
          thought.tabIndex = -1;
          clearTimeout(this._f);
          const { follow, back } = thoughtFollow(Math.random);
          await this.dialog.say({ text: follow });
          await this.dialog.say({ text: back, choices: [{ id: 'ok', label: 'Come back' }] });
          if (this.active) { controls.querySelector('button')?.focus(); schedule(); }
        };
        // left alone, it fades by itself
        this._f = setTimeout(() => {
          thought.classList.remove('show');
          thought.tabIndex = -1;
          schedule();
        }, 11000);
      };
      schedule();
    });
  }
}

export { wait };
