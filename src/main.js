// The Quiet Path — game shell. Ties together rendering, places, input,
// the story, the camera, sound and the interface.
import './ui/styles.css';
import { Renderer } from './render/gl.js';
import { quality } from './render/quality.js';
import { Scene } from './world/scene.js';
import { atmosphere } from './world/atmosphere.js';
import { PLACES } from './world/places/index.js';
import { game, TIMES, TIME_LABELS, ROLL_SIZE } from './core/state.js';
import { settings } from './core/settings.js';
import { Input } from './core/input.js';
import { audio } from './audio/audio.js';
import { photos } from './camera/photos.js';
import { exposeFrame, subjectsInFrame } from './camera/capture.js';
import { Viewfinder } from './camera/viewfinder.js';
import { Hud } from './ui/hud.js';
import { Dialog } from './ui/dialog.js';
import { Sitting } from './ui/sit.js';
import { h, wait } from './ui/dom.js';
import { openMenu, openSettings, openAlbum, openAbout, titleScreen, confirmBox } from './ui/panels.js';
import { SCRIPTS, PROMPTS, onEnter, dayIntro } from './story/content.js';

const NIGHT_FADE = '#0e1220';

class Game {
  constructor() {
    this.ui = document.getElementById('ui');
    this.canvas = document.getElementById('world');
    this.mode = 'title';
    this.cx = 0.5;
    this.lookVY = 0;
    this.busy = false;
    this.t = 0;
    this.panels = 0;
  }

  async boot() {
    this.applyDocSettings();
    settings.on('change', () => this.applyDocSettings());
    try {
      this.r = new Renderer(this.canvas);
    } catch (err) {
      this.ui.append(h('div', { class: 'toast-error' }, h('div', {},
        h('h1', { style: { fontFamily: 'var(--serif)' } }, 'The Quiet Path'),
        h('p', {}, 'This browser can’t show the painted world (WebGL2 isn’t available). Try a recent version of Chrome, Firefox, Safari or Edge.'))));
      return;
    }
    this.hud = new Hud(this.ui, {
      camera: () => this.toggleCamera(),
      album: () => this.openAlbum(),
      menu: () => this.openMenu(),
      poi: (d) => this.usePoi(d),
    });
    this.dialog = new Dialog(this.ui);
    this.vf = new Viewfinder(this.ui, {
      shutter: () => this.shutter(),
      close: () => this.toggleCamera(false),
    });
    this.sitting = new Sitting(this.ui, { dialog: this.dialog, whisper: (t, ms) => this.hud.whisper(t, ms), audio });
    this.flash = h('div', { class: 'flash' });
    this.devOverlay = h('div', { class: 'develop-overlay' });
    this.ui.append(this.flash, this.devOverlay);
    audio.onCaption = (t) => this.hud.caption(t);
    this.input = new Input(this.canvas, {
      look: (dx, dy) => this.look(dx, dy),
      zoom: (k) => this.vf.active && this.vf.setZoom(this.vf.zoom * k),
      wheelZooms: () => this.vf.active,
      tap: (x, y) => this.tap(x, y),
      key: (k, e) => this.key(k, e),
      activity: () => audio.ctx && audio.init(),
    });
    window.addEventListener('resize', () => this.vf.active && this.vf.layout());
    quality.onChange = () => {};
    if (!game.storageOk) setTimeout(() => this.hud.whisper('Your browser isn’t letting this page save. You can still play; progress won’t be kept.'), 3000);

    // Title: show the place you were last in (or the gate) behind the title.
    this.hud.show(false);
    await this.loadPlace(game.hasSave ? game.s.place : 'gate', { first: true, silent: true });
    this.loop();
    window.__ready = true;
    titleScreen(this.ui, {
      hasSave: game.hasSave,
      onBegin: () => this.begin(true),
      onContinue: () => this.begin(false),
    });
  }

  applyDocSettings() {
    const d = document.documentElement;
    d.dataset.text = settings.get('textSize');
    d.dataset.font = settings.get('plainFont') ? 'plain' : '';
    d.dataset.contrast = settings.get('highContrast') ? 'high' : '';
    d.dataset.motion = settings.reducedMotion ? 'reduced' : '';
  }

  get cond() {
    const s = game.s;
    return { season: s.season, weather: s.weather, time: s.time, flags: s.flags, day: s.day };
  }

