// Run with: node --test scripts/human-model-check.mjs
// Geometry/routine regressions supplement the browser silhouette review.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { figure, People } from '../src/world3d/people.js';

function checkFigure(obj, { seated, pose, hat }) {
  obj.updateMatrixWorld(true);
  let triangles = 0, draws = 0;
  obj.traverse((part) => {
    assert.ok(part.matrixWorld.elements.every(Number.isFinite), 'finite transforms');
    if (!part.isMesh) return;
    draws++;
    const geo = part.geometry;
    triangles += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    for (const name of ['position', 'normal', 'color']) {
      assert.ok(geo.attributes[name], `${name} attribute`);
      assert.ok(geo.attributes[name].array.every(Number.isFinite), `finite ${name}`);
    }
    assert.ok(part.material.vertexColors, 'painted geometry uses its vertex colours');
  });
  assert.ok(triangles > 2000 && triangles < 4500, 'sculpted detail within phone mesh budget');
  assert.ok(draws <= (seated ? 1 : 3), 'bounded draw calls');
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.x > .35 && size.x < .90, 'human shoulder/pose width');
  if (!seated) {
    assert.ok(size.y > 1.65 && size.y < (hat ? 2.05 : 1.90), 'adult standing proportions');
    assert.ok(box.min.y > -.02 && box.min.y < .05, 'standing soles reach the floor');
  } else {
    assert.ok(box.max.y > .9 && box.max.y < 1.2, 'seated torso/head height');
    if (pose === 'tea' || pose === 'reading') {
      // Existing scene anchors sit 0.3m above the floor, on the bench.
      assert.ok(box.min.y + .3 > -.08 && box.min.y + .3 < .08, 'chair-seated feet reach floor');
    } else assert.ok(box.min.y >= -.03, 'floor-seated pose stays above its cushion');
  }
}

for (const kind of ['monastic', 'lay']) {
  for (const spec of [{ seated: false }, { seated: false, hat: true },
    { seated: true }, { seated: true, pose: 'tea' }, { seated: true, pose: 'reading' }]) {
    test(`${kind}: ${JSON.stringify(spec)}`, () => {
      for (const seed of [1, 2, 4, 5, 12, 99]) checkFigure(figure(seed, { kind, ...spec }), spec);
    });
  }
}

test('daily routines retain finite figures and gently alternate walking legs', () => {
  const spots = { table: { x: -17, z: 46 }, table2: { x: -13, z: 46 }, front: { x: -17, z: 49 } };
  const built = { tea: { spots }, hall: { cushionSpots: [{ x: 1, z: -17, y: 4, rot: 0 }] }, benches: [{}, { x: 18, z: 20, rot: -2.1 }] };
  const people = new People(new THREE.Scene(), built);
  for (const time of [0, 1, 2, 3, 4]) {
    people.arrange(time, 'clear');
    for (let i = 0; i < 90; i++) people.update(1 / 30, i / 30, 0);
    for (const p of people.list) {
      assert.ok(p.fig.position.toArray().every(Number.isFinite), 'routine position');
      assert.ok(p.fig.rotation.toArray().slice(0, 3).every(Number.isFinite), 'routine facing');
      if (p.mode === 'loop') {
        const [left, right] = p.fig.userData.legs;
        assert.ok(Math.abs(left.rotation.x + right.rotation.x) < 1e-8, 'alternating gait');
        assert.ok(Math.abs(left.rotation.x) <= .14, 'restrained stride');
      }
    }
  }
  people.clear();
  assert.equal(people.group.children.length, 0);
});
