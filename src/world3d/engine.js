// The 3D engine: renderer, camera, lights, sky, fog and the time-of-day grade.
import * as THREE from 'three';
import { buildSky, buildMountains } from './sky.js';
import { shared } from './materials.js';

// Sun / moon direction per time of day (unit-ish vectors, +x east)
const SUN = {
  dawn: [0.9, 0.12, -0.3], morning: [0.6, 0.65, -0.35], afternoon: [-0.55, 0.75, 0.2],
  evening: [-0.92, 0.1, 0.25], night: [0.3, 0.7, -0.4],
};
const FOG = { clear: [45, 430], overcast: [30, 300], mist: [30, 255], rain: [15, 190], snow: [15, 200] };

export const TIERS = {
  low:    { pixelRatio: 1,   shadows: 0,    antialias: false, trees: 0.55, grass: 0.35, photoW: 1200 },
  medium: { pixelRatio: 1.5, shadows: 1024, antialias: true,  trees: 0.8,  grass: 0.7,  photoW: 1500 },
  high:   { pixelRatio: 2,   shadows: 2048, antialias: true,  trees: 1,    grass: 1,    photoW: 1800 },
};

export class Engine {
  constructor(canvas, tierName) {
    this.tierName = tierName;
    this.tier = TIERS[tierName];
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.tier.antialias, powerPreference: 'default', preserveDrawingBuffer: false }));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = this.tier.shadows > 0;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 1200);
    this.scene.fog = new THREE.Fog(0xcfd8dc, 45, 430);

    this.hemi = new THREE.HemisphereLight(0xdfe8f0, 0x4a5a3a, 1.2);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    if (this.tier.shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(this.tier.shadows, this.tier.shadows);
      const s = this.sun.shadow.camera;
      s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 1; s.far = 260;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.04;
    }
    this.scene.add(this.sun, this.sun.target);

    const sky = buildSky();
    this.sky = sky;
    this.scene.add(sky.mesh);
    this.mountains = buildMountains();
    this.scene.add(this.mountains);
  }

  resize(w, h, pixelRatio) {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Apply light and air for a time + weather (atm from world/atmosphere.js). */
  applyAtmosphere(atm, timeName, weather, interior) {
    const u = this.sky.uniforms;
    const SR = THREE.SRGBColorSpace;
    u.uTop.value.setRGB(...atm.skyTop, SR);
    u.uHor.value.setRGB(...atm.skyHor, SR);
    u.uSunCol.value.setRGB(...atm.sunCol, SR);
    u.uCloudCol.value.setRGB(...atm.cloudCol, SR);
    u.uSunVis.value = atm.sunVis;
    u.uCloud.value = atm.cloud;
    u.uStars.value = atm.stars;
    const sd = new THREE.Vector3(...SUN[timeName]).normalize();
    u.uSunDir.value.copy(sd);
    this.sunDir = sd;

    // raw (display) colours for our own shaders; linear colours for three's lighting & fog
    const rawFog = new THREE.Color().setRGB(...atm.skyHor).lerp(new THREE.Color().setRGB(...atm.fog), 0.5);
    const fogCol = new THREE.Color().setRGB(rawFog.r, rawFog.g, rawFog.b, THREE.SRGBColorSpace);
    this.scene.fog.color.copy(fogCol);
    const [near, far] = FOG[weather] || FOG.clear;
    const night = timeName === 'night';
    this.scene.fog.near = near * (night ? 0.7 : 1);
    this.scene.fog.far = far * (night ? 0.6 : 1) * (interior ? 1.4 : 1);

    const S = (a) => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
    const tint = new THREE.Color().setRGB(...atm.tint);
    this.hemi.color.copy(S(atm.skyTop)).lerp(S(atm.skyHor), 0.6).multiply(tint).multiplyScalar(1.1);
    this.hemi.groundColor.set(0x3d4a30).multiply(tint);
    this.hemi.intensity = night ? 1.6 : 0.55 + 0.9 * Math.min(1, atm.daylight + 0.15);
    this.sun.color.copy(S(atm.sunCol));
    this.sun.intensity = night ? 0.8 : 0.4 + 2.4 * atm.sunVis * Math.max(0.25, atm.daylight);
    if (night) this.sun.color.set(0x9fb2e0);
    this.renderer.toneMappingExposure = atm.exposure * (night ? 1.6 : 1.05);

    const mu = this.mountains.userData.uniforms;
    mu.uTint.value.copy(tint).multiplyScalar(night ? 1.2 : 1);
    mu.uHaze.value.copy(fogCol);
    mu.uHazeAmt.value = Math.min(0.72, 0.18 + atm.fogAmt * 0.55 + (weather === 'mist' ? 0.16 : 0) + (weather === 'rain' ? 0.2 : 0));
    shared.uWind.value = atm.wind;
  }

  /** Keep the shadow camera centred on the player. */
  followShadow(x, y, z) {
    if (!this.sunDir) return;
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + this.sunDir.x * 120, y + Math.max(0.15, this.sunDir.y) * 120, z + this.sunDir.z * 120);
  }

  tick(t) {
    shared.uTime.value = t;
    this.sky.uniforms.uTime.value = t;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
