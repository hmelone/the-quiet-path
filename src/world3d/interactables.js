// Everything you can approach: look, go (signposts & doors), sit, talk, bell.
// Each has an icon position, a place to stand, and a script to run.
import { groundAt, inBuilding } from './terrain.js';
import { ZONES, BUILDINGS, PADS, WATER_Y } from './layout.js';
import { SEEDLING_SPOT, LOTUS_SPOT } from './changing.js';

export const KINDS = {
  look: { icon: 'eye', verb: 'Look' },
  go: { icon: 'walk', verb: 'Go' },
  sit: { icon: 'lotus', verb: 'Sit' },
  talk: { icon: 'talk', verb: 'Talk' },
  bell: { icon: 'bell', verb: 'Bell' },
};

const at = (x, z, dy = 1.3) => ({ x, z, y: groundAt(x, z) + dy });

export function buildInteractables(built, people) {
  const H = BUILDINGS.hall, hallFloor = PADS.hall.h + H.floor;
  const tea = built.tea.spots, hut = built.hut.spots;
  const tw = PADS.tower;
  const list = [
    // the gate
    { id: 'gateBoard', kind: 'look', label: 'Board on the gate', ...at(0, -72, 3.2), stand: [0, -69.5], script: 'gateBoard' },
    { id: 'stone', kind: 'look', label: 'A stone with writing', ...at(3.6, -64.5, 0.9), stand: [2.4, -63], script: 'phraseStone' },
    { id: 'roadDown', kind: 'look', label: 'The road back down', ...at(0, -77.5, 1.2), stand: [0, -75.5], script: 'roadDown' },
    { id: 'signGate', kind: 'go', label: 'Down to the meditation hall', ...at(1.8, -67, 1.4), to: [3, -6], toName: 'the meditation hall' },
    // forest and stream
    { id: 'stream', kind: 'look', label: 'The stream', ...at(-21, -30, 0.8), stand: [-17.5, -30], script: 'stream' },
    { id: 'cedar', kind: 'look', label: 'An old cedar', ...at(9.5, -51, 2), stand: [7.4, -52], script: 'cedar' },
    // bell tower
    { id: 'bigBell', kind: 'bell', label: 'The great bell', x: tw.x, z: tw.z, y: tw.h + 3.4, stand: [tw.x + 1.4, tw.z + 2.6], script: 'towerBell' },
    { id: 'towerBench', kind: 'sit', label: 'Bench with a view', ...at(-12, -33, 1.0), stand: [-11.5, -32], script: 'sitTower' },
    // the hall
    { id: 'hallDoor', kind: 'go', label: 'Enter the meditation hall', x: H.x, z: H.z + H.d / 2 + 0.5, y: hallFloor + 2.2, to: [H.x, H.z + 1.5], toName: 'inside the hall', faceTo: [H.x, H.z - 4] },
    // several cushions to choose from, all facing the altar
    ...built.hall.seats.map((c) => ({ id: c.id, kind: 'sit', label: c.label, x: c.x, z: c.z, y: hallFloor + 0.7, stand: c.stand, seat: c, script: 'sitHall' })),
    { id: 'altar', kind: 'look', label: 'The altar', x: H.x, z: H.z - H.d / 2 + 0.8, y: hallFloor + 1.5, stand: [H.x, H.z - 1.5], script: 'altar' },
    { id: 'bowlBell', kind: 'look', label: 'The bell bowl', x: H.x - 2.2, z: H.z - H.d / 2 + 1.2, y: hallFloor + 0.8, stand: [H.x - 1.6, H.z - 1.4], script: 'bellBowl' },
    { id: 'callig', kind: 'look', label: 'Brushed words', x: H.x - H.w / 2 + 0.2, z: H.z, y: hallFloor + 2.75, stand: [H.x - 3, H.z], script: 'calligraphy' },
    { id: 'cat', kind: 'look', label: 'A cat on the veranda', x: H.x + 4.2, z: H.z + H.d / 2 + 0.9, y: hallFloor + 0.6, stand: [H.x + 3, H.z + H.d / 2 + 2.2], script: 'cat', visible: (c) => c.time >= 2 || c.time === 0 },
    { id: 'hallBench', kind: 'sit', label: 'Bench by the hall', ...at(6, -4.5, 1.0), stand: [6, -3.5], script: 'sitHallYard' },
    { id: 'signHall', kind: 'go', label: 'To the lotus pond', ...at(0.5, -2.8, 1.4), to: [-5, 4], toName: 'the lotus pond' },
    { id: 'signHall2', kind: 'go', label: 'Up to the bell tower', ...at(-1.6, -27, 1.4), to: [-12.5, -36.5], toName: 'the bell tower' },
    { id: 'signHall3', kind: 'go', label: 'Up the forest path to the gate', ...at(4.8, -24, 1.4), to: [0.5, -68], toName: 'the gate' },
    // the pond
    { id: 'bridge', kind: 'look', label: 'Middle of the bridge', x: 6, z: 12, y: 3.6, stand: [6, 12], script: 'bridge' },
    { id: 'lotus', kind: 'look', label: 'Lotus flowers', ...at(-1.5, 10, 0.4), stand: [-5.6, 8.8], script: 'lotus' },
    { id: 'koi', kind: 'look', label: 'Shapes beneath the water', ...at(12, 15, 0.2), stand: [17.5, 15], script: 'koi' },
    { id: 'heron', kind: 'look', label: 'A heron', ...at(1.6, 18.5, 1.6), stand: [-1.5, 21], script: 'heron', visible: (c) => c.time >= 1 && c.time <= 3 },
    { id: 'frog', kind: 'look', label: 'Something on a lotus leaf', ...at(12.5, 16.5, 0.3), stand: [17.5, 16], script: 'frog', visible: (c) => c.weather === 'rain' || c.flags.rainedYesterday },
    { id: 'pondBench', kind: 'sit', label: 'Bench by the water', ...at(-8, 6, 1.0), stand: [-8.6, 5], script: 'sitPond' },
    { id: 'signPond', kind: 'go', label: 'To the tea house', ...at(-3, 27.5, 1.4), to: tea.front ? [tea.front.x + 1, tea.front.z + 0.5] : [-14, 50], toName: 'the tea house' },
    { id: 'signPond2', kind: 'go', label: 'To your hut', ...at(11.5, 27, 1.4), to: [19, 39], toName: 'your hut' },
    { id: 'signPond3', kind: 'go', label: 'Back up to the hall', ...at(-2.8, 24, 1.4), to: [3, -6], toName: 'the meditation hall' },
    // the tea house and orchard
    { id: 'bowl', kind: 'look', label: 'Something on the low wall', x: tea.wall.x, z: tea.wall.z, y: groundAt(tea.wall.x, tea.wall.z) + 0.9, stand: [tea.wall.x + 1.4, tea.wall.z + 0.6], script: 'bowl', visible: (c) => !c.flags.bowl },
    { id: 'kitchen', kind: 'look', label: 'Kitchen door', x: tea.door.x, z: tea.door.z, y: groundAt(tea.door.x, tea.door.z) + 1.8, stand: [tea.peek.x, tea.peek.z], peek: tea.peek.yaw, script: 'kitchen' },
    { id: 'teaTable', kind: 'sit', label: 'Sit for tea', x: tea.table.x, z: tea.table.z, y: groundAt(tea.table.x, tea.table.z) + 1.1, stand: [tea.table.x + 0.2, tea.table.z + 1.1], script: 'tea' },
    { id: 'hien', kind: 'talk', label: 'Sister Hien', dynamic: () => people.hien?.fig, script: 'hien', visible: () => !!people.hien },
    { id: 'plum', kind: 'look', label: 'Plum trees', ...at(-27, 31, 2.2), stand: [-25, 33.2], script: 'plum' },
    { id: 'lavender', kind: 'look', label: 'Lavender rows', ...at(-3, 47, 0.8), stand: [-2.5, 44], script: 'lavender' },
    { id: 'signTea', kind: 'go', label: 'Back to the pond', ...at(-9.5, 32.5, 1.4), to: [-4, 24], toName: 'the lotus pond' },
    // your hut
    { id: 'hutDoor', kind: 'go', label: 'Into your hut', x: hut.door.x, z: hut.door.z + 0.6, y: groundAt(hut.door.x, hut.door.z) + 2.3, to: [BUILDINGS.hut.x, BUILDINGS.hut.z - 0.2], toName: 'inside your hut' },
    { id: 'futon', kind: 'look', label: 'Your futon (rest)', x: hut.futon.x, z: hut.futon.z, y: PADS.hut.h + 0.9, stand: [BUILDINGS.hut.x - 0.2, BUILDINGS.hut.z + 0.4], script: 'futon' },
    { id: 'desk', kind: 'look', label: 'Your desk', x: hut.desk.x, z: hut.desk.z, y: PADS.hut.h + 1.1, stand: [BUILDINGS.hut.x + 0.3, BUILDINGS.hut.z + 0.6], script: 'desk' },
    { id: 'smallBell', kind: 'bell', label: 'Small bell (let time pass)', x: hut.desk.x - 0.3, z: hut.desk.z - 0.1, y: PADS.hut.h + 0.95, stand: [BUILDINGS.hut.x + 0.3, BUILDINGS.hut.z + 0.6], script: 'smallBell' },
    { id: 'note', kind: 'look', label: 'A folded note', x: hut.desk.x + 0.2, z: hut.desk.z, y: PADS.hut.h + 0.85, stand: [BUILDINGS.hut.x + 0.3, BUILDINGS.hut.z + 0.6], script: 'note', visible: (c) => !!c.flags.noteWaiting },
    { id: 'darkroom', kind: 'look', label: 'Darkroom corner', x: hut.darkroom.x, z: hut.darkroom.z, y: PADS.hut.h + 1.6, stand: [BUILDINGS.hut.x, BUILDINGS.hut.z - 0.6], script: 'darkroom' },
    { id: 'signHut', kind: 'go', label: 'Back to the pond', ...at(15.8, 34, 1.4), to: [12, 25], toName: 'the lotus pond' },
    // --- things that change from day to day ---
    { id: 'lotusBud', kind: 'look', label: 'A single lotus', x: LOTUS_SPOT.x, z: LOTUS_SPOT.z, y: WATER_Y + 1.0, stand: [3, 11.5], script: 'lotusBud' },
    { id: 'seedlings', kind: 'look', label: 'Young plum seedlings', ...at(SEEDLING_SPOT.x + 1.1, SEEDLING_SPOT.z, 1.0), stand: [SEEDLING_SPOT.x + 1.1, SEEDLING_SPOT.z + 1.6], script: 'seedlings' },
    { id: 'pebbleBag', kind: 'look', label: 'A small cloth bag on the bench', x: built.benches[0].x + 0.3, z: built.benches[0].z, y: groundAt(built.benches[0].x, built.benches[0].z) + 0.9, script: 'pebbleBag',
      visible: (c) => c.day >= 2 && (!c.flags.pebbles || (c.flags.pebbles === 'left' && c.day <= (c.flags.pebbleDay ?? 0))) },
    { id: 'pebble', kind: 'look', label: 'A pebble on the bench', x: built.benches[0].x - 0.2, z: built.benches[0].z, y: groundAt(built.benches[0].x, built.benches[0].z) + 0.85, script: 'pebble',
      visible: (c) => c.flags.pebbles === 'left' && c.day > (c.flags.pebbleDay ?? 99) && !c.flags.keptPebble },
    { id: 'mendedBowl', kind: 'look', label: 'The tea bowl, mended', x: tea.table2.x, z: tea.table2.z, y: groundAt(tea.table2.x, tea.table2.z) + 1.2, script: 'mendedBowl',
      visible: (c) => !!c.flags.bowl && c.day >= (c.flags.bowlDay ?? 99) + 2 },
    { id: 'joinWalk', kind: 'go', label: 'Join the walking meditation', join: true, iconY: 2.2,
      dynamic: () => { const w = people.list.filter((p) => p.mode === 'loop'); return w.length ? w[w.length - 1].fig : null; },
      visible: () => people.list.some((p) => p.mode === 'loop') },
  ];
  return list;
}

/** Which zone is the player in? */
export function zoneAt(x, z) {
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (id !== 'tea' && inBuilding(b, x, z, 0.2)) return ZONES.find((zz) => zz.interior === id);
  }
  let best = null;
  for (const zz of ZONES) {
    if (zz.interior || zz.id === 'valley') continue;
    const d = Math.hypot(x - zz.x, z - zz.z);
    if (d < zz.r && (!best || d / zz.r < best.k)) best = { zz, k: d / zz.r };
  }
  return best ? best.zz : ZONES[ZONES.length - 1];
}