  async begin(fresh) {
    audio.init();
    if (fresh && game.hasSave) {
      const ok = await confirmBox(this.ui, 'Begin a new stay?', 'Your progress will start again from the gate. Your photographs will be kept in the album.', 'Begin again');
      if (!ok) {
        titleScreen(this.ui, { hasSave: true, onBegin: () => this.begin(true), onContinue: () => this.begin(false) });
        return;
      }
    }
    if (fresh) {
      game.reset();
      game.set({ started: true });
    }
    this.mode = 'explore';
    await this.loadPlace(game.s.place, { force: true });
    if (innerHeight > innerWidth * 1.2 && !localStorage.getItem('quietpath.landscapeHint')) {
      try { localStorage.setItem('quietpath.landscapeHint', '1'); } catch { /* ignore */ }
      setTimeout(() => this.hud.whisper('Tip: turning your phone sideways shows more of each place. Either way is fine.', 6000), 15000);
    }
  }

  // --- places ------------------------------------------------------------------

  async loadPlace(id, { first = false, silent = false, force = false, fadeColor } = {}) {
    if (this.busy && !first) return;
    this.busy = true;
    const place = PLACES[id] || PLACES.gate;
    const cond = this.cond;
    const key = `${place.id}|${place.paintKey ? place.paintKey(cond) : ''}|${cond.time}|${cond.weather}|${quality.name}`;
    const same = this.scene && this.sceneKey === key && !force;
    if (!first && !same) await this.hud.fade(true, fadeColor);
    if (!same) {
      const prev = this.scene;
      const scene = new Scene(this.r, place, cond);
      await scene.load();
      prev?.dispose();
      this.scene = scene;
      this.sceneKey = key;
      if (this.place?.id !== place.id) this.cx = game.s.look[place.id] ?? place.start ?? 0.5;
      this.place = place;
    }
    this.atm = atmosphere(TIMES[cond.time], cond.weather, place.interior);
    if (!place.closeup) game.set({ place: place.id });
    game.s.visited[place.id] = true;
    this.refreshPois();
    if (!silent) {
      this.hud.show(this.mode === 'explore');
      this.hud.setPlace(place.name, place.closeup ? 'up close' : `Day ${cond.day} · ${TIME_LABELS[cond.time]}`);
      this.hud.announce(`${place.name}. ${TIME_LABELS[cond.time]}, ${cond.weather}. ${place.describe(cond)}`);
    }
    audio.setScene(place.sound, this.audioEnv());
    if (!first) await this.hud.fade(false);
    this.busy = false;
    if (!silent && this.mode === 'explore') onEnter(place.id, this.api());
  }

  refreshPois() {
    const cond = this.cond;
    const defs = (this.place.pois || []).filter((p) => !p.visible || p.visible(cond));
    this.hud.setPois(defs);
  }

  /** Repaint the current place if story changes affect what it looks like. */
  async repaint() {
    await this.loadPlace(this.place.id);
  }

  audioEnv() {
    const a = this.atm || atmosphere('morning', 'clear');
    return { daylight: a.daylight, rain: a.rain, wind: a.wind, night: game.s.time >= 3 || game.s.time === 0, time: game.s.time };
  }

  async go(to) {
    if (this.busy) return;
    const surface = this.place.interior || PLACES[to]?.interior ? 'wood' : 'stone';
    audio.footsteps(5, surface);
    game.s.look[this.place.id] = this.cx;
    await this.loadPlace(to);
  }

  // --- time ------------------------------------------------------------------------

  async passTime(text, ringBell = false) {
    const wasRain = game.s.weather === 'rain';
    await this.hud.fade(true, game.s.time >= 2 ? NIGHT_FADE : '#cfd5d2');
    const newDay = game.advanceTime();
    if (newDay) game.s.flags.rainedYesterday = wasRain;
    if (ringBell) audio.rin('[you ring the small bell]');
    setTimeout(() => audio.bell(), ringBell ? 1800 : 300);
    await wait(900);
    await this.loadPlace(this.place.id, { force: true, first: true });
    await this.hud.fade(false);
    const msg = newDay ? dayIntro(game.s.day, game.s.weather) : text || `${TIME_LABELS[game.s.time]}.`;
    if (msg) this.hud.whisper(msg);
    onEnter(this.place.id, this.api());
  }

