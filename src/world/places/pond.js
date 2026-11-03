// The pond: an open view to the mountains, reflections, koi, irises.
import { ridge, forest, maple, pine, shrub, stone, grassTuft, fern, iris, mossGround } from '../../paint/nature.js';
import { roof, post } from '../../paint/build.js';
import { dab, mix, shade, css, jitter, path, fillV } from '../../paint/brush.js';
import { Rng, fbm1 } from '../../core/rng.js';

const LW = 2.9;       // shore and water share a width so reflections line up
const SHORE_Y = 0.53; // the far waterline

function pavilion(ctx, rng, x, baseY, w, pal) {
  const h = w * 0.55;
  for (const k of [-0.42, 0.42]) post(ctx, rng, x + k * w, baseY - h * 0.75, baseY, w * 0.04, pal);
  ctx.fillStyle = css(pal.woodDark);
  ctx.fillRect(x - w * 0.42, baseY - h * 0.25, w * 0.84, h * 0.05);
  roof(ctx, rng, x, baseY - h * 0.75, w * 1.25, h * 0.5, pal, { color: pal.bark, tiles: false });
}

/** Everything on the far shore, painted twice: once upright, once mirrored. */
function paintShore(ctx, pal) {
  const rng = new Rng('pond-shore');
  const haze = [186, 198, 200];
  forest(ctx, rng, { x0: -0.05, x1: LW + 0.05, yFn: (x) => SHORE_Y - 0.01 + fbm1(x * 3, 6) * 0.02, hMin: 0.12, hMax: 0.22, col: pal.cedar, light: pal.cedarLight, haze, hazeAmt: 0.5, rows: 2, density: 1.0 });
  mossGround(ctx, rng, { x0: -0.05, x1: LW + 0.05, topFn: (x) => SHORE_Y - 0.012 + fbm1(x * 6, 7) * 0.008, bottom: SHORE_Y + 0.01, pal, density: 0.8 });
  pavilion(ctx, rng, 0.75, SHORE_Y - 0.004, 0.13, pal);
  maple(ctx, rng, 1.25, SHORE_Y, 0.2, 0.22, pal.leafRed, pal.bark, { clusters: 8 });
  maple(ctx, rng, 2.15, SHORE_Y, 0.24, 0.26, pal.leaf, pal.bark, { clusters: 8, lean: 0.3 });
  pine(ctx, rng, 1.7, SHORE_Y, 0.16, 0.2, pal.pine, pal.pineLight, pal.bark);
  for (let i = 0; i < 10; i++) shrub(ctx, rng, rng.range(0, LW), SHORE_Y + 0.004, rng.range(0.025, 0.05), rng.range(0.015, 0.03), pal.azalea, pal.azaleaFlower, 0.3);
  for (let i = 0; i < 8; i++) stone(ctx, rng, rng.range(0, LW), SHORE_Y + 0.006, rng.range(0.012, 0.025), rng.range(0.006, 0.01), pal, { moss: 0.7 });
}

