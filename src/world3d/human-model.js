// Sculpted, vertex-painted human meshes. All faces look along local -Z.
// Cross-sections follow anatomy and cloth rather than stacking visible primitives.
import * as THREE from 'three';
import { colorize, merge, vary } from './geo.js';
import { paint } from './materials.js';
import { Rng } from '../core/rng.js';

const SKIN = ['#d7af8f', '#b98765', '#9e7055', '#765340', '#e3c2a4'];
const CLOTH = [['#7b9199', '#46515b'], ['#c7c1af', '#665c50'], ['#899078', '#4d5146'], ['#a57660', '#514943'], ['#687d80', '#37464b'], ['#b8a384', '#5c5348']];
const V = (p) => new THREE.Vector3(...p);
const bell = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
const C = (c) => new THREE.Color(c);

/** Smooth continuous tube along shaped sections; radii are width/depth. */
function sculpt(sections, sides = 14, deform = null) {
  const pos = [], idx = [];
  let previousWide = null;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i], p = V(s.p);
    const prev = V(sections[Math.max(0, i - 1)].p), next = V(sections[Math.min(sections.length - 1, i + 1)].p);
    const axis = next.sub(prev).normalize();
    const ref = Math.abs(axis.z) > 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    // Parallel-transport the cross-section through elbows/knees. A fixed
    // reference can flip 180 degrees at a bent joint and twist the surface.
    const wide = previousWide
      ? previousWide.clone().addScaledVector(axis, -previousWide.dot(axis)).normalize()
      : new THREE.Vector3().crossVectors(axis, ref).normalize();
    previousWide = wide.clone();
    const deep = new THREE.Vector3().crossVectors(wide, axis).normalize();
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2;
      const v = p.clone().addScaledVector(wide, Math.sin(a) * s.w).addScaledVector(deep, -Math.cos(a) * s.d);
      if (deform) deform(v, a, i, s);
      pos.push(v.x, v.y, v.z);
    }
    if (i) for (let j = 0; j < sides; j++) {
      const a = (i - 1) * sides + j, b = (i - 1) * sides + (j + 1) % sides;
      const c = i * sides + j, d = i * sides + (j + 1) % sides;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Small closed ends, hidden in joints or shaped into the crown/sole.
  for (const [ring, reverse] of [[0, false], [sections.length - 1, true]]) {
    const base = ring * sides;
    for (let j = 1; j < sides - 1; j++) idx.push(base, base + (reverse ? j + 1 : j), base + (reverse ? j : j + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const section = (y, w, d, x = 0, z = 0) => ({ p: [x, y, z], w, d });
const cloth = (g, col, seed = 0) => colorize(g, (x, y, z) => vary(C(col), 0.045, x * 1.4, y * 2, z, seed));

function headGeometry(skin, base, seed) {
  // Chin, jaw, cheekbones, temples and skull: one connected head surface.
  const profile = [
    [0, .028, .036, -.004], [.012, .050, .052, -.012], [.030, .066, .066, -.005],
    [.048, .074, .073, 0], [.067, .079, .078, 0], [.084, .083, .083, .002],
    [.102, .087, .086, .004], [.117, .088, .086, .005], [.130, .087, .085, .006],
    [.140, .084, .083, .006], [.151, .082, .083, .006], [.164, .082, .084, .007],
    [.180, .084, .085, .009], [.202, .083, .081, .010], [.223, .075, .072, .010],
    [.242, .055, .053, .010], [.253, .027, .029, .010], [.258, .002, .003, .010],
  ];
  const cheekWidth = 0.97 + (seed % 4) * .025;
  const g = sculpt(profile.map(([y, w, d]) => section(base + y, w * cheekWidth, d)), 48, (v, a, i) => {
    // Horizontal facial sections avoid a tilted end cap intersecting the neck.
    v.z += profile[i][3];
    const y = v.y - base, front = Math.max(0, Math.cos(a));
    // Nasal bridge/tip are displaced from the face itself, never attached beads.
    const nose = (bell(y, .115, .036) * .013 + bell(y, .096, .012) * .022) * bell(Math.sin(a), 0, .22) * front;
    const lips = bell(y, .065, .009) * .0035 * bell(Math.sin(a), 0, .36) * front;
    const brow = bell(y, .159, .012) * .0045 * bell(Math.abs(v.x), .034, .025) * front;
    const eyeSocket = bell(y, .139, .012) * .004 * bell(Math.abs(v.x), .034, .019) * front;
    v.z -= nose + lips + brow - eyeSocket;
    // Ears are a slight contour in the same cheek mesh, not round attachments.
    v.x += Math.sign(v.x) * bell(y, .115, .029) * bell(Math.abs(Math.sin(a)), 1, .13) * .008;
  });
  return colorize(g, (x, y, z) => {
    const rel = y - base, front = z < -.045;
    const c = C(skin);
    c.multiplyScalar(.97 + .04 * bell(rel, .105, .07));
    if (front) {
      const eye = bell(Math.abs(x), .035, .014) * bell(rel, .139, .0035);
      const brow = bell(Math.abs(x), .037, .021) * bell(rel, .158, .003);
      const mouth = bell(x, 0, .024) * bell(rel, .061, .0025);
      const sideNose = bell(Math.abs(x), .014, .006) * bell(rel, .099, .013);
      c.lerp(C('#51443b'), Math.min(.72, eye * .68 + brow * .38));
      c.lerp(C('#805b50'), Math.min(.35, mouth * .36 + sideNose * .15));
    }
    return c;
  });
}

function hairGeometry(base, seed, col) {
  // A fitted, irregular hairline and tapered nape share the head's contours.
  const g = sculpt([
    section(base + .07, .072, .077, 0, .018),
    section(base + .12, .091, .091, 0, .010),
    section(base + .18, .090, .092, 0, .012),
    section(base + .224, .077, .078, 0, .014),
    section(base + .253, .047, .047, 0, .015),
    section(base + .269, .002, .002, 0, .015),
  ], 28, (v, a, i) => {
    // Raise the front edge above the brow; keep the back of the hair at nape.
    const front = Math.max(0, Math.cos(a));
    v.y += front ** 3 * [.11, .10, .055, .020, .004, 0][i];
    if (i === 0) v.y += Math.sin(a * 2 + seed) * front * .004;
    v.z += Math.sin(a * 8 + seed) * .0015;
  });
  return cloth(g, col, seed);
}

function hatGeometry(y) {
  return cloth(sculpt([section(y, .025, .025), section(y + .004, .24, .24), section(y + .027, .22, .22), section(y + .13, .015, .015)], 24), '#b8a17c');
}

function torsoGeometry(kind, seated, col, shift, seed) {
  const y = (v) => v + shift;
  const g = sculpt([
    section(y(.86), .153, .106, 0, .010), section(y(.94), .153, .106, 0, .010),
    section(y(1.04), .139, .092, 0, .009), section(y(1.13), .147, .094, 0, .004),
    section(y(1.24), .174, .106, 0, -.002), section(y(1.33), .189, .100, 0, .002),
    section(y(1.38), .205, .089, 0, .008), section(y(1.405), .198, .084, 0, .009),
    section(y(1.43), .171, .075, 0, .010), section(y(1.45), .119, .065, 0, .010),
    section(y(1.47), .066, .055, 0, .012),
  ], 24, (v, a) => {
    const folds = Math.sin(a * 8 + v.y * 3) * .003 + Math.sin(a * 5 - v.y * 5) * .003;
    const k = kind === 'monastic' ? 1.5 : .6;
    v.x += Math.sin(a) * folds * k; v.z -= Math.cos(a) * folds * k;
  });
  return colorize(g, (x, yy, z) => {
    const c = vary(C(col), .035, x * 2, yy * 2, z, seed);
    // Overlapping diagonal robe edge or a quiet shirt opening painted in cloth.
    const h = yy - shift;
    if (z < -.045 && h > 1.08) {
      const seam = kind === 'monastic' ? x - (1.40 - h) * .65 : Math.abs(x) - (1.46 - h) * .23;
      c.multiplyScalar(1 - bell(seam, 0, .008) * .18);
    }
    return c;
  });
}

function drapedSkirt(seated, shift, col, seed, tea) {
  const rings = seated && tea ? [
    section(-.20, .19, .23, 0, -.17), section(-.14, .21, .26, 0, -.17),
    section(.04, .24, .28, 0, -.13), section(.19, .22, .20, 0, -.06),
    section(.38, .16, .115, 0, .004),
  ] : seated ? [
    section(.11, tea ? .20 : .35, tea ? .30 : .27, 0, tea ? -.16 : -.06),
    section(.18, tea ? .22 : .38, tea ? .30 : .29, 0, tea ? -.18 : -.05),
    section(.30, tea ? .25 : .34, .27, 0, -.11),
    section(.43, .22, .19, 0, -.06), section(.57, .16, .115, 0, .004),
  ] : [section(.20, .235, .14), section(.28, .23, .14), section(.43, .216, .13), section(.63, .19, .12), section(.85, .16, .106), section(.96, .153, .105)];
  return cloth(sculpt(rings, 28, (v, a) => {
    const pleat = (Math.cos(a * 10 + .3) * .008 + Math.cos(a * 5 + v.y * 2) * .006) * (seated ? .9 : 1.2);
    v.x += Math.sin(a) * pleat; v.z -= Math.cos(a) * pleat;
    // An uneven, overlapping cloth hem, not a perfectly circular vase base.
    if (v.y < .3) v.y += Math.sin(a * 3 + seed) * .012;
  }), col, seed);
}

function limb(sections, col, sides = 12) { return cloth(sculpt(sections, sides), col); }
function arm(side, seated, tea, shift, sleeve, skin) {
  const shoulder = [side * .215, 1.32 + shift, .008];
  const elbow = seated ? [side * .24, .50, tea ? -.14 : -.035] : [side * .245, 1.12, .025];
  const wrist = seated ? [side * (tea ? .17 : .13), tea ? .51 : .31, tea ? -.37 : -.27] : [side * .21, .90, -.035];
  const q = (p, w, d) => ({ p, w, d });
  const mid = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const cuff = mid(elbow, wrist, .72);
  const sleeves = limb([
    q([side * .13, 1.365 + shift, .008], .057, .065),
    q([side * .18, 1.35 + shift, .008], .071, .074),
    q(shoulder, .077, .075), q(mid(shoulder, elbow, .3), .081, .074),
    q(mid(shoulder, elbow, .8), .067, .064), q(elbow, .066, .063),
    q(mid(elbow, cuff, .5), .060, .054), q(cuff, .051, .048),
  ], sleeve);
  const fingers = mid(cuff, wrist, 1.40);
  // Wrist, palm, knuckles and tapered fingers form one continuous hand.
  const hand = limb([q(cuff, .032, .029), q(wrist, .028, .024),
    q(mid(wrist, fingers, .3), .036, .019), q(mid(wrist, fingers, .65), .035, .017), q(fingers, .022, .012)], skin, 10);
  return [sleeves, hand];
}

function standingLeg(side, col, skin, monastic) {
  const x = side * .085;
  const leg = limb([
    section(-.84, .030, .034, x, -.005), section(-.77, .043, .045, x, .012),
    section(-.65, .056, .058, x, .026), section(-.49, .061, .058, x, .022),
    section(-.43, .058, .059, x, .011), section(-.34, .066, .068, x, .006),
    section(-.18, .083, .080, x, .008), section(-.025, .078, .080, x, .006),
    section(.015, .063, .073, x, .005),
  ], monastic ? skin : col);
  const foot = cloth(sculpt([
    section(-.875, .034, .115, x, -.055), section(-.86, .044, .120, x, -.055),
    section(-.835, .044, .115, x, -.055), section(-.81, .033, .075, x, -.025),
    section(-.79, .025, .035, x, .006),
  ], 14), '#3d3b35');
  const g = merge([leg, foot]);
  const mesh = new THREE.Mesh(g, paint({})); mesh.position.y = .90; mesh.castShadow = true;
  return mesh;
}

function seatedLegs(tea, col, skin) {
  const parts = [];
  for (const side of [-1, 1]) {
    const leg = tea ? [
      { p: [side * .095, .56, .025], w: .077, d: .078 },
      { p: [side * .11, .47, -.17], w: .080, d: .070 },
      { p: [side * .115, .45, -.34], w: .065, d: .063 },
      { p: [side * .115, .25, -.38], w: .051, d: .050 },
      { p: [side * .12, .05, -.40], w: .032, d: .033 },
    ] : [
      { p: [side * .08, .14, .04], w: .082, d: .080 },
      { p: [side * .27, .11, -.15], w: .086, d: .082 },
      { p: [side * .25, .10, -.29], w: .068, d: .062 },
      { p: [side * .06, .09, -.28], w: .042, d: .041 },
    ];
    if (tea) for (const s of leg) s.p[1] -= .39;
    parts.push(limb(leg, col, 14));
    parts.push(limb(tea ? [section(-.285, .035, .095, side * .12, -.45), section(-.26, .042, .105, side * .12, -.45), section(-.23, .031, .065, side * .12, -.42)] : [section(.065, .030, .075, side * .05, -.27), section(.09, .038, .085, side * .05, -.27), section(.115, .026, .055, side * .05, -.27)], tea ? '#3d3b35' : skin, 12));
  }
  return parts;
}

/** One body + two gait legs when standing; a single merged seated mesh. */
export function sculptedHuman(seed, { kind = 'monastic', seated = false, hat = false, pose = 'meditation' } = {}) {
  const rng = new Rng(`person${seed}`), skin = rng.pick(SKIN);
  const [shirt, pants] = rng.pick(CLOTH), monastic = kind === 'monastic';
  const robe = rng.pick(['#7c5b43', '#76513b', '#84664b', '#694b39']);
  const tea = seated && (pose === 'tea' || pose === 'reading');
  const shift = seated ? (tea ? -.71 : -.73) : 0;
  const headBase = 1.505 + shift;
  const parts = [];
  parts.push(torsoGeometry(kind, seated, monastic ? robe : shirt, shift, seed));
  parts.push(limb([section(1.43 + shift, .054, .047, 0, .023), section(1.49 + shift, .045, .039, 0, .023), section(1.54 + shift, .037, .030, 0, .023)], skin));
  parts.push(headGeometry(skin, headBase, seed));
  if (!monastic) parts.push(hairGeometry(headBase, seed, rng.pick(['#302c29', '#544238', '#8b8170', '#594b40'])));
  if (hat) parts.push(hatGeometry(headBase + .22));
  if (monastic) parts.push(drapedSkirt(seated, shift, robe, seed, tea));
  for (const side of [-1, 1]) parts.push(...arm(side, seated, tea, shift, monastic ? robe : shirt, skin));
  if (seated) parts.push(...seatedLegs(tea, monastic ? robe : pants, skin));
  const body = new THREE.Group();
  const mesh = new THREE.Mesh(merge(parts), paint({})); mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh);
  const legs = [];
  if (!seated) for (const side of [-1, 1]) { const leg = standingLeg(side, pants, skin, monastic); body.add(leg); legs.push(leg); }
  const group = new THREE.Group(); group.add(body);
  group.userData.body = body; group.userData.legs = legs; group.userData.seated = seated;
  group.scale.set(rng.range(.95, 1.06), rng.range(.95, 1.04), rng.range(.96, 1.04));
  return group;
}