  async sleep() {
    const wasRain = game.s.weather === 'rain';
    await this.hud.fade(true, NIGHT_FADE);
    await wait(1200);
    game.sleep();
    game.s.flags.rainedYesterday = wasRain;
    game.save();
    await this.loadPlace(this.place.id, { force: true, first: true });
    await wait(400);
    await this.hud.fade(false);
    setTimeout(() => audio.bell('[the morning bell, far off]'), 600);
    this.hud.whisper(dayIntro(game.s.day, game.s.weather) || 'Morning.');
  }

  // --- interaction ------------------------------------------------------------------

  async usePoi(def) {
    if (this.busy || this.dialog.open || this.mode !== 'explore') return;
    if (def.kind === 'path') return this.go(def.to);
    const fn = SCRIPTS[def.script];
    if (!fn) return;
    this.mode = 'dialog';
    this.hud.show(false);
    try { await fn(this.api()); } finally {
      if (this.mode === 'dialog') this.mode = 'explore';
      this.hud.show(this.mode === 'explore');
      this.refreshPois();
    }
  }

  api() {
    const g = this;
    return {
      say: (o) => { audio.page(); return g.dialog.say(o); },
      whisper: (t, ms) => g.hud.whisper(t, ms),
      flag: (k) => game.flag(k),
      setFlag: (k, v = true) => game.setFlag(k, v),
      get stamp() { return game.s.stamp; },
      get day() { return game.s.day; },
      get time() { return game.s.time; },
      get weather() { return game.s.weather; },
      get isDark() { return game.isDark; },
      audio,
      repaint: () => g.repaint(),
      closeup: async (id) => { g.mode = 'explore'; await g.go(id); },
      passTime: (t, bell) => g.passTime(t, bell),
      sleep: () => g.sleep(),
      sit: (kind) => g.sit(kind),
      develop: () => g.develop(),
      prompt: () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
      keepPrompt: (p) => game.setFlag('prompt', p),
    };
  }

  async sit(kind) {
    this.mode = 'sit';
    this.hud.show(false);
    const how = await this.sitting.start(kind);
    this.mode = 'explore';
    if (how === 'bell') {
      await this.passTime('The bell sounds. You unfold your legs slowly, and stand.');
    } else {
      audio.rin('[a small bell]');
      this.hud.show(true);
    }
  }

  async develop() {
    const all = await photos.list();
    const waiting = all.filter((p) => !p.developed);
    if (!waiting.length) {
      await this.dialog.say({ title: 'Darkroom corner', text: 'Behind the curtain: a small red lamp, trays, a line with clothes-pegs. There’s no exposed film waiting to be developed.' });
      return;
    }
    const evening = game.s.time >= 3 || game.s.time === 0 || settings.get('instantReview');
    if (!evening) {
      await this.dialog.say({ title: 'Darkroom corner', text: 'Too much daylight leaks around the curtain just now. This evening, when the light has gone, the film can be developed.', note: 'You can choose to see photos right away in Settings.' });
      return;
    }
    const c = await this.dialog.say({ title: 'Darkroom corner', text: `You have ${waiting.length} exposed ${waiting.length === 1 ? 'frame' : 'frames'}. The trays are ready.`, choices: [{ id: 'dev', label: 'Develop the film' }, { id: 'no', label: 'Not now' }] });
    if (c !== 'dev') return;
    this.devOverlay.classList.add('on');
    this.hud.whisper('Red light. The smell of chemicals. Slowly, in the tray, shapes rise out of nothing.', 5000);
    await wait(settings.reducedMotion ? 1500 : 5200);
    const fresh = await photos.developAll();
    this.devOverlay.classList.remove('on');
    this.openAlbum(fresh.map((p) => p.id));
  }

  // --- look & camera ----------------------------------------------------------------

  look(dx, dy) {
    if (this.mode === 'title' || !this.scene) return;
    if (this.mode === 'sit') return;
    const v = this.scene.view(innerWidth / innerHeight);
    const range = Math.max(0.2, this.place.lw - v.viewW);
    const zoom = this.vf.active ? this.vf.zoom : 1;
    this.cx -= (dx * v.viewW) / range / zoom;
    this.cx = Math.max(0, Math.min(1, this.cx));
    if (this.vf.active) this.vf.pan(-dy);
  }

