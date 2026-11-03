// Architecture painters: roofs, gate, walls, hall, lantern, basin, steps.
import { clamp } from '../core/rng.js';
import { dab, path, fillV, texturize, mix, shade, jitter, css, glow, curve } from './brush.js';
import { stone } from './nature.js';

/** Front-elevation temple roof with lifted eave corners. */
export function roof(ctx, rng, cx, yEave, w, h, pal, { tiles = true, color } = {}) {
  const col = color || pal.roof;
  const hw = w / 2;
  const rw = w * 0.3;
  const top = yEave - h;
  const pts = [];
  // ridge
  pts.push([cx - rw, top], [cx + rw, top]);
  // right slope, concave
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const x = cx + rw + (hw - rw) * t;
    const y = top + h * (Math.pow(t, 0.7) * 0.92) - Math.pow(t, 6) * h * 0.18;
    pts.push([x, y]);
  }
  // eave underside, sagging slightly towards middle
  const thick = h * 0.13;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = cx + hw - w * t;
    const lift = Math.pow(Math.abs(t * 2 - 1), 5) * h * 0.2;
    pts.push([x, yEave + thick - lift]);
  }
  for (let i = 12; i >= 1; i--) {
    const t = i / 12;
    const x = cx - rw - (hw - rw) * t;
    const y = top + h * (Math.pow(t, 0.7) * 0.92) - Math.pow(t, 6) * h * 0.18;
    pts.push([x, y]);
  }
  ctx.save();
  path(ctx, pts);
  fillV(ctx, top, yEave + thick, [[0, shade(col, 0.85)], [0.6, col], [0.85, mix(col, pal.roofLight || col, 0.5)], [1, shade(col, 0.5)]]);
  ctx.clip();
  if (tiles) {
    // vertical tile rows
    const rows = Math.round(w / 0.006);
    for (let i = 0; i <= rows; i++) {
      const x = cx - hw + (w * i) / rows;
      ctx.strokeStyle = css(shade(col, 1.25), 0.35);
      ctx.lineWidth = w * 0.0025;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, yEave + thick);
      ctx.stroke();
    }
  }
  texturize(ctx, rng, cx - hw, top, cx + hw, yEave + thick, Math.round(w * h * 30000), w * 0.006, [shade(col, 0.7), shade(col, 1.2), [110, 120, 90]], 0.18);
  // eave shadow line
  ctx.fillStyle = css(shade(col, 0.35), 0.8);
  ctx.fillRect(cx - hw, yEave + thick * 0.55, w, thick);
  ctx.restore();
  // ridge cap
  ctx.fillStyle = css(shade(col, 0.6));
  ctx.fillRect(cx - rw - w * 0.01, top - h * 0.07, rw * 2 + w * 0.02, h * 0.09);
  dab(ctx, cx - rw - w * 0.012, top - h * 0.06, w * 0.014, h * 0.09, 0, shade(col, 0.55));
  dab(ctx, cx + rw + w * 0.012, top - h * 0.06, w * 0.014, h * 0.09, 0, shade(col, 0.55));
  return { top, bottom: yEave + thick };
}

function post(ctx, rng, x, yTop, yBot, w, pal) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w / 2, yTop, w, yBot - yTop);
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, css(pal.woodLight));
  g.addColorStop(0.45, css(pal.wood));
  g.addColorStop(1, css(pal.woodDark));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const gx = x - w / 2 + rng.f() * w;
    ctx.strokeStyle = css(shade(pal.wood, rng.range(0.6, 1.3)), 0.25);
    ctx.lineWidth = w * 0.04;
    ctx.beginPath();
    ctx.moveTo(gx, yTop);
    ctx.lineTo(gx + rng.g() * w * 0.1, yBot);
    ctx.stroke();
  }
  // weathering near the base
  const gb = ctx.createLinearGradient(0, yBot - (yBot - yTop) * 0.2, 0, yBot);
  gb.addColorStop(0, css(pal.woodGrey, 0));
  gb.addColorStop(1, css(pal.woodGrey, 0.5));
  ctx.fillStyle = gb;
  ctx.fillRect(x - w, yTop, w * 2, yBot - yTop);
  ctx.restore();
}

