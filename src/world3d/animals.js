// Ordinary wildlife: deer at the forest edge, a heron, koi, a sleeping cat,
// orchard squirrels, small birds overhead and fireflies on warm evenings.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { colorize } from './geo.js';
import { paint } from './materials.js';
import { groundAt } from './terrain.js';
import { POND, WATER_Y, pondDist, BUILDINGS, PADS } from './layout.js';

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

  arrange(time, weather) {
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
    this.fireflies.visible = (time === 3 || time === 4) && !rain;
  }

  addAnimal(obj, o) {
    this.group.add(obj);
    const a = { obj, ...o, t: 0 };
    obj.position.set(o.x, o.y ?? groundAt(o.x, o.z), o.z);
    obj.rotation.y = o.yaw || 0;
    const grow = { butterfly: 2.4, rabbit: 1.3, groundBird: 1.35, squirrel: 1.3 }[o.kind];
    if (grow) obj.scale.multiplyScalar(grow);
    this.list.push(a);
    return a;
  }

  update(dt, t, player, pause) {
    const go = 1 - pause * 0.8;
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
    if (this.fireflies.visible) {
      const pos = this.fireflies.geometry.attributes.position;
      this.ffSeeds.forEach(([ox, oz, ph], i) => {
        pos.setXYZ(i, POND.x + ox * 1.6 + Math.sin(t * 0.3 + ph) * 1.5, WATER_Y + 0.6 + Math.sin(t * 0.5 + ph * 2) * 0.5, POND.z + oz * 1.6 + Math.cos(t * 0.27 + ph) * 1.5);
      });
      pos.needsUpdate = true;
      this.fireflies.material.opacity = 0.5 + 0.5 * Math.sin(t * 2.3);
    }
  }

  /** Animals within range of a point (for photo subjects). */
  within(x, z, r) {
    return this.list.filter((a) => Math.hypot(a.obj.position.x - x, a.obj.position.z - z) < r);
  }
}
