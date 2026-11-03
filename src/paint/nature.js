// Procedural nature painters: mountains, trees, moss, stones, plants.
import { fbm1, clamp } from '../core/rng.js';
import { dab, dabCloud, curve, path, fillV, texturize, blob, mix, shade, jitter, css } from './brush.js';

/** A mountain ridge silhouette from x=0..lw. Returns the profile function. */
export function ridge(ctx, rng, { lw, baseY, amp, freq = 1.2, seed = 1, top, bottom, haze, texture = 0.4, sharp = 0 }) {
  const prof = (x) => {
    let n = clamp((fbm1(x * freq + seed * 10, seed, 6) - 0.22) / 0.56);
    if (sharp) n = 1 - Math.abs(n * 2 - 1) * sharp + n * (1 - sharp);
    return baseY - amp * n;
  };
  const pts = [[0, 1.01]];
  const step = 0.004;
  for (let x = 0; x <= lw + step; x += step) pts.push([x, prof(x)]);
  pts.push([lw, 1.01]);
  ctx.save();
  path(ctx, pts);
  fillV(ctx, baseY - amp, 1, [[0, top], [0.55, mix(top, bottom, 0.6)], [1, bottom]]);
  ctx.clip();
  // facet shading: slopes facing away from the light (to the right) are darker
  for (let x = 0; x <= lw; x += 0.0025) {
    const slope = (prof(x + 0.01) - prof(x)) / 0.01;
    const a = clamp(slope * 0.9, 0, 0.45);
    if (a < 0.02) continue;
    const y0 = prof(x);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + amp * 0.9);
    g.addColorStop(0, css(shade(top, 0.62), a));
    g.addColorStop(1, css(shade(top, 0.62), 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, 0.0032, amp * 0.9);
  }
  if (texture > 0) {
    // slanted brush texture suggests slopes and distant trees
    const n = Math.floor(lw * 900 * texture);
    for (let i = 0; i < n; i++) {
      const x = rng.f() * lw;
      const y = prof(x) + rng.f() * (1 - prof(x));
      const c = rng.chance(0.5) ? shade(top, 0.86) : mix(top, haze || bottom, 0.4);
      dab(ctx, x, y, rng.range(0.004, 0.012), rng.range(0.0015, 0.003), rng.g() * 0.5 + 0.3, jitter(c, rng, 6), 0.25);
    }
  }
  // haze gathering at the base
  if (haze) {
    ctx.fillStyle = (() => {
      const g = ctx.createLinearGradient(0, baseY - amp * 0.3, 0, baseY + 0.15);
      g.addColorStop(0, css(haze, 0));
      g.addColorStop(1, css(haze, 0.75));
      return g;
    })();
    ctx.fillRect(0, baseY - amp, lw, 1.2);
  }
  ctx.restore();
  return prof;
}

/** Japanese cedar (sugi): tall narrow tiered cone. */
export function cedar(ctx, rng, x, baseY, h, w, col, light, alpha = 1) {
  // trunk
  ctx.strokeStyle = css(shade(col, 0.55), alpha);
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + rng.g() * w * 0.05, baseY - h);
  ctx.stroke();
  const tiers = Math.max(6, Math.round(h / (w * 0.22)));
  for (let i = 0; i < tiers; i++) {
    const t = (i + 0.5) / tiers;
    const y = baseY - h + t * h * 0.88;
    const ww = w * (0.08 + 0.92 * Math.pow(t, 0.85)) * rng.range(0.85, 1.1);
    const th = (h / tiers) * 1.1;
    const n = Math.round(4 + ww * 900 * (th * 8 + 0.2));
    dabCloud(ctx, rng, x + rng.g() * ww * 0.08, y, ww * 0.5, th * 0.55, Math.min(n, 60), Math.max(th * 0.35, 0.002), (r, u, v) => {
      const lightness = clamp(0.5 - u * 0.5 - v * 0.3 + r.g() * 0.2);
      return [jitter(mix(col, light, lightness * 0.8), r, 6), alpha * r.range(0.75, 1)];
    }, -0.12);
  }
}

