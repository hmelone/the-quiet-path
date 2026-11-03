// Visual quality tiers. "auto" starts from a guess and steps down if the
// frame rate stays low, quietly, without interrupting play.
import { settings } from '../core/settings.js';

export const TIERS = {
  low:    { pixelRatio: 1.0,  paintHeight: 640,  particles: 0.45, blur: false, photoW: 1200 },
  medium: { pixelRatio: 1.5,  paintHeight: 880,  particles: 0.75, blur: true,  photoW: 1500 },
  high:   { pixelRatio: 2.0,  paintHeight: 1150, particles: 1.0,  blur: true,  photoW: 1800 },
};

function guessTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(screen.width, screen.height) < 500;
  if (mem <= 2 || cores <= 2) return 'low';
  if (small || mem <= 4) return 'medium';
  return 'high';
}

class Quality {
  constructor() {
    this.autoTier = guessTier();
    this._samples = [];
    this._cooldown = 0;
    this.onChange = null;
  }
  get name() {
    const q = settings.get('quality');
    return q === 'auto' ? this.autoTier : q;
  }
  get tier() { return TIERS[this.name]; }
  get pixelRatio() {
    return Math.min(window.devicePixelRatio || 1, this.tier.pixelRatio);
  }
  /** Feed frame durations (ms). Steps auto quality down if sustained < ~40fps. */
  sample(dt) {
    if (settings.get('quality') !== 'auto') return;
    if (this._cooldown > 0) { this._cooldown -= dt; return; }
    this._samples.push(dt);
    if (this._samples.length < 120) return;
    const sorted = [...this._samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this._samples = [];
    if (median > 25 && this.autoTier !== 'low') {
      this.autoTier = this.autoTier === 'high' ? 'medium' : 'low';
      this._cooldown = 4000;
      this.onChange?.();
    }
  }
}

export const quality = new Quality();
