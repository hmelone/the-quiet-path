// Original wildlife sculpts. Cross-section lofts give each species its own
// anatomy instead of stacking visible spheres, cones and cylindrical sticks.
// Forward is +X; all colour detail is baked into mobile-friendly merged meshes.
import * as THREE from 'three';
import { colorize, merge } from './geo.js';

const C = (s) => new THREE.Color(s);
const mix = (a, b, k) => C(a).lerp(C(b), THREE.MathUtils.clamp(k, 0, 1));

/** Smoothly connect elliptical cross-sections along a curved anatomical axis.
 * Each station is [x,y,z, radiusInBendPlane, radiusAcross]. */
function loft(stations, colour, sides = 12) {
  const pos = [], index = [], up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < stations.length; i++) {
    const p = new THREE.Vector3(...stations[i].slice(0, 3));
    const a = stations[Math.max(0, i - 1)], b = stations[Math.min(stations.length - 1, i + 1)];
    const tangent = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const u = new THREE.Vector3().crossVectors(up, tangent).normalize();
    if (u.lengthSq() < 0.001) u.set(1, 0, 0);
    const v = new THREE.Vector3().crossVectors(tangent, u).normalize();
    for (let j = 0; j < sides; j++) {
      const ang = j / sides * Math.PI * 2;
      const q = p.clone().addScaledVector(u, Math.cos(ang) * stations[i][3]).addScaledVector(v, Math.sin(ang) * stations[i][4]);
      pos.push(q.x, q.y, q.z);
      if (i < stations.length - 1) {
        const k = i * sides + j, n = i * sides + (j + 1) % sides;
        index.push(k, n, k + sides, n, n + sides, k + sides);
      }
    }
  }
  // Seal the ends; tiny first/last sections avoid pinched, needle-like poles.
  for (const ring of [0, stations.length - 1]) {
    const center = pos.length / 3;
    pos.push(...stations[ring].slice(0, 3));
    for (let j = 0; j < sides; j++) {
      const a = ring * sides + j, b = ring * sides + (j + 1) % sides;
      index.push(...(ring ? [center, a, b] : [center, b, a]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index); g.computeVertexNormals();
  return colorize(g, colour);
}

// A folded, tapered leaf surface: useful for real ears, folded wings and fins.
function leaf(base, tip, width, col, { side = [0, 0, 1], fold = 0.02 } = {}) {
  const a = new THREE.Vector3(...base), b = new THREE.Vector3(...tip), d = b.clone().sub(a);
  const v = new THREE.Vector3(...side).normalize().multiplyScalar(width);
  const mid = a.clone().addScaledVector(d, 0.48);
  const ridge = mid.clone().add(new THREE.Vector3(0, fold, 0));
  const pts = [a.clone().addScaledVector(v, -0.25), a.clone().addScaledVector(v, 0.25),
    mid.clone().sub(v), mid.clone().add(v), ridge, b];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(p => p.toArray()), 3));
  g.setIndex([0, 1, 4, 0, 4, 2, 1, 3, 4, 2, 4, 5, 4, 3, 5]);
  g.computeVertexNormals();
  return colorize(g, col);
}

// Flush elliptical patches read as recessed eyes, never a ball attached to a face.
function eye(x, y, z, rx, ry, side = 1, col = '#24271f') {
  const g = new THREE.CircleGeometry(1, 10);
  g.scale(rx, ry, 1); if (side < 0) g.rotateY(Math.PI);
  g.translate(x, y, z);
  return colorize(g, col);
}

function leg(nodes, col, hoof = '#39352b', thickness = 1) {
  return loft(nodes.map(([x,y,z,r]) => [x,y,z,r * thickness,r * thickness * 0.83]),
    (x,y,z) => y < 0.095 ? C(hoof) : typeof col === 'function' ? col(x,y,z) : C(col), 8);
}

// Record only limb vertices, so a small gait can keep a single merged mesh.
function addLimb(parts, limbs, geometry, pivot, phase) {
  const start = parts.reduce((sum, g) => sum + g.attributes.position.count, 0);
  limbs.push({ start, count: geometry.attributes.position.count, pivot, phase });
  parts.push(geometry);
}

function walkingMesh(parts, limbs) {
  const g = merge(parts);
  g.userData.walk = {
    limbs,
    rest: g.attributes.position.array.slice(),
    normals: g.attributes.normal.array.slice(),
  };
  g.attributes.position.setUsage(THREE.DynamicDrawUsage);
  g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
  return g;
}