/** A band of cedars along a slope; back trees fade into haze. */
export function forest(ctx, rng, { x0, x1, yFn, hMin, hMax, density = 1, col, light, haze, hazeAmt = 0.5, rows = 2 }) {
  for (let row = 0; row < rows; row++) {
    const k = rows === 1 ? 1 : row / (rows - 1);
    const hz = hazeAmt * (1 - k);
    const c = mix(col, haze, hz);
    const l = mix(light, haze, hz);
    const hs = 0.75 + 0.25 * k;
    let x = x0;
    while (x < x1) {
      const h = rng.range(hMin, hMax) * hs;
      const w = h * rng.range(0.22, 0.3);
      cedar(ctx, rng, x, yFn(x) + rng.range(0, 0.02) + k * 0.02, h, w, c, l);
      x += (w * rng.range(0.35, 0.7)) / density;
    }
  }
}

/** Japanese maple (momiji): light layered crown on graceful branches. */
export function maple(ctx, rng, x, baseY, h, w, leaves, bark, { alpha = 1, lean = 0, clusters = 9 } = {}) {
  const topX = x + lean * w * 0.4;
  // trunk & branches
  curve(ctx, x, baseY, x + lean * w * 0.1 + rng.g() * w * 0.05, baseY - h * 0.4, topX, baseY - h * 0.62, w * 0.06, bark, alpha);
  const bpts = [];
  for (let i = 0; i < clusters; i++) {
    const a = -Math.PI / 2 + (i / (clusters - 1) - 0.5) * 2.6 + rng.g() * 0.15;
    const r = rng.range(0.35, 0.55);
    const ex = topX + Math.cos(a) * w * r;
    const ey = baseY - h * 0.6 + Math.sin(a) * h * 0.38 * r * 1.6;
    const sx = topX, sy = baseY - h * 0.55;
    const mx = (sx + ex) / 2 + rng.g() * 0.01, my = (sy + ey) / 2 - h * 0.04;
    bpts.push([ex, ey, 1]);
    bpts.push([(sx + mx) / 2 * 0.3 + mx * 0.7, (sy + my) / 2 * 0.3 + my * 0.7, 0.7]);
    curve(ctx, sx, sy, mx, my, ex, ey, w * 0.018, bark, alpha);
  }
  // shadow clusters first, then lit leaves
  for (const pass of [0, 1]) {
    for (const [bx, by, k] of bpts) {
      const rx = w * rng.range(0.16, 0.24) * k, ry = h * rng.range(0.1, 0.15) * k;
      const n = Math.round(80 + rx * 3200);
      dabCloud(ctx, rng, bx + (pass ? -rx * 0.1 : rx * 0.08), by + (pass ? -ry * 0.12 : ry * 0.15), rx, ry, Math.min(n, 520), Math.max(w * 0.0085, 0.0012), (r, u, v) => {
        const base = leaves[(r.f() * leaves.length) | 0];
        const lit = pass ? clamp(0.55 - v * 0.6 - u * 0.25) : 0;
        const c = pass ? mix(base, [235, 230, 170], lit * 0.35) : shade(base, 0.58);
        return [jitter(c, r, 8), alpha * (pass ? r.range(0.55, 0.9) : 0.8)];
      });
    }
  }
}

