// The moss garden: stepping stones, a stone lantern, a water basin,
// the meditation hall to the right and your small room to the left.
import { ridge, forest, maple, pine, shrub, mossGround, stone, grassTuft, fern, trunk, lightShafts, dapple } from '../../paint/nature.js';
import { wall, lantern, tsukubai, bowl, hall, sandals } from '../../paint/build.js';
import { dab, mix, shade, css } from '../../paint/brush.js';
import { fbm1 } from '../../core/rng.js';

/** Where the bowl is right now, derived from story flags. */
export function bowlPlace(c) {
  const b = c.flags.bowl;
  if (!b) return 'basin';
  if (b === 'veranda') return c.flags.bowlCollected ? 'none' : 'veranda';
  if (b === 'left') return c.flags.bowlTaken ? 'pressed' : 'basin';
  return 'none';
}

const monksSitting = (c) => c.time === 0 || c.time === 3;

function han(ctx, x, y, s, pal) {
  // a thick wooden board hanging from cords, worn pale in the centre
  ctx.strokeStyle = css([60, 50, 40]);
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y - s * 0.5);
  ctx.lineTo(x - s * 0.3, y - s * 0.25);
  ctx.moveTo(x + s * 0.3, y - s * 0.5);
  ctx.lineTo(x + s * 0.3, y - s * 0.25);
  ctx.stroke();
  ctx.fillStyle = css(pal.woodLight);
  ctx.fillRect(x - s * 0.45, y - s * 0.25, s * 0.9, s * 0.38);
  dab(ctx, x, y - s * 0.06, s * 0.14, s * 0.12, 0, [196, 176, 140], 0.9);
  ctx.strokeStyle = css(pal.woodDark, 0.6);
  ctx.lineWidth = s * 0.02;
  ctx.strokeRect(x - s * 0.45, y - s * 0.25, s * 0.9, s * 0.38);
}

