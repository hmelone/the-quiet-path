// The valley's layout: one source of truth for where everything is.
// Units are metres. +x east, +z south (down-valley), y up.
// The gate is high in the north; the orchard and your hut are low in the south.

export const BOUNDS = { x0: -95, x1: 95, z0: -95, z1: 75 };
export const WATER_Y = 1.2;

/** Building / feature pads: the terrain is flattened to `h` within `r`. */
export const PADS = {
  gate:    { x: 0, z: -72, r: 9, h: null },
  tower:   { x: -17, z: -36, r: 7, h: null },
  hall:    { x: 3, z: -16, r: 15, h: null },
  pond:    { x: 6, z: 12, r: 15, h: null },
  tea:     { x: -16, z: 40, r: 12, h: null },
  hut:     { x: 20, z: 44, r: 7, h: null },
};

/** Walkable paths (centre polylines). surface: gravel | stone | wood */
export const PATHS = [
  { id: 'forest', surface: 'stone', width: 2.4, pts: [[0, -74], [2, -64], [7, -56], [4, -47], [-3, -40], [-6, -32], [-1, -25], [3, -22]] },
  { id: 'tower', surface: 'gravel', width: 1.6, pts: [[-4, -38], [-10, -38], [-15, -36.5]] },
  { id: 'hallToPond', surface: 'gravel', width: 2.2, pts: [[3, -9], [2, -3], [-4, 2], [-8, 10], [-6, 19], [-2, 26]] },
  { id: 'pondLoopE', surface: 'gravel', width: 1.8, pts: [[3, -3], [12, -2], [20, 4], [22, 13], [19, 21], [10, 25], [-2, 26]] },
  { id: 'toTea', surface: 'gravel', width: 2.2, pts: [[-2, 26], [-7, 31], [-12, 34]] },
  { id: 'toHut', surface: 'gravel', width: 1.6, pts: [[10, 25], [15, 33], [19, 39]] },
  { id: 'orchard', surface: 'grass', width: 1.4, pts: [[-12, 34], [-24, 33], [-34, 36], [-40, 44], [-34, 52], [-22, 52], [-14, 48]] },
];

/** The pond: an irregular ellipse. */
export const POND = { x: 6, z: 12, rx: 11, rz: 8.5 };
export function pondDist(x, z) {
  const a = Math.atan2(z - POND.z, x - POND.x);
  const wob = 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2);
  const dx = (x - POND.x) / (POND.rx * wob), dz = (z - POND.z) / (POND.rz * wob);
  return Math.sqrt(dx * dx + dz * dz); // < 1 inside
}

/** A small stream from the forest down into the pond. */
export const STREAM = [[-30, -60], [-26, -48], [-22, -34], [-20, -20], [-14, -8], [-6, 2], [0, 7]];

/** Bridge across the pond (wooden, walkable). */
export const BRIDGE = { x0: -4.5, z0: 9, x1: 16.5, z1: 15, width: 1.8 };

/** Rectangular building footprints. doors are openings in the walls (walkable). */
export const BUILDINGS = {
  hall: { x: 3, z: -17, w: 14, d: 9, rot: 0, floor: 0.45, door: { side: 'south', w: 5 } },
  tea:  { x: -17, z: 41, w: 9, d: 6.5, rot: 0.08, floor: 0.2, door: { side: 'east', w: 1.6 } },
  hut:  { x: 20, z: 45, w: 4.4, d: 4.0, rot: -0.15, floor: 0.3, door: { side: 'north', w: 1.2 } },
};

/** Areas of the valley; the nearest/containing one names where you are. */
export const ZONES = [
  { id: 'gate', name: 'The mountain gate', x: 0, z: -66, r: 14 },
  { id: 'forest', name: 'The forest path', x: 3, z: -50, r: 14 },
  { id: 'tower', name: 'The bell tower', x: -16, z: -36, r: 9 },
  { id: 'hallYard', name: 'Before the meditation hall', x: 3, z: -6, r: 9 },
  { id: 'hall', name: 'The meditation hall', x: 3, z: -17, r: 0, interior: 'hall' },
  { id: 'pond', name: 'The lotus pond', x: 6, z: 13, r: 15 },
  { id: 'tea', name: 'The tea house', x: -15, z: 38, r: 11 },
  { id: 'orchard', name: 'The plum orchard', x: -30, z: 44, r: 16 },
  { id: 'hut', name: 'Your hut', x: 20, z: 45, r: 0, interior: 'hut' },
  { id: 'hutYard', name: 'Outside your hut', x: 19, z: 38, r: 8 },
  { id: 'valley', name: 'The valley', x: 0, z: 0, r: 999 },
];

export const START = { x: 0.5, z: -70, yaw: Math.PI }; // at the gate, facing down the valley
