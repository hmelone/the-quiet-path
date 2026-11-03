// Game progress: where you are, what time it is, what has happened.
// Saved as small JSON in localStorage after every change.
import { Emitter } from './emitter.js';
import { Rng } from './rng.js';

const KEY = 'quietpath.progress.v1';
export const TIMES = ['dawn', 'morning', 'afternoon', 'evening', 'night'];
export const TIME_LABELS = ['Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const ROLL_SIZE = 24;

function freshState() {
  return {
    version: 1,
    started: false,
    day: 1,
    time: 1, // morning
    weather: 'mist',
    season: 'spring',
    place: 'gate',
    look: {},     // remembered look direction per place
    flags: {},
    visited: {},
    roll: { id: 1, shots: 0 },
    stamp: 0,     // counts time steps, used for "later" consequences
  };
}

/** Weather for a given day. Day 1 is misty, day 2 brings rain. */
export function weatherForDay(day, season) {
  if (day === 1) return 'mist';
  if (day === 2) return 'rain';
  const r = new Rng(`weather-${day}`);
  const table = season === 'winter'
    ? [['clear', 3], ['overcast', 3], ['mist', 2], ['snow', 3]]
    : [['clear', 4], ['overcast', 2], ['mist', 2], ['rain', 2]];
  const total = table.reduce((s, [, w]) => s + w, 0);
  let x = r.f() * total;
  for (const [w, n] of table) { x -= n; if (x <= 0) return w; }
  return 'clear';
}

class GameState extends Emitter {
  constructor() {
    super();
    this.s = freshState();
    this.storageOk = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        if (loaded && loaded.version === 1) this.s = { ...freshState(), ...loaded };
      }
      localStorage.setItem('quietpath.test', '1');
      localStorage.removeItem('quietpath.test');
    } catch {
      this.storageOk = false;
    }
  }
  get hasSave() { return this.s.started; }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* ignore */ }
  }
  reset() {
    this.s = freshState();
    this.save();
  }
  set(patch) {
    Object.assign(this.s, patch);
    this.save();
    this.emit('change', patch);
  }
  flag(k) { return this.s.flags[k]; }
  setFlag(k, v = true) {
    this.s.flags[k] = v;
    this.save();
    this.emit('flag', k, v);
  }
  get timeName() { return TIMES[this.s.time]; }
  get isDark() { return this.s.time >= 3 || this.s.time === 0; }

  /** Move time forward one step. Returns true if a new day began. */
  advanceTime() {
    let { time, day, season } = this.s;
    time += 1;
    let newDay = false;
    if (time >= TIMES.length) {
      time = 0;
      day += 1;
      newDay = true;
    }
    const patch = { time, day, stamp: this.s.stamp + 1 };
    if (newDay) {
      patch.weather = weatherForDay(day, season);
      // A finished roll is replaced each morning; a partly used one carries on.
      if (this.s.roll.shots >= ROLL_SIZE) patch.roll = { id: this.s.roll.id + 1, shots: 0 };
    }
    this.set(patch);
    return newDay;
  }
  /** Start the next day at dawn (used by sleeping). */
  sleep() {
    const day = this.s.day + 1;
    const patch = {
      day,
      time: 0,
      weather: weatherForDay(day, this.s.season),
      stamp: this.s.stamp + 1,
    };
    if (this.s.roll.shots >= ROLL_SIZE) patch.roll = { id: this.s.roll.id + 1, shots: 0 };
    this.set(patch);
  }
}

export const game = new GameState();