export function deerGeo() {
  const limbs = [];
  const coat = (x,y,z) => mix('#947252', '#d2c4a6', Math.max(0, 0.9-y)*3.8);
  const p = [loft([
    [-0.71,1.0,0,.025,.025],[-0.60,.99,0,.16,.14],[-0.43,1.02,0,.27,.24],
    [-0.18,1.00,0,.245,.20],[.10,1.01,0,.23,.18],[.34,1.03,0,.29,.205],
    [.49,1.03,0,.20,.16],[.58,1.05,0,.07,.08],
  ],coat,16)];
  for (const side of [-1,1]) {
    const phase = side < 0 ? 0 : Math.PI;
    addLimb(p, limbs, leg([[-.43,1.03,side*.16,.14],[-.35,.74,side*.17,.095],[-.31,.59,side*.17,.055],[-.49,.30,side*.16,.035],[-.45,.10,side*.16,.025],[-.43,.035,side*.16,.045]],coat), [-.43,1.03,side*.16], phase);
    addLimb(p, limbs, leg([[.35,1.01,side*.15,.09],[.39,.71,side*.15,.052],[.31,.53,side*.15,.035],[.33,.12,side*.15,.022],[.39,.035,side*.15,.043]],coat), [.35,1.01,side*.15], phase + Math.PI*.7);
  }
  p.push(loft([[-.60,1.10,0,.065,.055],[-.76,1.01,0,.055,.055],[-.78,.89,0,.025,.03]],'#c9c2aa',10));
  return walkingMesh(p, limbs);
}

// Includes the whole neck, so grazing pivots at the shoulder with no floating head.
export function deerHeadGeo() {
  const p = [loft([[0,0,0,.14,.13],[.10,.22,0,.13,.10],[.15,.41,0,.095,.075],[.20,.48,0,.08,.075]],'#997758',14),
    loft([[.10,.47,0,.04,.05],[.20,.51,0,.13,.09],[.32,.49,0,.11,.075],[.43,.43,0,.055,.05],[.51,.40,0,.035,.042]],
      (x,y,z)=>x>.47?C('#3b372c'):mix('#967254','#c4b18b',Math.max(0,.48-y)*5),14)];
  for (const s of [-1,1]) {
    p.push(leaf([.15,.59,s*.055],[.03,.86,s*.17],.072,'#a58b6d',{side:[1,0,0],fold:.012}));
    p.push(leaf([.15,.62,s*.064],[.05,.82,s*.164],.042,'#c4ae93',{side:[1,0,0],fold:.013}));
    p.push(eye(.29,.54,s*.082,.018,.012,s));
  }
  return merge(p);
}

export function heronGeo() {
  const p = [loft([[-.39,.96,0,.025,.025],[-.24,1.02,0,.145,.12],[-.05,1.04,0,.22,.16],[.15,1.01,0,.18,.11],[.27,1.05,0,.075,.07]],
    (x,y,z)=>mix('#71818a','#b8c1bd',Math.max(0,y-.95)*3),14)];
  // S-curved neck folds back over the breast then forward into the skull.
  p.push(loft([[.16,1.02,0,.09,.075],[.24,1.15,0,.06,.05],[.12,1.32,0,.047,.04],[.13,1.50,0,.045,.04],[.28,1.61,0,.06,.05],[.39,1.59,0,.065,.045]],'#c3c8be',12));
  p.push(loft([[.35,1.61,0,.055,.043],[.44,1.59,0,.04,.035],[.70,1.56,0,.002,.002]],(x)=>C(x>.43?'#b7a169':'#d0d0bf'),10));
  for (const s of [-1,1]) {
    p.push(leaf([.14,1.12,s*.13],[-.37,.91,s*.12],.115,'#73818a',{side:[0,1,0],fold:.015}));
    p.push(leg([[.02,.92,s*.07,.018],[-.03,.45,s*.07,.015],[.03,.10,s*.07,.010],[.02,.025,s*.07,.012]],'#776a4f','#776a4f'));
    for(const dz of [-.035,.03])p.push(loft([[.02,.035,s*.07,.012,.008],[.14,.018,s*.07+dz,.004,.004]],'#776a4f',6));
    p.push(eye(.41,1.62,s*.034,.009,.009,s,'#4c4529'));
  }
  return merge(p);
}

