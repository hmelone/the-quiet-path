// Your small room: tatami, a low desk and lamp, a folded futon,
// an alcove with a single flower, and a curtained darkroom corner.
import { room, shojiOnWall } from '../../paint/room.js';
import { path, fillV, css, mix, shade, dab, glow, texturize, jitter } from '../../paint/brush.js';
import { post } from '../../paint/build.js';

const VP = [1.15, 0.44];
const ZB = 2.4;
const FL = -0.2, FR = 2.5, FT = -0.06, FB = 1.06;

function paintRoom({ ctx }, rng, pal, cond, emis) {
  const R = room(VP);
  // ceiling
  path(ctx, [R.P(FL, FT, 1), R.P(FR, FT, 1), R.P(FR, FT, ZB), R.P(FL, FT, ZB)]);
  fillV(ctx, FT, R.P(0, FT, ZB)[1], [[0, shade(pal.wood, 0.5)], [1, shade(pal.woodLight, 0.7)]]);
  // back wall: plaster with an alcove (left) and a paper window (right)
  const bl = R.P(FL, FT, ZB), br = R.P(FR, FB, ZB);
  ctx.save();
  ctx.beginPath();
  ctx.rect(bl[0], bl[1], br[0] - bl[0], br[1] - bl[1]);
  fillV(ctx, bl[1], br[1], [[0, shade(pal.plaster, 0.8)], [1, pal.plaster]]);
  ctx.clip();
  texturize(ctx, rng, bl[0], bl[1], br[0], br[1], 600, 0.006, [pal.plasterShade, pal.plaster], 0.18);
  ctx.restore();
  // alcove (tokonoma)
  const ax0 = bl[0] + 0.06, ax1 = bl[0] + 0.42, at = bl[1] + 0.04, ab = br[1] - 0.01;
  ctx.fillStyle = css(shade(pal.plaster, 0.72));
  ctx.fillRect(ax0, at, ax1 - ax0, ab - at);
  ctx.fillStyle = css(pal.woodDark);
  ctx.fillRect(ax0, ab - 0.02, ax1 - ax0, 0.02);
  ctx.fillRect(ax1 - 0.008, at, 0.012, ab - at);
  // hanging scroll: an ink landscape, no writing
  const sx = (ax0 + ax1) / 2 - 0.035, sw = 0.07, st = at + 0.02, sh = 0.2;
  ctx.fillStyle = css([226, 216, 192]);
  ctx.fillRect(sx, st, sw, sh);
  ctx.fillStyle = css([110, 120, 100]);
  ctx.fillRect(sx - 0.004, st - 0.006, sw + 0.008, 0.008);
  ctx.fillRect(sx - 0.004, st + sh, sw + 0.008, 0.01);
  ctx.save();
  ctx.beginPath(); ctx.rect(sx + 0.006, st + 0.01, sw - 0.012, sh - 0.02); ctx.clip();
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = css([40, 40, 44], 0.18 + k * 0.12);
    ctx.beginPath();
    ctx.moveTo(sx, st + sh * (0.55 + k * 0.12));
    for (let i = 0; i <= 10; i++) ctx.lineTo(sx + (sw * i) / 10, st + sh * (0.45 + k * 0.13) - Math.sin(i * 1.3 + k) * 0.02 - rng.f() * 0.01);
    ctx.lineTo(sx + sw, st + sh);
    ctx.lineTo(sx, st + sh);
    ctx.fill();
  }
  ctx.restore();
  // single flower in a slim vase
  const vx = ax1 - 0.08, vy = ab - 0.02;
  ctx.fillStyle = css([70, 66, 60]);
  ctx.fillRect(vx - 0.006, vy - 0.04, 0.012, 0.04);
  ctx.strokeStyle = css(pal.fern);
  ctx.lineWidth = 0.0018;
  ctx.beginPath(); ctx.moveTo(vx, vy - 0.04); ctx.quadraticCurveTo(vx + 0.01, vy - 0.07, vx + 0.004, vy - 0.095); ctx.stroke();
  dab(ctx, vx + 0.004, vy - 0.098, 0.009, 0.007, 0, pal.camellia);
  dab(ctx, vx - 0.006, vy - 0.065, 0.008, 0.004, 0.5, pal.fern);
  // window on the back wall (right part)
  const wx0 = bl[0] + 0.62, wx1 = br[0] - 0.08, wt = bl[1] + 0.06, wb = bl[1] + 0.3;
  ctx.fillStyle = css(pal.shoji);
  ctx.fillRect(wx0, wt, wx1 - wx0, wb - wt);
  ctx.strokeStyle = css(pal.woodDark, 0.7);
  ctx.lineWidth = 0.003;
  for (let i = 0; i <= 6; i++) { const x = wx0 + ((wx1 - wx0) * i) / 6; ctx.beginPath(); ctx.moveTo(x, wt); ctx.lineTo(x, wb); ctx.stroke(); }
  for (let i = 0; i <= 4; i++) { const y = wt + ((wb - wt) * i) / 4; ctx.beginPath(); ctx.moveTo(wx0, y); ctx.lineTo(wx1, y); ctx.stroke(); }
  if (emis) {
    emis.ctx.fillStyle = css([255, 248, 230], 0.9);
    emis.ctx.fillRect(wx0, wt, wx1 - wx0, wb - wt);
  }
  // side walls
  for (const X of [FL, FR]) {
    path(ctx, [R.P(X, FT, 1), R.P(X, FT, ZB), R.P(X, FB, ZB), R.P(X, FB, 1)]);
    fillV(ctx, FT, FB, [[0, shade(pal.plaster, 0.7)], [1, shade(pal.plaster, 0.85)]]);
    for (const z of [1, 1.7, ZB]) {
      const A = R.P(X, FT, z), B = R.P(X, FB, z), w = 0.035 / z;
      ctx.fillStyle = css(pal.woodDark);
      ctx.fillRect(A[0] - w / 2, A[1], w, B[1] - A[1]);
    }
  }
  // left wall: sliding door to the garden
  shojiOnWall(ctx, R, FL, 0.05, 0.98, 1.1, 1.62, pal, emis);
  // tatami floor
  const floor = [R.P(FL, FB, 1), R.P(FR, FB, 1), R.P(FR, FB, ZB), R.P(FL, FB, ZB)];
  ctx.save();
  path(ctx, floor);
  fillV(ctx, floor[2][1], FB, [[0, shade(pal.tatami, 0.72)], [1, pal.tatami]]);
  ctx.clip();
  for (let i = 0; i < 5000; i++) {
    const x = rng.range(FL, FR), z = rng.range(1, ZB);
    const [px, py] = R.P(x, FB, z);
    dab(ctx, px, py, 0.012 / z, 0.0012 / z, 0, jitter(pal.tatami, rng, 10), 0.18);
  }
  for (const X of [0.45, 1.15, 1.85]) R.line(ctx, R.P(X, FB, 1), R.P(X, FB, ZB), css(pal.tatamiEdge, 0.85), 0.006);
  for (const z of [1.35, 1.85]) R.line(ctx, R.P(FL, FB, z), R.P(FR, FB, z), css(pal.tatamiEdge, 0.85), 0.006 / z);
  ctx.restore();
  // folded futon on the left
  const [fx, fy] = R.P(0.15, FB, 1.9);
  for (let k = 0; k < 3; k++) {
    dab(ctx, fx, fy - k * 0.022, 0.14, 0.025, 0, k === 2 ? [226, 222, 210] : [62, 74, 104]);
    dab(ctx, fx - 0.03, fy - k * 0.022 - 0.008, 0.08, 0.008, 0, [255, 255, 255], 0.12);
  }
  // darkroom corner on the right: a dark curtain and a small red lamp
  const c0 = R.P(FR, 0.1, 1.75), c1 = R.P(FR, FB, ZB);
  path(ctx, [R.P(FR, 0.12, 1.8), R.P(FR, 0.12, ZB), R.P(FR, FB, ZB), R.P(FR, FB, 1.8)]);
  ctx.fillStyle = css([34, 30, 34]);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const z = 1.8 + ((ZB - 1.8) * i) / 9;
    R.line(ctx, R.P(FR, 0.12, z), R.P(FR, FB, z), css([60, 54, 60], 0.6), 0.003 / z);
  }
  const lamp = R.P(FR, 0.2, 2.05);
  dab(ctx, lamp[0], lamp[1], 0.008, 0.008, 0, [170, 40, 30]);
  if (emis) glow(emis.ctx, lamp[0], lamp[1], 0.05, [200, 40, 30], 0.5);
  void c0; void c1;
}

