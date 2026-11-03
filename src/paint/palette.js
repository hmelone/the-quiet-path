// Base colours per season. Lighting (time, weather) is applied later by the
// colour-grading shader, so these are painted as if under soft daylight.
import { hex } from './brush.js';

const SPRING = {
  mossLight: hex('#9aae58'), moss: hex('#6f8f3e'), mossDark: hex('#3f5a2a'), mossDeep: hex('#2c4122'),
  grass: hex('#7f9c48'), fern: hex('#5f8a3a'),
  cedar: hex('#2f4a39'), cedarLight: hex('#4c6a4c'), cedarFar: hex('#5d7473'),
  leaf: [hex('#7fa449'), hex('#98b55a'), hex('#5f8a3a'), hex('#b3c066'), hex('#4f7434')],
  leafRed: [hex('#8e3226'), hex('#a8442e'), hex('#6d2a22')],
  pine: hex('#2d4634'), pineLight: hex('#557452'),
  azalea: hex('#4f6d3a'), azaleaFlower: hex('#d76f8a'),
  stone: hex('#8d8a80'), stoneLight: hex('#b7b2a4'), stoneDark: hex('#57554f'),
  wood: hex('#6b5240'), woodLight: hex('#8f735a'), woodDark: hex('#3b2d24'), woodGrey: hex('#857a6c'),
  roof: hex('#4b4e52'), roofLight: hex('#6c7075'), bark: hex('#4a3a2e'),
  plaster: hex('#d9cfba'), plasterShade: hex('#b8ad98'),
  shoji: hex('#efe7d4'), tatami: hex('#b9ad78'), tatamiEdge: hex('#3e3a30'),
  ridgeFar: hex('#7d93ad'), ridgeMid: hex('#5d7677'), ridgeNear: hex('#4f675c'),
  water: hex('#3f5a58'), iris: hex('#5a4a9a'), camellia: hex('#b8283a'),
  soil: hex('#6a5a44'), gravel: hex('#b5ad9c'),
};

export function palette(season = 'spring') {
  // Later iterations add summer / autumn / winter variations.
  return SPRING;
}
