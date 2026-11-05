// Builds the whole valley and keeps it in step with time, weather and story.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { buildTerrain, groundAt, heightAt } from './terrain.js';
import { paint } from './materials.js';
import { buildFoliage } from './foliage.js';
import { buildWater, updateWater } from './water.js';
import { buildAll, updateGlow, calligraphy } from './buildings.js';
import { Nav } from './nav.js';
import { People } from './people.js';
import { Animals } from './animals.js';
import { Changing } from './changing.js';
import { buildInteractables } from './interactables.js';
import { colorize, merge, jitter } from './geo.js';
import { atmosphere } from '../world/atmosphere.js';
import { TIMES } from '../core/state.js';
import { Rng } from '../core/rng.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

function signpost(x, z, text) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(colorize(new THREE.BoxGeometry(0.1, 1.5, 0.1).translate(0, 0.75, 0), '#5a4334'), paint({}));
  const boardMat = new THREE.MeshToonMaterial({ map: calligraphy(text, { w: 420, h: 96, paper: '#cbb48a' }), side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.22), boardMat);
  board.position.set(0.4, 1.32, 0);
  g.add(post, board);
  g.position.set(x, groundAt(x, z), z);
  return g;
}

function mistBanks() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5, fog: true });
  const group = new THREE.Group();
  const rng = new Rng('mist');
  for (let i = 0; i < 28; i++) {
    const s = new THREE.Sprite(mat);
    const x = rng.pick([-1, 1]) * rng.range(35, 85), z = rng.range(-85, 15);
    s.position.set(x, heightAt(x, z) + rng.range(1.5, 5), z);
    s.scale.set(rng.range(18, 36), rng.range(5, 9), 1);
    s.userData.drift = rng.range(0.2, 0.6);
    group.add(s);
  }
  group.userData.mat = mat;
  return group;
}

function rainStreaks(n) {
  const pos = new Float32Array(n * 6);
  const rng = new Rng('rain');
  for (let i = 0; i < n; i++) {
    const x = rng.range(-15, 15), y = rng.range(-4, 12), z = rng.range(-15, 15);
    pos.set([x, y, z, x + 0.03, y - 0.45, z + 0.02], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc8d2d8, transparent: true, opacity: 0.32, depthWrite: false }));
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

export class World {
  constructor(canvas, tierName) {
    this.engine = new Engine(canvas, tierName);
    this.t = 0;
    this.pause = 0;
  }

