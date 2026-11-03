// Geometry/lifecycle checks for the original sculpted wildlife. Run with Node.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as models from '../src/world3d/animal-models.js';
import { Animals } from '../src/world3d/animals.js';
import { POND, WATER_Y } from '../src/world3d/layout.js';

function finiteGeometry(g, label) {
  for (const [name, attribute] of Object.entries(g.attributes)) {
    assert.ok([...attribute.array].every(Number.isFinite), `${label}: finite ${name}`);
  }
  g.computeBoundingBox();
  assert.ok(!g.boundingBox.isEmpty(), `${label}: nonempty bounds`);
  assert.ok(g.attributes.position.count / 3 < 1500, `${label}: mobile triangle budget`);
}

test('wildlife meshes have finite geometry and species-sized bounds', () => {
  for (const [name, create] of Object.entries(models)) {
    const g = create();
    finiteGeometry(g, name);
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.x < 3 && size.y < 3 && size.z < 3, `${name}: metre-scale bounds`);
    if (name === 'deerGeo' || name === 'foxGeo') {
      assert.equal(g.userData.walk.limbs.length, 4);
      for (const limb of g.userData.walk.limbs) {
        assert.ok(limb.start >= 0 && limb.start + limb.count <= g.attributes.position.count);
      }
    }
    g.dispose();
  }
});

test('all time/weather arrangements update, keep koi submerged, and release retired meshes', () => {
  const animals = new Animals(new THREE.Scene());
  const v = new THREE.Vector3();
  for (const time of [0, 1, 2, 3, 4]) for (const weather of ['clear', 'mist', 'rain']) {
    animals.arrange(time, weather);
    for (let frame = 0; frame < 90; frame++) {
      animals.update(1 / 30, frame / 30, frame < 45 ? { x: -14, z: -55 } : { x: 10, z: 0 }, 0);
    }
    animals.group.updateMatrixWorld(true);
    assert.equal(animals.list.filter((a) => a.kind === 'koi').length, 7);
    for (const a of animals.list) {
      assert.ok([...a.obj.position.toArray(), ...a.obj.scale.toArray(), ...a.obj.rotation.toArray().slice(0, 3)].every(Number.isFinite), `${a.kind}: finite transform`);
      a.obj.traverse((o) => { if (o.geometry) finiteGeometry(o.geometry, a.kind); });
      if (a.kind !== 'koi') continue;
      const rx = (a.obj.position.x - POND.x) / POND.rx, rz = (a.obj.position.z - POND.z) / POND.rz;
      assert.ok(Math.hypot(rx, rz) <= 0.71, 'koi orbit stays inside the pond');
      a.obj.traverse((o) => {
        if (!o.geometry) return;
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
          assert.ok(v.y < WATER_Y, 'body and tail remain beneath the calm surface');
        }
      });
    }
    const retired = new Set();
    animals.group.traverse((o) => { if (o.geometry) retired.add(o.geometry); });
    let disposed = 0;
    for (const g of retired) g.addEventListener('dispose', () => disposed++);
    animals.clear();
    assert.equal(disposed, retired.size, 'every retired geometry released once');
    assert.equal(animals.group.children.length, 0);
    assert.equal(animals.list.length, 0);
  }
});

test('fox limb gait follows movement, slows with the bell, and settles when watching', () => {
  const full = new Animals(new THREE.Scene()), quiet = new Animals(new THREE.Scene());
  full.arrange(0, 'clear'); quiet.arrange(0, 'clear');
  const f = full.list.find((a) => a.kind === 'fox'), q = quiet.list.find((a) => a.kind === 'fox');
  const far = { x: 1000, z: 1000 };
  for (let i = 0; i < 3; i++) {
    full.update(1 / 60, i / 60, far, 0);
    quiet.update(1 / 60, i / 60, far, 0);
  }
  const fp = f.walkPhase, qp = q.walkPhase;
  for (let i = 0; i < 30; i++) {
    full.update(1 / 60, i / 60, far, 0);
    quiet.update(1 / 60, i / 60, far, 1);
  }
  assert.ok(Math.abs((q.walkPhase - qp) / (f.walkPhase - fp) - 0.2) < 1e-6);
  assert.ok(f.obj.geometry.attributes.position.array.some((n, i) => Math.abs(n - f.obj.geometry.userData.walk.rest[i]) > 1e-4), 'walking deforms the limbs');
  const amplitude = f.walkAmount;
  for (let i = 0; i < 120; i++) full.update(1 / 60, i / 60, { x: f.obj.position.x + 3, z: f.obj.position.z }, 0);
  assert.ok(f.walkAmount < amplitude * 0.01, 'gait settles when the fox pauses');
  finiteGeometry(f.obj.geometry, 'posed fox');
  full.clear(); quiet.clear();
});