/** Cloud-pruned pine (niwaki): twisting trunk with flat foliage pads. */
export function pine(ctx, rng, x, baseY, h, w, col, light, bark) {
  const pts = [[x, baseY]];
  let cx = x, cy = baseY;
  for (let i = 1; i <= 5; i++) {
    cx += rng.g() * w * 0.12 + w * 0.03;
    cy -= h * 0.17;
    pts.push([cx, cy]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    curve(ctx, pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2 + rng.g() * 0.01, (pts[i][1] + pts[i + 1][1]) / 2, pts[i + 1][0], pts[i + 1][1], w * (0.07 - i * 0.01), bark);
  }
  const pads = [];
  for (let i = 1; i < pts.length; i++) {
    const side = i % 2 ? -1 : 1;
    const px = pts[i][0] + side * w * rng.range(0.15, 0.38);
    const py = pts[i][1] + rng.range(-0.01, 0.02);
    curve(ctx, pts[i][0], pts[i][1], (pts[i][0] + px) / 2, py + 0.01, px, py, w * 0.03, bark);
    pads.push([px, py, w * rng.range(0.2, 0.3) * (1 - i * 0.08)]);
  }
  pads.push([pts[pts.length - 1][0], pts[pts.length - 1][1] - 0.01, w * 0.2]);
  for (const [px, py, pr] of pads) {
    dabCloud(ctx, rng, px, py + pr * 0.12, pr, pr * 0.3, 90, pr * 0.1, (r) => [jitter(shade(col, 0.7), r, 5), 0.9]);
    dabCloud(ctx, rng, px - pr * 0.05, py - pr * 0.04, pr * 0.95, pr * 0.22, 120, pr * 0.09, (r, u, v) =>
      [jitter(mix(col, light, clamp(0.6 - v - u * 0.3)), r, 6), r.range(0.7, 1)]);
  }
}

/** Rounded clipped shrub (azalea mound). */
export function shrub(ctx, rng, cx, baseY, rx, ry, col, flowers = null, flowerAmt = 0) {
  const cy = baseY - ry * 0.85;
  ctx.save();
  path(ctx, blob(rng, cx, cy, rx, ry, 22, 0.06));
  fillV(ctx, cy - ry, baseY, [[0, mix(col, [210, 220, 150], 0.25)], [1, shade(col, 0.55)]]);
  ctx.clip();
  texturize(ctx, rng, cx - rx, cy - ry, cx + rx, baseY, Math.round(rx * ry * 60000), rx * 0.03,
    [shade(col, 0.7), col, mix(col, [200, 210, 140], 0.3)], 0.5);
  if (flowers) {
    const n = Math.round(rx * ry * 40000 * flowerAmt);
    for (let i = 0; i < n; i++) {
      const a = rng.f() * Math.PI * 2, r = Math.sqrt(rng.f());
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      if (y > cy + ry * 0.4) continue;
      dab(ctx, x, y, rx * 0.025, rx * 0.018, rng.g(), jitter(flowers, rng, 14), 0.85);
    }
  }
  ctx.restore();
  dab(ctx, cx, baseY, rx * 1.05, ry * 0.12, 0, [20, 26, 16], 0.25);
}

/** Moss-covered ground between a top edge function and the bottom. */
export function mossGround(ctx, rng, { x0, x1, topFn, bottom = 1.01, pal, density = 1, lightLeft = true }) {
  const pts = [[x0, bottom]];
  for (let x = x0; x <= x1 + 0.005; x += 0.005) pts.push([x, topFn(x)]);
  pts.push([x1, bottom]);
  ctx.save();
  path(ctx, pts);
  let minY = 1;
  for (const p of pts) minY = Math.min(minY, p[1]);
  fillV(ctx, minY, bottom, [[0, mix(pal.mossLight, [196, 206, 196], 0.35)], [0.18, mix(pal.moss, pal.mossLight, 0.4)], [0.55, pal.moss], [1, pal.mossDeep]]);
  ctx.clip();
  const area = (x1 - x0) * (bottom - minY);
  const n = Math.round(area * 26000 * density);
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1);
    const y = rng.range(minY, bottom);
    const depth = clamp((y - minY) / (bottom - minY + 0.0001));
    const s = 0.0018 + depth * 0.006;
    const roll = rng.f();
    let c = roll < 0.3 ? pal.mossDark : roll < 0.75 ? pal.moss : roll < 0.95 ? pal.mossLight : [196, 200, 120];
    c = shade(mix(c, [190, 200, 190], (1 - depth) * 0.3), 1.05 - depth * 0.35);
    dab(ctx, x, y, s * rng.range(1, 1.8), s * rng.range(0.5, 0.8), rng.g() * 0.3, jitter(c, rng, 10), rng.range(0.25, 0.6));
  }
  // moss cushions: soft mounds lit from the upper left
  const m = Math.round(area * 160 * density);
  for (let i = 0; i < m; i++) {
    const x = rng.range(x0, x1);
    const y = rng.range(minY + 0.01, bottom);
    if (y < topFn(x) + 0.01) continue;
    const depth = clamp((y - minY) / (bottom - minY + 0.0001));
    const rx = (0.012 + depth * 0.06) * rng.range(0.5, 1.6), ry = rx * rng.range(0.22, 0.38);
    const k = 1.05 - depth * 0.4;
    // built from several overlapping soft dabs so edges stay irregular
    for (let j = 0; j < 5; j++) {
      const ox = rng.g() * rx * 0.5, oy = rng.g() * ry * 0.4;
      dab(ctx, x + ox + rx * 0.1, y + oy + ry * 0.35, rx * 0.7, ry * 0.6, rng.g() * 0.2, shade(pal.mossDeep, 0.8), 0.12);
      dab(ctx, x + ox, y + oy, rx * 0.65, ry * 0.65, rng.g() * 0.2, shade(jitter(pal.moss, rng, 12), k), 0.22);
      dab(ctx, x + ox - rx * 0.2, y + oy - ry * 0.3, rx * 0.4, ry * 0.35, 0, shade(mix(pal.mossLight, [220, 220, 150], 0.2), k), 0.18);
    }
  }
  ctx.restore();
}

