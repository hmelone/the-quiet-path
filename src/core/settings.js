// Player settings, stored separately from progress so "new stay" keeps them.
import { Emitter } from './emitter.js';

const KEY = 'quietpath.settings.v2';

export const DEFAULTS = {
  muted: false,         // sound on by default (v2); the title screen makes the choice clear
  master: 0.8,
  ambience: 0.8,
  effects: 0.7,
  bell: 0.8,
  music: 0.55,
  musicOn: true,
  bellFrequency: 'occasional', // off | occasional | frequent
  pauseForBell: true,
  thoughts: 'occasional', // off | rare | occasional
  fov: 62,
  autoTurn: true,
  quality: 'auto',      // auto | low | medium | high
  reducedMotion: 'system', // system | on | off
  textSize: 'm',        // s | m | l | xl
  highContrast: false,
  plainFont: false,
  captions: true,
  hints: 'on',          // on | subtle | off
  lookSensitivity: 1,
  invertLook: false,
  momentum: true,
  instantReview: false, // develop photos immediately instead of in the darkroom
  breathGuide: false,
};

class Settings extends Emitter {
  constructor() {
    super();
    this.values = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch { /* storage unavailable: use defaults */ }
    this.mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.mq?.addEventListener?.('change', () => this.emit('change', 'reducedMotion'));
  }
  get(k) { return this.values[k]; }
  set(k, v) {
    this.values[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch { /* ignore */ }
    this.emit('change', k);
  }
  get reducedMotion() {
    const v = this.values.reducedMotion;
    if (v === 'on') return true;
    if (v === 'off') return false;
    return !!this.mq?.matches;
  }
}

export const settings = new Settings();
