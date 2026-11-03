// Temporary bootstrap for checking rendering; replaced by the full game shell.
import { Renderer } from './render/gl.js';
import { Scene } from './world/scene.js';
import { atmosphere } from './world/atmosphere.js';
import { TIMES } from './core/state.js';

window.__debugPaint = true;
const canvas = document.getElementById('world');
const r = new Renderer(canvas);
const params = new URLSearchParams(location.search);
const time = +(params.get('t') ?? 1);
const weather = params.get('w') ?? 'mist';
const cond = { season: 'spring', weather, time, flags: {}, day: 1 };
const place = (await import(`./world/places/${params.get('p') || 'gate'}.js`)).default;
const scene = new Scene(r, place, cond);
await scene.load();
window.__ready = true;
let cx = +(params.get('cx') ?? 0.5);
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  r.resize(innerWidth, innerHeight, Math.min(devicePixelRatio, 1.5));
  const atm = atmosphere(TIMES[time], weather, place.interior);
  const env = { speed: 1, wind: atm.wind, daylight: atm.daylight, rain: atm.rain, night: time >= 3 };
  scene.update(dt, env);
  scene.render(null, r.width / r.height, atm, { cx, env });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
let drag = null;
addEventListener('pointerdown', (e) => (drag = e.clientX));
addEventListener('pointermove', (e) => { if (drag != null) { cx -= (e.clientX - drag) / innerWidth * 0.6; cx = Math.max(0, Math.min(1, cx)); drag = e.clientX; } });
addEventListener('pointerup', () => (drag = null));
window.__ready = true;