/** A weathered stone, optionally mossy. */
export function stone(ctx, rng, cx, cy, rx, ry, pal, { moss = 0.4, flat = true, shadow = true } = {}) {
  if (shadow) dab(ctx, cx + rx * 0.1, cy + ry * 0.55, rx * 1.1, ry * 0.28, 0, [18, 22, 14], 0.35);
  const pts = blob(rng, cx, cy, rx, ry, 20, 0.1, flat);
  ctx.save();
  path(ctx, pts);
  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.6, cy + ry);
  g.addColorStop(0, css(pal.stoneLight));
  g.addColorStop(0.5, css(pal.stone));
  g.addColorStop(1, css(pal.stoneDark));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  texturize(ctx, rng, cx - rx, cy - ry, cx + rx, cy + ry, Math.round(40 + rx * ry * 90000), Math.max(rx * 0.05, 0.0015),
    [pal.stoneDark, pal.stoneLight, pal.stone], 0.3);
  if (moss > 0) {
    const n = Math.round(rx * ry * 140000 * moss + 10);
    for (let i = 0; i < n; i++) {
      const a = rng.f() * Math.PI * 2, r = Math.sqrt(rng.f());
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      const top = (cy - y) / ry; // more moss on top
      if (rng.f() > 0.25 + top * 0.9 * moss) continue;
      const c = rng.chance(0.6) ? pal.moss : rng.chance(0.5) ? pal.mossLight : pal.mossDark;
      dab(ctx, x, y, rx * 0.06, ry * 0.05, rng.g(), jitter(c, rng, 10), 0.75);
    }
  }
  ctx.restore();
}

export function grassTuft(ctx, rng, x, y, h, col, blades = 9) {
  for (let i = 0; i < blades; i++) {
    const lean = rng.g() * h * 0.5;
    const hh = h * rng.range(0.6, 1.1);
    curve(ctx, x + rng.g() * h * 0.1, y, x + lean * 0.4, y - hh * 0.6, x + lean, y - hh, h * 0.035, jitter(mix(col, [200, 200, 130], rng.f() * 0.3), rng, 10), 0.85, 6);
  }
}

export function fern(ctx, rng, x, y, size, col) {
  const fronds = rng.int(5, 8);
  for (let f = 0; f < fronds; f++) {
    const a = -Math.PI / 2 + (f / (fronds - 1) - 0.5) * 2.4 + rng.g() * 0.1;
    const len = size * rng.range(0.7, 1.05);
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.8;
    const cx = x + Math.cos(a) * len * 0.5, cy = y + Math.sin(a) * len * 0.5 - len * 0.18;
    const c = jitter(col, rng, 10);
    curve(ctx, x, y, cx, cy, ex, ey, size * 0.012, shade(c, 0.8), 0.9, 8);
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
      const ls = size * 0.07 * (1 - t * 0.7);
      dab(ctx, px, py, ls, ls * 0.35, a + 1.2, mix(c, [200, 210, 130], 0.15 * (1 - t)), 0.85);
      dab(ctx, px, py, ls, ls * 0.35, a - 1.2, c, 0.85);
    }
  }
}

export function iris(ctx, rng, x, y, h, pal, flower = true) {
  for (let i = 0; i < 6; i++) {
    const lean = rng.g() * h * 0.2;
    curve(ctx, x + rng.g() * 0.004, y, x + lean * 0.3, y - h * 0.5, x + lean, y - h * rng.range(0.7, 1.05), h * 0.05, jitter(pal.fern, rng, 8), 0.9, 6);
  }
  if (flower) {
    const fx = x + rng.g() * h * 0.08, fy = y - h * 1.05;
    curve(ctx, x, y, fx, y - h * 0.6, fx, fy, h * 0.02, pal.fern, 0.9, 5);
    for (let p = 0; p < 3; p++) {
      const a = -Math.PI / 2 + (p - 1) * 1.3;
      dab(ctx, fx + Math.cos(a) * h * 0.06, fy + Math.sin(a) * h * 0.04 + h * 0.03, h * 0.07, h * 0.035, a, jitter(pal.iris, rng, 10), 0.95);
    }
    dab(ctx, fx, fy + h * 0.02, h * 0.02, h * 0.012, 0, [225, 196, 80], 0.9);
  }
}

