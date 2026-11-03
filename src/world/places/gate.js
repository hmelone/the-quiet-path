// Arrival: mossy stone steps climbing through mist to the temple gate.
import { ridge, forest, maple, shrub, mossGround, stone, grassTuft, fern, trunk, lightShafts, dapple } from '../../paint/nature.js';
import { gate, wall, steps, lantern, roof } from '../../paint/build.js';
import { dab, mix, shade, css, jitter, path, fillV } from '../../paint/brush.js';
import { fbm1, smoothstep } from '../../core/rng.js';

const CX = 1.5;

function jizo(ctx, rng, x, y, s, pal) {
  dab(ctx, x, y + s * 0.02, s * 0.45, s * 0.08, 0, [20, 20, 14], 0.4);
  // body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.28, y);
  ctx.bezierCurveTo(x - s * 0.32, y - s * 0.45, x - s * 0.2, y - s * 0.62, x, y - s * 0.62);
  ctx.bezierCurveTo(x + s * 0.2, y - s * 0.62, x + s * 0.32, y - s * 0.45, x + s * 0.28, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0);
  g.addColorStop(0, css(pal.stoneLight));
  g.addColorStop(1, css(pal.stoneDark));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // head
  dab(ctx, x, y - s * 0.75, s * 0.17, s * 0.18, 0, pal.stone);
  dab(ctx, x - s * 0.05, y - s * 0.8, s * 0.07, s * 0.06, 0, pal.stoneLight, 0.6);
  // moss on the head and shoulders
  for (let i = 0; i < 30; i++) dab(ctx, x + rng.g() * s * 0.2, y - s * 0.88 + rng.f() * s * 0.08, s * 0.03, s * 0.02, 0, jitter(pal.moss, rng, 10), 0.8);
  // red cloth bib
  ctx.fillStyle = css([170, 40, 36]);
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y - s * 0.58);
  ctx.quadraticCurveTo(x, y - s * 0.52, x + s * 0.2, y - s * 0.58);
  ctx.lineTo(x, y - s * 0.3);
  ctx.closePath();
  ctx.fill();
  // camellia at its feet
  dab(ctx, x + s * 0.32, y - s * 0.02, s * 0.07, s * 0.05, 0, pal.camellia);
  dab(ctx, x + s * 0.32, y - s * 0.03, s * 0.025, s * 0.02, 0, [230, 200, 90]);
}

function noticeBoard(ctx, x, y, s, pal) {
  ctx.fillStyle = css(pal.woodDark);
  ctx.fillRect(x - s * 0.03, y - s * 0.9, s * 0.06, s * 0.9);
  ctx.fillStyle = css(pal.wood);
  ctx.fillRect(x - s * 0.3, y - s * 1.05, s * 0.6, s * 0.4);
  ctx.fillStyle = css(pal.roof);
  ctx.fillRect(x - s * 0.36, y - s * 1.1, s * 0.72, s * 0.07);
  ctx.fillStyle = css([236, 228, 210]);
  ctx.fillRect(x - s * 0.16, y - s * 1.0, s * 0.3, s * 0.28);
  ctx.strokeStyle = css([60, 55, 50], 0.6);
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1 - i * s * 0.05, y - s * 0.97);
    ctx.lineTo(x + s * 0.1 - i * s * 0.05, y - s * (0.8 + (i % 2) * 0.04));
    ctx.stroke();
  }
}

