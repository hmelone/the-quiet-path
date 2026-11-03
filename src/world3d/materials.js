// Painterly materials: soft banded ("toon") shading over vertex colours,
// with optional wind sway injected into the vertex shader.
import * as THREE from 'three';

let gradient = null;
function gradientMap() {
  if (gradient) return gradient;
  // five soft light bands; LinearFilter keeps the steps gentle, like brushed values
  const data = new Uint8Array([70, 120, 170, 215, 255].flatMap((v) => [v, v, v, 255]));
  gradient = new THREE.DataTexture(data, 5, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.LinearFilter;
  gradient.magFilter = THREE.LinearFilter;
  gradient.needsUpdate = true;
  return gradient;
}

export const shared = {
  uTime: { value: 0 },
  uWind: { value: 0.5 },
};

/**
 * @param {object} o
 *  color, vertexColors, sway (0..1: how much the top moves), swayHeight (metres to full sway),
 *  emissive, map, transparent, side
 */
export function paint(o = {}) {
  const m = new THREE.MeshToonMaterial({
    color: o.color ?? 0xffffff,
    vertexColors: o.vertexColors ?? true,
    gradientMap: gradientMap(),
    map: o.map || null,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: !!o.transparent,
    opacity: o.opacity ?? 1,
    alphaTest: o.alphaTest ?? 0,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.sway) {
    const amt = o.sway, h = o.swayHeight ?? 4;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = shared.uTime;
      sh.uniforms.uWind = shared.uWind;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          {
            vec3 ip = vec3(0.0);
            #ifdef USE_INSTANCING
              ip = instanceMatrix[3].xyz;
            #endif
            float k = clamp(position.y / ${h.toFixed(2)}, 0.0, 1.0);
            k *= k;
            float ph = ip.x * 0.37 + ip.z * 0.29;
            float gust = sin(uTime * 0.9 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7 + position.x) * 0.25;
            float flutter = sin(uTime * 6.0 + position.x * 3.0 + position.z * 2.0) * 0.08;
            float a = ${amt.toFixed(3)} * (0.25 + uWind) * k;
            transformed.x += (gust + flutter) * a;
            transformed.z += (gust * 0.6 - flutter) * a * 0.7;
          }`);
    };
    m.customProgramCacheKey = () => `sway${amt}-${h}`;
  }
  return m;
}
