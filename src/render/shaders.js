// GLSL for the painted-panorama compositor.
// Every layer is a fullscreen quad; uRect maps screen UV -> layer UV, which is
// how parallax, zoom and photo framing all work with the same code.

const HEADER = /* glsl */ `#version 300 es
precision highp float;
`;

export const FULLSCREEN_VS = HEADER + /* glsl */ `
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos.x * 2.0 - 1.0, 1.0 - aPos.y * 2.0, 0.0, 1.0);
}`;

const NOISE = /* glsl */ `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;

const COMMON_UNIFORMS = /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform vec4 uRect;      // layer uv = (x + vUv.x * y, z + vUv.y * w)
uniform float uLw;       // layer width in world units (height is 1)
uniform float uTime;
uniform vec3 uTint;
uniform vec3 uFog;
uniform float uFogAmt;
uniform float uSat;
uniform float uExposure;
vec2 layerUv() { return vec2(uRect.x + vUv.x * uRect.y, uRect.z + vUv.y * uRect.w); }
vec3 grade(vec3 rgb, float a) {
  rgb *= uTint * uExposure;
  float l = dot(rgb, vec3(0.299, 0.587, 0.114));
  rgb = mix(vec3(l), rgb, uSat);
  return mix(rgb, uFog * a, uFogAmt);
}
`;

const SKY_FN = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uSunCol;
uniform vec2 uSun;
uniform float uSunVis;
vec3 skyColor(vec2 p, float lw) {
  vec3 col = mix(uSkyTop, uSkyHor, smoothstep(0.0, 0.8, p.y));
  float d = distance(p, vec2(uSun.x * lw, uSun.y));
  col += uSunCol * (exp(-d * 6.0) * 0.32 + exp(-d * 28.0) * 0.35) * uSunVis;
  col = mix(col, uSunCol * 1.05, smoothstep(0.034, 0.026, d) * uSunVis);
  return col;
}
`;

// Painted texture layer, with optional sway, focus blur and emissive light.
export const PAINT_FS = HEADER + NOISE + COMMON_UNIFORMS + /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uTex2;
uniform float uHasTex2;
uniform float uEmis;
uniform float uSway;
uniform float uBlur;
uniform float uAdditive;
uniform float uWind;

vec4 sampleBlur(sampler2D t, vec2 uv, float b) {
  if (b < 0.05) return texture(t, uv);
  vec2 ts = vec2(textureSize(t, 0));
  vec2 o = exp2(b) * 0.75 / ts;
  vec4 s = texture(t, uv, b) * 0.36;
  s += texture(t, uv + vec2(o.x, o.y), b) * 0.16;
  s += texture(t, uv + vec2(-o.x, o.y), b) * 0.16;
  s += texture(t, uv + vec2(o.x, -o.y), b) * 0.16;
  s += texture(t, uv + vec2(-o.x, -o.y), b) * 0.16;
  return s;
}

void main() {
  vec2 uv = layerUv();
  if (uv.y < 0.0 || uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0) discard;
  if (uSway > 0.0) {
    vec2 wp = vec2(uv.x * uLw, uv.y);
    float flutter = vnoise(wp * vec2(38.0, 30.0) + vec2(uTime * 0.9, 0.0)) - 0.5;
    float gust = sin(uTime * 0.6 + wp.x * 1.7) * 0.5 + sin(uTime * 1.13 + wp.x * 3.1) * 0.25;
    float bend = (flutter * 0.55 + gust * uWind) * uSway;
    uv.x += bend * 0.0035 / uLw;
    uv.y += flutter * uSway * 0.0012;
  }
  vec4 c = sampleBlur(uTex, uv, uBlur);
  vec3 e = vec3(0.0);
  if (uHasTex2 > 0.5) e = texture(uTex2, uv).rgb * uEmis;
  if (c.a < 0.002 && dot(e, e) < 0.00001) discard;
  if (uAdditive > 0.5) {
    outColor = vec4(c.rgb * uEmis * normalize(uTint + 0.001) * 1.5, 0.0);
    return;
  }
  c.rgb = grade(c.rgb, c.a) + e;
  outColor = c;
}`;

// Procedural sky: gradient, sun or moon, painterly clouds, stars.
export const SKY_FS = HEADER + NOISE + COMMON_UNIFORMS + SKY_FN + /* glsl */ `
uniform float uCloud;
uniform float uStars;
uniform vec3 uCloudCol;
void main() {
  vec2 uv = layerUv();
  vec2 p = vec2(uv.x * uLw, uv.y);
  vec3 col = skyColor(p, uLw);
  // stars
  if (uStars > 0.01) {
    vec2 g = p * vec2(140.0, 140.0);
    vec2 cell = floor(g);
    float h = hash(cell);
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
    float star = step(0.985, h) * smoothstep(0.5, 0.0, length(fract(g) - 0.5)) * tw;
    col += vec3(star) * uStars * smoothstep(0.85, 0.2, p.y);
  }
  // clouds: two drifting fbm layers, brushed horizontally
  vec2 q = vec2(p.x * 1.4 + uTime * 0.003, p.y * 4.5);
  float n = fbm(q + fbm(q * 0.7 + 3.0) * 0.6);
  float band = smoothstep(0.05, 0.3, p.y) * smoothstep(0.85, 0.45, p.y);
  float cov = mix(0.62, 0.22, uCloud);
  float cl = smoothstep(cov, cov + 0.28, n) * mix(band, 1.0, uCloud * 0.8);
  vec3 cc = mix(uCloudCol, uSunCol, 0.25 * uSunVis) * (0.92 + 0.12 * fbm(q * 3.0));
  col = mix(col, cc, cl * 0.85);
  outColor = vec4(col, 1.0);
}`;