  async build(onProgress = () => {}) {
    const e = this.engine;
    onProgress(0.1, 'Shaping the valley');
    await tick();
    const terrain = new THREE.Mesh(buildTerrain(e.tierName), paint({}));
    terrain.receiveShadow = true;
    e.scene.add(terrain);
    onProgress(0.3, 'Planting trees');
    await tick();
    const fol = buildFoliage(e.tier);
    e.scene.add(fol.group);
    onProgress(0.55, 'Filling the pond');
    await tick();
    this.water = buildWater();
    e.scene.add(this.water);
    onProgress(0.65, 'Raising the halls');
    await tick();
    this.built = buildAll();
    e.scene.add(this.built.group);
    // phrase stone at the gate
    const st = new THREE.Mesh(jitter(colorize(new THREE.DodecahedronGeometry(0.8, 1).scale(1.1, 0.75, 0.6), '#8f8a7e'), 0.2, 1.5, 3), paint({}));
    st.position.set(3.6, heightAt(3.6, -64.5) + 0.35, -64.5);
    st.rotation.y = -0.5;
    st.castShadow = true;
    e.scene.add(st);
    const stText = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshToonMaterial({ map: calligraphy('Here is a good place to begin', { w: 512, h: 160, paper: '#9a958a', ink: '#1f1c1a' }) }));
    stText.position.set(3.6 - Math.sin(-0.5) * 0.0 - 0.2, heightAt(3.6, -64.5) + 0.62, -64.5 + 0.47);
    stText.rotation.y = -0.5;
    e.scene.add(stText);
    // the tea bowl on the terrace wall (or wherever the story put it)
    this.bowl = new THREE.Mesh(merge([
      colorize(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).rotateX(Math.PI).translate(0, 0.1, 0), '#7a563e'),
      colorize(new THREE.ConeGeometry(0.03, 0.04, 3).translate(0.16, 0.02, 0.05), '#7a563e'),
    ]), paint({ side: THREE.DoubleSide }));
    e.scene.add(this.bowl);
    onProgress(0.75, 'Finding the paths');
    await tick();
    this.nav = new Nav(this.built.colliders, fol.obstacles);
    this.people = new People(e.scene, this.built);
    this.changing = new Changing(e.scene, this.built);
    this.animals = new Animals(e.scene);
    this.interactables = buildInteractables(this.built, this.people);
    for (const it of this.interactables) {
      if (it.kind === 'go' && it.id.startsWith('sign')) e.scene.add(signpost(it.x - 0.3, it.z, it.label.replace(/^(To|Up to|Back to|Back up to|Down to) /, '→ ')));
    }
    this.mist = mistBanks();
    e.scene.add(this.mist);
    this.rain = rainStreaks(e.tierName === 'low' ? 500 : 1300);
    e.scene.add(this.rain);
    onProgress(1, 'Arriving');
  }

  /** Apply time + weather + story state to the whole world. */
  setConditions(cond, interior = false) {
    this.cond = cond;
    const timeName = TIMES[cond.time];
    this.atm = atmosphere(timeName, cond.weather, interior);
    this.engine.applyAtmosphere(this.atm, timeName, cond.weather, interior);
    updateGlow(this.built, this.atm, timeName);
    updateWater(this.water, this.atm, this.engine.sunDir, this.t, 1);
    // the cooks are at work before breakfast, lunch and dinner
    this.built.tea.setCooking(cond.time <= 2);
    this.people.arrange(cond.time, cond.weather);
    this.animals.arrange(cond.time, cond.weather, cond.day);
    const mm = this.mist.userData.mat;
    mm.opacity = Math.min(0.36, this.atm.mist * 0.34 + (cond.weather === 'mist' ? 0.05 : 0));
    mm.color.setRGB(...this.atm.fog, THREE.SRGBColorSpace);
    this.rain.visible = this.atm.rain > 0;
    this.placeBowl(cond.flags, cond.day);
    this.changing.update(cond);
  }

  /** Lighter-weight refresh when only interior/exterior changes. */
  setInterior(interior) {
    if (!this.cond) return;
    const timeName = TIMES[this.cond.time];
    this.atm = atmosphere(timeName, this.cond.weather, interior);
    this.engine.applyAtmosphere(this.atm, timeName, this.cond.weather, interior);
  }

  /** Is the bowl back, mended, a couple of days after it was broken? */
  static bowlMended(flags, day) {
    return !!flags.bowl && day >= (flags.bowlDay ?? 99) + 2;
  }

  placeBowl(flags, day = this.cond?.day ?? 1) {
    const tea = this.built.tea.spots;
    const b = flags.bowl;
    let spot = null;
    const mended = World.bowlMended(flags, day);
    if (mended) spot = { ...tea.table2, y: groundAt(tea.table2.x, tea.table2.z) + 0.78 };
    else if (!b || (b === 'left' && !flags.bowlTaken)) spot = { ...tea.wall, y: groundAt(tea.wall.x, tea.wall.z) + 0.6 };
    else if (b === 'table' && !flags.bowlCollected) spot = { ...tea.table2, y: groundAt(tea.table2.x, tea.table2.z) + 0.78 };
    this.bowl.visible = !!spot;
    if (spot) this.bowl.position.set(spot.x, spot.y, spot.z);
    // the mend: a thin bright seam where the piece was set back
    if (!this.seam) {
      this.seam = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.006, 4, 16, 0.9), new THREE.MeshBasicMaterial({ color: 0xd9b45a }));
      this.seam.rotation.set(Math.PI / 2, 0, 0.2);
      this.seam.position.y = 0.1;
      this.bowl.add(this.seam);
    }
    this.seam.visible = mended;
  }

  /** Re-show story-driven things after a script changes something. */
  refresh() {
    if (!this.cond) return;
    this.placeBowl(this.cond.flags, this.cond.day);
    this.changing.update(this.cond);
  }

  update(dt, player) {
    this.t += dt;
    const e = this.engine;
    e.tick(this.t);
    this.built.tea.update(dt, this.t);
    this.people.update(dt, this.t, this.pause);
    this.animals.update(dt, this.t, player, this.pause);
    updateWater(this.water, this.atm, e.sunDir, this.t, 1);
    for (const s of this.mist.children) {
      s.position.x += s.userData.drift * dt * 0.4;
      if (s.position.x > 75) s.position.x = -75;
    }
    if (this.rain.visible) {
      const pos = this.rain.geometry.attributes.position;
      const fall = dt * (this.reducedMotion ? 4 : 11);
      for (let i = 0; i < pos.count; i += 2) {
        let x = pos.getX(i), y = pos.getY(i) - fall, z = pos.getZ(i);
        // keep the rain box centred on the player
        if (x - player.x > 15) x -= 30; else if (player.x - x > 15) x += 30;
        if (z - player.z > 15) z -= 30; else if (player.z - z > 15) z += 30;
        if (y < player.y - 4) y += 16;
        pos.setXYZ(i, x, y, z);
        pos.setXYZ(i + 1, x + 0.03, y - 0.45, z + 0.02);
      }
      pos.needsUpdate = true;
    }
    e.followShadow(player.x, player.y, player.z);
  }
}