export default {
  id: 'pond',
  name: 'The pond',
  lw: 3.1,
  start: 0.5,
  describe: (c) =>
    'A still pond opens toward the mountains. Across the water, a small roofed shelter stands among maples and cedars. ' +
    'Koi move beneath the surface; irises grow at the water’s edge. A flat stone near you is good for sitting.',
  sound: { wind: 0.6, leaves: 0.4, stream: 0.4, birds: 0.9, frogs: 1, room: 0 },
  layers: [
    { id: 'sky', kind: 'sky', lw: 2.3, depth: 0 },
    {
      id: 'far', kind: 'paint', lw: 2.4, depth: 0.06, pick: false,
      paint({ ctx, lw }, rng, pal) {
        ridge(ctx, rng, { lw, baseY: 0.44, amp: 0.36, freq: 1.3, seed: 41, top: mix(pal.ridgeFar, [120, 140, 160], 0.3), bottom: mix(pal.ridgeFar, [210, 216, 222], 0.45), haze: [210, 216, 222], sharp: 0.5 });
        ridge(ctx, rng, { lw, baseY: 0.5, amp: 0.16, freq: 2.0, seed: 44, top: pal.ridgeMid, bottom: mix(pal.ridgeMid, [200, 208, 208], 0.5), haze: [200, 208, 208] });
      },
    },
    { id: 'mist1', kind: 'mist', lw: 2.5, depth: 0.15, band: [0.47, 0.08, 1.0, 0.007] },
    {
      id: 'shore', kind: 'paint', lw: LW, depth: 0.4, sway: 0.12,
      paint({ ctx }, rng, pal) { paintShore(ctx, pal); },
    },
    {
      id: 'water', kind: 'water', lw: LW, depth: 0.45, mirrorY: SHORE_Y, pick: false,
      particles: [{ type: 'koi', count: 6, area: [0.6, 2.3, 0.62, 0.86], seed: 12 }],
      paint({ ctx }, rng, pal, cond, { refl }) {
        // water body: deep colour, darker toward the front
        ctx.save();
        path(ctx, [[0, SHORE_Y], [LW, SHORE_Y], [LW, 1.01], [0, 1.01]]);
        fillV(ctx, SHORE_Y, 1, [[0, mix(pal.water, [150, 170, 170], 0.35)], [1, shade(pal.water, 0.55)]]);
        ctx.restore();
        // mirrored shore for reflections
        const r = refl.ctx;
        r.save();
        r.translate(0, SHORE_Y * 2);
        r.scale(1, -1);
        paintShore(r, { ...pal, cedar: shade(pal.cedar, 0.75), cedarLight: shade(pal.cedarLight, 0.75) });
        r.restore();
        // fade reflections out with distance from the shore
        r.save();
        r.globalCompositeOperation = 'destination-out';
        const g = r.createLinearGradient(0, SHORE_Y, 0, 1);
        g.addColorStop(0, 'rgba(0,0,0,0.05)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.55)');
        g.addColorStop(1, 'rgba(0,0,0,0.9)');
        r.fillStyle = g;
        r.fillRect(0, SHORE_Y, LW, 1);
        r.fillStyle = 'rgba(0,0,0,1)';
        r.fillRect(0, 0, LW, SHORE_Y);
        r.restore();
      },
    },
    {
      id: 'pads', kind: 'paint', lw: 3.0, depth: 0.55,
      particles: [{ type: 'floatleaf', area: [0.5, 2.5, 0.66, 0.8] }],
      paint({ ctx, lw }, rng, pal) {
        for (let i = 0; i < 26; i++) {
          const y = rng.range(0.6, 0.95);
          const k = (y - 0.55) / 0.45;
          const x = rng.chance(0.5) ? rng.range(0.1, 0.9) : rng.range(2.0, 2.9);
          const r = 0.012 + k * 0.03;
          for (let j = 0; j < rng.int(1, 4); j++) {
            const px = x + rng.g() * r * 2.5, py = y + rng.g() * r * 0.5;
            dab(ctx, px, py + r * 0.1, r, r * 0.3, 0, [20, 40, 30], 0.35);
            dab(ctx, px, py, r, r * 0.3, 0, jitter(mix(pal.moss, [60, 100, 60], 0.5), rng, 12), 0.95);
            dab(ctx, px - r * 0.2, py - r * 0.08, r * 0.5, r * 0.12, 0, mix(pal.mossLight, [200, 210, 160], 0.3), 0.45);
            if (rng.chance(0.25)) {
              dab(ctx, px, py - r * 0.18, r * 0.35, r * 0.2, 0, [244, 232, 236], 0.95);
              dab(ctx, px, py - r * 0.22, r * 0.12, r * 0.08, 0, [236, 200, 90], 0.95);
            }
          }
        }
      },
    },
    {
      id: 'edge', kind: 'paint', lw: 3.1, depth: 0.7, sway: 0.7,
      particles: [{ type: 'fireflies', count: 14, area: [0.3, 2.8, 0.55, 0.9], seed: 5 }],
      paint({ ctx, lw }, rng, pal) {
        // near banks on both sides, with irises at the water's edge
        mossGround(ctx, rng, { x0: 0, x1: 0.75, topFn: (x) => 0.82 + Math.pow(x / 0.75, 2) * 0.2, pal });
        mossGround(ctx, rng, { x0: lw - 0.8, x1: lw, topFn: (x) => 0.84 + Math.pow((lw - x) / 0.8, 2) * 0.2, pal });
        for (let i = 0; i < 9; i++) iris(ctx, rng, rng.range(0.25, 0.7), rng.range(0.86, 0.96), rng.range(0.07, 0.11), pal, rng.chance(0.7));
        for (let i = 0; i < 8; i++) iris(ctx, rng, rng.range(lw - 0.75, lw - 0.3), rng.range(0.88, 0.97), rng.range(0.07, 0.11), pal, rng.chance(0.7));
        // the flat sitting stone
        stone(ctx, rng, 0.95, 0.97, 0.12, 0.035, pal, { moss: 0.3, flat: true });
        stone(ctx, rng, 2.45, 0.95, 0.06, 0.03, pal, { moss: 0.6 });
        for (let i = 0; i < 12; i++) grassTuft(ctx, rng, rng.range(0, 0.6), rng.range(0.9, 1.0), rng.range(0.03, 0.06), pal.grass, 7);
      },
    },
    { id: 'rain', kind: 'rain', lw: 3.2, depth: 0.75, scale: 70, speed: 2.4 },
    {
      id: 'front', kind: 'paint', lw: 3.4, depth: 0.92, sway: 1.0,
      paint({ ctx, lw }, rng, pal) {
        const dark = { ...pal, stone: shade(pal.stone, 0.6), stoneLight: shade(pal.stoneLight, 0.6), stoneDark: shade(pal.stoneDark, 0.6), moss: shade(pal.moss, 0.7), mossLight: shade(pal.mossLight, 0.7), mossDark: shade(pal.mossDark, 0.7) };
        stone(ctx, rng, 0.15, 1.02, 0.2, 0.08, dark, { moss: 0.9 });
        for (let i = 0; i < 6; i++) fern(ctx, rng, rng.range(0, 0.45), 1.02, rng.range(0.1, 0.16), shade(pal.fern, 0.7));
        // overhanging maple branch from the top right
        const leaves = pal.leafRed.map((c) => shade(c, 0.8));
        for (let i = 0; i < 7; i++) {
          const bx = lw - 0.1 - i * 0.12, by = 0.02 + i * i * 0.006;
          dab(ctx, bx, by, 0.11, 0.05, 0.3, [40, 30, 24], 0);
          for (let j = 0; j < 260; j++) {
            const a = rng.f() * Math.PI * 2, r = Math.sqrt(rng.f());
            dab(ctx, bx + Math.cos(a) * 0.1 * r, by + Math.sin(a) * 0.05 * r, 0.006, 0.004, rng.g(), jitter(rng.pick(leaves), rng, 12), 0.85);
          }
        }
        ctx.strokeStyle = css([45, 34, 28]);
        ctx.lineWidth = 0.008;
        ctx.beginPath();
        ctx.moveTo(lw + 0.02, -0.02);
        ctx.quadraticCurveTo(lw - 0.4, 0.02, lw - 0.85, 0.32);
        ctx.stroke();
      },
    },
  ],
  pois: [
    { id: 'toGarden', kind: 'path', layer: 'edge', x: 0.6, y: 0.85, label: 'Back to the moss garden', to: 'garden' },
    { id: 'sit', kind: 'sit', layer: 'edge', x: 0.95, y: 0.92, label: 'Sit on the flat stone', script: 'sitPond' },
    { id: 'koi', kind: 'look', layer: 'water', x: 1.45, y: 0.74, label: 'Shapes beneath the water', script: 'koi' },
    { id: 'pavilion', kind: 'look', layer: 'shore', x: 0.75, y: 0.44, label: 'Shelter across the water', script: 'pavilion' },
    { id: 'iris', kind: 'look', layer: 'edge', x: 2.55, y: 0.82, label: 'Irises', script: 'iris' },
    { id: 'frog', kind: 'look', layer: 'pads', x: 2.35, y: 0.78, label: 'Something on a lily pad', script: 'frog', visible: (c) => c.weather === 'rain' || c.flags.rainedYesterday },
  ],
  subjects: [
    { id: 'reflection', layer: 'water', x: 1.45, y: 0.6, r: 0.25, label: 'reflections on the water' },
    { id: 'pavilion', layer: 'shore', x: 0.75, y: 0.48, r: 0.07, label: 'the shelter across the pond' },
    { id: 'lilies', layer: 'pads', x: 0.5, y: 0.8, r: 0.15, label: 'water lilies' },
    { id: 'iris', layer: 'edge', x: 2.55, y: 0.85, r: 0.12, label: 'irises at the water’s edge' },
    { id: 'koi', layer: 'water', x: 1.45, y: 0.74, r: 0.3, label: 'koi beneath the surface' },
    { id: 'leaf', layer: 'pads', dynamic: 'floatleaf', r: 0.015, label: 'a leaf floating on the water' },
    { id: 'fireflies', layer: 'edge', x: 1.5, y: 0.72, r: 0.4, label: 'fireflies over the water', when: (c) => c.time >= 3 && c.weather !== 'rain' },
    { id: 'rain-rings', layer: 'water', x: 1.45, y: 0.8, r: 0.3, label: 'rain on the pond', when: (c) => c.weather === 'rain' },
  ],
};