function beam(ctx, rng, x0, x1, y, h, pal) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y, x1 - x0, h);
  fillV(ctx, y, y + h, [[0, pal.woodLight], [1, pal.woodDark]]);
  ctx.clip();
  texturize(ctx, rng, x0, y, x1, y + h, Math.round((x1 - x0) * 300), h * 0.4, [pal.woodDark, pal.woodLight], 0.15);
  ctx.restore();
}

/** Plaster wall with a small tiled cap (tsuiji-bei). */
export function wall(ctx, rng, x0, x1, baseY, h, pal) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, baseY - h, x1 - x0, h);
  fillV(ctx, baseY - h, baseY, [[0, pal.plasterShade], [0.2, pal.plaster], [1, mix(pal.plaster, pal.soil, 0.35)]]);
  ctx.clip();
  texturize(ctx, rng, x0, baseY - h, x1, baseY, Math.round((x1 - x0) * h * 30000), h * 0.04, [pal.plasterShade, pal.plaster, [190, 180, 160]], 0.2);
  // rain streaks
  for (let i = 0; i < (x1 - x0) * 60; i++) {
    const x = rng.range(x0, x1);
    ctx.strokeStyle = css([120, 110, 95], rng.range(0.05, 0.15));
    ctx.lineWidth = rng.range(0.001, 0.003);
    ctx.beginPath();
    ctx.moveTo(x, baseY - h);
    ctx.lineTo(x, baseY - h + rng.range(0.1, 0.6) * h);
    ctx.stroke();
  }
  // damp base with moss
  for (let i = 0; i < (x1 - x0) * 500; i++) {
    dab(ctx, rng.range(x0, x1), baseY - rng.f() * rng.f() * h * 0.3, 0.004, 0.002, rng.g() * 0.3, jitter(pal.mossDark, rng, 10), 0.3);
  }
  ctx.restore();
  // tile cap
  ctx.save();
  path(ctx, [[x0 - 0.01, baseY - h + 0.004], [x0 + 0.004, baseY - h - h * 0.12], [x1 - 0.004, baseY - h - h * 0.12], [x1 + 0.01, baseY - h + 0.004]]);
  fillV(ctx, baseY - h - h * 0.12, baseY - h, [[0, pal.roofLight], [1, shade(pal.roof, 0.6)]]);
  ctx.restore();
  ctx.fillStyle = css(shade(pal.roof, 0.4), 0.5);
  ctx.fillRect(x0, baseY - h + 0.003, x1 - x0, 0.006);
}

