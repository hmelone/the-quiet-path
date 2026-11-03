// The bell of mindfulness. Now and then the great bell sounds; everyone in
// the valley stops, and you are offered three breaths before life continues.
import { settings } from '../core/settings.js';

const GAP = { occasional: [360, 540], frequent: [180, 260] }; // seconds of real time

export class BellKeeper {
  constructor(onBell) {
    this.onBell = onBell;
    this.next = this._schedule(true);
    this.elapsed = 0;
  }

  _schedule(first = false) {
    const f = settings.get('bellFrequency');
    if (f === 'off') return Infinity;
    const [a, b] = GAP[f] || GAP.occasional;
    return (first ? 0.5 : 1) * (a + Math.random() * (b - a));
  }

  /** Advance only while the player is freely exploring. */
  update(dt, exploring) {
    if (!exploring) return;
    this.elapsed += dt;
    if (this.elapsed >= this.next) {
      this.elapsed = 0;
      this.next = this._schedule();
      this.onBell('mindfulness');
    }
  }

  reset() {
    this.elapsed = 0;
    this.next = this._schedule();
  }
}