export default {
  id: 'gate',
  name: 'The gate',
  lw: 3.0,
  start: 0.5,
  describe: (c) =>
    `Mossy stone steps climb toward a wooden temple gate${c.weather === 'mist' ? ', half hidden in mist' : ''}. ` +
    'Cedars rise on either side. A small stone figure stands to the left of the steps; a notice board hangs to the right of the gate.',
  sound: { wind: 0.7, leaves: 0.6, stream: 0.25, birds: 1, room: 0 },
  layers: [
    { id: 'sky', kind: 'sky', lw: 2.2, depth: 0 },
    {
      id: 'far', kind: 'paint', lw: 2.35, depth: 0.08, pick: false,
      paint({ ctx, lw }, rng, pal) {
        ridge(ctx, rng, { lw, baseY: 0.46, amp: 0.34, freq: 1.6, seed: 3, top: pal.ridgeFar, bottom: mix(pal.ridgeFar, [200, 210, 216], 0.4), haze: [205, 212, 218], sharp: 0.4 });
        ridge(ctx, rng, { lw, baseY: 0.5, amp: 0.2, freq: 2.2, seed: 8, top: pal.ridgeMid, bottom: mix(pal.ridgeMid, [200, 208, 206], 0.45), haze: [200, 208, 208] });
      },
    },
    { id: 'mist1', kind: 'mist', lw: 2.45, depth: 0.15, band: [0.5, 0.11, 1.0, 0.008] },
    {
      id: 'forest', kind: 'paint', lw: 2.6, depth: 0.3, sway: 0.12,
      paint({ ctx, lw }, rng, pal) {
        const mid = lw / 2;
        // a distant hall roof beyond the gate, glimpsed through trees
        roof(ctx, rng, mid + 0.06, 0.37, 0.3, 0.08, pal, { color: mix(pal.roof, [160, 170, 175], 0.5) });
        const crest = (x) => 0.46 - 0.12 * Math.min(1, Math.abs(x - mid) / 1.0) + fbm1(x * 3, 2) * 0.03;
        const haze = [184, 196, 198];
        forest(ctx, rng, { x0: -0.05, x1: mid - 0.12, yFn: crest, hMin: 0.2, hMax: 0.34, col: pal.cedar, light: pal.cedarLight, haze, hazeAmt: 0.6, rows: 3, density: 1.2 });
        forest(ctx, rng, { x0: mid + 0.12, x1: lw + 0.05, yFn: crest, hMin: 0.2, hMax: 0.34, col: pal.cedar, light: pal.cedarLight, haze, hazeAmt: 0.6, rows: 3, density: 1.2 });
        forest(ctx, rng, { x0: mid - 0.14, x1: mid + 0.14, yFn: () => 0.47, hMin: 0.07, hMax: 0.12, col: mix(pal.cedar, haze, 0.45), light: mix(pal.cedarLight, haze, 0.45), haze, hazeAmt: 0.2, rows: 1 });
      },
    },
    {
      id: 'shafts', kind: 'paint', lw: 2.7, depth: 0.34, additive: true, emisKey: 'beam', emisGain: 1.0, pick: false,
      paint({ ctx, lw }, rng) {
        lightShafts(ctx, rng, lw, { count: 9, from: -0.1, angle: 0.42, alpha: 0.2 });
      },
    },
    { id: 'mist2', kind: 'mist', lw: 2.7, depth: 0.38, band: [0.55, 0.09, 0.85, 0.012] },
    {
      id: 'main', kind: 'paint', lw: 3.0, depth: 0.5, emissive: true,
      paint({ ctx, lw }, rng, pal, cond, { emis }) {
        const groundTop = (x) => 0.47 - 0.07 * smoothstep(0.05, 0.9, Math.abs(x - CX)) + fbm1(x * 4, 5) * 0.025 - 0.01;
        // a few mid-distance cedar trunks behind the banks
        for (const [x, w] of [[CX - 1.3, 0.055], [CX - 0.92, 0.05], [CX - 0.6, 0.04], [CX + 0.58, 0.042], [CX + 0.9, 0.052], [CX + 1.32, 0.058]]) {
          trunk(ctx, rng, x, groundTop(x) + 0.03, -0.05, w, pal, { light: 0.5 });
        }
        mossGround(ctx, rng, { x0: 0, x1: lw, topFn: groundTop, pal, density: 1.1 });
        dapple(ctx, rng, 0, lw, 0.47, 1.0, 260);
        wall(ctx, rng, CX - 0.48, CX - 0.17, 0.48, 0.06, pal);
        wall(ctx, rng, CX + 0.17, CX + 0.48, 0.48, 0.06, pal);
        gate(ctx, rng, CX, 0.485, 0.3, pal, emis);
        steps(ctx, rng, CX, 0.485, 1.07, 0.085, 0.5, 17, pal);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const t = i / 4;
            const y = 0.53 + t * 0.4;
            const x = CX + side * (0.07 + t * 0.24 + 0.04);
            shrub(ctx, rng, x, y, 0.028 + t * 0.045, 0.02 + t * 0.032, pal.azalea, pal.azaleaFlower, 0.3);
          }
          for (let i = 0; i < 8; i++) fern(ctx, rng, CX + side * rng.range(0.45, 1.3), rng.range(0.55, 0.9), rng.range(0.03, 0.06), pal.fern);
        }
        const lit = cond.time >= 3 || cond.time === 0;
        lantern(ctx, rng, CX - 0.27, 0.74, 0.16, pal, { emis, lit });
        lantern(ctx, rng, CX + 0.27, 0.74, 0.16, pal, { emis, lit });
        jizo(ctx, rng, CX - 0.44, 0.82, 0.085, pal);
        noticeBoard(ctx, CX + 0.33, 0.52, 0.075, pal);
        for (let i = 0; i < 22; i++) {
          stone(ctx, rng, rng.range(0, lw), rng.range(0.52, 0.97), rng.range(0.01, 0.03), rng.range(0.008, 0.02), pal, { moss: 0.8 });
        }
      },
    },
    {
      id: 'near', kind: 'paint', lw: 3.3, depth: 0.72, sway: 0.6,
      particles: [{ type: 'leaves', count: 6, x: [0, 3.3], colors: [[0.55, 0.68, 0.28], [0.62, 0.22, 0.16]], seed: 4 }],
      paint({ ctx, lw }, rng, pal) {
        trunk(ctx, rng, 0.22, 1.04, -0.05, 0.11, pal, { light: 0.35 });
        trunk(ctx, rng, 0.78, 0.98, -0.05, 0.075, pal, { light: 0.45 });
        trunk(ctx, rng, lw - 0.75, 0.99, -0.05, 0.08, pal, { light: 0.45 });
        trunk(ctx, rng, lw - 0.18, 1.05, -0.05, 0.12, pal, { light: 0.35 });
        maple(ctx, rng, 0.5, 1.03, 0.7, 0.75, pal.leaf, pal.bark, { lean: 0.5, clusters: 10 });
        maple(ctx, rng, lw - 0.45, 1.03, 0.75, 0.7, pal.leafRed, pal.bark, { lean: -0.6, clusters: 9 });
        for (let i = 0; i < 14; i++) fern(ctx, rng, rng.range(0, lw), rng.range(0.92, 1.0), rng.range(0.05, 0.09), pal.fern);
      },
    },
    { id: 'rain', kind: 'rain', lw: 3.3, depth: 0.75, scale: 70, speed: 2.4 },
    {
      id: 'front', kind: 'paint', lw: 3.6, depth: 0.92, sway: 1.0,
      paint({ ctx, lw }, rng, pal) {
        const dark = { ...pal, stone: shade(pal.stone, 0.6), stoneLight: shade(pal.stoneLight, 0.65), stoneDark: shade(pal.stoneDark, 0.6), moss: shade(pal.moss, 0.7), mossLight: shade(pal.mossLight, 0.75), mossDark: shade(pal.mossDark, 0.7) };
        stone(ctx, rng, 0.2, 1.0, 0.22, 0.09, dark, { moss: 0.9 });
        stone(ctx, rng, lw - 0.3, 1.01, 0.26, 0.1, dark, { moss: 0.9 });
        for (let i = 0; i < 46; i++) {
          const x = rng.chance(0.5) ? rng.range(0, 0.75) : rng.range(lw - 0.85, lw);
          grassTuft(ctx, rng, x, rng.range(0.97, 1.03), rng.range(0.04, 0.09), shade(pal.grass, 0.75), 8);
        }
        for (let i = 0; i < 8; i++) fern(ctx, rng, rng.chance(0.5) ? rng.range(0, 0.55) : rng.range(lw - 0.55, lw), 1.02, rng.range(0.1, 0.17), shade(pal.fern, 0.7));
      },
    },
  ],
  pois: [
    { id: 'up', kind: 'path', layer: 'main', x: CX, y: 0.44, label: 'Climb the steps through the gate', to: 'garden' },
    { id: 'board', kind: 'look', layer: 'main', x: CX + 0.33, y: 0.43, label: 'Notice board', script: 'gateNotice' },
    { id: 'jizo', kind: 'look', layer: 'main', x: CX - 0.44, y: 0.76, label: 'Small stone figure', script: 'jizo' },
    { id: 'road', kind: 'look', layer: 'front', x: 1.8, y: 0.95, label: 'The road back down', script: 'roadDown' },
  ],
  subjects: [
    { id: 'gate', layer: 'main', x: CX, y: 0.38, r: 0.14, label: 'the gate' },
    { id: 'steps-moss', layer: 'main', x: CX, y: 0.85, r: 0.15, label: 'moss on the stone steps' },
    { id: 'jizo', layer: 'main', x: CX - 0.44, y: 0.78, r: 0.05, label: 'the stone figure by the steps' },
    { id: 'camellia', layer: 'main', x: CX - 0.413, y: 0.818, r: 0.012, label: 'a camellia left as an offering' },
    { id: 'lantern-light', layer: 'main', x: CX - 0.27, y: 0.64, r: 0.04, label: 'lantern light', when: (c) => c.time >= 3 || c.time === 0 },
  ],
};
