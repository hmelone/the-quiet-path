// A loaded place: painted layer textures, particle systems, the look direction,
// and the maths that turns "where you're looking" into layer coordinates.
import { Rng, clamp } from '../core/rng.js';
import { makeLayer, makeCompanion, alphaMap } from '../paint/brush.js';
import { palette } from '../paint/palette.js';
import { makeSystem } from './particles.js';
import { quality } from '../render/quality.js';

const MAX_VIEW_W = 2.0;
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

export class Scene {
  constructor(renderer, place, cond) {
    this.r = renderer;
    this.place = place;
    this.cond = cond;
    this.layers = [];
    this.cx = place.start ?? 0.5;
    this.vel = 0;
    this.time = 0;
    this.buf = new Float32Array(12 * 600);
  }

  /** Paint all layers. Yields between layers so fades stay smooth. */
  async load() {
    const { place, cond } = this;
    const H = quality.tier.paintHeight;
    const pal = palette(cond.season);
    const density = quality.tier.particles;
    for (const def of place.layers) {
      const L = { def, kind: def.kind, lw: def.lw, depth: def.depth ?? 0.5, systems: [] };
      if (def.kind === 'paint' || def.kind === 'water') {
        const layer = makeLayer(def.lw, Math.round(H * (def.res || 1)), this.r.maxTex);
        const extras = {};
        if (def.emissive) extras.emis = makeCompanion(layer, 0.25);
        if (def.kind === 'water') extras.refl = makeCompanion(layer, 0.5);
        const rng = new Rng(`${place.id}:${def.id}:${cond.season}`);
        def.paint(layer, rng, pal, cond, extras);
        if (def.kind === 'paint' && def.pick !== false) L.pick = alphaMap(layer.canvas);
        L.tex = this.r.createTexture(layer.canvas);
        if (extras.emis) {
          softenGlow(extras.emis.canvas);
          L.tex2 = this.r.createTexture(extras.emis.canvas);
        }
        if (extras.refl) L.tex2 = this.r.createTexture(extras.refl.canvas);
        await yieldFrame();
      }
      for (const sc of def.particles || []) {
        if (sc.when && !sc.when(cond)) continue;
        const sys = makeSystem(sc, def.lw, density);
        if (sys) L.systems.push(sys);
      }
      this.layers.push(L);
    }
    this.layerById = Object.fromEntries(this.layers.map((l) => [l.def.id, l]));
  }

  dispose() {
    for (const L of this.layers) {
      this.r.deleteTexture(L.tex);
      this.r.deleteTexture(L.tex2);
    }
    this.layers = [];
  }

  // View maths -----------------------------------------------------------------

  /** Visible region in world units for the current screen shape. */
  view(aspect) {
    let vh = 1;
    let viewW = aspect;
    if (aspect > MAX_VIEW_W) {
      vh = MAX_VIEW_W / aspect;
      viewW = MAX_VIEW_W;
    }
    const vTop = (1 - vh) * 0.55;
    return { viewW, vh, vTop };
  }

  layerLeft(lw, viewW, cx) {
    if (lw <= viewW) return (lw - viewW) / 2;
    return clamp(cx) * (lw - viewW);
  }

  /** uRect for a layer given a sub-rectangle of the screen (for zoom / photo). */
  rect(lw, v, cx, sub) {
    const left = this.layerLeft(lw, v.viewW, cx);
    return [
      (left + sub.x * v.viewW) / lw,
      (sub.w * v.viewW) / lw,
      v.vTop + sub.y * v.vh,
      sub.h * v.vh,
    ];
  }

  /** Project a layer point to normalised screen coordinates (0..1). */
  project(layerId, x, y, aspect, cx, sub = FULL) {
    const L = this.layerById[layerId];
    const lw = L ? L.lw : this.place.lw;
    const v = this.view(aspect);
    const left = this.layerLeft(lw, v.viewW, cx);
    const sx = ((x - left) / v.viewW - sub.x) / sub.w;
    const sy = ((y - v.vTop) / v.vh - sub.y) / sub.h;
    return [sx, sy];
  }

