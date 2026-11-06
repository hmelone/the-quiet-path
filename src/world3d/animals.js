// Ordinary wildlife: deer at the forest edge, a heron, koi, a sleeping cat,
// orchard squirrels, small birds overhead and fireflies on warm evenings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../core/rng.js';
import { colorize } from './geo.js';
import { paint } from './materials.js';
import { groundAt } from './terrain.js';
import { POND, WATER_Y, pondDist, BUILDINGS, PADS } from './layout.js';
import { inBuilding, onBridge } from './terrain.js';

import { deerGeo, deerHeadGeo, heronGeo, catGeo, squirrelGeo, koiGeo, koiTailGeo, rabbitGeo, foxGeo, owlGeo, smallBirdGeo } from './animal-models.js';

function butterflyGeo() {
  const g = new THREE.BufferGeometry();
  // two wings hinged along the body (x axis); flapping is done by scaling z
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0.05, 0, 0, -0.05, 0, 0, 0.02, 0.01, 0.09,
    0.05, 0, 0, 0.02, 0.01, 0.09, 0.07, 0.0, 0.07,
    0.05, 0, 0, -0.05, 0, 0, 0.02, 0.01, -0.09,
    0.05, 0, 0, 0.02, 0.01, -0.09, 0.07, 0.0, -0.07,
  ], 3));
  g.computeVertexNormals();
  return colorize(g, '#ffffff');
}

/** A snake resting in an easy S-curve: olive-brown with darker bands. */
function snakeGeo() {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector3(-0.75 + t * 1.5, 0.035, Math.sin(t * Math.PI * 2.2) * 0.16 * (0.4 + t * 0.6)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 60, 0.035, 8, false);
  // taper toward the tail
  const pos = tube.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 9) / 60;
    curve.getPoint(Math.min(1, seg), c);
    const k = 0.35 + 0.65 * Math.min(1, seg * 1.6);
    pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * k, c.y + (pos.getY(i) - c.y) * k, c.z + (pos.getZ(i) - c.z) * k);
  }
  tube.computeVertexNormals();
  const body = colorize(tube, (x) => new THREE.Color(Math.sin(x * 22) > 0.55 ? '#4a4128' : '#7a6e44'));
  const head = new THREE.SphereGeometry(0.05, 10, 8).scale(1.5, 0.7, 1.05).translate(0.78, 0.035, 0);
  return mergeGeometries([body.index ? body.toNonIndexed() : body, colorize(head, '#5e5434').toNonIndexed()]);
}

/** A hawk soaring: broad wings, fanned tail, pale underside. */
function hawkGeo() {
  const g = new THREE.BufferGeometry();
  const v = [
    // left wing, right wing (broad, slightly swept), tail fan
    0.15, 0, 0, -0.2, 0, 0, -0.05, 0.02, 0.62,
    0.15, 0, 0, -0.05, 0.02, 0.62, 0.12, 0.03, 0.55,
    0.15, 0, 0, -0.05, 0.02, -0.62, -0.2, 0, 0,
    0.15, 0, 0, 0.12, 0.03, -0.55, -0.05, 0.02, -0.62,
    -0.2, 0, 0, -0.5, 0, 0.13, -0.5, 0, -0.13,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  const wings = colorize(g, (x, y, z) => new THREE.Color(Math.abs(z) > 0.45 ? '#3a2c22' : '#7a5a3e'));
  const body = colorize(new THREE.SphereGeometry(0.09, 8, 6).scale(2.4, 0.8, 1).toNonIndexed(), '#6a4c34');
  return mergeGeometries([wings, body]);
}

function birdGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.18, 0.05, 0.25, 0.04, 0, 0, 0, 0, 0, 0.04, 0, 0, -0.18, 0.05, -0.25], 3));
  g.computeVertexNormals();
  return colorize(g, '#2e2a26');
}

// Rotate the sculpted limbs around their hips/shoulders inside one draw call.
// Phase follows actual movement and the same bell slowdown as the animal.
function walk(a, dt, go, moving, rate, stride) {
  const mesh = a.obj.isMesh ? a.obj : a.obj.children[0];
  const g = mesh.geometry, rig = g.userData.walk;
  if (!rig) return;
  a.walkPhase ??= a.x * 0.73;
  a.walkAmount ??= 0;
  if (moving) a.walkPhase += dt * go * rate * Math.PI * 2;
  a.walkAmount += ((moving ? stride : 0) - a.walkAmount) * Math.min(1, dt * go * 9);
  if (a.walkAmount < 0.0001) {
    if (!a.wasWalking) return;
    a.walkAmount = 0;
  }
  a.wasWalking = a.walkAmount > 0;
  const p = g.attributes.position, n = g.attributes.normal;
  for (const limb of rig.limbs) {
    const angle = Math.sin(a.walkPhase + limb.phase) * a.walkAmount;
    const c = Math.cos(angle), s = Math.sin(angle), [px, py] = limb.pivot;
    for (let v = limb.start; v < limb.start + limb.count; v++) {
      const i = v * 3, x = rig.rest[i] - px, y = rig.rest[i + 1] - py;
      p.setXYZ(v, px + x * c - y * s, py + x * s + y * c, rig.rest[i + 2]);
      const nx = rig.normals[i], ny = rig.normals[i + 1];
      n.setXYZ(v, nx * c - ny * s, nx * s + ny * c, rig.normals[i + 2]);
    }
  }
  p.needsUpdate = true; n.needsUpdate = true;
}

