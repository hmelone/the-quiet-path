// Ordinary wildlife: deer at the forest edge, a heron, koi, a sleeping cat,
// orchard squirrels, small birds overhead and fireflies on warm evenings.
import * as THREE from 'three';
import { Rng, noise1 } from '../core/rng.js';
import { colorize, merge, radialNormals } from './geo.js';
import { paint } from './materials.js';
import { groundAt } from './terrain.js';
import { POND, WATER_Y, pondDist, BUILDINGS, PADS } from './layout.js';

function deerGeo() {
  const p = [];
  const body = new THREE.CapsuleGeometry(0.28, 0.75, 4, 10).rotateZ(Math.PI / 2).translate(0, 0.95, 0);
  p.push(colorize(body, (x, y) => new THREE.Color('#9a6a44').lerp(new THREE.Color('#d8c0a0'), Math.max(0, 0.85 - y) * 2.5)));
  for (const [x, z] of [[-0.42, 0.12], [-0.42, -0.12], [0.4, 0.12], [0.4, -0.12]]) {
    p.push(colorize(new THREE.CylinderGeometry(0.035, 0.03, 0.85, 5).translate(x, 0.43, z), '#6e4a32'));
  }
  const neck = new THREE.CylinderGeometry(0.09, 0.13, 0.55, 7).rotateZ(-0.6).translate(0.62, 1.25, 0);
  p.push(colorize(neck, '#9a6a44'));
  const tail = new THREE.SphereGeometry(0.07, 6, 4).translate(-0.7, 1.05, 0);
  p.push(colorize(tail, '#f0e8dc'));
  const g = merge(p);
  return g;
}
function deerHeadGeo() {
  const p = [];
  p.push(colorize(new THREE.SphereGeometry(0.12, 8, 6).scale(1.6, 0.9, 0.9).translate(0.1, 0, 0), '#8f6040'));
  for (const s of [-1, 1]) p.push(colorize(new THREE.ConeGeometry(0.05, 0.16, 5).rotateX(s * 0.5).translate(-0.02, 0.12, s * 0.08), '#7a5236'));
  p.push(colorize(new THREE.SphereGeometry(0.03, 5, 4).translate(0.29, -0.01, 0), '#2a201a'));
  return merge(p);
}

function heronGeo() {
  const p = [];
  p.push(colorize(new THREE.SphereGeometry(0.2, 10, 8).scale(1.4, 0.9, 0.8).translate(0, 0.95, 0), '#9aa0a6'));
  p.push(colorize(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6).rotateZ(-0.3).translate(0.2, 1.25, 0), '#c9cdd0'));
  p.push(colorize(new THREE.SphereGeometry(0.07, 8, 6).scale(1.3, 1, 1).translate(0.3, 1.5, 0), '#d8dadc'));
  p.push(colorize(new THREE.ConeGeometry(0.025, 0.22, 5).rotateZ(-Math.PI / 2).translate(0.47, 1.49, 0), '#c9a640'));
  for (const s of [-1, 1]) p.push(colorize(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4).translate(0, 0.4, s * 0.06), '#5a5040'));
  return merge(p);
}

function catGeo() {
  const p = [];
  const body = new THREE.SphereGeometry(0.2, 10, 8).scale(1.3, 0.55, 1);
  body.translate(0, 0.1, 0);
  radialNormals(body, 0, 0, 0);
  p.push(colorize(body, (x, y, z) => new THREE.Color('#d08a4a').lerp(new THREE.Color('#f2e2cc'), Math.max(0, -z) * 2)));
  p.push(colorize(new THREE.SphereGeometry(0.09, 8, 6).translate(0.2, 0.12, 0.08), '#d08a4a'));
  for (const s of [-1, 1]) p.push(colorize(new THREE.ConeGeometry(0.03, 0.06, 4).translate(0.22, 0.21, 0.08 + s * 0.04), '#b0703a'));
  p.push(colorize(new THREE.TorusGeometry(0.18, 0.03, 5, 12, Math.PI).rotateX(Math.PI / 2).translate(-0.02, 0.06, 0), '#c07a3a'));
  return merge(p);
}