export function rabbitGeo() {
  const fur=(x,y,z)=>mix('#817b69','#c6c1ab',Math.max(0,.23-y)*2.8);
  const p=[loft([[-.24,.18,0,.025,.025],[-.17,.23,0,.18,.13],[-.04,.23,0,.17,.12],[.08,.23,0,.12,.085],[.15,.29,0,.09,.075],[.23,.30,0,.08,.065],[.31,.26,0,.04,.04]],fur,14)];
  for(const s of [-1,1]) {
    p.push(loft([[-.16,.18,s*.09,.11,.06],[-.06,.08,s*.10,.07,.055],[.08,.045,s*.10,.028,.04],[.15,.04,s*.10,.012,.025]],fur,10));
    p.push(leg([[.12,.21,s*.055,.035],[.14,.08,s*.055,.022],[.22,.025,s*.055,.025]],fur,'#a69c86'));
    p.push(leaf([.13,.36,s*.044],[.06,.62,s*.09],.046,'#8d8776',{side:[1,0,0],fold:.008}));
    p.push(leaf([.13,.38,s*.048],[.07,.59,s*.088],.023,'#b6a196',{side:[1,0,0],fold:.009}));
    p.push(eye(.238,.325,s*.060,.012,.010,s));
  }
  p.push(loft([[-.21,.21,0,.035,.04],[-.29,.24,0,.05,.045],[-.31,.28,0,.015,.02]],'#ddd7c4',10));
  return merge(p);
}

export function foxGeo() {
  const limbs = [];
  const fur=(x,y,z)=>mix('#ae7850','#ddd1b5',Math.max(0,.42-y)*5);
  const p=[loft([[-.39,.43,0,.025,.025],[-.29,.45,0,.145,.12],[-.07,.44,0,.13,.10],[.16,.47,0,.17,.105],[.28,.55,0,.12,.085],[.34,.61,0,.115,.085],[.45,.59,0,.075,.07],[.59,.55,0,.025,.029]],
    (x,y,z)=>x>.55?C('#383b31'):fur(x,y,z),14)];
  for (const s of [-1,1]) {
    const phase = s < 0 ? 0 : Math.PI;
    addLimb(p, limbs, leg([[-.25,.45,s*.085,.075],[-.14,.26,s*.09,.045],[-.26,.12,s*.09,.021],[-.23,.027,s*.09,.028]],fur,'#4b4438'), [-.25,.45,s*.085], phase);
    addLimb(p, limbs, leg([[.17,.47,s*.075,.055],[.18,.25,s*.075,.035],[.14,.08,s*.075,.020],[.22,.025,s*.075,.029]],fur,'#4b4438'), [.17,.47,s*.075], phase + Math.PI);
    p.push(leaf([.29,.69,s*.055],[.26,.88,s*.085],.069,'#9c6a4b',{side:[1,0,0],fold:.008}));
    p.push(leaf([.29,.71,s*.059],[.265,.84,s*.083],.035,'#c2ab91',{side:[1,0,0],fold:.010}));
    p.push(eye(.433,.637,s*.069,.015,.010,s));
  }
  p.push(loft([[-.32,.48,0,.07,.07],[-.51,.40,0,.11,.10],[-.69,.28,0,.13,.11],[-.88,.23,0,.075,.065],[-.98,.25,0,.008,.008]],
    (x,y,z)=>x<-.80?C('#e2d8bf'):C('#a87954'),12));
  return walkingMesh(p, limbs);
}

export function catGeo() {
  const fur=(x,y,z)=>mix('#ad8c68','#cbbb9e',Math.max(0,.16-y)*4);
  const p=[loft([[-.30,.12,0,.025,.025],[-.21,.16,-.02,.13,.18],[.01,.15,-.04,.145,.18],[.18,.14,.02,.10,.12],[.27,.16,.07,.085,.08],[.34,.14,.08,.035,.05]],fur,14)];
  // Paws tucked under a sleeping cat, tail curled naturally beside the body.
  for(const s of [-1,1]) {
    p.push(loft([[.08,.08,s*.08,.035,.03],[.26,.045,s*.09,.025,.035]],'#c1ad8e',10));
    p.push(leaf([.23,.22,.07+s*.045],[.20,.34,.07+s*.060],.044,'#a78764',{side:[1,0,0],fold:.008}));
    p.push(eye(.296,.17,.08+s*.071,.020,.0025,s,'#645947'));
  }
  p.push(loft([[-.24,.13,-.11,.035,.035],[-.34,.08,-.19,.035,.035],[-.25,.045,-.25,.030,.03],[.02,.04,-.24,.026,.026],[.22,.05,-.15,.015,.015]],'#997d5b',10));
  return merge(p);
}

