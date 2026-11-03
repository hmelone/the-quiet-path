// Generated ambient music: slow pads and sparse gentle notes in a calm scale.
// It never repeats exactly, and its mood follows the time of day.
import { audio } from './audio.js';

const MOODS = {
  dawn:      { root: 62, scale: [0, 2, 4, 7, 9], noteGap: [6, 11], bright: 0.6 },   // D
  morning:   { root: 67, scale: [0, 2, 4, 7, 9], noteGap: [4, 8], bright: 1.0 },    // G
  afternoon: { root: 60, scale: [0, 2, 4, 7, 9], noteGap: [4, 9], bright: 0.9 },    // C
  evening:   { root: 65, scale: [0, 2, 4, 7, 9], noteGap: [6, 11], bright: 0.55 },  // F
  night:     { root: 57, scale: [0, 3, 5, 7, 10], noteGap: [9, 16], bright: 0.35 }, // A minor pentatonic
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

class Music {
  constructor() {
    this.mood = MOODS.morning;
    this.running = false;
  }

  start() {
    if (this.running || !audio.ctx) return;
    this.running = true;
    this.out = audio.ctx.createGain();
    this.out.gain.value = 0.9;
    this.lp = audio.ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 2400;
    // nothing low and steady: a high-pass removes anything that could read as a hum
    this.hp = audio.ctx.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 170;
    this.hp.Q.value = 0.5;
    this.out.connect(this.hp);
    this.hp.connect(this.lp);
    this.lp.connect(audio.bus.music);
    const send = audio.ctx.createGain();
    send.gain.value = 0.55;
    this.out.connect(send);
    send.connect(audio.reverb);
    this._padLoop();
    this._noteLoop();
  }

  setTime(timeName) {
    this.mood = MOODS[timeName] || MOODS.morning;
    if (this.lp) this.lp.frequency.setTargetAtTime(1200 + this.mood.bright * 2200, audio.ctx.currentTime, 4);
  }

  _padLoop() {
    if (!this.running) return;
    // leave some quiet between chords
    if (Math.random() < 0.7) this._pad();
    this._padT = setTimeout(() => this._padLoop(), rand(16, 26) * 1000);
  }

  _noteLoop() {
    if (!this.running) return;
    if (Math.random() < 0.85) this._note();
    const [a, b] = this.mood.noteGap;
    this._noteT = setTimeout(() => this._noteLoop(), rand(a, b) * 1000);
  }

  _pad() {
    const ctx = audio.ctx, t = ctx.currentTime + 0.1;
    const m = this.mood;
    const deg = [0, 2, 3][Math.floor(Math.random() * 3)];
    // mid register only (roughly 200-700 Hz): warm, never a low drone
    const base = m.root - 12 + m.scale[deg % m.scale.length];
    const voices = [base, base + 7, base + 12 + m.scale[(deg + 2) % m.scale.length]];
    const dur = 18;
    voices.forEach((n, vi) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(n);
      // a slow, slightly irregular waver, like breath on a reed
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(0.07, 0.16);
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = rand(3, 7); // cents
      lfo.connect(lfoAmt);
      lfoAmt.connect(o.detune);
      const g = ctx.createGain();
      const amp = 0.022 * (vi === 2 ? 0.6 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 7 + vi);
      g.gain.linearRampToValueAtTime(amp * 0.6, t + 12);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.out);
      o.start(t); lfo.start(t);
      o.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2);
    });
  }

  _note() {
    const ctx = audio.ctx, t = ctx.currentTime + 0.05;
    const m = this.mood;
    const oct = Math.random() < 0.7 ? 0 : 12;
    const n = m.root + m.scale[Math.floor(Math.random() * m.scale.length)] + oct;
    const f = hz(n);
    const play = (when, vel) => {
      for (const [mult, amp, dec] of [[1, 0.05, 3.2], [2, 0.014, 1.6], [3, 0.006, 0.9]]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(amp * vel, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dec);
        o.connect(g);
        g.connect(this.out);
        o.start(when);
        o.stop(when + dec + 0.1);
      }
    };
    play(t, 1);
    // sometimes a soft answering note
    if (Math.random() < 0.35) {
      const n2 = m.root + m.scale[Math.floor(Math.random() * m.scale.length)] + oct;
      const f2 = hz(n2);
      const o = ctx.createOscillator();
      o.frequency.value = f2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + 1.1);
      g.gain.exponentialRampToValueAtTime(0.03, t + 1.13);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g);
      g.connect(this.out);
      o.start(t + 1.1);
      o.stop(t + 3.6);
    }
  }
}

export const music = new Music();