export default {
  id: 'quarters',
  name: 'Your room',
  lw: 2.4,
  interior: true,
  start: 0.5,
  describe: (c) =>
    'A small tatami room. A low desk sits in the middle with a paper lamp and a small bell. A futon is folded on the left. ' +
    'In the alcove hangs an ink painting of mountains, with a single flower beneath it. A dark curtain closes off a corner for developing film.' +
    (c.flags.noteWaiting ? ' A folded note lies on the desk.' : ''),
  sound: { room: 1, wind: 0.2, birds: 0.2, muffled: 1 },
  paintKey: (c) => `${!!c.flags.noteWaiting}`,
  layers: [
    {
      id: 'room', kind: 'paint', lw: 2.35, depth: 0.35, emissive: true, emisKey: 'day', emisGain: 0.6,
      paint(layer, rng, pal, cond, { emis }) { paintRoom(layer, rng, pal, cond, emis); },
    },
    {
      id: 'desk', kind: 'paint', lw: 2.4, depth: 0.55, emissive: true, emisKey: 'night',
      paint({ ctx }, rng, pal, cond, { emis }) {
        const R = room(VP);
        // low desk
        const top = [R.P(0.85, 0.86, 1.25), R.P(1.6, 0.86, 1.25), R.P(1.6, 0.86, 1.55), R.P(0.85, 0.86, 1.55)];
        path(ctx, top);
        fillV(ctx, top[2][1], top[0][1], [[0, shade(pal.woodDark, 1.2)], [1, pal.wood]]);
        const f0 = R.P(0.85, 0.86, 1.25), f1 = R.P(1.6, 0.86, 1.25);
        ctx.fillStyle = css(shade(pal.woodDark, 0.8));
        ctx.fillRect(f0[0], f0[1], f1[0] - f0[0], 0.02);
        for (const X of [0.88, 1.57]) {
          const a = R.P(X, 0.88, 1.25);
          ctx.fillRect(a[0] - 0.006, a[1], 0.012, 0.11);
        }
        // paper lamp (andon)
        const [lx, ly] = R.P(1.45, 0.86, 1.45);
        ctx.fillStyle = css([236, 224, 196]);
        ctx.fillRect(lx - 0.025, ly - 0.1, 0.05, 0.1);
        ctx.strokeStyle = css(pal.woodDark);
        ctx.lineWidth = 0.003;
        ctx.strokeRect(lx - 0.025, ly - 0.1, 0.05, 0.1);
        glow(emis.ctx, lx, ly - 0.05, 0.3, [255, 190, 110], 0.9);
        emis.ctx.fillStyle = css([255, 220, 160], 0.9);
        emis.ctx.fillRect(lx - 0.025, ly - 0.1, 0.05, 0.1);
        // small bell on a cushion
        const [bx, by] = R.P(1.05, 0.86, 1.38);
        dab(ctx, bx, by, 0.025, 0.008, 0, [140, 40, 40]);
        dab(ctx, bx, by - 0.012, 0.016, 0.012, 0, [120, 100, 50]);
        dab(ctx, bx - 0.005, by - 0.016, 0.006, 0.004, 0, [220, 200, 130], 0.7);
        // prompt slips and, sometimes, a note
        const [px, py] = R.P(1.25, 0.86, 1.32);
        ctx.fillStyle = css([240, 236, 224]);
        ctx.fillRect(px - 0.03, py - 0.006, 0.025, 0.01);
        ctx.fillRect(px + 0.002, py - 0.004, 0.025, 0.01);
        if (cond.flags.noteWaiting) {
          ctx.fillStyle = css([248, 244, 232]);
          ctx.fillRect(px - 0.05, py + 0.01, 0.05, 0.016);
          ctx.strokeStyle = css([80, 70, 60], 0.5);
          ctx.strokeRect(px - 0.05, py + 0.01, 0.05, 0.016);
        }
      },
    },
    {
      id: 'near', kind: 'paint', lw: 2.6, depth: 0.85,
      paint({ ctx, lw }, rng, pal) {
        post(ctx, rng, 0.08, -0.05, 1.05, 0.06, pal);
        post(ctx, rng, lw - 0.08, -0.05, 1.05, 0.06, pal);
        // your camera bag at the bottom right
        dab(ctx, lw - 0.42, 1.0, 0.09, 0.05, 0, [86, 70, 52]);
        dab(ctx, lw - 0.44, 0.97, 0.07, 0.012, 0, [120, 100, 76], 0.6);
      },
    },
  ],
  pois: [
    { id: 'out', kind: 'path', layer: 'room', x: 0.16, y: 0.6, label: 'Slide the door open and go out to the garden', to: 'garden' },
    { id: 'futon', kind: 'look', layer: 'room', x: 0.28, y: 0.74, label: 'Folded futon (rest)', script: 'futon' },
    { id: 'bell', kind: 'look', layer: 'desk', x: 1.05, y: 0.78, label: 'Small bell (let time pass)', script: 'bell' },
    { id: 'desk', kind: 'look', layer: 'desk', x: 1.27, y: 0.75, label: 'Paper slips on the desk', script: 'desk' },
    { id: 'note', kind: 'look', layer: 'desk', x: 1.2, y: 0.8, label: 'A folded note', script: 'note', visible: (c) => !!c.flags.noteWaiting },
    { id: 'darkroom', kind: 'look', layer: 'room', x: 2.0, y: 0.55, label: 'Darkroom corner (develop film)', script: 'darkroom' },
    { id: 'scroll', kind: 'look', layer: 'room', x: 0.67, y: 0.38, label: 'Alcove with a painting and a flower', script: 'alcove' },
  ],
  subjects: [
    { id: 'flower', layer: 'room', x: 0.78, y: 0.45, r: 0.03, label: 'a single flower in the alcove' },
    { id: 'scroll', layer: 'room', x: 0.67, y: 0.38, r: 0.06, label: 'the ink painting' },
    { id: 'lamp', layer: 'desk', x: 1.42, y: 0.72, r: 0.05, label: 'the paper lamp', when: (c) => c.time >= 3 || c.time === 0 },
    { id: 'window', layer: 'room', x: 1.3, y: 0.38, r: 0.12, label: 'light on the paper window' },
  ],
};