function squirrelGeo() {
  const p = [];
  p.push(colorize(new THREE.SphereGeometry(0.07, 8, 6).scale(1.4, 1, 1).translate(0, 0.08, 0), '#8a4a2a'));
  p.push(colorize(new THREE.SphereGeometry(0.045, 6, 5).translate(0.09, 0.13, 0), '#8a4a2a'));
  p.push(colorize(new THREE.SphereGeometry(0.06, 6, 5).scale(0.8, 1.8, 0.8).translate(-0.1, 0.17, 0), '#a0603a'));
  return merge(p);
}

function koiGeo() {
  const p = [];
  const b = new THREE.SphereGeometry(0.12, 8, 6).scale(2.4, 0.5, 0.8);
  p.push(colorize(b, (x) => (Math.sin(x * 18) > 0.3 ? new THREE.Color('#f2ece0') : new THREE.Color('#e8742c'))));
  p.push(colorize(new THREE.ConeGeometry(0.08, 0.16, 4).rotateZ(Math.PI / 2).translate(-0.34, 0, 0).scale(1, 0.4, 1), '#e8742c'));
  return merge(p);
}

function birdGeo() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.18, 0.05, 0.25, 0.04, 0, 0, 0, 0, 0, 0.04, 0, 0, -0.18, 0.05, -0.25], 3));
  g.computeVertexNormals();
  return colorize(g, '#2e2a26');
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

  clear() { this.group.clear(); this.list = []; }

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
        head.position.set(0.82, 1.48, 0);
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
    // koi always; they rise toward the surface in rain
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Mesh(koiGeo(), this.mat);
      this.addAnimal(g, { kind: 'koi', label: 'koi beneath the surface', x: POND.x, z: POND.z, seed: i * 13.7, speed: this.rng.range(0.02, 0.04) });
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
    this.fireflies.visible = (time === 3 || time === 4) && !rain;
  }

  addAnimal(obj, o) {
    this.group.add(obj);
    const a = { obj, ...o, t: 0 };
    obj.position.set(o.x, o.y ?? groundAt(o.x, o.z), o.z);
    obj.rotation.y = o.yaw || 0;
    this.list.push(a);
    return a;
  }

  update(dt, t, player, pause) {
    const go = 1 - pause * 0.8;
    for (const a of this.list) {
      const o = a.obj;
      if (a.kind === 'deer') {
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
            const sp = 1.6 * dt * go;
            o.position.x += (dx / dd) * sp;
            o.position.z += (dz / dd) * sp;
            o.position.y = groundAt(o.position.x, o.position.z);
            o.rotation.y = Math.atan2(-dz, dx);
            a.head.position.y = 1.48;
          } else a.leaving = null;
        } else {
          // graze: head down, look up now and then
          a.head.position.y = 1.48 - (Math.sin(t * 0.4 + a.x) > -0.2 ? 0.75 : 0);
        }
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
        o.rotation.z = Math.sin(t * 0.3) * 0.03;
      } else if (a.kind === 'koi') {
        a.t += dt * go;
        const u = noise1(a.t * a.speed * 10 + a.seed), v = noise1(a.t * a.speed * 13 + a.seed + 40);
        let x = POND.x + (u - 0.5) * POND.rx * 1.6, z = POND.z + (v - 0.5) * POND.rz * 1.6;
        if (pondDist(x, z) > 0.85) { x = POND.x + (x - POND.x) * 0.7; z = POND.z + (z - POND.z) * 0.7; }
        const px = o.position.x, pz = o.position.z;
        o.position.set(x, WATER_Y - (this.weather === 'rain' ? 0.06 : 0.14), z);
        if (Math.hypot(x - px, z - pz) > 1e-4) o.rotation.y = Math.atan2(-(z - pz), x - px);
      } else if (a.kind === 'cat') {
        o.scale.y = 1 + Math.sin(t * 1.2) * 0.04;
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
