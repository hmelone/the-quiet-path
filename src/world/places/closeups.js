// Close-up details: small hand-composed scenes for looking (and photographing) closely.
import { mossGround, stone, fern, grassTuft } from '../../paint/nature.js';
import { bowl } from '../../paint/build.js';
import { dab, mix, shade, css, jitter, path, fillV, texturize } from '../../paint/brush.js';

const rainy = (c) => c.weather === 'rain';

export const bowlCloseup = {
  id: 'bowlCloseup',
  name: 'The tea bowl, up close',
  closeup: true,
  lw: 2.0,
  start: 0.5,
  describe: (c) =>
    'Up close: an earthy brown tea bowl rests in deep moss. A triangular piece is missing from its rim; the break is pale and clean. ' +
    'The missing piece lies a hand’s width away.' + (rainy(c) ? ' Rain beads on the glaze.' : ''),
  sound: { trickle: 1, birds: 0.6, wind: 0.3, leaves: 0.3 },
  layers: [
    {
      id: 'bg', kind: 'paint', lw: 1.9, depth: 0.2,
      paint({ ctx, lw }, rng, pal) {
        // soft, out-of-focus moss and the basin's edge
        ctx.fillStyle = css(shade(pal.moss, 0.8));
        ctx.fillRect(0, 0, lw, 1);
        for (let i = 0; i < 260; i++) dab(ctx, rng.f() * lw, rng.f(), rng.range(0.03, 0.09), rng.range(0.02, 0.06), 0, jitter(rng.chance(0.5) ? pal.mossLight : pal.mossDark, rng, 12), 0.35);
        stone(ctx, rng, lw * 0.25, 0.25, 0.5, 0.28, pal, { moss: 0.5 });
        dab(ctx, lw * 0.25, 0.08, 0.3, 0.06, 0, [40, 56, 58], 0.9);
      },
    },
    {
      id: 'moss', kind: 'paint', lw: 2.0, depth: 0.5,
      paint({ ctx, lw }, rng, pal, cond) {
        mossGround(ctx, rng, { x0: 0, x1: lw, topFn: () => 0.55, pal, density: 3 });
        for (let i = 0; i < 12; i++) grassTuft(ctx, rng, rng.range(0, lw), rng.range(0.6, 1.0), rng.range(0.04, 0.09), pal.grass, 6);
        bowl(ctx, rng, lw * 0.48, 0.82, 0.42, { chipped: true, piece: false });
        // the missing piece
        const px = lw * 0.82, py = 0.86;
        ctx.fillStyle = css([120, 86, 62]);
        ctx.beginPath(); ctx.moveTo(px - 0.05, py); ctx.lineTo(px, py - 0.07); ctx.lineTo(px + 0.06, py + 0.005); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = css([228, 214, 190]); ctx.lineWidth = 0.008; ctx.stroke();
        if (rainy(cond)) {
          for (let i = 0; i < 40; i++) {
            const x = lw * 0.48 + rng.g() * 0.18, y = 0.6 + rng.f() * 0.2;
            dab(ctx, x, y, 0.006, 0.008, 0, [230, 236, 240], 0.7);
            dab(ctx, x - 0.002, y - 0.003, 0.002, 0.002, 0, [255, 255, 255], 0.9);
          }
        }
      },
    },
    { id: 'rain', kind: 'rain', lw: 2.1, depth: 0.7, scale: 40, speed: 2.6 },
  ],
  pois: [
    { id: 'back', kind: 'path', layer: 'moss', x: 1.0, y: 0.97, label: 'Step back', to: 'garden' },
  ],
  subjects: [
    { id: 'bowl-close', layer: 'moss', x: 0.96, y: 0.65, r: 0.15, label: 'the chipped bowl, up close' },
    { id: 'piece', layer: 'moss', x: 1.64, y: 0.85, r: 0.04, label: 'the missing piece' },
    { id: 'break', layer: 'moss', x: 1.07, y: 0.6, r: 0.03, label: 'the clean, pale break' },
  ],
};