/** A tall cedar trunk rising out of frame, with fibrous bark. */
export function trunk(ctx, rng, x, baseY, topY, w, pal, { light = 0.5, roots = true } = {}) {
  const bark = [112, 70, 50];
  const pts = [];
  const lean = rng.g() * w * 0.4;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push([x + lean * t + Math.sin(t * 3 + x * 9) * w * 0.05, baseY + (topY - baseY) * t]);
  }
  ctx.save();
  ctx.beginPath();
  const ww = (t) => w * (1 + (1 - t) * 0.18 + (t < 0.08 ? (0.08 - t) * 6 : 0));
  pts.forEach(([px, py], i) => {
    const t = i / 12;
    if (i === 0) ctx.moveTo(px - ww(t) / 2, py);
    else ctx.lineTo(px - ww(t) / 2, py);
  });
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    ctx.lineTo(pts[i][0] + ww(t) / 2, pts[i][1]);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, css(mix(bark, [200, 160, 120], light * 0.4)));
  g.addColorStop(0.35, css(bark));
  g.addColorStop(1, css(shade(bark, 0.38)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // long fibrous bark strips
  const n = Math.round(w * 2500);
  for (let i = 0; i < n; i++) {
    const u = rng.f();
    const y0 = rng.range(topY, baseY);
    const len = rng.range(0.03, 0.12);
    const xx = x - w / 2 + u * w + lean * ((y0 - baseY) / (topY - baseY));
    const c = rng.chance(0.5) ? shade(bark, rng.range(0.5, 0.8)) : mix(bark, [190, 150, 120], rng.f() * 0.5 * (1 - u));
    ctx.strokeStyle = css(c, 0.35);
    ctx.lineWidth = w * rng.range(0.02, 0.06);
    ctx.beginPath();
    ctx.moveTo(xx, y0);
    ctx.lineTo(xx + rng.g() * w * 0.03, y0 - len);
    ctx.stroke();
  }
  // moss creeping up the shaded side and base
  for (let i = 0; i < w * 900; i++) {
    const t = Math.pow(rng.f(), 2.5);
    const y = baseY - t * (baseY - topY) * 0.35;
    const xx = x + w * (rng.range(-0.5, 0.5) * (1 - t) + 0.15 * t);
    dab(ctx, xx, y, w * 0.08, w * 0.04, rng.g(), jitter(rng.chance(0.6) ? pal.moss : pal.mossDark, rng, 10), 0.6);
  }
  ctx.restore();
  if (roots) {
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      curve(ctx, x + side * w * 0.3, baseY - w * 0.3, x + side * w * 0.7, baseY - w * 0.05, x + side * w * rng.range(0.9, 1.4), baseY + w * 0.1, w * 0.18, shade(bark, 0.7), 0.9, 6);
    }
  }
}

/** Soft diagonal light shafts (painted for an additive layer). */
export function lightShafts(ctx, rng, lw, { count = 7, from = -0.3, angle = 0.35, color = [255, 236, 190], alpha = 0.22, x0 = 0, x1 } = {}) {
  x1 = x1 ?? lw;
  for (let i = 0; i < count; i++) {
    const x = rng.range(x0, x1);
    const w = rng.range(0.02, 0.09);
    const len = rng.range(0.7, 1.1);
    const dx = Math.tan(angle) * len;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, from);
    ctx.lineTo(x + w / 2, from);
    ctx.lineTo(x + w * 1.6 + dx, from + len);
    ctx.lineTo(x - w * 1.0 + dx, from + len);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, from, 0, from + len);
    const a = alpha * rng.range(0.5, 1);
    g.addColorStop(0, css(color, 0));
    g.addColorStop(0.3, css(color, a));
    g.addColorStop(0.75, css(color, a * 0.6));
    g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}

/** Dappled light and shadow patches on the ground. */
export function dapple(ctx, rng, x0, x1, y0, y1, n, { light = [235, 230, 160], shadow = [20, 34, 18], la = 0.16, sa = 0.22 } = {}) {
  for (let i = 0; i < n; i++) {
    const y = rng.range(y0, y1);
    const k = (y - y0) / (y1 - y0 + 1e-6);
    const s = 0.02 + k * 0.08;
    const x = rng.range(x0, x1);
    if (rng.chance(0.55)) dab(ctx, x, y, s * rng.range(1, 2.4), s * rng.range(0.25, 0.4), rng.g() * 0.1, shadow, sa * rng.range(0.5, 1));
    else dab(ctx, x, y, s * rng.range(0.6, 1.6), s * rng.range(0.15, 0.3), rng.g() * 0.1, light, la * rng.range(0.5, 1));
  }
}