/** Temple gate: four posts, beams, open doors and a single roof. */
export function gate(ctx, rng, cx, baseY, w, pal, emis) {
  const h = w * 0.62;
  const pw = w * 0.055;
  const xs = [-0.46, -0.2, 0.2, 0.46].map((k) => cx + k * w);
  // inner shadow in the opening
  ctx.fillStyle = css([30, 28, 24], 0.18);
  ctx.fillRect(xs[1], baseY - h * 0.9, xs[2] - xs[1], h * 0.9);
  xs.forEach((x, i) => post(ctx, rng, x, baseY - h * (i === 0 || i === 3 ? 0.88 : 0.92), baseY, pw * (i === 0 || i === 3 ? 0.85 : 1), pal));
  // stone footings
  xs.forEach((x) => stone(ctx, rng, x, baseY, pw * 0.9, pw * 0.35, pal, { moss: 0.5 }));
  beam(ctx, rng, xs[0] - pw, xs[3] + pw, baseY - h * 0.93, h * 0.07, pal);
  beam(ctx, rng, xs[0] - pw * 0.5, xs[3] + pw * 0.5, baseY - h * 0.72, h * 0.04, pal);
  // bracket blocks
  for (let i = 0; i < 9; i++) {
    const x = xs[0] + ((xs[3] - xs[0]) * i) / 8;
    ctx.fillStyle = css(shade(pal.wood, 0.75));
    ctx.fillRect(x - pw * 0.4, baseY - h * 0.99, pw * 0.8, h * 0.06);
  }
  // plaque (left blank and weathered on purpose)
  ctx.fillStyle = css(shade(pal.wood, 0.5));
  ctx.fillRect(cx - w * 0.06, baseY - h * 0.88, w * 0.12, h * 0.12);
  ctx.strokeStyle = css(pal.woodLight, 0.6);
  ctx.lineWidth = w * 0.004;
  ctx.strokeRect(cx - w * 0.055, baseY - h * 0.875, w * 0.11, h * 0.11);
  // folded doors
  for (const [x, dir] of [[xs[1], 1], [xs[2], -1]]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + dir * pw * 0.5 - (dir < 0 ? w * 0.05 : 0), baseY - h * 0.7, w * 0.05, h * 0.7);
    fillV(ctx, baseY - h * 0.7, baseY, [[0, shade(pal.wood, 0.8)], [1, shade(pal.woodDark, 0.9)]]);
    ctx.restore();
  }
  roof(ctx, rng, cx, baseY - h * 0.98, w * 1.35, h * 0.55, pal);
  if (emis) {
    // a hanging lantern under the eaves glows at night
    glow(emis.ctx, cx, baseY - h * 0.6, w * 0.12, [255, 190, 110], 0.9);
  }
  // a small hanging lantern shape
  ctx.fillStyle = css([210, 190, 150]);
  ctx.beginPath();
  ctx.ellipse(cx, baseY - h * 0.6, w * 0.018, w * 0.026, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(pal.woodDark);
  ctx.fillRect(cx - w * 0.012, baseY - h * 0.6 - w * 0.03, w * 0.024, w * 0.006);
  ctx.fillRect(cx - w * 0.012, baseY - h * 0.6 + w * 0.024, w * 0.024, w * 0.006);
  ctx.fillRect(cx - w * 0.001, baseY - h * 0.72, w * 0.002, h * 0.09);
}

/** Stone steps receding upward toward yTop. */
export function steps(ctx, rng, cx, yTop, yBot, wTop, wBot, n, pal) {
  for (let i = n - 1; i >= 0; i--) {
    const t0 = i / n, t1 = (i + 1) / n;
    const e0 = Math.pow(t0, 1.6), e1 = Math.pow(t1, 1.6);
    const ya = yTop + (yBot - yTop) * e0;
    const yb = yTop + (yBot - yTop) * e1;
    const wa = wTop + (wBot - wTop) * e0;
    const wb = wTop + (wBot - wTop) * e1;
    const riser = (yb - ya) * 0.38;
    const off = rng.g() * wa * 0.03;
    ctx.save();
    // tread (top surface)
    path(ctx, [[cx - wa / 2 + off, ya], [cx + wa / 2 + off, ya], [cx + wb / 2, yb - riser], [cx - wb / 2, yb - riser]]);
    fillV(ctx, ya, yb, [[0, mix(pal.stone, pal.stoneLight, 0.4)], [1, pal.stone]]);
    ctx.clip();
    texturize(ctx, rng, cx - wb / 2, ya, cx + wb / 2, yb, Math.round(wb * (yb - ya) * 60000 + 20), (yb - ya) * 0.12, [pal.stoneDark, pal.stoneLight, pal.moss], 0.25);
    ctx.restore();
    // riser (front face)
    ctx.save();
    path(ctx, [[cx - wb / 2, yb - riser], [cx + wb / 2, yb - riser], [cx + wb / 2, yb], [cx - wb / 2, yb]]);
    fillV(ctx, yb - riser, yb, [[0, shade(pal.stone, 0.75)], [1, shade(pal.stoneDark, 0.8)]]);
    ctx.restore();
    // moss creeping at both ends
    for (let k = 0; k < 40; k++) {
      const side = rng.chance(0.5) ? -1 : 1;
      const x = cx + side * (wb / 2 - rng.f() * rng.f() * wb * 0.25);
      dab(ctx, x, yb - riser * rng.f(), wb * 0.012, riser * 0.25, rng.g(), jitter(rng.chance(0.5) ? pal.moss : pal.mossLight, rng, 10), 0.7);
    }
  }
}