export function squirrelGeo() {
  const p=[loft([[-.12,.10,0,.02,.02],[-.06,.13,0,.085,.065],[.04,.14,0,.065,.05],[.10,.21,0,.055,.04],[.18,.21,0,.035,.03],[.22,.18,0,.008,.015]],'#967859',12),
    loft([[-.09,.14,0,.035,.03],[-.20,.26,0,.08,.065],[-.23,.41,0,.09,.065],[-.12,.49,0,.07,.05],[-.05,.44,0,.008,.008]],'#ad8e6b',12)];
  for(const s of [-1,1]) {
    p.push(leg([[-.045,.12,s*.045,.04],[.05,.025,s*.055,.025]],'#967859','#7e694f'));
    p.push(leg([[.10,.17,s*.035,.02],[.16,.08,s*.035,.012],[.21,.07,s*.035,.015]],'#ad9271','#7e694f'));
    p.push(leaf([.08,.25,s*.025],[.06,.33,s*.04],.025,'#8c7054',{side:[1,0,0],fold:.005}));
    p.push(eye(.159,.23,s*.035,.009,.008,s));
  }
  return merge(p);
}

export function koiGeo(seed=0) {
  const p=[loft([[-.34,0,0,.018,.016],[-.25,.005,0,.045,.045],[-.09,.01,0,.080,.092],[.10,.005,0,.085,.095],[.25,-.004,0,.060,.065],[.33,-.013,0,.025,.035]],
    (x,y,z)=>{
      const patch=Math.sin(x*12+seed*2)+Math.cos(z*18+seed);
      return patch>.7?C('#a97a51'):mix(seed%3===0?'#c4af7b':'#d5d1b7','#8a9c8d',Math.max(0,-y)*5);
    },16)];
  for(const s of [-1,1]) {
    p.push(leaf([.07,-.03,s*.07],[-.06,-.065,s*.22],.065,'#bcb292',{side:[1,0,0],fold:0}));
    p.push(eye(.245,.02,s*.062,.010,.008,s));
  }
  p.push(leaf([.12,.055,0],[-.15,.125,0],.075,'#b8b18f',{side:[1,0,0],fold:0}));
  return merge(p);
}
export function koiTailGeo() {
  return merge([
    leaf([0,0,0],[-.27,.005,-.15],.07,'#b6a78a',{side:[1,0,0],fold:0}),
    leaf([0,0,0],[-.27,.005,.15],.07,'#b6a78a',{side:[1,0,0],fold:0}),
  ]);
}

export function owlGeo() {
  const p=[loft([[0,-.18,0,.015,.015],[0,-.10,0,.15,.14],[0,.07,0,.19,.16],[0,.25,0,.17,.15],[0,.32,0,.09,.08]],
    (x,y,z)=>mix('#7f7866','#b6ad95',Math.max(0,z)*4),16)];
  // Flat facial discs sit within the head plumage, not popped-out eyeballs.
  for(const s of [-1,1]) {
    const disk=new THREE.CircleGeometry(1,14).scale(.069,.080,1).translate(s*.073,.22,.151);
    p.push(colorize(disk,'#b5ae97'));
    p.push(eye(s*.073,.22,.154,.018,.024,1,'#3d3e32'));
    p.push(leaf([s*.14,.15,.01],[s*.10,-.18,-.06],.075,'#756f5e',{side:[0,0,1],fold:.01}));
  }
  p.push(leaf([0,.20,.16],[0,.12,.20],.025,'#a09267',{side:[1,0,0],fold:0}));
  // A short natural branch supports the perched bird.
  p.push(loft([[-.42,-.23,0,.025,.025],[0,-.22,0,.034,.030],[.42,-.20,.02,.018,.019]],'#756451',8));
  return merge(p);
}

export function smallBirdGeo() {
  const p=[loft([[-.11,.07,0,.008,.008],[-.05,.10,0,.055,.045],[.02,.11,0,.06,.045],[.07,.15,0,.04,.033],[.13,.14,0,.012,.015],[.16,.13,0,.002,.002]],
    (x,y,z)=>x>.12?C('#8e825d'):mix('#706d5a','#b4aa8a',Math.max(0,.11-y)*9),12)];
  for(const s of [-1,1]) {
    p.push(leaf([.04,.135,s*.035],[-.12,.075,s*.032],.038,'#666959',{side:[0,1,0],fold:.005}));
    p.push(eye(.092,.165,s*.024,.005,.004,s));
    p.push(leg([[.015,.07,s*.022,.006],[0,.015,s*.025,.004],[.035,.008,s*.025,.004]],'#70654d','#70654d'));
  }
  return merge(p);
}
