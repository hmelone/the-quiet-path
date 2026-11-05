// The Quiet Path (v2) — a walkable valley in the spirit of the Plum Village tradition.
// This shell ties together the 3D world, walking, the story, the camera,
// sound, music, the bell of mindfulness and the interface.
import './ui/styles.css';
import * as THREE from 'three';
import { World } from './world3d/world.js';
import { Player } from './world3d/player.js';
import { zoneAt, KINDS } from './world3d/interactables.js';
import { polyDist, groundAt } from './world3d/terrain.js';
import { STREAM, pondDist, START, POND } from './world3d/layout.js';
import { game, TIMES, TIME_LABELS, ROLL_SIZE } from './core/state.js';
import { settings } from './core/settings.js';
import { Input } from './core/input.js';
import { audio } from './audio/audio.js';
import { music } from './audio/music.js';
import { BellKeeper } from './audio/bell.js';
import { photos } from './camera/photos.js';
import { exposeFrame, subjectsInFrame } from './camera/capture.js';
import { Viewfinder } from './camera/viewfinder.js';
import { Hud } from './ui/hud.js';
import { Dialog } from './ui/dialog.js';
import { Sitting } from './ui/sit.js';
import { h, wait } from './ui/dom.js';
import { openMenu, openSettings, openAlbum, openAbout, titleScreen, confirmBox } from './ui/panels.js';
import { SCRIPTS, PROMPTS, onEnterZone, dayIntro } from './story/content.js';
import { ThoughtStream } from './story/thoughts.js';
import { ThoughtView } from './ui/thought.js';
import { openLibrary } from './ui/library.js';

const NIGHT_FADE = '#0e1220';

function pickTier() {
  const q = settings.get('quality');
  if (q && q !== 'auto') return q;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = Math.min(screen.width, screen.height) < 500;
  if (mem <= 2 || cores <= 2) return 'low';
  if (small || mem <= 4) return 'medium';
  return 'high';
}

class Game {
  constructor() {
    this.ui = document.getElementById('ui');
    this.canvas = document.getElementById('world');
    this.mode = 'loading';
    this.t = 0;
    this.zone = null;
    this._acc = { zone: 0, audio: 0, save: 0 };
    this.ray = new THREE.Raycaster();
  }

  async boot() {
    this.applyDocSettings();
    settings.on('change', (k) => this.onSetting(k));
    const loading = h('div', { class: 'loading', role: 'status' },
      h('h1', {}, 'The Quiet Path'), h('div', { class: 'bar' }, h('i')), h('p', {}, 'Arriving…'));
    this.ui.append(loading);
    const bar = loading.querySelector('i'), msg = loading.querySelector('p');
    try {
      this.world = new World(this.canvas, pickTier());
    } catch (err) {
      loading.remove();
      this.ui.append(h('div', { class: 'toast-error' }, h('div', {},
        h('h1', { style: { fontFamily: 'var(--serif)' } }, 'The Quiet Path'),
        h('p', {}, 'This browser can’t show the 3D world (WebGL isn’t available). Try a recent version of Chrome, Firefox, Safari or Edge.'))));
      return;
    }
    await this.world.build((p, text) => { bar.style.width = `${Math.round(p * 100)}%`; msg.textContent = `${text}…`; });
    this.engine = this.world.engine;
    const pos = game.hasSave ? game.s.pos : START;
    this.player = new Player(this.world.nav, pos);
    this.player.onStep = (surface) => audio.step(surface);
    this.world.setConditions(this.cond);
    this.updateFov();

    this.hud = new Hud(this.ui, {
      camera: () => this.toggleCamera(),
      album: () => this.openAlbum(),
      menu: () => this.openMenu(),
      sound: () => { audio.init(); settings.set('muted', !settings.get('muted')); this.startMusic(); },
      use: (it) => this.use(it),
      stop: () => this.stopWalking(),
    });
    this.dialog = new Dialog(this.ui);
    this.vf = new Viewfinder(this.ui, { shutter: () => this.shutter(), close: () => this.toggleCamera(false), focusChanged: () => {} });
    this.sitting = new Sitting(this.ui, { dialog: this.dialog, whisper: (t, ms) => this.hud.whisper(t, ms), audio });
    // spontaneous thoughts
    this.thoughtView = new ThoughtView(this.ui, { onRespond: (t, id) => this.onThought(t, id), onDone: () => this.thoughts.done() });
    this.thoughts = new ThoughtStream((t) => this.thoughtView.show(t));
    this.extraItems = [];
    this.moment = { teaFor: 0, photosToday: 0, photoDay: 0, peopleNear: 0, readerNear: false, hienAt: null, noteAt: null, sentAlone: {} };
    this.flash = h('div', { class: 'flash' });
    this.devOverlay = h('div', { class: 'develop-overlay' });
    this.breath = h('div', { class: 'breath-pause', 'aria-live': 'polite', hidden: true }, h('div', { class: 'ring', 'aria-hidden': 'true' }), h('p'), h('button', { onclick: () => this.endBreath() }, 'Continue'));
    this.marker = this.makeMarker();
    this.ui.append(this.flash, this.devOverlay, this.breath);
    audio.onCaption = (t) => this.hud.caption(t);
    this.bells = new BellKeeper((src) => this.bellOfMindfulness(src));
    this.input = new Input(this.canvas, {
      look: (dx, dy) => this.look(dx, dy),
      zoom: (k) => this.vf.active && (this.vf.setZoom(this.vf.zoom * k), this.updateFov()),
      wheelZooms: () => this.vf.active,
      tap: (x, y) => this.tap(x, y),
      key: (k, e) => this.key(k, e),
      activity: () => { if (audio.ctx) audio.init(); },
    });
    window.addEventListener('resize', () => this.vf.active && this.vf.layout());
    if (!game.storageOk) setTimeout(() => this.hud.whisper('Your browser isn’t letting this page save. You can still play; progress won’t be kept.'), 3000);

    this.hud.show(false);
    this.mode = 'title';
    this.loop();
    loading.style.opacity = 0;
    setTimeout(() => loading.remove(), 1200);
    window.__ready = true;
    this.showTitle();
  }