const LAND = new Set(['deer', 'fox', 'rabbit', 'squirrel', 'groundBird', 'cat', 'snake', 'snail']);
/** Dry ground that isn't the pond, the stream bridge or inside a building. */
export function landOk(x, z) {
  if (pondDist(x, z) < 1.18 && !onBridge(x, z)) return false;
  for (const b of Object.values(BUILDINGS)) if (inBuilding(b, x, z, 0.3)) return false;
  return true;
}


// --- small pond and path life: frogs, tiny snails, turtles -----------------------------
// Built facing -Z, then turned to face +X like the other animals here.
const ell = (r, sx, sy, sz, x, y, z, col, seg = 10) => colorize(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)).scale(sx, sy, sz).translate(x, y, z), col);
function faceX(g) { g.rotateY(-Math.PI / 2); return g; }

/** A small pond frog, about 12 cm: squat body, bright eyes, folded hind legs. */
function frogGeo(seed = 0) {
  const top = ['#5f8a3c', '#6b8f45', '#4f7a3a', '#7a8a4a'][seed % 4];
  const parts = [
    ell(0.05, 1, 0.55, 1.35, 0, 0.032, 0.005, top, 12),            // body
    ell(0.045, 0.95, 0.35, 1.2, 0, 0.022, 0.01, '#d6d29a', 10),     // pale belly
    ell(0.034, 1.15, 0.7, 1, 0, 0.045, -0.06, top, 10),             // head
  ];
  for (const sx of [-1, 1]) {
    parts.push(ell(0.013, 1, 1, 1, sx * 0.022, 0.066, -0.066, '#c9b25a', 8));  // golden eye
    parts.push(ell(0.008, 1, 1, 1, sx * 0.025, 0.07, -0.073, '#1c1a14', 6));   // pupil
    parts.push(ell(0.022, 0.6, 0.5, 1.9, sx * 0.05, 0.022, 0.045, top, 8));    // folded thigh
    parts.push(ell(0.016, 0.5, 0.35, 1.8, sx * 0.055, 0.008, 0.005, top, 8));  // lower leg
    parts.push(ell(0.012, 0.9, 0.3, 1.4, sx * 0.06, 0.004, -0.03, '#4a6a32', 6)); // foot
    parts.push(ell(0.01, 0.6, 1.4, 0.6, sx * 0.03, 0.012, -0.06, top, 6));     // front leg
  }
  for (let i = 0; i < 5; i++) parts.push(ell(0.007, 1, 0.4, 1, Math.sin(i * 2.3) * 0.025, 0.055, 0.03 - i * 0.012, '#3e5f2c', 5)); // spots
  return faceX(mergeGeometries(parts));
}

/** A tiny garden snail, about 5 cm: a banded spiral shell on a soft foot. */
function snailGeo(seed = 0) {
  const shellCol = ['#a0703c', '#8a6a44', '#b38450'][seed % 3];
  const parts = [ell(0.012, 0.8, 0.45, 3.2, 0, 0.006, -0.005, '#b8a684', 8)]; // foot
  parts.push(ell(0.007, 1, 1, 1.4, 0, 0.013, -0.036, '#b0a07e', 6)); // head
  for (const sx of [-1, 1]) {
    parts.push(colorize(new THREE.CylinderGeometry(0.0015, 0.002, 0.016, 4).rotateX(-0.6).rotateZ(sx * 0.35).translate(sx * 0.004, 0.022, -0.042), '#9c8c6c'));
    parts.push(ell(0.0028, 1, 1, 1, sx * 0.007, 0.03, -0.047, '#5a4a38', 4));
  }
  // the shell: a spiral of shrinking spheres, banded
  for (let i = 0; i < 9; i++) {
    const a = i * 0.75, r = 0.016 * (1 - i * 0.085);
    const rad = 0.006 * (1 - i * 0.1);
    parts.push(ell(r, 0.75, 1, 1, Math.cos(a) * rad * 0.4, 0.024 + Math.sin(a) * rad + i * 0.0006, 0.006 + Math.cos(a) * rad, i % 2 ? shellCol : '#6e4a2a', 8));
  }
  return faceX(mergeGeometries(parts));
}

/** A pond turtle, about 30 cm: a domed, plated shell, head and four paddling legs. */
function turtleGeo() {
  const shell = colorize(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.85, 0.42, 1.15).translate(0, 0.035, 0),
    (x, y, z) => {
      // scutes: a dark seam pattern over olive-brown plates
      const seam = Math.abs(Math.sin(x * 34)) < 0.12 || Math.abs(Math.sin(z * 26 + Math.abs(x) * 6)) < 0.1;
      return new THREE.Color(seam ? '#2f3424' : (Math.sin(x * 13 + z * 9) > 0 ? '#5d5e36' : '#6b6a3e'));
    });
  const parts = [shell, colorize(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 16).scale(1, 1, 1.35).translate(0, 0.028, 0), '#b8a46a')];
  parts.push(ell(0.022, 0.9, 0.8, 2.2, 0, 0.035, -0.17, '#5a5f3a', 8));  // neck
  parts.push(ell(0.03, 1, 0.85, 1.25, 0, 0.042, -0.215, '#5f653e', 10)); // head
  for (const sx of [-1, 1]) {
    parts.push(ell(0.012, 1, 0.5, 1, sx * 0.03, 0.052, -0.235, '#e0b23a', 5)); // yellow cheek stripe
    parts.push(ell(0.006, 1, 1, 1, sx * 0.022, 0.056, -0.24, '#16140f', 5));
    for (const z of [-0.1, 0.11]) parts.push(ell(0.035, 1.3, 0.35, 0.8, sx * 0.12, 0.02, z, '#5a5f3a', 8)); // legs
  }
  parts.push(colorize(new THREE.ConeGeometry(0.015, 0.06, 6).rotateX(Math.PI / 2).translate(0, 0.03, 0.18), '#5a5f3a')); // tail
  return faceX(mergeGeometries(parts));
}