export default {
  id: 'garden',
  name: 'The moss garden',
  lw: 3.0,
  start: 0.45,
  paintKey: (c) => `${bowlPlace(c)}-${monksSitting(c)}`,
  describe: (c) => {
    const b = bowlPlace(c);
    return 'A garden of deep moss and stepping stones. A stone lantern stands near the middle; a low stone water basin is in front of you. ' +
      'The meditation hall is to the right, with a wooden veranda. Your small room is to the left.' +
      (b === 'basin' ? ' Something sits beside the water basin.' : '') +
      (b === 'veranda' ? ' The bowl rests on the edge of the veranda.' : '');
  },
  sound: { wind: 0.5, leaves: 0.7, trickle: 0.8, birds: 1, room: 0 },
  layers: [
    { id: 'sky', kind: 'sky', lw: 2.2, depth: 0 },
    {
      id: 'far', kind: 'paint', lw: 2.3, depth: 0.08, pick: false,
      paint({ ctx, lw }, rng, pal) {
        ridge(ctx, rng, { lw, baseY: 0.42, amp: 0.3, freq: 1.5, seed: 21, top: pal.ridgeFar, bottom: mix(pal.ridgeFar, [205, 212, 218], 0.4), haze: [205, 212, 218], sharp: 0.3 });
      },
    },
    { id: 'mist1', kind: 'mist', lw: 2.4, depth: 0.15, band: [0.42, 0.1, 0.9, 0.008] },
    {
      id: 'trees', kind: 'paint', lw: 2.5, depth: 0.25, sway: 0.15,
      paint({ ctx, lw }, rng, pal) {
        const haze = [186, 198, 198];
        forest(ctx, rng, { x0: -0.05, x1: lw + 0.05, yFn: (x) => 0.47 + fbm1(x * 2, 4) * 0.04, hMin: 0.2, hMax: 0.32, col: pal.cedar, light: pal.cedarLight, haze, hazeAmt: 0.55, rows: 2, density: 1.1 });
      },
    },
    {
      id: 'shafts', kind: 'paint', lw: 2.6, depth: 0.3, additive: true, emisKey: 'beam', pick: false,
      paint({ ctx, lw }, rng) { lightShafts(ctx, rng, lw, { count: 8, from: -0.1, angle: 0.4, alpha: 0.18 }); },
    },
    {
      id: 'buildings', kind: 'paint', lw: 2.8, depth: 0.4, emissive: true,
      paint({ ctx, lw }, rng, pal, cond, { emis }) {
        mossGround(ctx, rng, { x0: 0, x1: lw, topFn: () => 0.515, pal, density: 0.6 });
        wall(ctx, rng, -0.05, lw + 0.05, 0.52, 0.07, pal);
        // your quarters, small, on the left
        hall(ctx, rng, 0.18, 0.56, 0.5, 0.26, pal, emis, { bays: 2, shojiGlow: cond.time >= 3 ? 1 : 0.2 });
        // the meditation hall on the right
        hall(ctx, rng, 1.75, 0.6, 0.9, 0.4, pal, emis, { bays: 5, shojiGlow: monksSitting(cond) ? 1 : 0.35 });
        han(ctx, 1.66, 0.36, 0.06, pal);
        if (monksSitting(cond)) {
          for (let i = 0; i < 5; i++) sandals(ctx, 1.95 + i * 0.07, 0.585, 0.012);
        }
        if (bowlPlace(cond) === 'veranda') bowl(ctx, rng, 1.86, 0.535, 0.022, { chipped: true, piece: false });
      },
    },
    { id: 'mist2', kind: 'mist', lw: 2.9, depth: 0.45, band: [0.6, 0.06, 0.5, 0.012] },
    {
      id: 'main', kind: 'paint', lw: 3.0, depth: 0.55, emissive: true,
      particles: [{ type: 'motes', count: 40, x: [0.5, 2.5], y: [0.3, 0.8], light: true, seed: 3 }],
      paint({ ctx, lw }, rng, pal, cond, { emis }) {
        mossGround(ctx, rng, { x0: 0, x1: lw, topFn: (x) => 0.585 + fbm1(x * 5, 9) * 0.012, pal, density: 1.1 });
        dapple(ctx, rng, 0, lw, 0.6, 1.0, 220);
        // stepping stones winding from the front toward the hall and your room
        const path = [[1.5, 1.0], [1.45, 0.9], [1.5, 0.82], [1.6, 0.75], [1.7, 0.69], [1.82, 0.645], [1.95, 0.615]];
        const left = [[1.38, 0.76], [1.2, 0.71], [1.0, 0.67], [0.8, 0.635], [0.62, 0.61], [0.47, 0.595]];
        for (const [x, y] of [...left, ...path]) {
          const k = (y - 0.58) / 0.42;
          stone(ctx, rng, x + rng.g() * 0.01, y, 0.02 + k * 0.06, 0.006 + k * 0.022, pal, { moss: 0.2, flat: false });
        }
        pine(ctx, rng, 0.92, 0.66, 0.3, 0.36, pal.pine, pal.pineLight, pal.bark);
        shrub(ctx, rng, 0.7, 0.66, 0.08, 0.05, pal.azalea, pal.azaleaFlower, 0.5);
        shrub(ctx, rng, 2.3, 0.68, 0.1, 0.055, pal.azalea, pal.azaleaFlower, 0.4);
        shrub(ctx, rng, 2.55, 0.7, 0.07, 0.04, pal.azalea, null);
        shrub(ctx, rng, 0.35, 0.72, 0.09, 0.05, pal.azalea, pal.azaleaFlower, 0.6);
        lantern(ctx, rng, 1.2, 0.72, 0.3, pal, { emis, lit: false });
        for (let i = 0; i < 20; i++) fern(ctx, rng, rng.range(0, lw), rng.range(0.62, 0.95), rng.range(0.03, 0.06), pal.fern);
        tsukubai(ctx, rng, 1.6, 0.9, 0.19, pal);
        const b = bowlPlace(cond);
        if (b === 'basin') bowl(ctx, rng, 1.86, 0.905, 0.05, { chipped: true, piece: true });
        if (b === 'pressed') {
          dab(ctx, 1.86, 0.902, 0.045, 0.012, 0, shade(pal.moss, 0.7), 0.7);
          dab(ctx, 1.86, 0.9, 0.036, 0.008, 0, shade(pal.mossDark, 0.9), 0.6);
        }
        for (let i = 0; i < 14; i++) stone(ctx, rng, rng.range(0, lw), rng.range(0.64, 0.97), rng.range(0.012, 0.03), rng.range(0.008, 0.02), pal, { moss: 0.8 });
      },
    },
    {
      id: 'near', kind: 'paint', lw: 3.3, depth: 0.75, sway: 0.6,
      particles: [{ type: 'leaves', count: 5, x: [0, 3.3], colors: [[0.55, 0.68, 0.28], [0.7, 0.75, 0.35]], seed: 9 }],
      paint({ ctx, lw }, rng, pal) {
        trunk(ctx, rng, 0.15, 1.05, -0.05, 0.1, pal, { light: 0.35 });
        maple(ctx, rng, 0.42, 1.02, 0.78, 0.8, pal.leaf, pal.bark, { lean: 0.6, clusters: 10 });
        maple(ctx, rng, lw - 0.25, 1.04, 0.85, 0.7, pal.leafRed, pal.bark, { lean: -0.6, clusters: 9 });
        for (let i = 0; i < 10; i++) fern(ctx, rng, rng.range(0, lw), rng.range(0.93, 1.0), rng.range(0.05, 0.09), pal.fern);
      },
    },
    { id: 'rain', kind: 'rain', lw: 3.3, depth: 0.78, scale: 70, speed: 2.4 },
    {
      id: 'front', kind: 'paint', lw: 3.6, depth: 0.92, sway: 1.0,
      paint({ ctx, lw }, rng, pal) {
        const dark = { ...pal, stone: shade(pal.stone, 0.6), stoneLight: shade(pal.stoneLight, 0.65), stoneDark: shade(pal.stoneDark, 0.6), moss: shade(pal.moss, 0.7), mossLight: shade(pal.mossLight, 0.75), mossDark: shade(pal.mossDark, 0.7) };
        stone(ctx, rng, 0.3, 1.01, 0.22, 0.08, dark, { moss: 0.9 });
        stone(ctx, rng, lw - 0.4, 1.02, 0.24, 0.09, dark, { moss: 0.9 });
        for (let i = 0; i < 40; i++) {
          const x = rng.chance(0.5) ? rng.range(0, 0.8) : rng.range(lw - 0.9, lw);
          grassTuft(ctx, rng, x, rng.range(0.97, 1.03), rng.range(0.04, 0.08), shade(pal.grass, 0.75), 8);
        }
        for (let i = 0; i < 6; i++) fern(ctx, rng, rng.chance(0.5) ? rng.range(0, 0.6) : rng.range(lw - 0.6, lw), 1.02, rng.range(0.1, 0.16), shade(pal.fern, 0.7));
      },
    },
  ],
  pois: [
    { id: 'toGate', kind: 'path', layer: 'front', x: 1.15, y: 0.93, label: 'Back down the steps to the gate', to: 'gate' },
    { id: 'toPond', kind: 'path', layer: 'main', x: 2.85, y: 0.72, label: 'Follow the path to the pond', to: 'pond' },
    { id: 'toHall', kind: 'path', layer: 'buildings', x: 2.05, y: 0.5, label: 'Enter the meditation hall', to: 'zendo' },
    { id: 'toRoom', kind: 'path', layer: 'buildings', x: 0.43, y: 0.47, label: 'Go to your room', to: 'quarters' },
    { id: 'bowl', kind: 'look', layer: 'main', x: 1.87, y: 0.85, label: 'Something beside the water basin', script: 'bowl', visible: (c) => bowlPlace(c) === 'basin' && !c.flags.bowl },
    { id: 'pressed', kind: 'look', layer: 'main', x: 1.86, y: 0.88, label: 'A small hollow in the moss', script: 'pressedMoss', visible: (c) => bowlPlace(c) === 'pressed' },
    { id: 'basin', kind: 'look', layer: 'main', x: 1.58, y: 0.79, label: 'Stone water basin', script: 'basin' },
    { id: 'lantern', kind: 'look', layer: 'main', x: 1.2, y: 0.45, label: 'Stone lantern', script: 'lantern' },
    { id: 'han', kind: 'look', layer: 'buildings', x: 1.66, y: 0.33, label: 'Wooden board by the hall', script: 'han' },
    { id: 'veranda', kind: 'sit', layer: 'buildings', x: 2.45, y: 0.53, label: 'Sit on the veranda', script: 'sitVeranda' },
  ],
  subjects: [
    { id: 'lantern-moss', layer: 'main', x: 1.2, y: 0.44, r: 0.05, label: 'moss on the stone lantern' },
    { id: 'basin', layer: 'main', x: 1.6, y: 0.83, r: 0.1, label: 'water in the stone basin' },
    { id: 'bowl', layer: 'main', x: 1.86, y: 0.885, r: 0.03, label: 'the chipped tea bowl', when: (c) => bowlPlace(c) === 'basin' },
    { id: 'bowl-veranda', layer: 'buildings', x: 1.86, y: 0.53, r: 0.015, label: 'the bowl on the veranda', when: (c) => bowlPlace(c) === 'veranda' },
    { id: 'pressed', layer: 'main', x: 1.86, y: 0.9, r: 0.03, label: 'where the bowl had been', when: (c) => bowlPlace(c) === 'pressed' },
    { id: 'pine', layer: 'main', x: 0.95, y: 0.5, r: 0.12, label: 'the pruned pine' },
    { id: 'sandals', layer: 'buildings', x: 2.09, y: 0.585, r: 0.03, label: 'sandals left by the hall', when: monksSitting },
    { id: 'han', layer: 'buildings', x: 1.66, y: 0.34, r: 0.025, label: 'the wooden board' },
    { id: 'shoji-glow', layer: 'buildings', x: 2.2, y: 0.45, r: 0.12, label: 'lamplight through paper screens', when: (c) => c.time >= 3 },
  ],
};