// Drifting low mist band.
export const MIST_FS = HEADER + NOISE + COMMON_UNIFORMS + /* glsl */ `
uniform vec4 uBand; // centre y, half-height, density, speed
void main() {
  vec2 uv = layerUv();
  vec2 p = vec2(uv.x * uLw, uv.y);
  float t = uTime * uBand.w;
  float n = fbm(vec2(p.x * 1.6 + t, p.y * 5.0 - t * 0.3));
  float n2 = fbm(vec2(p.x * 3.2 - t * 0.7, p.y * 9.0) + 7.0);
  float d = abs(p.y - uBand.x) / uBand.y;
  float shape = smoothstep(1.0, 0.0, d);
  float a = clamp(shape * (n * 1.25 + n2 * 0.35 - 0.25), 0.0, 1.0) * uBand.z;
  vec3 col = mix(uFog, vec3(1.0), 0.12) * uExposure;
  outColor = vec4(col * a, a);
}`;

// Water: sky reflection + painted reflections, rippled; rain rings when raining.
export const WATER_FS = HEADER + NOISE + COMMON_UNIFORMS + SKY_FN + /* glsl */ `
uniform sampler2D uTex;   // rgb: water colour, a: water mask
uniform sampler2D uTex2;  // reflection of things above the water (premultiplied)
uniform float uRain;
uniform float uSkyLw;
uniform float uSkyMirror; // y of the horizon line used for mirroring the sky
uniform float uCalm;

vec2 rainRings(vec2 p) {
  vec2 off = vec2(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 g = p * vec2(18.0, 54.0) + float(k) * 11.3;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(cell + float(k) * 3.7);
    float ph = fract(uTime * 0.7 + h * 7.0);
    vec2 dv = f * vec2(1.0, 0.33);
    float r = length(dv);
    float ring = sin((r - ph * 0.45) * 80.0) * smoothstep(0.06, 0.0, abs(r - ph * 0.45)) * (1.0 - ph);
    off += normalize(dv + 0.0001) * ring * step(0.35, h);
  }
  return off * uRain;
}

void main() {
  vec2 uv = layerUv();
  if (uv.y < 0.0 || uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0) discard;
  vec4 base = texture(uTex, uv);
  if (base.a < 0.003) discard;
  vec2 p = vec2(uv.x * uLw, uv.y);
  float depth = clamp((p.y - 0.5) * 2.0, 0.0, 1.0);
  vec2 wob = vec2(
    vnoise(vec2(p.x * 6.0, p.y * 90.0 - uTime * 0.6)) - 0.5,
    vnoise(vec2(p.x * 4.0 + 5.0, p.y * 70.0 + uTime * 0.4)) - 0.5);
  wob *= (0.004 + 0.006 * depth) * uCalm;
  wob += rainRings(p) * 0.006;
  vec2 ruv = uv + vec2(wob.x / uLw, wob.y);
  vec4 refl = texture(uTex2, ruv, 0.5);
  float my = clamp(2.0 * uSkyMirror - p.y + wob.y * 3.0, 0.0, 1.0);
  vec3 sky = skyColor(vec2(p.x * uSkyLw / uLw, my), uSkyLw);
  vec3 water = base.rgb / max(base.a, 0.001);
  float fres = mix(0.55, 0.85, 1.0 - depth);
  vec3 col = mix(water, sky, fres * 0.75);
  col = col * (1.0 - refl.a * 0.92) + refl.rgb * 0.92;
  // sparkle
  float sp = smoothstep(0.9, 0.99, vnoise(vec2(p.x * 26.0, p.y * 120.0) + uTime * 0.35)) * 0.06 * uCalm * uSunVis;
  col += sp * uSunCol;
  col = grade(col, 1.0);
  outColor = vec4(col * base.a, base.a);
}`;