/** Kasuga-style stone lantern (tōrō). */
export function lantern(ctx, rng, x, baseY, h, pal, { emis = null, lit = false } = {}) {
  const w = h * 0.42;
  const part = (cx, y0, y1, w0, w1, col) => {
    ctx.save();
    path(ctx, [[cx - w0 / 2, y0], [cx + w0 / 2, y0], [cx + w1 / 2, y1], [cx - w1 / 2, y1]]);
    const g = ctx.createLinearGradient(cx - w1 / 2, 0, cx + w1 / 2, 0);
    g.addColorStop(0, css(pal.stoneLight));
    g.addColorStop(0.55, css(col || pal.stone));
    g.addColorStop(1, css(pal.stoneDark));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    texturize(ctx, rng, cx - w1, y0, cx + w1, y1, 40, w * 0.04, [pal.stoneDark, pal.stoneLight, pal.moss], 0.3);
    ctx.restore();
  };
  let y = baseY;
  part(x, y - h * 0.08, y, w * 0.7, w * 0.8);        // base
  y -= h * 0.08;
  part(x, y - h * 0.32, y, w * 0.22, w * 0.26);      // pole
  y -= h * 0.32;
  part(x, y - h * 0.07, y, w * 0.75, w * 0.4);       // platform
  y -= h * 0.07;
  const fb0 = y - h * 0.2;
  part(x, fb0, y, w * 0.5, w * 0.5);                 // fire box
  ctx.fillStyle = css([28, 26, 22], 0.85);
  ctx.fillRect(x - w * 0.11, fb0 + h * 0.04, w * 0.22, h * 0.12);
  if (lit) {
    ctx.fillStyle = css([255, 210, 140], 0.8);
    ctx.fillRect(x - w * 0.1, fb0 + h * 0.05, w * 0.2, h * 0.1);
    if (emis) glow(emis.ctx, x, fb0 + h * 0.1, h * 0.35, [255, 180, 100], 0.85);
  }
  y = fb0;
  // umbrella roof
  ctx.save();
  path(ctx, [[x - w * 0.6, y], [x - w * 0.15, y - h * 0.13], [x + w * 0.15, y - h * 0.13], [x + w * 0.6, y], [x + w * 0.55, y + h * 0.02], [x - w * 0.55, y + h * 0.02]]);
  fillV(ctx, y - h * 0.13, y + h * 0.02, [[0, pal.stoneLight], [1, pal.stoneDark]]);
  ctx.clip();
  for (let i = 0; i < 160; i++) {
    const px = x + rng.g() * w * 0.6, py = y - h * 0.13 + rng.f() * h * 0.08;
    dab(ctx, px, py, w * 0.03, w * 0.018, rng.g(), jitter(rng.chance(0.6) ? pal.moss : pal.mossLight, rng, 10), 0.85);
  }
  ctx.restore();
  // finial
  dab(ctx, x, y - h * 0.155, w * 0.08, h * 0.03, 0, pal.stone);
  dab(ctx, x, y - h * 0.19, w * 0.05, h * 0.03, 0, pal.stoneLight);
  dab(ctx, x + w * 0.01, y - h * 0.17, w * 0.05, h * 0.012, 0, pal.moss, 0.8);
  return { fireboxY: fb0 + h * 0.1, top: y - h * 0.2 };
}

