// One-point perspective helpers for painting interiors.
// Points are given in the front picture plane (z = 1) and pushed back by z.
import { path, fillV, css, mix, shade, texturize, dab, jitter } from './brush.js';

export function room(vp) {
  const P = (X, Y, z) => [vp[0] + (X - vp[0]) / z, vp[1] + (Y - vp[1]) / z];
  return {
    P,
    /** Quad on a wall or floor between depths z0..z1. corners: [X,Y] pairs at front plane */
    quad(ctx, a, b, z0, z1, fill) {
      // a and b are two front-plane points; quad spans from a..b at z0 to b..a at z1
      const pts = [P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1)];
      path(ctx, pts);
      if (typeof fill === 'function') fill(pts);
      else { ctx.fillStyle = fill; ctx.fill(); }
      return pts;
    },
    /** Vertical rectangle on a side wall at X between z0..z1 and heights Y0..Y1. */
    wallRect(ctx, X, Y0, Y1, z0, z1, fill) {
      const pts = [P(X, Y0, z0), P(X, Y0, z1), P(X, Y1, z1), P(X, Y1, z0)];
      path(ctx, pts);
      ctx.fillStyle = fill;
      ctx.fill();
      return pts;
    },
    line(ctx, A, B, color, w) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
    },
  };
}

/** Polished plank floor converging to the vanishing point. */
export function plankFloor(ctx, rng, R, x0, x1, yFloor, zBack, pal, planks = 26) {
  const pts = [R.P(x0, yFloor, 1), R.P(x1, yFloor, 1), R.P(x1, yFloor, zBack), R.P(x0, yFloor, zBack)];
  ctx.save();
  path(ctx, pts);
  fillV(ctx, pts[2][1], pts[0][1], [[0, shade(pal.wood, 0.7)], [0.5, pal.wood], [1, shade(pal.woodDark, 1.1)]]);
  ctx.clip();
  for (let i = 0; i <= planks; i++) {
    const X = x0 + ((x1 - x0) * i) / planks;
    const A = R.P(X, yFloor, 1), B = R.P(X, yFloor, zBack);
    R.line(ctx, A, B, css(pal.woodDark, 0.55), 0.002);
    // plank tone variation
    const X2 = x0 + ((x1 - x0) * (i + 1)) / planks;
    if (rng.chance(0.5)) {
      path(ctx, [A, R.P(X2, yFloor, 1), R.P(X2, yFloor, zBack), B]);
      ctx.fillStyle = css(rng.chance(0.5) ? pal.woodLight : pal.woodDark, rng.range(0.06, 0.16));
      ctx.fill();
    }
  }
  // soft polished sheen
  const c = R.P((x0 + x1) / 2, yFloor, 1.6);
  dab(ctx, c[0], c[1], 0.3, 0.04, 0, [255, 236, 200], 0.035);
  ctx.restore();
}

/** A paper shoji panel on a side wall, returns its polygon. */
export function shojiOnWall(ctx, R, X, Y0, Y1, z0, z1, pal, emis, glowCol = [255, 246, 226]) {
  const pts = R.wallRect(ctx, X, Y0, Y1, z0, z1, css(pal.shoji));
  ctx.save();
  path(ctx, pts);
  ctx.clip();
  // lattice
  const cols = 3, rows = 5;
  for (let c = 1; c < cols; c++) {
    const z = z0 + ((z1 - z0) * c) / cols;
    R.line(ctx, R.P(X, Y0, z), R.P(X, Y1, z), css(pal.woodDark, 0.6), 0.0025 / z);
  }
  for (let r = 1; r < rows; r++) {
    const Y = Y0 + ((Y1 - Y0) * r) / rows;
    R.line(ctx, R.P(X, Y, z0), R.P(X, Y, z1), css(pal.woodDark, 0.6), 0.002);
  }
  ctx.restore();
  if (emis) {
    path(emis.ctx, pts);
    emis.ctx.fillStyle = css(glowCol, 0.75);
    emis.ctx.fill();
  }
  return pts;
}

/** Black meditation cushion (zafu) on a flat mat (zabuton). */
export function zafu(ctx, x, y, s, rng) {
  dab(ctx, x, y + s * 0.15, s * 1.3, s * 0.32, 0, [32, 28, 26], 0.95);
  dab(ctx, x, y + s * 0.18, s * 1.35, s * 0.3, 0, [10, 10, 10], 0.25);
  dab(ctx, x, y, s * 0.62, s * 0.3, 0, [24, 22, 22]);
  dab(ctx, x - s * 0.12, y - s * 0.1, s * 0.4, s * 0.12, 0, [70, 66, 62], 0.5);
  if (rng) for (let i = 0; i < 6; i++) dab(ctx, x + rng.g() * s * 0.4, y + rng.g() * s * 0.08, s * 0.05, s * 0.18, 0, [12, 12, 12], 0.5);
}

export { texturize, jitter, mix, shade, css, dab, path, fillV };
