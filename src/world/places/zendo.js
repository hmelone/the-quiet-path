// Inside the meditation hall (zendō): raised platforms with cushions,
// paper windows, a small altar at the far end, incense smoke in the light.
import { room, plankFloor, shojiOnWall, zafu } from '../../paint/room.js';
import { path, fillV, css, mix, shade, dab, glow, texturize } from '../../paint/brush.js';
import { lightShafts } from '../../paint/nature.js';
import { post } from '../../paint/build.js';

const VP = [1.25, 0.42];
const ZB = 3.3;
const FL = -0.25, FR = 2.75, FT = -0.06, FB = 1.06; // front frame
const PLAT_Y = 0.83;           // top of the raised platforms (front plane)
const PLAT_L = 0.32, PLAT_R = 2.18;

function paintRoom({ ctx }, rng, pal, cond, emis) {
  const R = room(VP);
  // ceiling
  ctx.save();
  path(ctx, [R.P(FL, FT, 1), R.P(FR, FT, 1), R.P(FR, FT, ZB), R.P(FL, FT, ZB)]);
  fillV(ctx, FT, R.P(0, FT, ZB)[1], [[0, shade(pal.woodDark, 0.6)], [1, shade(pal.wood, 0.7)]]);
  ctx.restore();
  for (let i = 1; i <= 7; i++) {
    const z = 1 + ((ZB - 1) * i) / 7;
    R.line(ctx, R.P(FL, FT, z), R.P(FR, FT, z), css(shade(pal.woodDark, 0.5)), 0.012 / z);
  }
  // back wall
  const bl = R.P(FL, FT, ZB), br = R.P(FR, FB, ZB);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bl[0], bl[1], br[0] - bl[0], br[1] - bl[1]);
  fillV(ctx, bl[1], br[1], [[0, shade(pal.wood, 0.75)], [1, pal.wood]]);
  ctx.clip();
  texturize(ctx, rng, bl[0], bl[1], br[0], br[1], 400, 0.006, [pal.woodDark, pal.woodLight], 0.12);
  ctx.restore();
  // altar alcove
  const ax = VP[0], aw = 0.2, at = bl[1] + 0.05, ab = br[1] - 0.02;
  ctx.fillStyle = css([26, 20, 16]);
  ctx.fillRect(ax - aw / 2, at, aw, ab - at);
  // seated figure, deliberately soft and in shadow
  ctx.fillStyle = css([92, 78, 56], 0.75);
  ctx.beginPath();
  ctx.ellipse(ax, ab - 0.035, 0.045, 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ax, ab - 0.07, 0.024, 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(ax, ab - 0.115, 0.012, 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  // altar table with candle, incense bowl, flowers
  ctx.fillStyle = css(shade(pal.woodDark, 0.8));
  ctx.fillRect(ax - 0.07, ab - 0.012, 0.14, 0.016);
  ctx.fillRect(ax - 0.06, ab, 0.008, 0.02);
  ctx.fillRect(ax + 0.052, ab, 0.008, 0.02);
  ctx.fillStyle = css([210, 200, 180]);
  ctx.fillRect(ax - 0.05, ab - 0.03, 0.006, 0.018);
  dab(ctx, ax - 0.047, ab - 0.034, 0.0025, 0.004, 0, [255, 210, 120]);
  dab(ctx, ax, ab - 0.016, 0.012, 0.006, 0, [120, 110, 90]);
  ctx.strokeStyle = css([120, 60, 40]);
  ctx.lineWidth = 0.0015;
  ctx.beginPath(); ctx.moveTo(ax, ab - 0.02); ctx.lineTo(ax, ab - 0.045); ctx.stroke();
  ctx.fillStyle = css([90, 80, 70]);
  ctx.fillRect(ax + 0.035, ab - 0.03, 0.01, 0.018);
  for (let i = 0; i < 6; i++) dab(ctx, ax + 0.04 + rng.g() * 0.008, ab - 0.035 - rng.f() * 0.012, 0.004, 0.003, 0, i % 2 ? [220, 200, 120] : pal.fern);
  if (emis) {
    glow(emis.ctx, ax - 0.047, ab - 0.034, 0.08, [255, 190, 110], 0.9);
  }
  // side walls with windows above the platforms
  for (const [X, side] of [[FL, -1], [FR, 1]]) {
    ctx.save();
    path(ctx, [R.P(X, FT, 1), R.P(X, FT, ZB), R.P(X, FB, ZB), R.P(X, FB, 1)]);
    ctx.fillStyle = css(shade(pal.wood, 0.85));
    ctx.fill();
    ctx.restore();
    const zs = [1, 1.45, 1.95, 2.55, ZB];
    for (let i = 0; i < zs.length - 1; i++) {
      shojiOnWall(ctx, R, X, 0.12, 0.62, zs[i] + 0.04, zs[i + 1] - 0.04, pal, emis);
    }
    for (const z of zs) {
      const A = R.P(X, FT, z), B = R.P(X, FB, z);
      const w = 0.03 / z;
      ctx.fillStyle = css(shade(pal.woodDark, 0.9));
      ctx.fillRect(A[0] - w / 2, A[1], w, B[1] - A[1]);
    }
    void side;
  }
  // floor
  plankFloor(ctx, rng, R, FL, FR, FB, ZB, pal, 28);
  // raised tatami platforms along both sides
  for (const [x0, x1, edge] of [[FL, PLAT_L, PLAT_L], [PLAT_R, FR, PLAT_R]]) {
    ctx.save();
    path(ctx, [R.P(x0, PLAT_Y, 1), R.P(x1, PLAT_Y, 1), R.P(x1, PLAT_Y, ZB), R.P(x0, PLAT_Y, ZB)]);
    fillV(ctx, R.P(0, PLAT_Y, ZB)[1], PLAT_Y, [[0, shade(pal.tatami, 0.75)], [1, pal.tatami]]);
    ctx.clip();
    for (let i = 1; i < 12; i++) {
      const z = 1 + ((ZB - 1) * i) / 12;
      R.line(ctx, R.P(x0, PLAT_Y, z), R.P(x1, PLAT_Y, z), css(pal.tatamiEdge, 0.7), 0.006 / z);
    }
    ctx.restore();
    // vertical face of the platform
    path(ctx, [R.P(edge, PLAT_Y, 1), R.P(edge, PLAT_Y, ZB), R.P(edge, FB, ZB), R.P(edge, FB, 1)]);
    ctx.fillStyle = css(shade(pal.woodDark, 0.85));
    ctx.fill();
    R.line(ctx, R.P(edge, PLAT_Y, 1), R.P(edge, PLAT_Y, ZB), css(pal.woodLight), 0.004);
    // cushions
    const cx = (x0 + x1) / 2;
    for (const z of [1.25, 1.6, 2.0, 2.45, 2.9]) {
      const [px, py] = R.P(cx, PLAT_Y, z);
      zafu(ctx, px, py - 0.006 / z, 0.07 / z, rng);
    }
  }
}

export default {
  id: 'zendo',
  name: 'The meditation hall',
  lw: 2.55,
  interior: true,
  start: 0.5,
  describe: (c) =>
    'A long, quiet hall with a polished wooden floor. Raised mats run along both sides, each with a row of round black cushions. ' +
    'Paper windows let in soft light. At the far end is a small altar with a candle, incense and flowers. ' +
    (c.time === 0 || c.time === 3 ? 'Several cushions are taken; people sit facing the wall in silence.' : 'The hall is empty.'),
  sound: { room: 1, wind: 0.15, birds: 0.25, leaves: 0.1, muffled: 1 },
  layers: [
    {
      id: 'room', kind: 'paint', lw: 2.5, depth: 0.35, emissive: true, emisKey: 'day', emisGain: 0.55,
      particles: [{ type: 'smoke', at: [1.25, 0.52], count: 26, rise: 0.12 }],
      paint(layer, rng, pal, cond, { emis }) { paintRoom(layer, rng, pal, cond, emis); },
    },
    {
      id: 'lamps', kind: 'paint', lw: 2.52, depth: 0.4, emissive: true, emisKey: 'night', pick: false,
      paint({ ctx }, rng, pal, cond, { emis }) {
        const R = room(VP);
        for (const z of [1.5, 2.4]) {
          const [x, y] = R.P(VP[0], 0.08, z);
          const s = 0.05 / z;
          ctx.strokeStyle = css(pal.woodDark);
          ctx.lineWidth = 0.002;
          ctx.beginPath(); ctx.moveTo(x, R.P(VP[0], FT, z)[1]); ctx.lineTo(x, y - s); ctx.stroke();
          dab(ctx, x, y, s * 0.55, s * 0.75, 0, [226, 214, 186]);
          ctx.fillStyle = css(pal.woodDark);
          ctx.fillRect(x - s * 0.4, y - s * 0.8, s * 0.8, s * 0.1);
          ctx.fillRect(x - s * 0.4, y + s * 0.72, s * 0.8, s * 0.1);
          glow(emis.ctx, x, y, s * 3.2, [255, 196, 120], 0.9);
          glow(emis.ctx, x, y + 0.25 / z, s * 4, [255, 170, 90], 0.25);
        }
      },
    },
    {
      id: 'shafts', kind: 'paint', lw: 2.5, depth: 0.42, additive: true, emisKey: 'beam', emisGain: 0.8, pick: false,
      particles: [{ type: 'motes', count: 50, x: [0.4, 1.9], y: [0.2, 0.8], light: true, seed: 8 }],
      paint({ ctx, lw }, rng) {
        lightShafts(ctx, rng, lw, { count: 6, from: 0.1, angle: 0.75, alpha: 0.16, x0: 0.05, x1: 1.0, color: [255, 240, 210] });
      },
    },
    {
      id: 'near', kind: 'paint', lw: 2.75, depth: 0.8,
      paint({ ctx, lw }, rng, pal) {
        post(ctx, rng, 0.12, -0.05, 1.05, 0.07, pal);
        post(ctx, rng, lw - 0.12, -0.05, 1.05, 0.07, pal);
        // a small handwritten card pinned to the right post
        ctx.fillStyle = css([236, 230, 214]);
        ctx.fillRect(lw - 0.2, 0.5, 0.05, 0.07);
        ctx.strokeStyle = css([60, 55, 50], 0.5);
        ctx.lineWidth = 0.002;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(lw - 0.192, 0.512 + i * 0.013); ctx.lineTo(lw - 0.158 - (i % 2) * 0.01, 0.512 + i * 0.013); ctx.stroke();
        }
        // your cushion, close by on the left platform's edge
        zafu(ctx, 0.5, 0.97, 0.1, rng);
      },
    },
  ],
  pois: [
    { id: 'out', kind: 'path', layer: 'near', x: 2.45, y: 0.9, label: 'Step back outside', to: 'garden' },
    { id: 'cushion', kind: 'sit', layer: 'near', x: 0.5, y: 0.9, label: 'Sit on the cushion', script: 'sitZendo' },
    { id: 'altar', kind: 'look', layer: 'room', x: 1.25, y: 0.46, label: 'The altar', script: 'altar' },
    { id: 'windows', kind: 'look', layer: 'room', x: 0.55, y: 0.3, label: 'Paper windows', script: 'windows' },
    { id: 'card', kind: 'look', layer: 'near', x: 2.575, y: 0.53, label: 'A small card on the post', script: 'card' },
  ],
  subjects: [
    { id: 'altar-candle', layer: 'room', x: 1.2, y: 0.55, r: 0.03, label: 'the altar candle' },
    { id: 'incense', layer: 'room', x: 1.25, y: 0.47, r: 0.04, label: 'incense smoke' },
    { id: 'cushions', layer: 'room', x: 0.1, y: 0.8, r: 0.15, label: 'the row of cushions' },
    { id: 'window-light', layer: 'room', x: 0.4, y: 0.35, r: 0.15, label: 'light through paper windows', when: (c) => c.time > 0 && c.time < 4 },
    { id: 'floor', layer: 'room', x: 1.25, y: 0.85, r: 0.2, label: 'the polished floor' },
    { id: 'lamps', layer: 'lamps', x: 1.25, y: 0.2, r: 0.08, label: 'hanging lamps', when: (c) => c.time >= 3 || c.time === 0 },
  ],
};