/** Low stone water basin (tsukubai) with bamboo spout and ladle. */
export function tsukubai(ctx, rng, x, baseY, s, pal) {
  // flanking stones
  stone(ctx, rng, x - s * 0.9, baseY - s * 0.05, s * 0.32, s * 0.18, pal, { moss: 0.7 });
  stone(ctx, rng, x + s * 0.95, baseY - s * 0.02, s * 0.25, s * 0.13, pal, { moss: 0.7 });
  // basin
  stone(ctx, rng, x, baseY - s * 0.18, s * 0.55, s * 0.32, pal, { moss: 0.45 });
  dab(ctx, x, baseY - s * 0.36, s * 0.32, s * 0.07, 0, [30, 44, 46], 1);
  dab(ctx, x - s * 0.08, baseY - s * 0.375, s * 0.16, s * 0.025, 0, [140, 170, 175], 0.35);
  // bamboo spout from the right
  ctx.strokeStyle = css([150, 140, 80]);
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.9, baseY - s * 0.62);
  ctx.lineTo(x + s * 0.18, baseY - s * 0.55);
  ctx.stroke();
  ctx.strokeStyle = css([110, 100, 60]);
  ctx.lineWidth = s * 0.012;
  for (const k of [0.35, 0.65]) {
    const px = x + s * 0.9 - s * 0.72 * k;
    ctx.beginPath();
    ctx.moveTo(px, baseY - s * 0.65);
    ctx.lineTo(px, baseY - s * 0.52);
    ctx.stroke();
  }
  // post holding the spout
  ctx.fillStyle = css([128, 116, 70]);
  ctx.fillRect(x + s * 0.86, baseY - s * 0.7, s * 0.06, s * 0.7);
  // trickle
  ctx.strokeStyle = css([210, 225, 230], 0.55);
  ctx.lineWidth = s * 0.008;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.18, baseY - s * 0.55);
  ctx.lineTo(x + s * 0.16, baseY - s * 0.38);
  ctx.stroke();
  // ladle resting across
  ctx.strokeStyle = css([170, 150, 100]);
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, baseY - s * 0.4);
  ctx.lineTo(x + s * 0.05, baseY - s * 0.43);
  ctx.stroke();
  dab(ctx, x - s * 0.38, baseY - s * 0.4, s * 0.05, s * 0.035, 0, [160, 140, 92]);
}

/** A tea bowl, optionally with a chip missing from the rim. */
export function bowl(ctx, rng, x, y, s, { chipped = true, piece = true } = {}) {
  const glaze = [120, 86, 62];
  dab(ctx, x, y + s * 0.02, s * 0.62, s * 0.1, 0, [20, 20, 14], 0.35);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.55);
  ctx.bezierCurveTo(x - s * 0.52, y - s * 0.1, x - s * 0.3, y, x - s * 0.18, y);
  ctx.lineTo(x + s * 0.18, y);
  ctx.bezierCurveTo(x + s * 0.3, y, x + s * 0.52, y - s * 0.1, x + s * 0.5, y - s * 0.55);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - s * 0.5, 0, x + s * 0.5, 0);
  g.addColorStop(0, css(mix(glaze, [230, 210, 180], 0.35)));
  g.addColorStop(0.5, css(glaze));
  g.addColorStop(1, css(shade(glaze, 0.55)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // glaze drips
  for (let i = 0; i < 14; i++) {
    const dx = x + rng.range(-0.45, 0.45) * s;
    ctx.strokeStyle = css([190, 170, 140], 0.35);
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(dx, y - s * 0.55);
    ctx.lineTo(dx + rng.g() * s * 0.02, y - s * rng.range(0.25, 0.45));
    ctx.stroke();
  }
  ctx.restore();
  // rim
  dab(ctx, x, y - s * 0.55, s * 0.5, s * 0.09, 0, [62, 44, 34]);
  dab(ctx, x, y - s * 0.56, s * 0.46, s * 0.065, 0, [86, 58, 42]);
  if (chipped) {
    // notch: paint background-coloured wedge plus pale broken edge
    ctx.fillStyle = css([92, 110, 60]);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.18, y - s * 0.62);
    ctx.lineTo(x + s * 0.24, y - s * 0.44);
    ctx.lineTo(x + s * 0.32, y - s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css([226, 210, 186]);
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.18, y - s * 0.6);
    ctx.lineTo(x + s * 0.24, y - s * 0.45);
    ctx.lineTo(x + s * 0.31, y - s * 0.6);
    ctx.stroke();
  }
  if (piece) {
    ctx.fillStyle = css(glaze);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.75, y - s * 0.02);
    ctx.lineTo(x + s * 0.84, y - s * 0.12);
    ctx.lineTo(x + s * 0.92, y - s * 0.01);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css([226, 210, 186]);
    ctx.lineWidth = s * 0.015;
    ctx.stroke();
  }
}