  tap(x, y) {
    if (!this.vf.active || !this.scene) return;
    const r = this.vf.rect;
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return;
    const zs = this.vf.zoomSub;
    const depth = this.scene.pickDepth(x / innerWidth, y / innerHeight, innerWidth / innerHeight, this.cx, zs);
    this.vf.setFocusAt(depth, x, y);
  }

  toggleCamera(on = !this.vf.active) {
    if (this.mode !== 'explore' && on) return;
    if (on) {
      this.mode = 'camera';
      this.hud.show(false);
      this.vf.updateInfo(game.s.roll.shots);
      this.vf.open(game.flag('prompt'));
      audio.page();
    } else {
      this.vf.close();
      this.mode = 'explore';
      this.hud.show(true);
      this.hud.cameraBtn.focus();
    }
  }

  async shutter() {
    if (!this.vf.active || this._exposing) return;
    if (game.s.roll.shots >= ROLL_SIZE) {
      this.hud.whisper('The roll is finished. A fresh roll will be waiting for you tomorrow morning. For now, there’s still looking.');
      return;
    }
    this._exposing = true;
    audio.shutter();
    this.flash.classList.add('on');
    setTimeout(() => this.flash.classList.remove('on'), 90);
    const aspect = innerWidth / innerHeight;
    const zs = this.vf.zoomSub, fs = this.vf.frameSub;
    const sub = { x: zs.x + fs.x * zs.w, y: zs.y + fs.y * zs.h, w: fs.w * zs.w, h: fs.h * zs.h };
    const cond = this.cond;
    const subjects = subjectsInFrame(this.scene, this.place, cond, aspect, this.cx, sub);
    try {
      const { full, small } = await exposeFrame({
        renderer: this.r, scene: this.scene, atm: this.atm, aspect, cx: this.cx, sub,
        focus: this.vf.focus, zoom: this.vf.zoom, env: this.env, reduced: settings.reducedMotion,
        photoW: quality.tier.photoW, portrait: this.vf.portrait,
      });
      const frame = game.s.roll.shots + 1;
      const meta = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        day: cond.day, time: cond.time, weather: cond.weather, season: cond.season, place: this.place.id,
        roll: game.s.roll.id, frame, subjects, prompt: game.flag('prompt') || null,
        developed: !!settings.get('instantReview'), created: Date.now(),
      };
      await photos.add(meta, full, small);
      game.set({ roll: { ...game.s.roll, shots: frame } });
      audio.advance();
      this.vf.updateInfo(frame);
      if (subjects.length) this.hud.caption(`— ${subjects[0]}`);
    } catch (err) {
      console.error(err);
      this.hud.whisper('The shutter stuck for a moment. Try again.');
    }
    this._exposing = false;
  }

  // --- panels -----------------------------------------------------------------------

  async openAlbum(highlight) {
    if (this.mode === 'title') return;
    const prev = this.mode;
    if (this.vf.active) this.toggleCamera(false);
    this.mode = 'panel';
    this.hud.show(false);
    const p = await openAlbum(this.ui, { highlight });
    const obs = new MutationObserver(() => {
      if (!p.wrap.isConnected && !this.ui.querySelector('.panel-wrap')) {
        obs.disconnect();
        this.mode = prev === 'camera' || prev === 'panel' ? 'explore' : prev === 'dialog' ? 'explore' : prev;
        this.hud.show(this.mode === 'explore');
      }
    });
    obs.observe(this.ui, { childList: true });
  }

  openMenu() {
    if (this.mode === 'title' || this.ui.querySelector('.panel-wrap')) return;
    if (this.vf.active) this.toggleCamera(false);
    const prev = this.mode;
    this.mode = 'panel';
    this.hud.show(false);
    const restore = () => {
      if (!this.ui.querySelector('.panel-wrap')) {
        this.mode = prev === 'panel' ? 'explore' : prev;
        this.hud.show(this.mode === 'explore');
      }
    };
    const obs = new MutationObserver(() => { if (!this.ui.querySelector('.panel-wrap')) { obs.disconnect(); restore(); } });
    obs.observe(this.ui, { childList: true });
    openMenu(this.ui, {
      onSettings: () => openSettings(this.ui, () => audio.init()),
      onAlbum: () => openAlbum(this.ui),
      onAbout: () => openAbout(this.ui),
      onTitle: () => {
        obs.disconnect();
        this.mode = 'title';
        this.hud.show(false);
        game.s.look[this.place.id] = this.cx;
        game.save();
        titleScreen(this.ui, { hasSave: game.hasSave, onBegin: () => this.begin(true), onContinue: () => this.begin(false) });
      },
      onNewStay: async () => {
        const ok = await confirmBox(this.ui, 'Begin a new stay?', 'Your progress will start again from the gate. Your photographs stay in the album.', 'Begin again');
        if (ok) {
          game.reset();
          game.set({ started: true });
          this.mode = 'explore';
          await this.loadPlace('gate', { force: true });
        }
      },
    });
  }

  key(k, e) {
    if (this.mode === 'title') return;
    const inPanel = !!this.ui.querySelector('.panel-wrap');
    if (inPanel || this.dialog.open) return;
    if (this.mode === 'camera') {
      if (k === ' ' || k === 'enter') { e.preventDefault(); this.shutter(); }
      else if (k === 'escape' || k === 'c') this.toggleCamera(false);
      else if (k === 'f') this.vf.cycleFocus();
      else if (k === '+' || k === '=') this.vf.setZoom(this.vf.zoom + 0.25);
      else if (k === '-' || k === '_') this.vf.setZoom(this.vf.zoom - 0.25);
      return;
    }
    if (this.mode !== 'explore') return;
    if (k === 'c') this.toggleCamera(true);
    else if (k === 'escape') this.openMenu();
    else if (k === 'p') this.openAlbum();
    else if (k === 'w' || (k === 'arrowup' && e.target === document.body)) this.activateNearest((d) => d.kind === 'path');
    else if (k === 's') this.activateNearest((d) => d.kind === 'sit');
    else if (k === 'e' || (k === 'enter' && e.target === document.body)) {
      if (!this.activateNearest((d) => d.kind !== 'path')) this.activateNearest(() => true);
    }
  }

  /** Use the visible point of interest nearest the centre of the screen. */
  activateNearest(filter) {
    let best = null, bd = Infinity;
    for (const p of this.hud.pois) {
      if (!filter(p.def) || p.el.style.visibility === 'hidden') continue;
      const x = parseFloat(p.el.style.left), y = parseFloat(p.el.style.top);
      const d = Math.hypot(x - innerWidth / 2, (y - innerHeight / 2) * 0.5);
      if (d < bd) { bd = d; best = p.def; }
    }
    if (best) this.usePoi(best);
    return !!best;
  }

  // --- frame loop ---------------------------------------------------------------------

  loop() {
    let last = performance.now();
    const frame = (now) => {
      const dtMs = now - last;
      last = now;
      const dt = Math.min(0.05, dtMs / 1000);
      this.t += dt;
      quality.sample(dtMs);
      if (!document.hidden && this.scene && !this.busyPaint) this.render(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  render(dt) {
    const reduced = settings.reducedMotion;
    const [dx, dy] = this.input.step(dt);
    if (dx || dy) this.look(dx, dy);
    this.r.resize(innerWidth, innerHeight, quality.pixelRatio);
    const atm = this.atm;
    this.env = {
      speed: reduced ? 0.45 : 1, wind: atm.wind, daylight: atm.daylight, rain: atm.rain,
      night: game.s.time >= 3 || game.s.time === 0,
    };
    this.scene.update(dt, this.env);
    const aspect = this.r.width / this.r.height;
    const drift = reduced || this.vf.active ? 0 : Math.sin(this.t * 0.05) * 0.004;
    const cx = Math.max(0, Math.min(1, this.cx + drift));
    const opts = { cx, env: this.env, reduced };
    if (this.vf.active) {
      opts.sub = this.vf.zoomSub;
      opts.focus = this.vf.focus;
      opts.zoom = this.vf.zoom;
    }
    this.scene.render(null, aspect, atm, opts);
    if (this.mode === 'explore') {
      this.hud.layoutPois((d) => {
        const [sx, sy] = this.scene.project(d.layer, d.x, d.y, aspect, cx);
        return [sx * innerWidth, sy * innerHeight];
      });
    }
  }
}

const g = new Game();
g.boot();
window.__game = g;