/** A flat, sun-warmed rock at the pond's edge, for a turtle to bask on. */
function baskRockGeo() {
  const g = new THREE.SphereGeometry(0.42, 12, 7).scale(1.2, 0.32, 0.9);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 + Math.sin(p.getX(i) * 9) * 0.15));
  g.computeVertexNormals();
  return colorize(g, (x, y, z) => new THREE.Color(y > 0.06 ? '#8f8a7c' : '#5c5a4e').multiplyScalar(0.9 + Math.sin(x * 21 + z * 17) * 0.08));
}

export class Animals {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rng = new Rng('animals');
    this.list = [];
    this.mat = paint({ side: THREE.DoubleSide });
    // fireflies: additive points
    const n = 40;
    const pos = new Float32Array(n * 3);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd8ff7a, size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.fireflies.frustumCulled = false;
    this.ffSeeds = Array.from({ length: n }, () => [this.rng.range(-8, 8), this.rng.range(-6, 6), this.rng.f() * 100]);
    scene.add(this.fireflies);
  }

  clear() {
    // A change of time/weather rebuilds wildlife; release the retired meshes.
    const geometries = new Set(), materials = new Set();
    this.group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material && o.material !== this.mat) materials.add(o.material);
    });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    this.group.clear(); this.list = [];
  }

  arrange(time, weather, day = 1) {
    this.clear();
    const rain = weather === 'rain';
    this.time = time;
    this.weather = weather;
    // deer at the forest edge, dawn and evening
    if (time === 0 || time === 3 || (time === 1 && weather === 'mist')) {
      for (const [x, z] of [[-28, -18], [-31, -14], [27, -6]]) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(deerGeo(), this.mat);
        const head = new THREE.Mesh(deerHeadGeo(), this.mat);
        head.position.set(0.48, 1.06, 0);
        body.castShadow = true;
        g.add(body, head);
        g.scale.setScalar(this.rng.range(0.9, 1.05));
        this.addAnimal(g, { kind: 'deer', label: 'deer at the forest edge', x, z, yaw: this.rng.f() * 6, head });
      }
    }
    // heron at the pond edge (not at night)
    if (time >= 1 && time <= 3) {
      const g = new THREE.Mesh(heronGeo(), this.mat);
      g.castShadow = true;
      const a = 2.2;
      this.addAnimal(g, { kind: 'heron', label: 'a heron at the pond', x: POND.x + Math.cos(a) * POND.rx * 1.02, z: POND.z + Math.sin(a) * POND.rz * 1.02, yaw: -1.2 });
    }
    // Fish weave from the reed shadows into open water, in every weather.
    const tailGeo = koiTailGeo();
    const finMat = paint({ side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(koiGeo(i), this.mat);
      const tail = new THREE.Mesh(tailGeo, finMat);
      tail.position.x = -0.31;
      g.add(body, tail);
      g.scale.setScalar(1.15 + (i % 3) * 0.12);
      this.addAnimal(g, { kind: 'koi', label: 'koi beneath the surface',
        x: POND.x, z: POND.z, seed: i * 1.79, speed: 0.07 + i * 0.007, tail });
    }
    // the cat, asleep on the hall veranda
    if (time >= 2 || time === 0) {
      const B = BUILDINGS.hall;
      const g = new THREE.Mesh(catGeo(), this.mat);
      this.addAnimal(g, { kind: 'cat', label: 'a cat asleep on the veranda', x: B.x + 4.2, z: B.z + B.d / 2 + 0.9, y: PADS.hall.h + B.floor, yaw: 0.4 });
    }
    // squirrels in the orchard
    if ((time === 1 || time === 2) && !rain) {
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Mesh(squirrelGeo(), this.mat);
        this.addAnimal(g, { kind: 'squirrel', label: 'a squirrel in the orchard', x: -30 + i * 4, z: 38 + i * 5, hopT: this.rng.f() * 5 });
      }
    }
    // small birds crossing the sky in daytime
    if (time >= 1 && time <= 3 && !rain) {
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Mesh(birdGeo(), new THREE.MeshBasicMaterial({ color: 0x2e2a26, side: THREE.DoubleSide }));
        this.addAnimal(g, { kind: 'bird', label: 'birds overhead', x: 0, z: 0, seed: i, flock: true });
      }
    }
    // --- the forest, made livelier ---
    const forestOk = !rain || this.rng.f() < 0.4;
    // more deer, including a fawn, in forest clearings (not at night)
    if (time <= 3 && forestOk) {
      const herd = time === 2 ? [[18, -44], [21, -41]] : [[-14, -55], [-17, -51], [-15, -48, 0.6], [19, -44], [22, -40]];
      for (const [x, z, sc] of herd) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(deerGeo(), this.mat);
        const head = new THREE.Mesh(deerHeadGeo(), this.mat);
        head.position.set(0.48, 1.06, 0);
        body.castShadow = true;
        g.add(body, head);
        g.scale.setScalar(sc || this.rng.range(0.9, 1.05));
        this.addAnimal(g, { kind: 'deer', label: sc ? 'a fawn among the cedars' : 'deer among the cedars', x, z, yaw: this.rng.f() * 6, head, lookable: true });
      }
    }
    // rabbits by the path edges at dawn, morning and evening
    if (time !== 2 && time !== 4 && !rain) {
      for (const [x, z] of [[5, -60], [-4, -46], [9, -36], [-7, -24], [12, -12], [-12, 22], [16, 30]]) {
        const g = new THREE.Mesh(rabbitGeo(), this.mat);
        this.addAnimal(g, { kind: 'rabbit', label: 'a rabbit by the path', x: x + this.rng.g(), z: z + this.rng.g(), yaw: this.rng.f() * 6, hopT: this.rng.f() * 4, lookable: true });
      }
    }
    // a fox trotting through the forest at dawn and dusk
    if ((time === 0 || time === 3) && !rain) {
      const g = new THREE.Mesh(foxGeo(), this.mat);
      g.castShadow = true;
      this.addAnimal(g, { kind: 'fox', label: 'a fox in the forest', x: -16, z: -44, yaw: 0, route: [[-16, -44], [-6, -50], [8, -47], [16, -38], [10, -30], [-4, -33]], leg: 0, lookable: true });
    }
    // an owl in the forest at night (and at dusk)
    if (time === 4 || time === 3) {
      const g = new THREE.Mesh(owlGeo(), this.mat);
      const x = 9.5, z = -48.5;
      this.addAnimal(g, { kind: 'owl', label: 'an owl on a branch', x, z, y: groundAt(x, z) + 3.8, yaw: Math.PI * 0.9, lookable: true });
    }
    // small birds pecking on the paths; they flutter up as you come close
    if ((time === 1 || time === 2) && !rain) {
      for (const [cx, cz] of [[3, -58], [-2, -36], [0, -4], [-6, 30], [-30, 46]]) {
        for (let i = 0; i < 3; i++) {
          const g = new THREE.Mesh(smallBirdGeo(), this.mat);
          const x = cx + this.rng.g() * 1.5, z = cz + this.rng.g() * 1.5;
          this.addAnimal(g, { kind: 'groundBird', label: 'small birds on the path', x, z, home: [x, z], yaw: this.rng.f() * 6, phase: this.rng.f() * 10 });
        }
      }
    }
    // butterflies over the meadows and clearings in fine weather
    if ((time === 1 || time === 2) && weather !== 'rain' && weather !== 'mist') {
      const cols = ['#f4f0e0', '#f2d24a', '#e8913a', '#8fb4e8', '#f4f0e0'];
      for (const [cx, cz] of [[2, -62], [-5, -30], [10, -6], [-10, 14], [18, 22], [-4, 44], [-30, 38]]) {
        for (let i = 0; i < 3; i++) {
          const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.rng.pick(cols)), side: THREE.DoubleSide });
          const g = new THREE.Mesh(butterflyGeo(), m);
          this.addAnimal(g, { kind: 'butterfly', label: 'butterflies over the grass', x: cx, z: cz, home: [cx, cz], phase: this.rng.f() * 50, y: groundAt(cx, cz) + 0.8 });
        }
      }
    }
    // squirrels in the forest too
    if ((time === 1 || time === 2 || time === 3) && !rain) {
      for (const [x, z] of [[-9, -58], [12, -50], [-11, -40]]) {
        const g = new THREE.Mesh(squirrelGeo(), this.mat);
        this.addAnimal(g, { kind: 'squirrel', label: 'a squirrel in the forest', x, z, hopT: this.rng.f() * 5 });
      }
    }
    // --- rare visitors: not every day, and the same for the same day and time ---
    const rare = new Rng(`rare-${day}-${time}`);
    if ((time === 1 || time === 2) && weather === 'clear' && rare.f() < 0.4) {
      const m = new THREE.Mesh(hawkGeo(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      this.addAnimal(m, { kind: 'hawk', label: 'a hawk circling overhead', x: 0, z: 0, y: 40, phase: rare.f() * 6, lookable: true, iconY: 0 });
    }
    if (time === 4 && !rain && rare.f() < 0.55) {
      const m = new THREE.Mesh(owlGeo(), this.mat);
      m.visible = false;
      this.addAnimal(m, { kind: 'owlFly', label: 'an owl gliding over the valley', x: -80, z: 0, y: 10, wait: 8 + rare.f() * 20 });
    }
    if ((time === 1 || time === 2) && weather !== 'rain' && rare.f() < (day >= 2 ? 0.25 : 0.12)) {
      const spots = [[-10.5, 18.8], [13.2, 26.6], [-29, 33.6], [6.6, -41.5]];
      const [x, z] = spots[Math.floor(rare.f() * spots.length)];
      const m = new THREE.Mesh(snakeGeo(), this.mat);
      this.addAnimal(m, { kind: 'snake', label: 'a snake resting on the warm stones', x, z, yaw: rare.f() * 6, lookable: true });
    }
    // --- small life: frogs from dawn to evening, tiny snails, and turtles on dry days ---
    const small = new Rng(`small-${day}-${time}`);
    const pads = (this.pads || []).filter((p) => pondDist(p.x, p.z) > 0.55 && !onBridge(p.x, p.z));
    const shoreAt = (ang, r) => this._shore(ang, r);
    if (time <= 3) {
      const nPad = rain ? 3 : 2, nShore = rain ? 3 : 2;
      for (let i = 0; i < nPad && pads.length; i++) {
        const pd = pads[Math.floor(small.f() * pads.length)];
        this.addAnimal(new THREE.Mesh(frogGeo(i), this.mat), { kind: 'frog', label: 'a frog on a lotus leaf', x: pd.x, z: pd.z, y: WATER_Y + 0.04, yaw: small.f() * 6, phase: small.f() * 9, lookable: true, grow: 1.3 });
      }
      for (let i = 0; i < nShore; i++) {
        const a = small.f() * Math.PI * 2;
        const [x, z] = shoreAt(a);
        if (onBridge(x, z)) continue;
        this.addAnimal(new THREE.Mesh(frogGeo(i + 2), this.mat), { kind: 'frog', label: 'a frog at the water’s edge', x, z, yaw: a + Math.PI, phase: small.f() * 9, lookable: true, grow: 1.3, shore: a, hopT: 6 + small.f() * 10 });
      }
    }
    if (time <= 3) {
      // more snails after rain, in mist, and in the cool of dawn and evening
      const damp = rain || weather === 'mist' || time === 0 || time === 3;
      const spots = [[17.6, 39.4, 0], [-23.0, 46.9, 0], [-7.2, 5.4, 0], [4.2, -10.6, 0], [-11.4, 31.5, 0], [21.6, 37.2, 0]];
      spots.forEach(([x, z, up], i) => {
        if (!damp && small.f() < 0.55) return;
        this.addAnimal(new THREE.Mesh(snailGeo(i), this.mat), { kind: 'snail', label: 'a tiny snail', x, z, y: groundAt(x, z) + up, up, home: [x, z], yaw: small.f() * 6, lookable: true, grow: 1.6 });
      });
    }
    if ((time === 1 || time === 2) && !rain) {
      // one basks on a warm rock at the pond's south-east edge; one paddles slowly
      const [rx, rz] = shoreAt(0.9, 0.97);
      const rock = new THREE.Mesh(baskRockGeo(), this.mat);
      this.addAnimal(rock, { kind: 'rock', x: rx, z: rz, y: WATER_Y - 0.06 });
      if (weather !== 'mist') this.addAnimal(new THREE.Mesh(turtleGeo(), this.mat), { kind: 'turtle', label: 'a turtle basking on a rock', x: rx, z: rz, y: WATER_Y + 0.07, yaw: 0.9 + Math.PI, lookable: true, bask: true });
      this.addAnimal(new THREE.Mesh(turtleGeo(), this.mat), { kind: 'turtle', label: 'a turtle swimming in the pond', x: POND.x, z: POND.z, y: WATER_Y - 0.075, lookable: true, swim: small.f() * 6 });
    }
    this.fireflies.visible = (time === 3 || time === 4) && !rain;
  }

  /** A point on the pond's edge at angle a (pondDist ≈ r). */
  _shore(a, r = 1.04) {
    let lo = 0, hi = 20;
    for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (pondDist(POND.x + Math.cos(a) * m, POND.z + Math.sin(a) * m) < r) lo = m; else hi = m; }
    return [POND.x + Math.cos(a) * lo, POND.z + Math.sin(a) * lo];
  }

  addAnimal(obj, o) {
    this.group.add(obj);
    const a = { obj, ...o, t: 0 };
    obj.position.set(o.x, o.y ?? groundAt(o.x, o.z), o.z);
    obj.rotation.y = o.yaw || 0;
    const grow = o.grow || { butterfly: 2.4, rabbit: 1.3, groundBird: 1.35, squirrel: 1.3 }[o.kind];
    if (grow) obj.scale.multiplyScalar(grow);
    this.list.push(a);
    return a;
  }

  update(dt, t, player, pause) {
    const go = 1 - pause * 0.8;
    for (const a of this.list) { a._px = a.obj.position.x; a._pz = a.obj.position.z; }
    for (const a of this.list) {
      const o = a.obj;
      if (a.kind === 'deer') {
        let moving = false;
        const d = Math.hypot(player.x - o.position.x, player.z - o.position.z);
        if (d < 14 && !a.leaving) {
          // drift calmly away from you
          const ang = Math.atan2(o.position.z - player.z, o.position.x - player.x);
          a.leaving = { x: o.position.x + Math.cos(ang) * 14, z: o.position.z + Math.sin(ang) * 14 };
        }
        if (a.leaving) {
          const dx = a.leaving.x - o.position.x, dz = a.leaving.z - o.position.z;
          const dd = Math.hypot(dx, dz);
          if (dd > 0.3) {
            moving = true;
            const sp = 1.6 * dt * go;
            o.position.x += (dx / dd) * sp;
            o.position.z += (dz / dd) * sp;
            o.position.y = groundAt(o.position.x, o.position.z);
            o.rotation.y = Math.atan2(-dz, dx);
            a.head.rotation.z += (0 - a.head.rotation.z) * Math.min(1, dt * 3);
          } else a.leaving = null;
        } else {
          // graze: head down, look up now and then
          const graze = Math.sin(t * 0.4 + a.x) > -0.2 ? -0.8 : 0;
          a.head.rotation.z += (graze - a.head.rotation.z) * Math.min(1, dt * 1.8);
        }
        walk(a, dt, go, moving, 1.25, 0.23);
      } else if (a.kind === 'heron') {
        const d = Math.hypot(player.x - o.position.x, player.z - o.position.z);
        if (d < 5 && !a.moved) {
          a.moved = true;
          const ang = 2.2 + 1.3;
          a.target = { x: POND.x + Math.cos(ang) * POND.rx * 1.02, z: POND.z + Math.sin(ang) * POND.rz * 1.02 };
        }
        if (a.target) {
          const dx = a.target.x - o.position.x, dz = a.target.z - o.position.z, dd = Math.hypot(dx, dz);
          if (dd > 0.2) {
            o.position.x += (dx / dd) * 0.8 * dt * go;
            o.position.z += (dz / dd) * 0.8 * dt * go;
            o.position.y = groundAt(o.position.x, o.position.z);
            o.rotation.y = Math.atan2(-dz, dx);
          } else a.target = null;
        }
        o.rotation.z = Math.sin(t * 0.3) * 0.008;
      } else if (a.kind === 'koi') {
        a.t += dt * go;
        const ph = a.seed + a.t * a.speed;
        // Bounded, continuous orbits: broad turns rather than noise teleports.
        // The smaller harmonic brings fish out from the reed-lined east shore.
        const radius = 0.52 + 0.18 * Math.sin(ph * 0.63 + a.seed);
        const x = POND.x + Math.cos(ph) * POND.rx * radius;
        const z = POND.z + Math.sin(ph) * POND.rz * radius;
        const prevX = o.position.x, prevZ = o.position.z;
        o.position.set(x, WATER_Y - 0.22 - Math.sin(ph * 1.7) * 0.045, z);
        if (Math.hypot(x - prevX, z - prevZ) > 1e-5) o.rotation.y = Math.atan2(-(z - prevZ), x - prevX);
        a.tail.rotation.y = Math.sin(a.t * 3.2 + a.seed) * 0.32;
      } else if (a.kind === 'cat') {
        o.scale.y = 1 + Math.sin(t * 1.2) * 0.009;
      } else if (a.kind === 'squirrel') {
        a.hopT += dt * go;
        const k = a.hopT % 6;
        if (k < 1.2) {
          const ang = a.x * 3 + Math.floor(a.hopT / 6);
          o.position.x += Math.cos(ang) * dt * 1.4 * go;
          o.position.z += Math.sin(ang) * dt * 1.4 * go;
          o.position.y = groundAt(o.position.x, o.position.z) + Math.abs(Math.sin(k * 8)) * 0.12;
          o.rotation.y = -ang;
        }
      } else if (a.kind === 'bird') {
        const cycle = 40;
        const k = ((t + a.seed * 0.6) % cycle) / cycle;
        const r = 70;
        const ang = k * Math.PI - 0.3;
        o.position.set(Math.cos(ang) * r + a.seed * 1.2, 26 + Math.sin(k * 9 + a.seed) * 2, Math.sin(ang) * r * 0.6 - 10 + a.seed * 0.8);
        o.rotation.y = -ang - Math.PI / 2;
        o.scale.y = Math.sin(t * 14 + a.seed) * 0.8;
      }
    }
    for (const a of this.list) {
      const o = a.obj;
      const dp = Math.hypot(player.x - o.position.x, player.z - o.position.z);
      if (a.kind === 'rabbit') {
        a.hopT += dt * go;
        if (dp < 6 && !a.flee) {
          const ang = Math.atan2(o.position.z - player.z, o.position.x - player.x) + this.rng.g() * 0.4;
          a.flee = { ang, left: 1.4 };
        }
        const hopping = a.flee || (a.hopT % 5) < 0.8;
        if (hopping) {
          const ang = a.flee ? a.flee.ang : a.yaw + Math.sin(a.hopT) * 0.8;
          const sp = (a.flee ? 3.2 : 0.7) * dt * go;
          const nx = o.position.x + Math.cos(ang) * sp, nz = o.position.z + Math.sin(ang) * sp;
          o.position.set(nx, groundAt(nx, nz) + Math.abs(Math.sin(t * (a.flee ? 14 : 9))) * 0.12, nz);
          o.rotation.y = -ang;
          if (a.flee && (a.flee.left -= dt) <= 0) a.flee = null;
        } else {
          o.position.y = groundAt(o.position.x, o.position.z);
          o.rotation.z = Math.sin(t * 2 + a.x) * 0.006; // a small attentive shift
        }
      } else if (a.kind === 'fox') {
        // trot slowly along the route, pausing to look at you when you're near
        const looking = dp < 12;
        const [tx, tz] = a.route[a.leg];
        const dx = tx - o.position.x, dz = tz - o.position.z, dd = Math.hypot(dx, dz);
        walk(a, dt, go, !looking && dd >= 0.5, 2.0, 0.29);
        if (looking) {
          o.rotation.y = Math.atan2(-(player.z - o.position.z), player.x - o.position.x);
        } else if (dd < 0.5) a.leg = (a.leg + 1) % a.route.length;
        else {
          const sp = 1.1 * dt * go;
          o.position.x += (dx / dd) * sp;
          o.position.z += (dz / dd) * sp;
          o.position.y = groundAt(o.position.x, o.position.z) + Math.abs(Math.sin(t * 7)) * 0.03;
          o.rotation.y = Math.atan2(-dz, dx);
        }
      } else if (a.kind === 'owl') {
        // A perched owl is still; its supporting branch must stay still too.
      } else if (a.kind === 'groundBird') {
        if (dp < 5 && !a.flying) a.flying = { t: 0, ang: this.rng.f() * Math.PI * 2 };
        if (a.flying) {
          a.flying.t += dt;
          const k = a.flying.t;
          const rise = Math.min(1, k / 1.2);
          o.position.x += Math.cos(a.flying.ang) * 4 * dt;
          o.position.z += Math.sin(a.flying.ang) * 4 * dt;
          o.position.y = groundAt(o.position.x, o.position.z) + rise * 3 + Math.sin(k * 20) * 0.05;
          o.rotation.y = -a.flying.ang;
          if (k > 3.5) {
            // settle back near home a little later
            a.flying = null;
            const [hx, hz] = a.home;
            o.position.set(hx + this.rng.g() * 4, 0, hz + this.rng.g() * 4);
            o.position.y = groundAt(o.position.x, o.position.z);
            o.visible = false;
            a.away = 6 + this.rng.f() * 6;
          }
        } else if (a.away > 0) {
          a.away -= dt;
          if (a.away <= 0 && dp > 8) o.visible = true;
          else if (a.away <= 0) a.away = 2;
        } else {
          // peck, hop a little
          o.rotation.z = Math.max(0, Math.sin(t * 3 + a.phase)) * -0.5;
          if (Math.sin(t * 0.7 + a.phase) > 0.97) o.rotation.y += 0.05;
        }
      } else if (a.kind === 'butterfly') {
        const ph = a.phase + t * 0.25 * go;
        const [hx, hz] = a.home;
        const x = hx + Math.sin(ph * 1.3) * 3 + Math.sin(ph * 3.1) * 0.6;
        const z = hz + Math.cos(ph * 1.1) * 3 + Math.cos(ph * 2.7) * 0.6;
        const px = o.position.x, pz = o.position.z;
        o.position.set(x, groundAt(x, z) + 0.6 + Math.sin(ph * 4) * 0.3, z);
        o.rotation.y = Math.atan2(-(z - pz), x - px);
        o.scale.z = 2.4 * (0.25 + Math.abs(Math.sin(t * 14 + a.phase)) * 0.75);
      }
    }
    for (const a of this.list) {
      const o = a.obj;
      if (a.kind === 'hawk') {
        // slow soaring circles on warm air, barely a wingbeat
        const ang = a.phase + t * 0.06 * go;
        o.position.set(Math.cos(ang) * 46, 38 + Math.sin(t * 0.13) * 3, Math.sin(ang) * 38 - 8);
        o.rotation.set(0, -ang - Math.PI / 2, 0.28);
      } else if (a.kind === 'owlFly') {
        // now and then an owl glides across the valley at night
        if (!o.visible) {
          a.wait -= dt;
          if (a.wait <= 0) {
            o.visible = true;
            a.dir = this.rng.f() < 0.5 ? 1 : -1;
            a.lane = this.rng.range(-40, 30);
            o.position.set(-75 * a.dir, 11, a.lane);
            a.hooted = false;
          }
        } else {
          o.position.x += a.dir * 4.5 * dt * go;
          o.position.y = 11 + Math.sin(t * 0.6) * 1.2;
          o.rotation.set(0, a.dir > 0 ? 0 : Math.PI, Math.sin(t * 2.4) * 0.15);
          if (Math.abs(o.position.x) > 78) { o.visible = false; a.wait = 70 + this.rng.f() * 80; }
        }
      } else if (a.kind === 'frog') {
        const pd = Math.hypot(player.x - o.position.x, player.z - o.position.z);
        if (a.gone) {
          // back from the water after a while, a little along the shore
          a.gone -= dt;
          if (a.gone <= 0 && pd > 4) { a.gone = 0; o.visible = true; }
        } else {
          o.scale.y = (a.grow || 1) * (1 + Math.sin(t * 5 + a.phase) * 0.035); // throat pulsing
          if (a.shore != null) {
            if (a.hop) {
              // a short arc; into the water if you came close
              a.hop.t += dt / 0.45;
              const k = Math.min(1, a.hop.t);
              o.position.x = a.hop.x0 + (a.hop.x1 - a.hop.x0) * k;
              o.position.z = a.hop.z0 + (a.hop.z1 - a.hop.z0) * k;
              o.position.y = a.hop.y0 + (a.hop.y1 - a.hop.y0) * k + Math.sin(k * Math.PI) * 0.12;
              if (k >= 1) {
                if (a.hop.splash) { o.visible = false; a.gone = 18 + this.rng.f() * 20; a.plop = true; a.shore += this.rng.range(-0.25, 0.25); const [x, z] = this._shore(a.shore); o.position.set(x, groundAt(x, z), z); o.rotation.y = a.shore + Math.PI; }
                a.hop = null;
              }
            } else if (pd < 1.6) {
              const [x1, z1] = this._shore(a.shore, 0.9);
              a.hop = { t: 0, x0: o.position.x, z0: o.position.z, y0: o.position.y, x1, z1, y1: WATER_Y - 0.05, splash: true };
            } else if ((a.hopT -= dt * go) <= 0) {
              a.hopT = 8 + this.rng.f() * 14;
              a.shore += this.rng.range(-0.06, 0.06);
              const [x1, z1] = this._shore(a.shore);
              if (!onBridge(x1, z1)) a.hop = { t: 0, x0: o.position.x, z0: o.position.z, y0: o.position.y, x1, z1, y1: groundAt(x1, z1) };
            }
          }
        }
      } else if (a.kind === 'snail') {
        // creeping, slowly, near home, gently turning
        a.turn = (a.turn ?? 0) + Math.sin(t * 0.2 + a.home[0]) * 0.002;
        o.rotation.y += a.turn * dt * go;
        const sp = 0.004 * dt * go;
        o.position.x += Math.cos(-o.rotation.y) * sp;
        o.position.z += Math.sin(-o.rotation.y) * sp;
        if (Math.hypot(o.position.x - a.home[0], o.position.z - a.home[1]) > 0.35) o.rotation.y += Math.PI * 0.6 * dt;
        o.position.y = groundAt(o.position.x, o.position.z) + (a.up || 0);
        o.scale.x = (a.grow || 1) * (1 + Math.sin(t * 1.3 + a.home[1]) * 0.05); // the foot stretching
      } else if (a.kind === 'turtle') {
        if (a.bask) {
          const pd = Math.hypot(player.x - o.position.x, player.z - o.position.z);
          if (!a.sliding && pd < 2.6) { a.sliding = 1; a.plop = true; }
          if (a.sliding) {
            // slides calmly off the rock and away under the water
            a.sliding += dt;
            const dir = Math.atan2(POND.z - o.position.z, POND.x - o.position.x);
            o.rotation.y = -dir;
            o.position.x += Math.cos(dir) * 0.25 * dt; o.position.z += Math.sin(dir) * 0.25 * dt;
            o.position.y -= 0.12 * dt;
            if (a.sliding > 4) { o.visible = false; }
          } // otherwise basking: perfectly still in the sun
        } else {
          // paddling a slow loop around the pond, just under the surface
          a.swim += dt * 0.045 * go;
          const r = 0.55 + Math.sin(a.swim * 1.7) * 0.12;
          const x = POND.x + Math.cos(a.swim) * POND.rx * r, z = POND.z + Math.sin(a.swim) * POND.rz * r;
          o.rotation.y = Math.atan2(-(z - o.position.z), x - o.position.x) || o.rotation.y;
          o.position.set(x, WATER_Y - 0.075 + Math.sin(t * 0.8) * 0.01, z);
        }
      } else if (a.kind === 'snake') {
        if (a.leaving) {
          a.leaving -= dt;
          const sp = 0.22 * dt * go;
          o.position.x += Math.cos(-o.rotation.y) * sp;
          o.position.z += Math.sin(-o.rotation.y) * sp;
          o.position.y = groundAt(o.position.x, o.position.z);
          o.rotation.y += Math.sin(t * 3) * 0.01;
          if (a.leaving <= 0) o.visible = false;
        } else {
          o.scale.x = 1 + Math.sin(t * 0.5) * 0.015; // breathing
        }
      }
    }
    // land animals never wade into the pond or walk through walls:
    // if a step would take them there, they stay put and turn away
    for (const a of this.list) {
      if (!LAND.has(a.kind) || (a.kind === 'groundBird' && a.flying)) continue;
      const o = a.obj;
      if (!landOk(o.position.x, o.position.z)) {
        o.position.x = a._px; o.position.z = a._pz;
        if (!landOk(o.position.x, o.position.z)) {
          // spawned in a bad spot: step out of the water, away from its centre
          const ang = Math.atan2(o.position.z - POND.z, o.position.x - POND.x);
          o.position.x = POND.x + Math.cos(ang) * POND.rx * 1.45;
          o.position.z = POND.z + Math.sin(ang) * POND.rz * 1.45;
        }
        o.position.y = groundAt(o.position.x, o.position.z);
        if (a.leaving) a.leaving = null;
        if (a.flee) a.flee.ang += Math.PI * 0.75;
        if (a.kind === 'squirrel' || a.kind === 'rabbit') a.yaw = (a.yaw || 0) + Math.PI;
      }
    }
    if (this.fireflies.visible) {
      const pos = this.fireflies.geometry.attributes.position;
      this.ffSeeds.forEach(([ox, oz, ph], i) => {
        pos.setXYZ(i, POND.x + ox * 1.6 + Math.sin(t * 0.3 + ph) * 1.5, WATER_Y + 0.6 + Math.sin(t * 0.5 + ph * 2) * 0.5, POND.z + oz * 1.6 + Math.cos(t * 0.27 + ph) * 1.5);
      });
      pos.needsUpdate = true;
      this.fireflies.material.opacity = 0.5 + 0.5 * Math.sin(t * 2.3);
    }
  }

  /** The snake decides it's time to move on. */
  snakeLeaves() {
    const sn = this.list.find((a) => a.kind === 'snake');
    if (sn) sn.leaving = 9;
  }

  /** Animals within range of a point (for photo subjects). */
  within(x, z, r) {
    return this.list.filter((a) => Math.hypot(a.obj.position.x - x, a.obj.position.z - z) < r);
  }
}