/** A raised hall with veranda, posts, shoji panels and a broad roof. */
export function hall(ctx, rng, x0, baseY, w, h, pal, emis, { bays = 5, shojiGlow = 1 } = {}) {
  const floorY = baseY - h * 0.16;
  const eaveY = baseY - h * 0.78;
  // foundation stones & shadow under the veranda
  ctx.fillStyle = css([24, 22, 18], 0.75);
  ctx.fillRect(x0, floorY, w, baseY - floorY);
  for (let i = 0; i <= bays; i++) {
    const x = x0 + (w * i) / bays;
    stone(ctx, rng, x, baseY - h * 0.03, w * 0.02, h * 0.04, pal, { moss: 0.5 });
  }
  // wall area behind posts
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + bw * i;
    // shoji panels
    const sx = bx + bw * 0.06, sw = bw * 0.88, sy = eaveY + h * 0.05, sh = floorY - sy - h * 0.02;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    fillV(ctx, sy, sy + sh, [[0, shade(pal.shoji, 0.86)], [1, pal.shoji]]);
    ctx.clip();
    ctx.strokeStyle = css(pal.woodDark, 0.7);
    ctx.lineWidth = bw * 0.012;
    const cols = 4, rows = 6;
    for (let c = 1; c < cols; c++) {
      ctx.beginPath(); ctx.moveTo(sx + (sw * c) / cols, sy); ctx.lineTo(sx + (sw * c) / cols, sy + sh); ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(sx, sy + (sh * r) / rows); ctx.lineTo(sx + sw, sy + (sh * r) / rows); ctx.stroke();
    }
    ctx.lineWidth = bw * 0.03;
    ctx.beginPath(); ctx.moveTo(sx + sw / 2, sy); ctx.lineTo(sx + sw / 2, sy + sh); ctx.stroke();
    // bottom kick panel
    ctx.fillStyle = css(pal.wood);
    ctx.fillRect(sx, sy + sh * 0.85, sw, sh * 0.15);
    ctx.restore();
    if (emis) {
      emis.ctx.fillStyle = css([255, 196, 120], 0.85 * shojiGlow * rng.range(0.6, 1));
      emis.ctx.fillRect(sx, sy, sw, sh * 0.85);
      glow(emis.ctx, sx + sw / 2, sy + sh * 0.5, sw * 0.9, [255, 170, 90], 0.35);
    }
  }
  for (let i = 0; i <= bays; i++) post(ctx, rng, x0 + (w * i) / bays, eaveY, floorY, w * 0.022, pal);
  // veranda floor
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - w * 0.03, floorY - h * 0.005, w * 1.06, h * 0.045);
  fillV(ctx, floorY, floorY + h * 0.04, [[0, pal.woodLight], [1, pal.woodDark]]);
  ctx.restore();
  beam(ctx, rng, x0 - w * 0.02, x0 + w * 1.02, eaveY - h * 0.02, h * 0.05, pal);
  return roof(ctx, rng, x0 + w / 2, eaveY - h * 0.02, w * 1.3, h * 0.42, pal);
}

/** A pair of straw sandals (zōri) left by a step. */
export function sandals(ctx, x, y, s) {
  for (const dx of [-0.6, 0.6]) {
    dab(ctx, x + dx * s, y, s * 0.42, s * 0.16, 0, [196, 176, 120]);
    dab(ctx, x + dx * s, y - s * 0.05, s * 0.3, s * 0.05, 0, [70, 60, 50], 0.8);
  }
}

export { post, beam, clamp, curve };
