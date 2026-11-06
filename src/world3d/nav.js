// Walkability grid + A* routing, so tap-to-walk always finds a gentle way
// around trees, walls and water, and WASD walking slides along obstacles.
import { heightAt, onBridge, inBuilding, polyDist } from './terrain.js';
import { BUILDINGS, PATHS, STREAM, pondDist } from './layout.js';

const CELL = 0.5;
const X0 = -70, X1 = 70, Z0 = -82, Z1 = 66;

export class Nav {
  constructor(colliders, obstacles) {
    this.w = Math.round((X1 - X0) / CELL);
    this.h = Math.round((Z1 - Z0) / CELL);
    this.grid = new Uint8Array(this.w * this.h); // 1 = walkable
    const onPath = (x, z) => PATHS.some((p) => polyDist(p.pts, x, z) < p.width / 2 + 0.2);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
        let ok = true;
        const inside = Object.values(BUILDINGS).some((b) => inBuilding(b, x, z, 0.3));
        if (onBridge(x, z)) ok = true;
        else if (pondDist(x, z) < 1.02) ok = false;
        // the stream is shallow: you can wade across it anywhere (but not the pond)
        else if (!inside) {
          const e = 0.6;
          const s = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
          if (s > 0.62) ok = false;
        }
        this.grid[j * this.w + i] = ok ? 1 : 0;
      }
    }
    // walls and other rectangles
    for (const c of colliders) this._blockRect(c, 0.3);
    for (const o of obstacles) this._blockCircle(o.x, o.z, o.r + 0.2);
  }

  _blockRect(c, m) {
    const r = Math.hypot(c.w, c.d) / 2 + m + CELL;
    const [i0, j0] = this.cell(c.x - r, c.z - r), [i1, j1] = this.cell(c.x + r, c.z + r);
    const cs = Math.cos(-c.rot || 0), sn = Math.sin(-c.rot || 0);
    for (let j = Math.max(0, j0); j <= Math.min(this.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.w - 1, i1); i++) {
      const x = X0 + (i + 0.5) * CELL - c.x, z = Z0 + (j + 0.5) * CELL - c.z;
      const lx = x * cs - z * sn, lz = x * sn + z * cs;
      if (Math.abs(lx) <= c.w / 2 + m && Math.abs(lz) <= c.d / 2 + m) this.grid[j * this.w + i] = 0;
    }
  }
  _blockCircle(x, z, r) {
    const [i0, j0] = this.cell(x - r, z - r), [i1, j1] = this.cell(x + r, z + r);
    for (let j = Math.max(0, j0); j <= Math.min(this.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.w - 1, i1); i++) {
      const cx = X0 + (i + 0.5) * CELL, cz = Z0 + (j + 0.5) * CELL;
      if (Math.hypot(cx - x, cz - z) <= r) this.grid[j * this.w + i] = 0;
    }
  }

  cell(x, z) { return [Math.floor((x - X0) / CELL), Math.floor((z - Z0) / CELL)]; }
  center(i, j) { return [X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL]; }
  ok(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && this.grid[j * this.w + i] === 1; }
  walkable(x, z) { const [i, j] = this.cell(x, z); return this.ok(i, j); }

  /** Nearest walkable cell to a point (spiral search). */
  nearest(x, z, maxR = 24) {
    const [ci, cj] = this.cell(x, z);
    if (this.ok(ci, cj)) return [ci, cj];
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (this.ok(ci + di, cj + dj)) {
          const d = di * di + dj * dj;
          if (d < bd) { bd = d; best = [ci + di, cj + dj]; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** A* from (x0,z0) to (x1,z1). Returns smoothed [[x,z],...] or null. */
  route(x0, z0, x1, z1) {
    const s = this.nearest(x0, z0, 6), g = this.nearest(x1, z1);
    if (!s || !g) return null;
    const W = this.w;
    const start = s[1] * W + s[0], goal = g[1] * W + g[0];
    const gScore = new Float32Array(this.w * this.h).fill(Infinity);
    const came = new Int32Array(this.w * this.h).fill(-1);
    const closed = new Uint8Array(this.w * this.h);
    const heap = new Heap();
    const hfun = (k) => { const i = k % W, j = (k / W) | 0; return Math.hypot(i - g[0], j - g[1]); };
    gScore[start] = 0;
    heap.push(start, hfun(start));
    let found = false, steps = 0;
    while (heap.size && steps++ < 120000) {
      const cur = heap.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % W, cj = (cur / W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.ok(ni, nj)) continue;
        if (di && dj && (!this.ok(ci + di, cj) || !this.ok(ci, cj + dj))) continue; // no corner cutting
        const nk = nj * W + ni;
        const ng = gScore[cur] + (di && dj ? 1.4142 : 1);
        if (ng < gScore[nk]) {
          gScore[nk] = ng;
          came[nk] = cur;
          heap.push(nk, ng + hfun(nk));
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = goal; k !== -1; k = came[k]) cells.push(k);
    cells.reverse();
    // string-pulling: keep only points needed for clear lines of sight
    const pts = cells.map((k) => this.center(k % W, (k / W) | 0));
    const out = [pts[0]];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (!this.clear(pts[anchor], pts[i])) {
        out.push(pts[i - 1]);
        anchor = i - 1;
      }
    }
    out.push(pts[pts.length - 1]);
    // finish exactly at the target if it is walkable
    if (this.walkable(x1, z1)) out[out.length - 1] = [x1, z1];
    return out;
  }

  clear(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(d / (CELL * 0.5));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      // check a slightly widened corridor
      if (!this.walkable(x, z) || !this.walkable(x + 0.2, z) || !this.walkable(x - 0.2, z) || !this.walkable(x, z + 0.2) || !this.walkable(x, z - 0.2)) return false;
    }
    return true;
  }
}

class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) {
    this.k.push(k); this.p.push(p);
    let i = this.k.length - 1;
    while (i > 0) {
      const q = (i - 1) >> 1;
      if (this.p[q] <= this.p[i]) break;
      [this.k[q], this.k[i]] = [this.k[i], this.k[q]];
      [this.p[q], this.p[i]] = [this.p[i], this.p[q]];
      i = q;
    }
  }
  pop() {
    const top = this.k[0];
    const lk = this.k.pop(), lp = this.p.pop();
    if (this.k.length) {
      this.k[0] = lk; this.p[0] = lp;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        [this.k[m], this.k[i]] = [this.k[i], this.k[m]];
        [this.p[m], this.p[i]] = [this.p[i], this.p[m]];
        i = m;
      }
    }
    return top;
  }
}