// Rain streaks in screen space (with a little parallax offset).
export const RAIN_FS = HEADER + NOISE + /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform float uTime;
uniform float uAspect;
uniform float uOffset;
uniform float uScale;
uniform float uSpeed;
uniform float uAmount;
uniform vec3 uColor;
void main() {
  vec2 p = vec2(vUv.x * uAspect + uOffset, vUv.y);
  p.x += p.y * 0.08;
  vec2 g = vec2(p.x * uScale, p.y * uScale * 0.12 - uTime * uSpeed);
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float h = hash(cell);
  float x = abs(f.x - (0.2 + 0.6 * h));
  float streak = smoothstep(0.06, 0.0, x) * smoothstep(0.0, 0.35, f.y) * smoothstep(1.0, 0.55, f.y);
  streak *= step(1.0 - uAmount * 0.5, hash(cell + 13.1));
  float a = streak * 0.22;
  outColor = vec4(uColor * a, a);
}`;

// Instanced particles (motes, leaves, koi, smoke, fireflies, snow).
export const PARTICLE_VS = HEADER + /* glsl */ `
in vec2 aCorner;
in vec4 iPos;   // x (world units in layer), y (0..1), size, rotation
in vec4 iCol;   // straight rgb, alpha
in vec4 iKind;  // kind, aspect, seed, unused
uniform vec4 uRect;
uniform float uLw;
out vec2 vLocal;
out vec4 vCol;
out vec4 vKind;
void main() {
  vec2 c = aCorner * vec2(iKind.y, 1.0) * iPos.z;
  float s = sin(iPos.w), co = cos(iPos.w);
  c = vec2(c.x * co - c.y * s, c.x * s + c.y * co);
  float u = (iPos.x + c.x) / uLw;
  float v = iPos.y + c.y;
  float sx = (u - uRect.x) / uRect.y;
  float sy = (v - uRect.z) / uRect.w;
  vLocal = aCorner;
  vCol = iCol;
  vKind = iKind;
  gl_Position = vec4(sx * 2.0 - 1.0, 1.0 - sy * 2.0, 0.0, 1.0);
}`;

export const PARTICLE_FS = HEADER + NOISE + /* glsl */ `
in vec2 vLocal;
in vec4 vCol;
in vec4 vKind;
out vec4 outColor;
uniform vec3 uTint;
uniform vec3 uFog;
uniform float uFogAmt;
uniform float uExposure;
void main() {
  vec2 p = vLocal;           // -0.5..0.5 across the quad
  int kind = int(vKind.x + 0.5);
  float a = 0.0;
  vec3 col = vCol.rgb;
  bool lit = true;
  if (kind == 0) {           // soft mote
    a = smoothstep(0.5, 0.0, length(p));
    a *= a;
  } else if (kind == 1) {    // leaf / petal
    vec2 q = p * vec2(1.0, 1.0);
    float d = length(vec2(q.x, q.y * (1.0 + abs(q.x) * 1.6))) ;
    a = smoothstep(0.5, 0.42, d);
    col *= 0.85 + 0.3 * smoothstep(0.08, 0.0, abs(q.y)) * 0.4 + 0.15 * p.x;
  } else if (kind == 2) {    // koi seen from above, moving along +x
    float body = length(vec2((p.x + 0.08) * 1.25, p.y * 3.2));
    float tail = smoothstep(0.5, 0.33, p.x * -1.0) * step(p.x, -0.28) * smoothstep(0.2, 0.0, abs(p.y) - (-p.x - 0.28) * 0.9);
    a = max(smoothstep(0.5, 0.4, body), tail * 0.8);
    float spots = smoothstep(0.45, 0.6, vnoise(p * 6.0 + vKind.z * 13.0));
    col = mix(col, vec3(0.95, 0.93, 0.88), spots);
    a *= 0.85;
  } else if (kind == 3) {    // smoke puff
    float n = vnoise(p * 4.0 + vKind.z * 7.0);
    a = smoothstep(0.5, 0.05, length(p)) * (0.5 + 0.6 * n);
  } else if (kind == 4) {    // firefly glow (not affected by darkness)
    float d = length(p);
    a = smoothstep(0.5, 0.0, d);
    a = a * a * 0.9 + smoothstep(0.08, 0.0, d);
    lit = false;
  } else {                   // snowflake / droplet
    a = smoothstep(0.5, 0.2, length(p));
  }
  a *= vCol.a;
  if (a < 0.003) discard;
  if (lit) {
    col *= uTint * uExposure;
    col = mix(col, uFog, uFogAmt);
    outColor = vec4(col * a, a);
  } else {
    outColor = vec4(col * a, a * 0.2);
  }
}`;

// Film look applied when a photograph is "exposed".
export const FILM_FS = HEADER + NOISE + /* glsl */ `
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform float uSeed;
uniform vec2 uRes;
uniform vec3 uStock;
uniform float uGrain;
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c = texture(uScene, uv).rgb;
  vec3 h = texture(uScene, uv, 4.0).rgb;
  c += max(h - 0.62, 0.0) * vec3(1.0, 0.42, 0.22) * 0.45;    // halation
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);                   // gentle S-curve
  c = c * 0.93 + 0.035;                                       // lifted blacks
  c *= uStock;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.92);
  float d = length((vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 0.8);
  c *= 1.0 - 0.32 * smoothstep(0.3, 0.9, d);
  float g = hash(vUv * uRes + uSeed) + hash(vUv * uRes * 0.5 + uSeed * 1.7) - 1.0;
  c += g * uGrain * (1.0 - l * 0.6);
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
