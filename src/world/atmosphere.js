// Light and air for each time of day and weather. These numbers drive the
// colour-grading shader, so one painting yields many moods.
import { hex } from '../paint/brush.js';

const f = (h) => hex(h).map((v) => v / 255);

const TIMES = {
  dawn: {
    skyTop: f('#3c4a6e'), skyHor: f('#e9b79e'), sunCol: f('#ffbe94'), sun: [0.22, 0.8], sunVis: 0.7,
    tint: [0.8, 0.78, 0.86], fog: f('#b9b5c6'), fogAmt: 0.42, exposure: 0.92, sat: 0.78,
    emis: 0.55, stars: 0.15, cloudCol: f('#c7a8a8'), mist: 0.65, daylight: 0.45, wind: 0.3,
  },
  morning: {
    skyTop: f('#6d9bc9'), skyHor: f('#e1e9ec'), sunCol: f('#fff3da'), sun: [0.3, 0.22], sunVis: 1,
    tint: [1.0, 0.99, 0.95], fog: f('#cdd7dc'), fogAmt: 0.26, exposure: 1.0, sat: 1.0,
    emis: 0, stars: 0, cloudCol: f('#f4f2ec'), mist: 0.3, daylight: 1, wind: 0.5,
  },
  afternoon: {
    skyTop: f('#5b8ec6'), skyHor: f('#ebe5d3'), sunCol: f('#fff0c8'), sun: [0.66, 0.2], sunVis: 1,
    tint: [1.03, 1.0, 0.92], fog: f('#d8d8cc'), fogAmt: 0.22, exposure: 1.02, sat: 1.04,
    emis: 0, stars: 0, cloudCol: f('#f7f1e2'), mist: 0.12, daylight: 1, wind: 0.7,
  },
  evening: {
    skyTop: f('#4b5987'), skyHor: f('#f2a46a'), sunCol: f('#ff9f5c'), sun: [0.8, 0.74], sunVis: 0.95,
    tint: [1.0, 0.8, 0.66], fog: f('#d8a78c'), fogAmt: 0.36, exposure: 0.88, sat: 0.95,
    emis: 0.8, stars: 0.05, cloudCol: f('#e7a283'), mist: 0.3, daylight: 0.55, wind: 0.4,
  },
  night: {
    skyTop: f('#0a1124'), skyHor: f('#27324e'), sunCol: f('#cfd9ff'), sun: [0.58, 0.18], sunVis: 0.55,
    tint: [0.34, 0.4, 0.6], fog: f('#2a3352'), fogAmt: 0.4, exposure: 0.72, sat: 0.55,
    emis: 1, stars: 1, cloudCol: f('#3b4562'), mist: 0.35, daylight: 0, wind: 0.25,
  },
};

const WEATHER = {
  clear:    { cloud: 0.15, desat: 1.0, dark: 1.0, fog: 0, mist: 0, rain: 0, snow: 0, sun: 1, grey: 0 },
  overcast: { cloud: 0.85, desat: 0.75, dark: 0.88, fog: 0.12, mist: 0.1, rain: 0, snow: 0, sun: 0.25, grey: 0.35 },
  mist:     { cloud: 0.6, desat: 0.8, dark: 0.95, fog: 0.22, mist: 0.6, rain: 0, snow: 0, sun: 0.45, grey: 0.25 },
  rain:     { cloud: 1.0, desat: 0.65, dark: 0.78, fog: 0.2, mist: 0.3, rain: 1, snow: 0, sun: 0.0, grey: 0.5 },
  snow:     { cloud: 0.9, desat: 0.7, dark: 0.95, fog: 0.2, mist: 0.2, rain: 0, snow: 1, sun: 0.2, grey: 0.4 },
};

const grey = (c, k, g = [0.72, 0.74, 0.76]) => c.map((v, i) => v + (g[i] - v) * k);

/** Compute shader parameters for a time + weather. */
export function atmosphere(timeName, weather, interior = false) {
  const t = TIMES[timeName];
  const w = WEATHER[weather] || WEATHER.clear;
  const dark = t === TIMES.night ? 0.5 + 0.5 * w.dark : 1;
  const a = {
    skyTop: grey(t.skyTop, w.grey * (timeName === 'night' ? 0.2 : 1)).map((v) => v * w.dark),
    skyHor: grey(t.skyHor, w.grey).map((v) => v * w.dark),
    sunCol: t.sunCol,
    sun: t.sun,
    sunVis: t.sunVis * w.sun,
    tint: grey(t.tint, w.grey * 0.4, [0.85, 0.88, 0.9]).map((v) => v * w.dark * dark),
    fog: grey(t.fog, w.grey * 0.6),
    fogAmt: Math.min(0.75, t.fogAmt + w.fog),
    exposure: t.exposure,
    sat: t.sat * w.desat,
    emis: t.emis,
    stars: t.stars * (1 - w.cloud),
    cloud: w.cloud,
    cloudCol: grey(t.cloudCol, w.grey * 0.7).map((v) => v * (w.rain ? 0.8 : 1)),
    mist: Math.min(1, t.mist * 0.5 + w.mist),
    rain: w.rain,
    snow: w.snow,
    wind: t.wind + w.rain * 0.4,
    daylight: t.daylight * (w.rain ? 0.55 : weather === 'overcast' ? 0.7 : 1),
    beams: t.daylight * w.sun,
  };
  if (interior) {
    // Indoors the outside weather is softened; light comes from windows.
    a.fogAmt *= 0.25;
    a.tint = a.tint.map((v) => v * 0.82 + 0.06);
    a.sat = Math.min(1, a.sat + 0.1);
    a.mist = 0;
  }
  return a;
}
