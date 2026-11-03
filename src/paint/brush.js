// Shared painterly brush toolkit. Every painter draws in "world units":
// the panorama is 1 unit tall, `lw` units wide, so art is resolution-independent.
import { clamp } from '../core/rng.js';

export function makeLayer(lw, height, maxTex) {
  let H = height;
  let W = Math.ceil(lw * H);
  if (W > maxTex) {
    H = Math.floor((maxTex / lw));
    W = Math.ceil(lw * H);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // CPU raster: fast for many small dabs
  ctx.scale(H, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { canvas, ctx, lw, H };
}

/** A smaller companion canvas (emissive light, reflections). */
export function makeCompanion(layer, scale = 0.25) {
  const H = Math.max(16, Math.round(layer.H * scale));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(layer.lw * H);
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // CPU raster: fast for many small dabs
  ctx.scale(H, H);
  ctx.lineCap = 'round';
  return { canvas, ctx, lw: layer.lw, H };
}

// Colour helpers: colours are [r, g, b] in 0..255 -----------------------------
export const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const css = (c, a = 1) =>
  `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;
export function jitter(c, rng, amt = 10) {
  const d = rng.g() * amt;
  return [c[0] + d + rng.g() * amt * 0.4, c[1] + d + rng.g() * amt * 0.4, c[2] + d + rng.g() * amt * 0.4];
}

// Marks -----------------------------------------------------------------------

/** One brush dab: a soft-edged rotated ellipse. */
export function dab(ctx, x, y, rx, ry, ang, color, alpha = 1) {
  ctx.fillStyle = css(color, alpha);
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.0002), Math.max(ry, 0.0002), ang, 0, Math.PI * 2);
  ctx.fill();
}

/** Scatter dabs in an elliptical cloud. colorFn(rng, u, v) -> [color, alpha] */
export function dabCloud(ctx, rng, cx, cy, rx, ry, n, size, colorFn, ang = 0) {
  for (let i = 0; i < n; i++) {
    const a = rng.f() * Math.PI * 2;
    const r = Math.sqrt(rng.f());
    const u = Math.cos(a) * r, v = Math.sin(a) * r;
    const x = cx + u * rx, y = cy + v * ry;
    const [col, al] = colorFn(rng, u, v);
    const s = size * rng.range(0.6, 1.3);
    dab(ctx, x, y, s * rng.range(1.0, 1.8), s * rng.range(0.55, 0.9), ang + rng.g() * 0.6, col, al);
  }
}

/** A tapered brush stroke through points. */
export function stroke(ctx, pts, w0, w1, color, alpha = 1) {
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const t = i / (n - 1);
    ctx.strokeStyle = css(color, alpha);
    ctx.lineWidth = w0 + (w1 - w0) * t;
    ctx.beginPath();
    ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    ctx.stroke();
  }
}

/** A smooth curved stroke (quadratic), tapered by drawing several passes. */
export function curve(ctx, x0, y0, cx, cy, x1, y1, w, color, alpha = 1, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    pts.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]);
  }
  stroke(ctx, pts, w, w * 0.25, color, alpha);
}

/** Path from points, optionally closed. */
export function path(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}

/** Fill current path with a vertical gradient. */
export function fillV(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([t, c, a = 1]) => g.addColorStop(t, css(c, a)));
  ctx.fillStyle = g;
  ctx.fill();
}

/** Texture the current clip region with many low-alpha dabs. */
export function texturize(ctx, rng, x0, y0, x1, y1, n, size, colors, alpha = 0.25, ang = 0) {
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1), y = rng.range(y0, y1);
    const c = colors[(rng.f() * colors.length) | 0];
    const s = size * rng.range(0.5, 1.4);
    dab(ctx, x, y, s * rng.range(1.2, 2.4), s * rng.range(0.4, 0.8), ang + rng.g() * 0.4, jitter(c, rng, 8), alpha * rng.range(0.5, 1));
  }
}

/** Soft radial glow (for emissive light maps). */
export function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(color, alpha));
  g.addColorStop(0.35, css(color, alpha * 0.45));
  g.addColorStop(1, css(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Noisy closed blob around a centre (for stones, bushes). */
export function blob(rng, cx, cy, rx, ry, n = 18, rough = 0.12, flatBottom = true) {
  const pts = [];
  const ph = rng.f() * 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (Math.sin(a * 3 + ph) * 0.5 + rng.g() * 0.6) * rough;
    let y = cy + Math.sin(a) * ry * k;
    if (flatBottom && Math.sin(a) > 0.2) y = Math.min(y, cy + ry * 0.55);
    pts.push([cx + Math.cos(a) * rx * k, y]);
  }
  return pts;
}

/** Build an alpha pick-map (small) for focus picking. */
export function alphaMap(canvas, scale = 1 / 8) {
  const w = Math.max(8, Math.round(canvas.width * scale));
  const h = Math.max(8, Math.round(canvas.height * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3];
  return { w, h, a };
}