  showTitle() {
    const el = titleScreen(this.ui, {
      hasSave: game.hasSave, onBegin: () => this.begin(true), onContinue: () => this.begin(false),
      onSound: (on) => { if (on) { audio.init(); this.startMusic(); } this.updateTitleHint(); },
    });
    this.titleEl = el;
    this.titleMusic();
  }

  /**
   * Play the music on the title screen. Browsers only allow sound after the
   * person has tapped, clicked or pressed a key, so if it's held back we start
   * on the very first interaction and show a small "Tap anywhere for sound" note.
   */
  titleMusic() {
    if (settings.get('muted')) { this.updateTitleHint(); return; }
    audio.init();
    this.startMusic();
    if (!this._unlockBound) {
      this._unlockBound = true;
      const unlock = () => {
        if (!settings.get('muted')) { audio.init(); this.startMusic(); }
        if (audio.ctx?.state === 'running') {
          for (const ev of ['pointerdown', 'keydown', 'touchend']) window.removeEventListener(ev, unlock, true);
        }
        setTimeout(() => this.updateTitleHint(), 100);
      };
      for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, true);
    }
    // the context may still be waiting for permission
    setTimeout(() => this.updateTitleHint(), 300);
  }

  updateTitleHint() {
    const hint = this.titleEl?.querySelector('.title-sound-hint');
    if (!hint) return;
    hint.hidden = settings.get('muted') || audio.ctx?.state === 'running';
  }

  applyDocSettings() {
    const d = document.documentElement;
    d.dataset.text = settings.get('textSize');
    d.dataset.font = settings.get('plainFont') ? 'plain' : '';
    d.dataset.contrast = settings.get('highContrast') ? 'high' : '';
    d.dataset.motion = settings.reducedMotion ? 'reduced' : '';
  }

  onSetting(k) {
    this.applyDocSettings();
    if (k === 'fov') this.updateFov();
    if (k === 'bellFrequency') this.bells?.reset();
    if (k === 'musicOn' || k === 'muted') this.startMusic();
  }

  updateFov() {
    const base = settings.get('fov') || 62;
    this.engine.camera.fov = this.vf?.active ? base / this.vf.zoom : base;
    this.engine.camera.updateProjectionMatrix();
  }

  get cond() {
    const s = game.s;
    return { season: s.season, weather: s.weather, time: s.time, flags: s.flags, day: s.day };
  }

  startMusic() {
    if (!audio.ctx) return;
    music.start();
    music.setTime(TIMES[game.s.time]);
  }

  async begin(fresh) {
    audio.init();
    if (fresh && game.hasSave) {
      const ok = await confirmBox(this.ui, 'Begin a new stay?', 'Your progress will start again from the gate. Your photographs stay in the album.', 'Begin again');
      if (!ok) { this.showTitle(); return; }
    }
    if (fresh) {
      game.reset();
      game.set({ started: true });
      this.player.x = START.x; this.player.z = START.z; this.player.yaw = START.yaw;
      this.player.stop();
      this.world.setConditions(this.cond);
    }
    this.startMusic();
    this.mode = 'explore';
    this.hud.show(true);
    this.zone = null;
    if (innerHeight > innerWidth * 1.2 && !localStorage.getItem('quietpath.landscapeHint')) {
      try { localStorage.setItem('quietpath.landscapeHint', '1'); } catch { /* ignore */ }
      setTimeout(() => this.hud.whisper('Tip: turning your phone sideways shows more of the valley. Either way is fine.', 6000), 20000);
    }
  }

  // --- story API ---------------------------------------------------------------------

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
      refresh: () => g.world.refresh(),
      snakeLeaves: () => g.world.animals.snakeLeaves(),
      thoughtMoment: (type) => g.thoughts.event(type, 2),
      passTime: (t, bell) => g.passTime(t, bell),
      sleep: () => g.sleep(),
      sit: (kind) => g.sit(kind),
      develop: () => g.develop(),
      bell: (src) => g.bellOfMindfulness(src),
      prompt: () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
      keepPrompt: (p) => game.setFlag('prompt', p),
    };
  }

  async runScript(name) {
    const fn = SCRIPTS[name];
    if (!fn) return;
    this.mode = 'dialog';
    this.hud.show(false);
    this.thoughtView.hideNow();
    const cups = game.flag('teaCups') || 0;
    try { await fn(this.api()); } finally {
      if (name === 'tea' && (game.flag('teaCups') || 0) > cups) this.thoughts.event('tea', 3);
      if (name === 'hien') this.moment.hienAt = this.t;
      if (name === 'note') this.moment.noteAt = this.t;
      if (this.mode === 'dialog') this.mode = 'explore';
      this.hud.show(this.mode === 'explore');
      if (this._pendingBreath) { this._pendingBreath = false; this.startBreath(); }
    }
  }

  /**
   * Use an interactable. Looking, talking and bells open right where you are —
   * no walking needed. Signposts and doors walk you there; sitting walks you to the seat.
   */
  use(it) {
    if (this.mode !== 'explore' || this.dialog.open) return;
    audio.init();
    if (it.join) { this.joinWalk(); return; }
    if (it.kind === 'go') {
      if (this.player.walkTo(it.to[0], it.to[1], null, it.faceTo)) {
        this.walkingTo = it.toName;
        this.showMarker(it.to[0], it.to[1]);
      }
      return;
    }
    if (it.peek !== undefined) {
      // Step up to the doorway and look in, rather than reading from afar.
      const look = () => {
        this.walkingTo = null;
        Object.assign(this.player, { yaw: it.peek, pitch: -0.12 });
        this.player.lookTarget = null;
        this.runScript(it.script);
      };
      if (Math.hypot(it.stand[0] - this.player.x, it.stand[1] - this.player.z) > 0.6 && this.player.walkTo(it.stand[0], it.stand[1], look)) {
        this.walkingTo = 'the kitchen door';
      } else { this.player.stop(); look(); }
      return;
    }
    if (it.kind === 'sit' && it.stand && Math.hypot(it.stand[0] - this.player.x, it.stand[1] - this.player.z) > 1.2) {
      const ok = this.player.walkTo(it.stand[0], it.stand[1], () => { this.walkingTo = null; this.runScript(it.script); });
      if (ok) { this.walkingTo = it.label.toLowerCase(); return; }
    }
    this.player.stop();
    this.walkingTo = null;
    if (it.dynamic) {
      // the person turns to face you
      const f = it.dynamic();
      if (f) f.rotation.y = Math.atan2(-(this.player.x - f.position.x), -(this.player.z - f.position.z));
    }
    this.runScript(it.script);
  }

  /**
   * Join the morning walking meditation: walk to the loop around the pond,
   * then go round once at the line's slow pace. Stop or Esc leaves it.
   */
  joinWalk() {
    const loop = this.world.people.loop;
    const px = this.player;
    let bi = 0, bd = Infinity;
    loop.forEach(([x, z], i) => { const d = Math.hypot(x - px.x, z - px.z); if (d < bd) { bd = d; bi = i; } });
    const around = [];
    const n = loop.length - 1; // last point repeats the first
    for (let k = 1; k <= n; k++) around.push(loop[(bi + k) % n]);
    const startLoop = () => {
      px.route = around.slice();
      px.speed = 0.38;
      this.walkMeditation = true;
      this.walkingTo = 'the walking meditation';
      px.onArrive = () => this.endWalkMeditation(true);
      this.hud.whisper('You fall in at the end of the line. Slowly. One breath, a few steps. Nobody looks back.', 6500);
    };
    if (bd < 1.5) startLoop();
    else if (px.walkTo(loop[bi][0], loop[bi][1], startLoop)) this.walkingTo = 'the walking line';
  }

  endWalkMeditation(completed) {
    if (!this.walkMeditation) return;
    this.walkMeditation = false;
    this.player.speed = 1.45;
    game.setFlag('joinedWalk', (game.flag('joinedWalk') || 0) + 1);
    if (completed) this.hud.whisper('The line comes back to where it began. You stand still a moment, and let it go on without you.');
    this.thoughts.event('afterWalk', 6);
  }

  /** Stop walking (Esc or the Stop button). */
  stopWalking() {
    this.endWalkMeditation(false);
    this.player.stop();
    this.walkingTo = null;
    this.marker.material.opacity = 0;
  }

  itemPos(it) {
    if (it.dynamic) {
      const f = it.dynamic();
      if (f) return { x: f.position.x, y: f.position.y + (it.iconY ?? 2.1), z: f.position.z };
    }
    return { x: it.x, y: it.y, z: it.z };
  }

  // --- the bell of mindfulness --------------------------------------------------------

  bellOfMindfulness(source) {
    if (this.mode === 'title' || this.mode === 'loading') return;
    if (this.mode === 'listen') { this.bells.reset(); return; } // don't ring over a talk
    const cap = source === 'you' ? '[you invite the great bell; its sound spreads across the valley]' : source === 'time' ? '[the great bell sounds from the tower]' : '[the bell of mindfulness sounds from the tower]';
    // a soft "waking" touch first, then the full sound
    audio.rin('');
    setTimeout(() => audio.bell(cap), 1600);
    this.bells.reset();
    audio.setDuck(0.25);
    this.breathTarget = 1;
    clearTimeout(this._breathEnd);
    if (settings.get('pauseForBell') && this.mode === 'dialog' && source === 'you') {
      this._pendingBreath = true; // start once the dialog closes
      return;
    }
    this.startBreath();
  }

  startBreath() {
    const pauseBreath = settings.get('pauseForBell') && (this.mode === 'explore' || this.mode === 'camera');
    this.breathTarget = 1;
    clearTimeout(this._breathEnd);
    if (pauseBreath) {
      if (this.vf.active) this.toggleCamera(false);
      this.mode = 'breath';
      this.hud.show(false);
      this.breath.hidden = false;
      requestAnimationFrame(() => this.breath.classList.add('on'));
      const p = this.breath.querySelector('p');
      const lines = ['Everyone in the valley stops where they are.', 'Breathing in…', 'Breathing out…', 'Breathing in…', 'Breathing out…', 'Breathing in…', 'Breathing out…'];
      let i = 0;
      const next = () => {
        if (this.mode !== 'breath') return;
        p.textContent = lines[i];
        this.hud.announce(lines[i]);
        i++;
        if (i < lines.length) this._breathT = setTimeout(next, i === 1 ? 4000 : settings.reducedMotion ? 3000 : 3600);
        else this._breathEnd = setTimeout(() => this.endBreath(), 3500);
      };
      next();
      setTimeout(() => this.breath.querySelector('button').focus(), 300);
    } else {
      this._breathEnd = setTimeout(() => this.endBreath(), 15000);
    }
  }

  endBreath() {
    clearTimeout(this._breathT);
    clearTimeout(this._breathEnd);
    this.breathTarget = 0;
    audio.setDuck(1);
    this.breath.classList.remove('on');
    setTimeout(() => { if (!this.breath.classList.contains('on')) this.breath.hidden = true; }, 1600);
    if (this.mode === 'breath') {
      this.mode = 'explore';
      this.hud.show(true);
    }
  }

  // --- time -------------------------------------------------------------------------------

  async passTime(text, ringBell = false) {
    const wasRain = game.s.weather === 'rain';
    await this.hud.fade(true, game.s.time >= 2 ? NIGHT_FADE : '#cfd5d2');
    const newDay = game.advanceTime();
    if (newDay) game.s.flags.rainedYesterday = wasRain;
    if (ringBell) audio.rin('[you invite the small bell]');
    setTimeout(() => audio.bell('[the great bell sounds from the tower]'), ringBell ? 1800 : 300);
    this.world.setConditions(this.cond, !!this.zone?.interior);
    music.setTime(TIMES[game.s.time]);
    await wait(900);
    await this.hud.fade(false);
    const msg = newDay ? dayIntro(game.s.day, game.s.weather) : text || `${TIME_LABELS[game.s.time]}.`;
    if (msg) this.hud.whisper(msg);
    this.hud.setPlace(this.zone?.name || '', `Day ${game.s.day} · ${TIME_LABELS[game.s.time]}`);
  }

  async sleep() {
    const wasRain = game.s.weather === 'rain';
    await this.hud.fade(true, NIGHT_FADE);
    await wait(1200);
    game.sleep();
    game.s.flags.rainedYesterday = wasRain;
    game.save();
    this.world.setConditions(this.cond, !!this.zone?.interior);
    music.setTime(TIMES[game.s.time]);
    await wait(400);
    await this.hud.fade(false);
    setTimeout(() => audio.bell('[the morning bell, from the tower]'), 600);
    this.hud.whisper(dayIntro(game.s.day, game.s.weather) || 'Morning.');
    this.hud.setPlace(this.zone?.name || '', `Day ${game.s.day} · ${TIME_LABELS[game.s.time]}`);
  }

  async sit(kind) {
    this.mode = 'sit';
    this.hud.show(false);
    audio.setDuck(0.4);
    const px = this.player;
    const before = { x: px.x, z: px.z };
    if (kind === 'hall') {
      // settle onto a cushion in the rows, facing the altar like everyone else
      const c = this.world.built.hall.playerCushion;
      px.stop();
      Object.assign(px, { x: c.x, z: c.z + 0.1, yaw: c.rot, pitch: -0.06 });
      px.lookTarget = null;
    }
    px.seated = true;
    let how;
    if (kind === 'hall') {
      // On a hall cushion the Dharma talks are offered first; you can choose
      // one, or just sit in silence (and come back to the talks at any time).
      for (;;) {
        this.mode = 'listen'; // the bell of mindfulness waits during a talk
        audio.setDuck(0.12);
        audio.setAmbienceDuck(0.45);
        this.bells.reset();
        const choice = await openLibrary(this.ui);
        audio.setAmbienceDuck(1);
        audio.setDuck(0.4);
        this.mode = 'sit';
        if (choice === 'stand') { how = 'stand'; break; }
        how = await this.sitting.start(kind, { talks: true });
        if (how !== 'talks') break;
      }
    } else how = await this.sitting.start(kind);
    px.seated = false;
    if (kind === 'hall') Object.assign(px, before); // stand up into the aisle
    audio.setDuck(1);
    this.mode = 'explore';
    if (how === 'bell') await this.passTime('The bell sounds. You stretch slowly, and stand.');
    else { audio.rin('[a small bell]'); this.hud.show(true); }
  }

  async develop() {
    const all = await photos.list();
    const waiting = all.filter((p) => !p.developed);
    if (!waiting.length) {
      await this.dialog.say({ title: 'Darkroom corner', text: 'Behind the curtain: a small red lamp, trays, a line with clothes-pegs. There’s no exposed film waiting to be developed.' });
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

  // --- looking, tapping, camera ----------------------------------------------------------

  look(dx, dy) {
    if (!['explore', 'camera', 'sit'].includes(this.mode)) return;
    const zoom = this.vf.active ? this.vf.zoom : 1;
    const k = 2.6 / zoom;
    this.player.look(dx * k, dy * k * 0.8);
  }

  tap(x, y) {
    if (this.mode === 'camera') {
      const r = this.vf.rect;
      if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return;
      const hit = this.raycastScreen(x, y);
      this.vf.setFocusAt(hit ? Math.max(0.5, hit.distance) : 40, x, y);
      return;
    }
    if (this.mode !== 'explore') return;
    audio.init();
    const hit = this.raycastScreen(x, y);
    if (!hit) return;
    const p = hit.point;
    let tx = p.x, tz = p.z;
    const d = Math.hypot(tx - this.player.x, tz - this.player.z);
    if (d < 0.6) { this.stopWalking(); return; }
    // tapping walks you to that spot only — never further than a short stroll
    const MAX = 35;
    if (d > MAX) { tx = this.player.x + ((tx - this.player.x) / d) * MAX; tz = this.player.z + ((tz - this.player.z) / d) * MAX; }
    if (this.walkMeditation) this.endWalkMeditation(false);
    if (this.player.walkTo(tx, tz)) { this.walkingTo = 'there'; this.showMarker(tx, tz); }
  }

  raycastScreen(x, y) {
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.engine.camera);
    this.ray.far = 120;
    if (!this.rayTargets) {
      this.rayTargets = [];
      this.engine.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position?.count > 3 && !o.material?.transparent) this.rayTargets.push(o); });
    }
    const hits = this.ray.intersectObjects(this.rayTargets, false);
    return hits[0] || null;
  }

  makeMarker() {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0, depthWrite: false }));
    this.engine.scene.add(m);
    return m;
  }

  showMarker(x, z) {
    this.marker.position.set(x, groundAt(x, z) + 0.06, z);
    this.marker.material.opacity = 0.9;
    this.markerT = 0;
  }

  toggleCamera(on = !this.vf.active) {
    if (on && this.mode !== 'explore') return;
    if (on) {
      this.thoughtView.hideNow(); // thoughts never appear in the viewfinder
      this.mode = 'camera';
      this.player.stop();
      this.hud.show(false);
      this.vf.updateInfo(game.s.roll.shots);
      this.vf.open(game.flag('prompt'));
      this.updateFov();
      audio.page();
    } else {
      this.vf.close();
      this.mode = 'explore';
      this.updateFov();
      this.hud.show(true);
      this.hud.cameraBtn.focus();
    }
  }

  photoThings() {
    const things = [];
    for (const it of this.world.interactables) {
      if (it.kind === 'go' || (it.visible && !it.visible(this.cond))) continue;
      const p = this.itemPos(it);
      things.push({ ...p, label: it.label.charAt(0).toLowerCase() + it.label.slice(1), r: 0.8 });
    }
    const roleLabel = { 'walking line': 'the walking meditation line', sweeping: 'someone sweeping the path', sitting: 'people sitting in the hall', tea: 'tea on the terrace', 'working in the orchard': 'someone working in the orchard', reading: 'someone reading by the pond', 'Sister Hien': 'Sister Hien' };
    for (const p of this.world.people.list) {
      const f = p.fig.position;
      things.push({ x: f.x, y: f.y + 1, z: f.z, label: roleLabel[p.role] || 'someone', r: 0.7 });
    }
    for (const a of this.world.animals.list) {
      if (!a.obj.visible) continue;
      const o = a.obj.position;
      things.push({ x: o.x, y: o.y + (a.kind === 'koi' ? 0 : 0.5), z: o.z, label: a.label, r: a.kind === 'bird' ? 0.5 : a.kind === 'koi' ? 0.48 : a.kind === 'squirrel' ? 0.25 : 0.7, range: a.kind === 'bird' ? 120 : 40 });
    }
    return things;
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
    const W = innerWidth, H = innerHeight;
    const frame = this.vf.rect;
    const cond = this.cond;
    const cam = this.engine.camera;
    const subjects = subjectsInFrame({ camera: cam, W, H, frame, things: this.photoThings(), raycastBlockers: this.rayTargets || [] });
    try {
      const { full, small } = await exposeFrame({
        renderer: this.engine.renderer, scene: this.engine.scene, camera: cam, W, H, frame,
        focus: this.vf.focus, photoW: this.engine.tier.photoW, portrait: this.vf.portrait,
      });
      const shot = game.s.roll.shots + 1;
      const meta = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        day: cond.day, time: cond.time, weather: cond.weather, season: cond.season, place: this.zone?.id || 'valley',
        roll: game.s.roll.id, frame: shot, subjects, prompt: game.flag('prompt') || null,
        developed: !!settings.get('instantReview'), created: Date.now(),
      };
      await photos.add(meta, full, small);
      game.set({ roll: { ...game.s.roll, shots: shot } });
      audio.advance();
      this.vf.updateInfo(shot);
      if (subjects.length) this.hud.caption(`— ${subjects[0]}`);
      const m = this.moment;
      if (m.photoDay !== cond.day) { m.photoDay = cond.day; m.photosToday = 0; }
      m.photosToday++;
      this.thoughts.event('photo', 5); // may arise a little after you lower the camera
    } catch (err) {
      console.error(err);
      this.hud.whisper('The shutter stuck for a moment. Try again.');
    }
    this._exposing = false;
  }

  // --- panels -------------------------------------------------------------------------------

  watchPanels(prev) {
    const obs = new MutationObserver(() => {
      if (!this.ui.querySelector('.panel-wrap')) {
        obs.disconnect();
        if (this.mode === 'panel') this.mode = prev === 'camera' || prev === 'panel' || prev === 'dialog' ? 'explore' : prev;
        this.hud.show(this.mode === 'explore');
      }
    });
    obs.observe(this.ui, { childList: true });
    return obs;
  }

  async openAlbum(highlight) {
    if (this.mode === 'title' || this.mode === 'loading') return;
    const prev = this.mode;
    if (this.vf.active) this.toggleCamera(false);
    this.mode = 'panel';
    this.hud.show(false);
    await openAlbum(this.ui, { highlight });
    this.watchPanels(prev === 'camera' ? 'explore' : prev);
  }

  openMenu() {
    if (this.mode === 'title' || this.mode === 'loading' || this.ui.querySelector('.panel-wrap')) return;
    if (this.vf.active) this.toggleCamera(false);
    const prev = this.mode;
    this.mode = 'panel';
    this.hud.show(false);
    const obs = this.watchPanels(prev);
    openMenu(this.ui, {
      onSettings: () => openSettings(this.ui, () => { audio.init(); this.startMusic(); }),
      onAlbum: () => openAlbum(this.ui),
      onAbout: () => openAbout(this.ui),
      onTitle: () => {
        obs.disconnect();
        this.mode = 'title';
        this.hud.show(false);
        this.savePos();
        this.showTitle();
      },
      onNewStay: async () => {
        const ok = await confirmBox(this.ui, 'Begin a new stay?', 'Your progress will start again from the gate. Your photographs stay in the album.', 'Begin again');
        if (ok) {
          game.reset();
          game.set({ started: true });
          Object.assign(this.player, { x: START.x, z: START.z, yaw: START.yaw });
          this.player.stop();
          this.world.setConditions(this.cond);
          this.zone = null;
          this.mode = 'explore';
          this.hud.show(true);
        }
      },
    });
  }

  key(k, e) {
    if (this.mode === 'title' || this.mode === 'loading') return;
    if (this.ui.querySelector('.panel-wrap') || this.dialog.open) return;
    if (this.mode === 'breath') { if (k === 'escape' || k === 'enter' || k === ' ') this.endBreath(); return; }
    if (this.mode === 'camera') {
      if (k === ' ' || k === 'enter') { e.preventDefault(); this.shutter(); }
      else if (k === 'escape' || k === 'c') this.toggleCamera(false);
      else if (k === 'f') this.vf.cycleFocus();
      else if (k === '+' || k === '=') { this.vf.setZoom(this.vf.zoom + 0.25); this.updateFov(); }
      else if (k === '-' || k === '_') { this.vf.setZoom(this.vf.zoom - 0.25); this.updateFov(); }
      return;
    }
    if (this.mode !== 'explore') return;
    if (k === 'escape' && this.player.route) { this.stopWalking(); return; }
    if (k === 'c') this.toggleCamera(true);
    else if (k === 'escape') this.openMenu();
    else if (k === 'p') this.openAlbum();
    else if (k === 'e' || (k === 'enter' && e.target === document.body)) {
      if (this.nearest) this.use(this.nearest);
    }
  }

  savePos() {
    game.s.pos = { x: this.player.x, z: this.player.z, yaw: this.player.yaw };
    game.s.zone = this.zone?.id || 'valley';
    game.save();
  }

  // --- every frame --------------------------------------------------------------------------

  loop() {
    let last = performance.now();
    const frame = (now) => {
      const raw = (now - last) / 1000;
      const dt = Math.min(0.1, raw);
      last = now;
      if (!document.hidden) this.frame(dt, raw);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Quietly lower the visual cost if frames are consistently slow. */
  watchPerformance(rawDt) {
    if (this.mode !== 'explore' || settings.get('quality') !== 'auto') return;
    this._perf = this._perf || { samples: [], step: 0, cool: 0 };
    const p = this._perf;
    if (p.cool > 0) { p.cool -= rawDt; return; }
    p.samples.push(rawDt);
    if (p.samples.length < 90) return;
    const sorted = [...p.samples].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    p.samples = [];
    if (median < 0.04) return;
    const eng = this.engine;
    if (p.step === 0 && eng.tier.pixelRatio > 1) { eng.tier = { ...eng.tier, pixelRatio: 1 }; }
    else if (p.step <= 1 && eng.renderer.shadowMap.enabled) {
      eng.renderer.shadowMap.enabled = false;
      eng.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    } else return;
    p.step++;
    p.cool = 3;
  }

  frame(dt, rawDt = dt) {
    // The opening is a still illustration. Avoid rendering the hidden 3D world
    // behind it, especially on phones and for reduced-motion preferences.
    if (this.mode === 'title') return;
    this.watchPerformance(rawDt);
    this.t += dt;
    const reduced = settings.reducedMotion;
    const eng = this.engine;
    const px = this.player;
    // ease the world's pause for the bell
    const target = this.breathTarget || 0;
    this.world.pause += (target - this.world.pause) * Math.min(1, dt * 1.5);
    px.pause = this.mode === 'breath' ? 1 : this.world.pause * 0.6;

    const inp = this.input.step(dt);
    if (inp.dx || inp.dy) this.look(inp.dx, inp.dy);
    const canWalk = this.mode === 'explore';
    px.update(dt, { f: canWalk ? inp.f : 0, s: canWalk ? inp.s : 0, userLooking: this.input.dragging, autoTurn: settings.get('autoTurn'), reduced });
    eng.resize(innerWidth, innerHeight, Math.min(window.devicePixelRatio || 1, eng.tier.pixelRatio));
    px.applyTo(eng.camera);
    this.world.reducedMotion = reduced;
    this.world.update(dt, px);
    this.bells.update(dt, this.mode === 'explore');

    // tap marker fades out
    if (this.marker.material.opacity > 0) {
      this.markerT += dt;
      this.marker.material.opacity = Math.max(0, 0.9 - this.markerT * 0.6);
      if (!px.route) this.marker.material.opacity *= 0.9;
    }

    // zones (place names, descriptions, story events)
    this._acc.zone += dt;
    if (this._acc.zone > 0.3) {
      this._acc.zone = 0;
      const z = zoneAt(px.x, px.z);
      if (z !== this.zone) {
        const wasInterior = !!this.zone?.interior;
        this.zone = z;
        if (!!z.interior !== wasInterior) this.world.setInterior(!!z.interior);
        if (this.mode !== 'title') {
          this.hud.setPlace(z.name, `Day ${game.s.day} · ${TIME_LABELS[game.s.time]}`);
          this.hud.announce(`${z.name}.`);
          onEnterZone(z.id, this.api());
        }
      }
    }

    // sound follows where you are
    this._acc.audio += dt;
    if (this._acc.audio > 0.6 && audio.ctx) {
      this._acc.audio = 0;
      const sd = polyDist(STREAM, px.x, px.z);
      const pd = pondDist(px.x, px.z);
      const interior = !!this.zone?.interior;
      const elev = Math.max(0, Math.min(1, (px.y - 2) / 20));
      const forest = Math.min(1, Math.max(0, (Math.abs(px.x) - 10) / 20) + Math.max(0, (-px.z - 25) / 30));
      const profile = {
        wind: interior ? 0.15 : 0.35 + elev * 0.65,
        leaves: interior ? 0.1 : 0.3 + forest * 0.6,
        stream: Math.max(0, 1 - sd / 22) * (interior ? 0.2 : 1),
        trickle: Math.max(0, 1 - pd / 2.2) * 0.4,
        birds: interior ? 0.3 : 1,
        frogs: Math.max(0, 1 - (pd - 1) / 3),
        room: interior ? 1 : 0,
        muffled: interior,
        forest: interior ? 0 : forest,
      };
      audio.setScene(profile, this.world.audioEnv?.() || { daylight: this.world.atm.daylight, rain: this.world.atm.rain, wind: this.world.atm.wind, night: game.s.time >= 3 || game.s.time === 0, time: game.s.time });
      // stereo position of the stream relative to where you face
      let best = null, bd = Infinity;
      for (const [x, z] of STREAM) { const d = Math.hypot(x - px.x, z - px.z); if (d < bd) { bd = d; best = [x, z]; } }
      const ang = Math.atan2(-(best[0] - px.x), -(best[1] - px.z)) - px.yaw;
      audio.setStreamPan(-Math.sin(ang));
    }

    // save position now and then
    this._acc.save += dt;
    if (this._acc.save > 3 && this.mode === 'explore') { this._acc.save = 0; this.savePos(); }

    this.updateThoughts(dt);

    // leaving the walking meditation any other way (a tap, the keys) ends it gently
    if (this.walkMeditation && !px.route) this.endWalkMeditation(false);
    if (this.walkMeditation && px.route && px.speed > 0.5) this.endWalkMeditation(false);

    // the "walking…" banner with a Stop button
    const walking = !!px.route && this.mode === 'explore';
    if (!walking && this.walkingTo) this.walkingTo = null;
    this.hud.setWalking(walking ? this.walkingTo || 'there' : null);

    eng.render();
    if (this.mode === 'explore') this.layoutIcons();
    else if (this.hud.icons.size && this.mode !== 'dialog') this.hud.layout([], null);
  }

  /** Describe this moment to the thought stream, and let it decide. */
  updateThoughts(dt) {
    const m = this.moment, px = this.player;
    const exploring = this.mode === 'explore' && !this.vf.active && !this.dialog.open;
    if (!exploring && this.thoughtView.visible) this.thoughtView.hideNow();
    this.thoughtView.update(dt);
    // who is near (checked twice a second)
    this._acc.people = (this._acc.people || 0) + dt;
    if (this._acc.people > 0.5) {
      this._acc.people = 0;
      const people = this.world.people.list;
      m.peopleNear = people.filter((p) => Math.hypot(p.fig.position.x - px.x, p.fig.position.z - px.z) < 10).length;
      m.reader = people.find((p) => p.role === 'reading') || null;
      m.readerNear = !!m.reader && Math.hypot(m.reader.fig.position.x - px.x, m.reader.fig.position.z - px.z) < 25;
    }
    const zone = this.zone?.id || 'valley';
    m.teaFor = zone === 'tea' && !px.route ? m.teaFor + dt : zone === 'tea' ? m.teaFor : 0;
    // warmth, later, while walking alone
    const alone = m.peopleNear === 0 && zone !== 'tea' && px.moving;
    if (alone && m.hienAt != null && this.t - m.hienAt > 60 && !m.sentAlone.hien) { m.sentAlone.hien = true; this.thoughts.event('aloneAfterHien', 0); }
    if (alone && m.noteAt != null && this.t - m.noteAt > 45 && !m.sentAlone.note) { m.sentAlone.note = true; this.thoughts.event('aloneAfterNote', 0); }
    // rare visitors: a startle at the snake, a wish to share the hawk; their voices
    for (const a of this.world.animals.list) {
      if (!a.obj.visible) continue;
      const d = Math.hypot(a.obj.position.x - px.x, a.obj.position.z - px.z);
      if (a.kind === 'snake' && d < 7 && !a.noticed) { a.noticed = true; this.thoughts.event('snake', 1); }
      if (a.kind === 'hawk') {
        a.seenFor = (a.seenFor || 0) + dt;
        if (a.seenFor > 25 && !a.noticed && !this.zone?.interior) { a.noticed = true; this.thoughts.event('hawk', 1); }
        a.cry = (a.cry ?? 20) - dt;
        if (a.cry <= 0) { a.cry = 35 + Math.random() * 50; audio.hawk?.(); }
      }
      if (a.kind === 'owlFly' && !a.hooted && Math.abs(a.obj.position.x) < 40) { a.hooted = true; audio.owlHoot?.(); }
    }
    this.thoughts.update(dt, {
      canShow: exploring && !this.thoughtView.visible,
      zone, time: game.s.time, weather: game.s.weather, flags: game.s.flags,
      moving: px.moving, inTeaFor: m.teaFor, peopleNear: m.peopleNear, readerNear: m.readerNear,
      photosToday: m.photosToday, rollLeft: ROLL_SIZE - game.s.roll.shots,
    });
  }

  /** What a response opens up. Letting go never costs anything. */
  onThought(t, id) {
    const px = this.player;
    if (id === 'stay') {
      // a quieter moment to feel it; nothing to fix
      audio.setDuck(0.7);
      setTimeout(() => audio.setDuck(1), 9000);
      return;
    }
    if (id !== 'linger') return;
    audio.setDuck(0.6);
    setTimeout(() => audio.setDuck(1), 12000);
    if (t.effect === 'pond') {
      // turn gently toward the water to enjoy it
      const pd = Math.hypot(POND.x - px.x, POND.z - px.z);
      if (pd < 45 && !this.input.dragging) px.lookTarget = Math.atan2(-(POND.x - px.x), -(POND.z - px.z));
    } else if (t.effect === 'reader' && this.moment.reader) {
      const f = this.moment.reader.fig.position;
      this.extraItems.push({ id: 'reader', kind: 'talk', label: 'The person on the bench', x: f.x, z: f.z, y: f.y + 1.7, script: 'reader', until: this.t + 240, range: 30 });
    } else if (t.effect === 'thankHien') {
      game.setFlag('wantThankHien');
    }
  }

  layoutIcons() {
    const cam = this.engine.camera;
    const px = this.player;
    const cond = this.cond;
    const insideNow = !!this.zone?.interior;
    const v = new THREE.Vector3();
    const items = [];
    const near = [];
    const animalIcon = { deer: 1.9, fox: 1.0, rabbit: 0.7, owl: 0.6, hawk: 0, snake: 0.45 };
    const animalLabel = { deer: 'Deer', fox: 'A fox', rabbit: 'A rabbit', owl: 'An owl', hawk: 'A hawk, circling', snake: 'A snake on the path' };
    const animalItems = [];
    for (const a of this.world.animals.list) {
      if (!a.lookable || !a.obj.visible) continue;
      if (Math.hypot(a.obj.position.x - px.x, a.obj.position.z - px.z) > (a.kind === 'hawk' ? 90 : 22)) continue;
      if (animalItems.some((i) => i.akind === a.kind)) continue; // one icon per kind
      animalItems.push({ id: `animal-${a.kind}`, akind: a.kind, kind: 'look', label: animalLabel[a.kind], dynamic: () => a.obj, iconY: animalIcon[a.kind], script: `animal_${a.kind}`, range: a.kind === 'hawk' ? 90 : undefined });
    }
    this.extraItems = this.extraItems.filter((x) => !x.until || x.until > this.t);
    for (const it of [...this.world.interactables, ...animalItems, ...this.extraItems]) {
      if (it.visible && !it.visible(cond)) continue;
      const p = this.itemPos(it);
      const d = Math.hypot(p.x - px.x, p.z - px.z);
      if (d > (it.range || (it.akind ? 22 : 16))) continue;
      // things inside a building only show from inside (and vice versa), except doorways
      const itInside = ['cushion', 'altar', 'bowlBell', 'callig', 'futon', 'desk', 'smallBell', 'note', 'darkroom'].includes(it.id);
      const isDoor = it.id === 'hallDoor' || it.id === 'hutDoor';
      if (isDoor ? insideNow : itInside !== insideNow) continue;
      if (d < 7 || (it.range && d < it.range)) near.push({ it, d: it.range ? Math.min(d, 6.9) : d });
      v.set(p.x, p.y, p.z).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      items.push({ it, x: (v.x * 0.5 + 0.5) * innerWidth, y: (1 - (v.y * 0.5 + 0.5)) * innerHeight, dist: d });
    }
    near.sort((a, b) => a.d - b.d);
    this.nearest = near[0]?.it || null;
    this.hud.layout(items, this.nearest);
    this.hud.setNearby(near.map((n) => n.it));
  }
}

const g = new Game();
g.boot();
window.__game = g;
void KINDS;