  /** Depth of the frontmost painted layer at a screen point (for focusing). */
  pickDepth(sx, sy, aspect, cx, sub = FULL) {
    const v = this.view(aspect);
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const L = this.layers[i];
      if (!L.pick) continue;
      const r = this.rect(L.lw, v, cx, sub);
      const u = r[0] + sx * r[1];
      const w = r[2] + sy * r[3];
      if (u < 0 || u > 1 || w < 0 || w > 1) continue;
      const px = Math.min(L.pick.w - 1, Math.floor(u * L.pick.w));
      const py = Math.min(L.pick.h - 1, Math.floor(w * L.pick.h));
      if (L.pick.a[py * L.pick.w + px] > 140) return L.depth;
    }
    return 0;
  }

  /** Main look reference width for drag speed. */
  get lookLw() { return this.place.lw; }

  // Update / render -------------------------------------------------------------

  update(dt, env) {
    this.time += dt * env.speed;
    for (const L of this.layers) for (const s of L.systems) s.update(dt, env);
  }

  render(target, aspect, atm, opts) {
    const r = this.r;
    const sub = opts.sub || FULL;
    const cx = opts.cx;
    const v = this.view(aspect);
    const reduced = opts.reduced;
    const fogCol = atm.fog;
    r.begin(target, this.place.interior ? [0.05, 0.04, 0.035] : atm.skyHor);
    const skyL = this.layers.find((l) => l.kind === 'sky');
    for (const L of this.layers) {
      const def = L.def;
      const rect = this.rect(L.lw, v, cx, sub);
      const fogK = def.fog ?? (Math.pow(1 - L.depth, 1.4) * 0.95 + 0.05);
      const base = {
        uRect: rect, uLw: L.lw, uTime: this.time,
        uTint: atm.tint, uFog: fogCol, uFogAmt: atm.fogAmt * fogK,
        uSat: atm.sat, uExposure: atm.exposure,
      };
      if (L.kind === 'sky') {
        r.draw('sky', {
          ...base, uSkyTop: atm.skyTop, uSkyHor: atm.skyHor, uSunCol: atm.sunCol, uSun: atm.sun,
          uSunVis: atm.sunVis, uCloud: atm.cloud, uStars: atm.stars, uCloudCol: atm.cloudCol,
        });
      } else if (L.kind === 'paint') {
        let emis = 0;
        if (L.tex2 || def.additive) {
          const key = def.emisKey || (def.additive ? 'beam' : 'night');
          emis = key === 'day' ? atm.daylight : key === 'beam' ? atm.beams : atm.emis;
          emis *= def.emisGain ?? 1;
        }
        if (def.additive && emis < 0.01) continue;
        let blur = 0;
        if (opts.focus != null) {
          blur = clamp(Math.abs(L.depth - opts.focus) * 4.2 * (0.6 + 0.4 * (opts.zoom || 1)), 0, 3.2);
          if (blur < 0.35) blur = 0;
        }
        r.draw('paint', {
          ...base,
          uHasTex2: L.tex2 ? 1 : 0, uEmis: emis, uSway: (def.sway || 0) * (reduced ? 0.35 : 1),
          uBlur: blur, uAdditive: def.additive ? 1 : 0, uWind: atm.wind,
        }, { uTex: L.tex, uTex2: L.tex2 });
      } else if (L.kind === 'water') {
        r.draw('water', {
          ...base, uSkyTop: atm.skyTop, uSkyHor: atm.skyHor, uSunCol: atm.sunCol, uSun: atm.sun,
          uSunVis: atm.sunVis, uRain: atm.rain, uSkyLw: skyL ? skyL.lw : L.lw, uSkyMirror: def.mirrorY ?? 0.5,
          uCalm: reduced ? 0.4 : 1,
        }, { uTex: L.tex, uTex2: L.tex2 });
      } else if (L.kind === 'mist') {
        const dens = (def.band[2] || 1) * atm.mist * (def.gain ?? 1);
        if (dens < 0.02) continue;
        r.draw('mist', { ...base, uBand: [def.band[0], def.band[1], dens, (def.band[3] ?? 0.01) * (reduced ? 0.3 : 1)] });
      } else if (L.kind === 'rain') {
        if (atm.rain < 0.01) continue;
        const left = this.layerLeft(def.lw, v.viewW, cx);
        r.draw('rain', {
          uTime: this.time, uAspect: v.viewW * sub.w, uOffset: left + sub.x * v.viewW, uScale: def.scale,
          uSpeed: def.speed * (reduced ? 0.25 : 1), uAmount: atm.rain,
          uColor: atm.fog.map((c) => Math.min(1, c * 1.1 + 0.15)),
        });
      }
      // particle systems attached to this layer
      if (L.systems.length) {
        let n = 0;
        for (const s of L.systems) n += s.write(this.buf, n, opts.env);
        r.drawParticles(this.buf, n, {
          uRect: rect, uLw: L.lw, uTint: atm.tint, uFog: fogCol, uFogAmt: atm.fogAmt * fogK * 0.8, uExposure: atm.exposure,
        });
      }
    }
  }

  /** Dynamic subjects exposed by particle systems (e.g. the floating leaf). */
  dynamicPosition(layerId, systemType) {
    const L = this.layerById[layerId];
    const s = L?.systems.find((x) => x.cfg.type === systemType);
    return s?.position || null;
  }
}

/** Soft bloom for emissive maps: downscale then upscale and add. */
function softenGlow(canvas) {
  const w = Math.max(4, canvas.width >> 3), h = Math.max(4, canvas.height >> 3);
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(canvas, 0, 0, w, h);
  const g = canvas.getContext('2d');
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'lighter';
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, canvas.width, canvas.height);
  g.restore();
}

export const FULL = { x: 0, y: 0, w: 1, h: 1 };