export const lanternCloseup = {
  id: 'lanternCloseup',
  name: 'The lantern, up close',
  closeup: true,
  lw: 2.0,
  start: 0.5,
  describe: (c) =>
    'Up close: the lantern’s stone roof is covered in a soft cushion of moss, with tiny ferns growing from a crack. ' +
    (rainy(c) ? 'A small snail moves slowly across the wet stone.' : 'Lichen spreads in pale rings across the stone.'),
  sound: { trickle: 0.3, birds: 0.8, wind: 0.5, leaves: 0.5 },
  layers: [
    {
      id: 'bg', kind: 'paint', lw: 1.9, depth: 0.15,
      paint({ ctx, lw }, rng, pal) {
        const g = ctx.createLinearGradient(0, 0, 0, 1);
        g.addColorStop(0, css(mix(pal.cedarLight, [200, 210, 200], 0.4)));
        g.addColorStop(1, css(shade(pal.moss, 0.7)));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, lw, 1);
        for (let i = 0; i < 200; i++) dab(ctx, rng.f() * lw, rng.f() * 0.8, rng.range(0.04, 0.12), rng.range(0.03, 0.08), 0, jitter(rng.chance(0.5) ? pal.leaf[0] : pal.cedarLight, rng, 12), 0.25);
      },
    },
    {
      id: 'stone', kind: 'paint', lw: 2.0, depth: 0.5,
      paint({ ctx, lw }, rng, pal, cond) {
        // the roof of the lantern, filling the lower frame
        const top = 0.42;
        path(ctx, [[-0.05, 1.05], [-0.05, 0.75], [lw * 0.3, top], [lw * 0.7, top], [lw + 0.05, 0.75], [lw + 0.05, 1.05]]);
        fillV(ctx, top, 1, [[0, pal.stoneLight], [1, pal.stoneDark]]);
        ctx.save();
        ctx.clip();
        texturize(ctx, rng, 0, top, lw, 1, 1600, 0.02, [pal.stoneDark, pal.stoneLight, pal.stone], 0.35);
        // lichen rings
        for (let i = 0; i < 18; i++) {
          const x = rng.range(0.1, lw - 0.1), y = rng.range(0.6, 0.95), r = rng.range(0.02, 0.06);
          ctx.strokeStyle = css([200, 204, 170], 0.5);
          ctx.lineWidth = 0.006;
          ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        // moss cushion on top
        for (let i = 0; i < 2600; i++) {
          const x = rng.range(lw * 0.2, lw * 0.8), y = top + 0.02 - Math.abs(rng.g()) * 0.12 + rng.f() * 0.08;
          dab(ctx, x, y, 0.012, 0.008, rng.g(), jitter(rng.pick([pal.moss, pal.mossLight, pal.mossDark]), rng, 14), 0.7);
        }
        for (let i = 0; i < 80; i++) {
          const x = rng.range(lw * 0.25, lw * 0.75), y = top - rng.f() * 0.12;
          ctx.strokeStyle = css([150, 120, 70], 0.8); ctx.lineWidth = 0.002;
          ctx.beginPath(); ctx.moveTo(x, y + 0.03); ctx.lineTo(x + rng.g() * 0.01, y - 0.02); ctx.stroke();
          dab(ctx, x, y - 0.022, 0.004, 0.006, 0, [140, 80, 50], 0.9);
        }
        fern(ctx, rng, lw * 0.68, top + 0.03, 0.16, pal.fern);
        fern(ctx, rng, lw * 0.73, top + 0.04, 0.1, pal.fern);
        if (rainy(cond)) {
          // a small snail
          const sx = lw * 0.4, sy = 0.62;
          dab(ctx, sx + 0.03, sy + 0.015, 0.05, 0.01, 0, [150, 130, 110], 0.9);
          dab(ctx, sx, sy, 0.03, 0.026, 0, [130, 96, 60]);
          ctx.strokeStyle = css([80, 60, 40]); ctx.lineWidth = 0.004;
          ctx.beginPath(); ctx.arc(sx, sy, 0.016, 0, Math.PI * 1.6); ctx.stroke();
          for (let i = 0; i < 40; i++) dab(ctx, rng.range(0, lw), rng.range(top, 1), 0.005, 0.006, 0, [230, 236, 240], 0.6);
        }
      },
    },
    { id: 'rain', kind: 'rain', lw: 2.1, depth: 0.7, scale: 40, speed: 2.6 },
  ],
  pois: [
    { id: 'back', kind: 'path', layer: 'stone', x: 1.0, y: 0.95, label: 'Step back', to: 'garden' },
  ],
  subjects: [
    { id: 'moss-roof', layer: 'stone', x: 1.0, y: 0.38, r: 0.2, label: 'moss on the lantern roof' },
    { id: 'tiny-fern', layer: 'stone', x: 1.36, y: 0.38, r: 0.08, label: 'a tiny fern growing from stone' },
    { id: 'lichen', layer: 'stone', x: 1.0, y: 0.8, r: 0.2, label: 'lichen on stone' },
    { id: 'snail', layer: 'stone', x: 0.8, y: 0.62, r: 0.04, label: 'a snail on wet stone', when: rainy },
  ],
};
