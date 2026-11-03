// Regression for forest scheduler methods accidentally removed by the v2.3
// sound-effects update. No Web Audio device or application dependencies needed.
import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { matchMedia: () => null };
globalThis.localStorage = { getItem: () => null };
const { audio } = await import('../src/audio/audio.js');

test('forest scheduler retains woodpecker taps and owl hoots without pitch sweeps', () => {
  const random = Math.random;
  const bursts = [], tones = [];
  const original = { ctx: audio.ctx, profile: audio.profile, env: audio.env,
    gusting: audio._gusting, burst: audio._burst, tone: audio._tone };
  try {
    Math.random = () => 0; // Force rare scheduler branches to execute.
    audio.ctx = { currentTime: 0 };
    audio._gusting = true;
    audio.profile = { forest: 1, birds: 0, muffled: true };
    audio._burst = (...args) => bursts.push(args);
    audio._tone = (...args) => tones.push(args);
    audio.env = { daylight: 1, rain: 0, night: false, time: 1 };
    audio._tick();
    assert.equal(bursts.length, 10, 'woodpecker uses filtered noise taps');
    assert.equal(tones.length, 0, 'woodpecker has no pitched sweep');
    audio.env = { daylight: 0, rain: 0, night: true, time: 4 };
    audio._tick();
    assert.equal(tones.length, 3, 'night scheduler emits three owl hoots');
    for (const [, start, end] of tones) assert.equal(start, end, 'owl pitch stays constant');
  } finally {
    Math.random = random;
    Object.assign(audio, { ctx: original.ctx, profile: original.profile, env: original.env,
      _gusting: original.gusting, _burst: original.burst, _tone: original.tone });
  }
});
