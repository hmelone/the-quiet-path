// Procedural environmental sound. Everything is synthesised with Web Audio,
// so there is nothing to download and every layer responds to weather and time.
import { settings } from '../core/settings.js';

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Noise that loops seamlessly: generated a little long, DC-free, and with the
 * tail crossfaded into the head, so there is no periodic click or thump.
 */
function noiseBuffer(ctx, type, seconds = 12) {
  const fade = Math.floor(ctx.sampleRate * 1.5);
  const len = Math.floor(ctx.sampleRate * seconds);
  const raw = new Float32Array(len + fade);
  let last = 0, b0 = 0, b1 = 0, b2 = 0, mean = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;
    let v;
    if (type === 'brown') { last = (last + 0.02 * w) / 1.02; v = last * 3.5; }
    else if (type === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      v = (b0 + b1 + b2 + w * 0.1848) * 0.12;
    } else v = w * 0.5;
    mean = mean * 0.9995 + v * 0.0005; // slow DC removal
    raw[i] = v - mean;
  }
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = raw[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    d[i] = raw[i] * Math.sqrt(k) + raw[len + i] * Math.sqrt(1 - k);
  }
  return buf;
}

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.beds = {};
    this.profile = {};
    this.env = { daylight: 1, rain: 0, wind: 0.5, night: false, time: 1 };
    this.onCaption = null;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.bus = {};
    for (const k of ['ambience', 'effects', 'bell', 'music']) {
      this.bus[k] = ctx.createGain();
      this.bus[k].connect(this.master);
    }
    this.noise = { white: noiseBuffer(ctx, 'white'), pink: noiseBuffer(ctx, 'pink'), brown: noiseBuffer(ctx, 'brown') };
    // simple generated reverb
    this.reverb = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 3.5, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    this.reverb.buffer = ir;
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.35;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
    this._makeBeds();
    this.applySettings();
    settings.on('change', () => this.applySettings());
    this._timer = setInterval(() => this._tick(), 200);
  }

  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = settings.values;
    this.master.gain.setTargetAtTime(v.muted ? 0 : v.master, t, 0.3);
    this.bus.ambience.gain.setTargetAtTime(v.ambience * (this.ambDuck ?? 1), t, 0.6);
    this.bus.effects.gain.setTargetAtTime(v.effects, t, 0.2);
    this.bus.bell.gain.setTargetAtTime(v.bell, t, 0.2);
    this.bus.music.gain.setTargetAtTime(v.musicOn ? v.music * (this.duck ?? 1) : 0, t, 0.8);
  }

  /** Lower the nature sound (listening to a talk). k: 0..1 */
  setAmbienceDuck(k) {
    this.ambDuck = k;
    this.applySettings();
  }

  /** Lower the music (bells, sitting). k: 0..1 */
  setDuck(k) {
    this.duck = k;
    this.applySettings();
  }

  _loop(buf, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, Math.random() * 3);
    return s;
  }

  _bed(name, src, filters) {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    let node = src;
    for (const f of filters) { node.connect(f); node = f; }
    node.connect(g);
    g.connect(this.bus.ambience);
    this.beds[name] = { gain: g, filters, level: 0 };
  }

  _makeBeds() {
    const c = this.ctx;
    const bp = (f, q) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; };
    const lp = (f) => { const b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; return b; };
    const hp = (f) => { const b = c.createBiquadFilter(); b.type = 'highpass'; b.frequency.value = f; return b; };
    this.windLp = lp(380);
    this._bed('wind', this._loop(this.noise.brown), [hp(40), this.windLp]);
    this._bed('leaves', this._loop(this.noise.pink), [bp(2600, 0.45)]);
    this.streamPan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    this._bed('stream', this._loop(this.noise.white, 0.9), [bp(800, 0.8), lp(2500), this.streamPan]);
    this._bed('trickle', this._loop(this.noise.pink), [bp(1800, 0.9)]);
    this.rainLp = lp(7000);
    this._bed('rain', this._loop(this.noise.white, 0.8), [hp(700), this.rainLp]);
    this._bed('room', this._loop(this.noise.pink, 0.7), [hp(60), lp(400)]);
  }

  /** Set the sound profile for a place, crossfading over a couple of seconds. */
  setScene(profile, env) {
    this.profile = profile || {};
    this.env = env;
    this._applyBeds(1.8);
  }

  updateEnv(env) {
    this.env = env;
    this._applyBeds(3);
  }

  _applyBeds(tc) {
    if (!this.ctx) return;
    const p = this.profile, e = this.env, t = this.ctx.currentTime;
    const muffled = p.muffled ? 1 : 0;
    const target = {
      wind: (p.wind ?? 0.3) * (0.2 + e.wind * 0.3) * 0.16,
      leaves: (p.leaves ?? 0.3) * (0.1 + e.wind * 0.2) * 0.18,
      stream: (p.stream ?? 0) * 0.2,
      trickle: (p.trickle ?? 0) * 0.05,
      rain: e.rain * (muffled ? 0.22 : 0.3),
      room: (p.room ?? 0) * 0.03,
    };
    for (const k in target) this.beds[k]?.gain.gain.setTargetAtTime(target[k], t, tc);
    this.rainLp.frequency.setTargetAtTime(muffled ? 900 : 7000, t, 0.5);
  }

  _tick() {
    if (!this.ctx || settings.get('muted')) return;
    const p = this.profile, e = this.env;
    const t = this.ctx.currentTime;
    // gusts
    // an occasional gentle breeze, then calm again (not a storm)
    if (Math.random() < 0.012 && !this._gusting) {
      this._gusting = true;
      const g = this.beds.wind.gain.gain, l = this.beds.leaves.gain.gain;
      const base = (p.wind ?? 0.3) * (0.2 + e.wind * 0.3) * 0.16;
      const lb = (p.leaves ?? 0.3) * (0.1 + e.wind * 0.2) * 0.18;
      const k = rand(1.25, 1.7), dur = rand(3, 6);
      g.setTargetAtTime(base * k, t, 1.6);
      l.setTargetAtTime(lb * k, t + 0.4, 1.4);
      this.windLp.frequency.setTargetAtTime(520, t, 2);
      g.setTargetAtTime(base, t + dur, 2.5);
      l.setTargetAtTime(lb, t + dur, 2.2);
      this.windLp.frequency.setTargetAtTime(380, t + dur, 3);
      setTimeout(() => { this._gusting = false; }, (dur + 6) * 1000);
    }
    const birdRate = (p.birds ?? 0) * e.daylight * (1 - e.rain * 0.8) * (p.muffled ? 0.4 : 1);
    if (Math.random() < birdRate * 0.07) this._bird(p.muffled ? 0.3 : 1);
    if (e.night && !p.muffled && Math.random() < 0.25 * (1 - e.rain)) this._cricket();
    if ((p.frogs ?? 0) && (e.time >= 3 || e.rain) && Math.random() < 0.03 * p.frogs) this._frog();
    if (e.rain && Math.random() < 0.5 * (p.muffled ? 0.3 : 1)) this._drip();
    if (p.room && Math.random() < 0.006) this._creak();
    // forest voices: a woodpecker by day, an owl at night
    const fr = p.forest ?? 0;
    if (fr > 0.2 && e.daylight > 0.4 && !e.rain && Math.random() < 0.006 * fr) this._woodpecker();
    if (fr > 0.15 && e.night && e.time === 4 && Math.random() < 0.01 * fr) this._owl();
  }

  // --- small synth voices ---------------------------------------------------

  _env(node, t, a, peak, dur, bus = 'ambience', pan = 0, toReverb = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    let out = g;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    out.connect(this.bus[bus]);
    if (toReverb) {
      const s = this.ctx.createGain();
      s.gain.value = toReverb;
      out.connect(s);
      s.connect(this.reverb);
    }
    return g;
  }

  _tone(t, f0, f1, dur, peak, { type = 'sine', bus = 'ambience', pan = 0, verb = 0.2 } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this._env(o, t, Math.min(0.02, dur * 0.3), peak, dur, bus, pan, verb);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _burst(t, dur, peak, filterType, freq, q = 1, bus = 'effects', pan = 0, verb = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise.white;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    s.connect(f);
    this._env(f, t, Math.min(0.005, dur * 0.2), peak, dur, bus, pan, verb);
    s.start(t, Math.random() * 3);
    s.stop(t + dur + 0.05);
  }

  _bird(vol = 1) {
    const t = this.ctx.currentTime + 0.05;
    const pan = rand(-0.8, 0.8);
    const v = 0.05 * vol * rand(0.5, 1);
    const kind = Math.random();
    if (kind < 0.25) {
      // bush-warbler-like: long whistle then a quick flourish
      this._tone(t, 1150, 1230, 0.7, v, { pan });
      this._tone(t + 0.85, 2100, 1500, 0.14, v, { pan });
      this._tone(t + 1.02, 2700, 2200, 0.12, v, { pan });
      this._tone(t + 1.18, 2500, 1700, 0.3, v, { pan });
    } else if (kind < 0.6) {
      const n = Math.floor(rand(3, 7));
      const base = rand(2600, 4200);
      for (let i = 0; i < n; i++) this._tone(t + i * rand(0.08, 0.14), base * rand(0.95, 1.15), base * rand(0.7, 0.9), 0.06, v * 0.8, { pan });
    } else {
      const f = rand(4800, 6200);
      for (let i = 0; i < 2; i++) this._tone(t + i * 0.32, f, f * 1.05, 0.18, v * 0.6, { pan });
    }
  }

  _cricket() {
    const t = this.ctx.currentTime;
    const f = rand(4200, 4700), pan = rand(-0.9, 0.9);
    for (let i = 0; i < 3; i++) this._tone(t + i * 0.06, f, f, 0.04, 0.012, { pan, verb: 0 });
  }

  /** A soft frog croak: a quick pulse train of filtered noise (no pitch sweep). */
  _frog() {
    const t0 = this.ctx.currentTime + 0.05;
    const pan = rand(-0.7, 0.7), f = rand(500, 800);
    const pulses = Math.floor(rand(4, 8));
    const calls = Math.random() < 0.5 ? 1 : 2;
    for (let c = 0; c < calls; c++) {
      for (let i = 0; i < pulses; i++) {
        this._burst(t0 + c * 0.45 + i * 0.028, 0.02, 0.018, 'bandpass', f, 4, 'ambience', pan, 0.15);
      }
    }
  }

  /** A raindrop: a tiny filtered tick, not a whistle. */
  _drip() {
    const t = this.ctx.currentTime + rand(0, 0.2);
    this._burst(t, 0.012, rand(0.006, 0.014), 'bandpass', rand(2500, 5000), 1.5, 'ambience', rand(-1, 1), 0.1);
  }

  // The forest scheduler still uses these voices. Keep their envelopes gentle
  // and omit pitch sweeps, matching the quieter sound-effects update.
  _woodpecker() {
    const t0 = this.ctx.currentTime + 0.05;
    const pan = rand(-0.9, 0.9);
    const n = Math.floor(rand(10, 18));
    for (let i = 0; i < n; i++) {
      this._burst(t0 + i * 0.055, 0.025, 0.025 * (1 - i / (n * 1.3)),
        'bandpass', rand(1300, 1500), 6, 'ambience', pan, 0.3);
    }
  }

  _owl() {
    const t = this.ctx.currentTime + 0.1;
    const pan = rand(-0.8, 0.8), f = rand(360, 420);
    // Fixed-frequency hoots: no rising or falling "boing" contour.
    for (const [delay, dur, peak] of [[0, 0.35, 0.035], [0.9, 0.18, 0.025], [1.15, 0.5, 0.03]]) {
      this._tone(t + delay, f, f, dur, peak, { pan, verb: 0.6 });
    }
  }

  /** Old wood settling: a soft, short rasp of filtered noise. */
  /** A hawk's cry, far overhead: a rasping, falling scream made of filtered noise. */
  hawk() {
    if (!this.ctx || settings.get('muted')) return;
    this.caption('[a hawk cries, high overhead]');
    const t = this.ctx.currentTime + 0.05;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise.white;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 9;
    f.frequency.setValueAtTime(3000, t);
    f.frequency.linearRampToValueAtTime(2100, t + 1.1);
    s.connect(f);
    this._env(f, t, 0.06, 0.05, 1.2, 'ambience', rand(-0.6, 0.6), 0.5);
    s.start(t, Math.random() * 3);
    s.stop(t + 1.3);
  }

  /** An owl's soft hoots as it glides over. */
  owlHoot() {
    if (!this.ctx || settings.get('muted')) return;
    this.caption('[an owl hoots as it glides over]');
    this._owl?.();
  }

  _creak() {
    const t = this.ctx.currentTime;
    const pan = rand(-0.6, 0.6);
    for (let i = 0; i < 5; i++) this._burst(t + i * 0.05, 0.05, 0.006, 'bandpass', rand(380, 520), 3, 'ambience', pan, 0.3);
  }


  // --- public one-shots -------------------------------------------------------

  caption(text) { if (settings.get('captions')) this.onCaption?.(text); }

  /** A large temple bell, struck far away. */
  bell(caption = '[a bell rings, far off]') {
    this.caption(caption);
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.1;
    const base = 128;
    const partials = [[0.5, 0.6, 12], [1, 1, 10], [1.007, 0.6, 10], [2.0, 0.5, 7], [2.76, 0.35, 5], [5.4, 0.15, 3], [8.93, 0.08, 2]];
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    for (const [r, a, d] of partials) {
      const o = this.ctx.createOscillator();
      o.frequency.value = base * r;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07 * a, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + d + 0.1);
    }
    const out = this.ctx.createGain();
    out.gain.value = 1;
    lp.connect(out);
    out.connect(this.bus.bell);
    const s = this.ctx.createGain();
    s.gain.value = 0.6;
    out.connect(s);
    s.connect(this.reverb);
  }

  /** A small hand bell, close by (start and end of sitting). */
  rin(caption = '[a small bell]') {
    this.caption(caption);
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    for (const [r, a, d] of [[1, 1, 6], [2.71, 0.4, 4], [5.2, 0.2, 2.5], [1.004, 0.5, 6]]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = 720 * r;
      this._env(o, t, 0.005, 0.05 * a, d, 'bell', 0, 0.3);
      o.start(t);
      o.stop(t + d + 0.1);
    }
  }

  /** The wooden board struck before sitting: slow strokes that speed up. */
  han(caption = '[a wooden board is struck, slowly, then faster]') {
    this.caption(caption);
    if (!this.ctx) return;
    let t = this.ctx.currentTime + 0.2;
    let gap = 1.3;
    for (let i = 0; i < 14; i++) {
      this._burst(t, 0.07, 0.08, 'bandpass', 900, 3, 'bell', 0.3, 0.4);
      this._tone(t, 560, 500, 0.08, 0.04, { bus: 'bell', pan: 0.3, verb: 0.4 });
      t += gap;
      gap = Math.max(0.16, gap * 0.78);
    }
  }

  footsteps(n = 6, surface = 'stone') {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.42 + rand(0, 0.05);
      if (surface === 'wood') {
        this._burst(t, 0.09, 0.05, 'lowpass', 500, 1, 'effects', 0, 0.2);
        this._tone(t, 170, 120, 0.08, 0.03, { bus: 'effects', verb: 0.2 });
      } else {
        this._burst(t, 0.08, 0.04, 'bandpass', 2200, 0.8, 'effects', rand(-0.2, 0.2));
        this._burst(t + 0.03, 0.06, 0.02, 'bandpass', 3800, 1, 'effects');
      }
    }
  }

  /** One footstep on a surface: gravel, stone, wood, grass. */
  step(surface = 'grass') {
    if (!this.ctx || settings.get('muted')) return;
    const t = this.ctx.currentTime;
    const pan = rand(-0.08, 0.08);
    if (surface === 'wood') {
      this._burst(t, 0.08, 0.04, 'lowpass', 520, 1, 'effects', pan, 0.1);
      this._tone(t, 160, 120, 0.07, 0.02, { bus: 'effects', verb: 0.1 });
    } else if (surface === 'gravel') {
      this._burst(t, 0.09, 0.03, 'bandpass', 2600, 0.7, 'effects', pan);
      this._burst(t + 0.03, 0.07, 0.02, 'bandpass', 4200, 1, 'effects', pan);
    } else if (surface === 'stone') {
      this._burst(t, 0.05, 0.03, 'bandpass', 1500, 1.2, 'effects', pan, 0.05);
    } else {
      this._burst(t, 0.12, 0.018, 'bandpass', 1200, 0.6, 'effects', pan);
    }
  }

  /** Spatial hints for the stream (stereo position, -1..1). */
  setStreamPan(p) {
    if (this.streamPan?.pan) this.streamPan.pan.setTargetAtTime(Math.max(-1, Math.min(1, p)), this.ctx.currentTime, 0.3);
  }

  /** Someone else's footsteps, on the veranda. */
  otherFootsteps(caption = '[footsteps on the veranda]') {
    this.caption(caption);
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const t = t0 + i * 0.55;
      this._burst(t, 0.1, 0.025 * (1 - i / 10), 'lowpass', 400, 1, 'effects', 0.6 - i * 0.05, 0.3);
    }
  }

  sweep(caption = '[a broom sweeping, beyond the wall]') {
    this.caption(caption);
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const t = t0 + i * rand(0.8, 1.1);
      this._burst(t, 0.45, 0.02, 'bandpass', 3200, 0.7, 'effects', -0.6, 0.2);
    }
  }

  shutter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._burst(t, 0.02, 0.15, 'highpass', 2500, 0.7);
    this._tone(t, 900, 300, 0.03, 0.06, { type: 'square', bus: 'effects', verb: 0 });
    this._burst(t + 0.06, 0.025, 0.1, 'bandpass', 1800, 2);
  }

  advance() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.25;
    for (let i = 0; i < 5; i++) this._burst(t + i * 0.05, 0.015, 0.05, 'bandpass', 3000, 3);
  }

  page() {
    if (!this.ctx) return;
    this._burst(this.ctx.currentTime, 0.18, 0.03, 'bandpass', 4000, 0.6);
  }
}

export const audio = new AudioEngine();
