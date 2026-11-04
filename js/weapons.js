import * as THREE from 'three';
import { box, tube, limb, radialSprite, clamp, damp, lerp } from './util.js';
import { KNIVES, KNIFE_BUILDERS, MELEES } from './knives.js';

// ---------------------------------------------------------------------------
// Weapon definitions
// spread values are cone half-angles in radians, recoil in degrees per shot
// ---------------------------------------------------------------------------
export const WEAPONS = {
  ar: {
    id: 'ar', name: 'VK-4 Vanguard', cls: 'Assault Rifle', slot: 'primary',
    desc: 'Reliable all-rounder. Controllable recoil, quick follow-up shots, 1.5x red dot.',
    auto: true, dmg: 29, head: 2.0, pellets: 1, rpm: 660, mag: 30, reload: 2.2,
    spread: { hip: 0.022, ads: 0.0015, move: 0.03, air: 0.08, bloom: 0.0025, bloomMax: 0.025 },
    recoil: { v: 0.85, h: 0.35, recover: 9 }, zoom: 1.5, adsTime: 0.2, equip: 0.45, speed: 0.95,
    sound: { crack: 1900, body: 1700, thump: 140, tail: 0.26, gain: 0.55 },
    hip: [0.2, -0.21, -0.58], ads: 0.34, kick: 0.035,
  },
  smg: {
    id: 'smg', name: 'K-7 Hornet', cls: 'SMG', slot: 'primary',
    desc: 'Blistering fire rate and mobility. Suppressed. Best for tracking at close range.',
    auto: true, dmg: 20, head: 1.75, pellets: 1, rpm: 900, mag: 32, reload: 1.8,
    spread: { hip: 0.016, ads: 0.006, move: 0.01, air: 0.05, bloom: 0.0015, bloomMax: 0.018 },
    recoil: { v: 0.45, h: 0.32, recover: 13 }, zoom: 1.25, adsTime: 0.14, equip: 0.35, speed: 1.06,
    sound: { crack: 3200, body: 1100, thump: 110, tail: 0.12, gain: 0.32 },
    hip: [0.19, -0.2, -0.5], ads: 0.33, kick: 0.025,
  },
  sniper: {
    id: 'sniper', name: 'LR-50 Longbow', cls: 'Sniper Rifle', slot: 'primary', bolt: true,
    desc: 'Bolt-action precision. One-shot headshots, 4.5x scope, punishing hipfire.',
    auto: false, dmg: 120, head: 2.5, pellets: 1, rpm: 46, mag: 5, reload: 3.0,
    spread: { hip: 0.09, ads: 0.0, move: 0.12, air: 0.25, bloom: 0, bloomMax: 0 },
    recoil: { v: 3.2, h: 0.8, recover: 6 }, zoom: 4.5, scope: true, adsTime: 0.3, equip: 0.6, speed: 0.88,
    sound: { crack: 1500, body: 1300, thump: 90, tail: 0.6, gain: 0.8, mech: 0.45 },
    hip: [0.21, -0.21, -0.62], ads: 0.3, kick: 0.07,
  },
  shotgun: {
    id: 'shotgun', name: 'SG-12 Breaker', cls: 'Shotgun', slot: 'primary', pump: true,
    desc: 'Pump-action, 9 pellets. Devastating up close, shell-by-shell reload.',
    auto: false, dmg: 13, head: 1.5, pellets: 9, rpm: 72, mag: 6, reload: 0.45, shellReload: true,
    spread: { hip: 0.06, ads: 0.045, move: 0.01, air: 0.02, bloom: 0, bloomMax: 0 },
    recoil: { v: 3.6, h: 1.0, recover: 7 }, zoom: 1.2, adsTime: 0.18, equip: 0.5, speed: 0.95,
    sound: { crack: 1200, body: 900, thump: 80, tail: 0.45, gain: 0.85, mech: 0.32 },
    hip: [0.2, -0.2, -0.55], ads: 0.33, kick: 0.08,
  },
  pistol: {
    id: 'pistol', name: 'P-9 Viper', cls: 'Sidearm', slot: 'secondary',
    desc: 'Accurate semi-auto sidearm. Fast draw, tight first-shot accuracy.',
    auto: false, dmg: 34, head: 2.0, pellets: 1, rpm: 420, mag: 12, reload: 1.3,
    spread: { hip: 0.008, ads: 0.002, move: 0.015, air: 0.05, bloom: 0.006, bloomMax: 0.03 },
    recoil: { v: 1.5, h: 0.5, recover: 11 }, zoom: 1.2, adsTime: 0.12, equip: 0.3, speed: 1.0,
    sound: { crack: 2600, body: 2100, thump: 180, tail: 0.18, gain: 0.5 },
    hip: [0.17, -0.17, -0.42], ads: 0.38, kick: 0.04,
  },
};

Object.assign(WEAPONS, KNIVES);

export const PRIMARIES = ['ar', 'smg', 'sniper', 'shotgun'];
export { MELEES };
export const SECONDARIES = ['pistol'];

// Normalised 0..1 ratings for the loadout screen
export function weaponRatings(w) {
  const dps = w.dmg * w.pellets * w.rpm / 60;
  return [
    ['Damage', clamp((w.dmg * w.pellets) / 120, 0.05, 1)],
    ['Fire rate', clamp(w.rpm / 900, 0.05, 1)],
    ['DPS', clamp(dps / 330, 0.05, 1)],
    ['Accuracy', clamp(1 - (w.spread.ads * 12 + w.recoil.v * 0.12), 0.05, 1)],
    ['Mobility', clamp((w.speed - 0.8) / 0.28, 0.05, 1)],
    ['Handling', clamp(1 - (w.adsTime + w.equip) / 1.0, 0.05, 1)],
  ];
}

// ---------------------------------------------------------------------------
// Materials (shared, so operator colours can be re-tinted live)
// ---------------------------------------------------------------------------
export const MATS = {
  metal: new THREE.MeshStandardMaterial({ color: 0x41454d, metalness: 0.75, roughness: 0.38 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6d727b, metalness: 0.9, roughness: 0.25 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x2e3036, metalness: 0.1, roughness: 0.7 }),
  tan: new THREE.MeshStandardMaterial({ color: 0x9c8462, metalness: 0.15, roughness: 0.7 }),
  olive: new THREE.MeshStandardMaterial({ color: 0x4f5a3c, metalness: 0.15, roughness: 0.7 }),
  slate: new THREE.MeshStandardMaterial({ color: 0x3c4552, metalness: 0.4, roughness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5a3a22, metalness: 0.0, roughness: 0.6 }),
  dot: new THREE.MeshBasicMaterial({ color: 0xff2030 }),
  sightGlow: new THREE.MeshBasicMaterial({ color: 0x40ff80 }),
  lens: new THREE.MeshStandardMaterial({ color: 0x0a2a3a, metalness: 1, roughness: 0.05, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  lensSolid: new THREE.MeshStandardMaterial({ color: 0x0b3346, metalness: 1, roughness: 0.05, emissive: 0x041824 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.9 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.8 }),
  cuff: new THREE.MeshStandardMaterial({ color: 0x00e0ff, roughness: 0.9, emissive: 0x00e0ff, emissiveIntensity: 0.15, envMapIntensity: 0.2 }),
};

function openTube(r, len, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18, 1, true), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function rail(parent, y, z0, z1) {
  box(0.03, 0.012, z1 - z0, MATS.metal, 0, y, (z0 + z1) / 2, parent);
  for (let z = z0 + 0.01; z < z1; z += 0.018) box(0.034, 0.006, 0.008, MATS.metal, 0, y + 0.008, z, parent);
}

// Each builder returns a group pointing down -Z with sight line at (0, sightY)
const BUILDERS = {
  ar(g) {
    box(0.064, 0.085, 0.4, MATS.tan, 0, 0, -0.12, g);           // receiver
    rail(g, 0.05, -0.32, 0.06);
    box(0.072, 0.072, 0.27, MATS.polymer, 0, -0.004, -0.45, g);  // handguard
    for (let i = 0; i < 4; i++) box(0.074, 0.012, 0.03, MATS.metal, 0, 0.018, -0.36 - i * 0.06, g);
    tube(0.011, 0.22, MATS.metal, 0, 0.004, -0.68, g);
    tube(0.018, 0.07, MATS.metal, 0, 0.004, -0.8, g);
    box(0.05, 0.085, 0.22, MATS.polymer, 0, -0.016, 0.18, g);   // stock
    box(0.056, 0.115, 0.03, MATS.polymer, 0, -0.024, 0.3, g);
    const grip = box(0.036, 0.11, 0.05, MATS.polymer, 0, -0.085, 0.03, g); grip.rotation.x = 0.3;
    box(0.012, 0.03, 0.05, MATS.metal, 0, -0.055, -0.03, g);     // trigger guard
    const mag = new THREE.Group(); mag.position.set(0, -0.045, -0.17); g.add(mag);
    const m = box(0.044, 0.17, 0.07, MATS.polymer, 0, -0.08, 0, mag); m.rotation.x = -0.22;
    // red dot optic
    box(0.03, 0.02, 0.05, MATS.metal, 0, 0.064, -0.1, g);
    openTube(0.024, 0.07, MATS.metal, 0, 0.088, -0.1, g);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), MATS.lens); lens.position.set(0, 0.088, -0.13); g.add(lens);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 10), MATS.dot); dot.position.set(0, 0.088, -0.128); g.add(dot);
    return { sightY: 0.088, muzzle: [0, 0.004, -0.85], mag, gripR: [0, -0.09, 0.04], gripL: [0, -0.04, -0.44] };
  },
  smg(g) {
    box(0.056, 0.08, 0.3, MATS.olive, 0, 0, -0.07, g);
    box(0.05, 0.03, 0.12, MATS.polymer, 0, -0.04, -0.26, g);
    tube(0.012, 0.06, MATS.metal, 0, 0.01, -0.25, g);
    tube(0.024, 0.2, MATS.polymer, 0, 0.01, -0.33, g);            // suppressor
    for (let i = 0; i < 3; i++) tube(0.026, 0.008, MATS.metal, 0, 0.01, -0.26 - i * 0.07, g);
    // wire stock
    box(0.008, 0.008, 0.2, MATS.metal, 0.022, 0.0, 0.17, g);
    box(0.008, 0.008, 0.2, MATS.metal, -0.022, 0.0, 0.17, g);
    box(0.052, 0.08, 0.016, MATS.polymer, 0, -0.02, 0.27, g);
    const grip = box(0.034, 0.1, 0.045, MATS.polymer, 0, -0.08, 0.04, g); grip.rotation.x = 0.25;
    const mag = new THREE.Group(); mag.position.set(0, -0.04, -0.1); g.add(mag);
    box(0.034, 0.2, 0.045, MATS.metal, 0, -0.1, 0, mag);
    // holo sight
    box(0.04, 0.012, 0.06, MATS.metal, 0, 0.046, -0.04, g);
    box(0.004, 0.045, 0.012, MATS.metal, 0.021, 0.07, -0.06, g);
    box(0.004, 0.045, 0.012, MATS.metal, -0.021, 0.07, -0.06, g);
    box(0.046, 0.006, 0.012, MATS.metal, 0, 0.094, -0.06, g);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.04), MATS.lens); lens.position.set(0, 0.07, -0.06); g.add(lens);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.0052, 24), MATS.sightGlow); ring.position.set(0, 0.07, -0.058); g.add(ring);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0009, 8), MATS.sightGlow); dot.position.set(0, 0.07, -0.058); g.add(dot);
    return { sightY: 0.07, muzzle: [0, 0.01, -0.44], mag, gripR: [0, -0.085, 0.05], gripL: [0, -0.07, -0.27] };
  },
  sniper(g) {
    box(0.06, 0.075, 0.36, MATS.slate, 0, 0, -0.08, g);
    box(0.066, 0.06, 0.3, MATS.polymer, 0, -0.01, -0.4, g);       // fore-end
    tube(0.013, 0.5, MATS.metal, 0, 0.006, -0.76, g);
    tube(0.022, 0.09, MATS.metal, 0, 0.006, -1.04, g);             // brake
    box(0.05, 0.1, 0.3, MATS.polymer, 0, -0.03, 0.24, g);          // stock
    box(0.04, 0.03, 0.14, MATS.polymer, 0, 0.032, 0.2, g);         // cheek riser
    box(0.056, 0.13, 0.03, MATS.polymer, 0, -0.03, 0.4, g);
    const grip = box(0.036, 0.1, 0.05, MATS.polymer, 0, -0.08, 0.05, g); grip.rotation.x = 0.35;
    const mag = new THREE.Group(); mag.position.set(0, -0.04, -0.12); g.add(mag);
    box(0.04, 0.06, 0.09, MATS.metal, 0, -0.03, 0, mag);
    const bolt = new THREE.Group(); bolt.position.set(0.032, 0.02, 0.02); g.add(bolt);
    box(0.05, 0.012, 0.012, MATS.steel, 0.025, 0, 0, bolt);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), MATS.steel); knob.position.set(0.05, 0, 0); bolt.add(knob);
    // scope
    box(0.02, 0.03, 0.03, MATS.metal, 0, 0.05, -0.02, g);
    box(0.02, 0.03, 0.03, MATS.metal, 0, 0.05, -0.18, g);
    tube(0.021, 0.3, MATS.metal, 0, 0.085, -0.1, g, 18);
    tube(0.033, 0.08, MATS.metal, 0, 0.085, -0.28, g, 18);
    tube(0.027, 0.06, MATS.metal, 0, 0.085, 0.07, g, 18);
    tube(0.012, 0.04, MATS.metal, 0, 0.11, -0.1, g, 10).rotation.set(0, 0, 0);
    const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), MATS.lensSolid); lensF.position.set(0, 0.085, -0.321); lensF.rotation.y = Math.PI; g.add(lensF);
    const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), MATS.lensSolid); lensR.position.set(0, 0.085, 0.101); g.add(lensR);
    return { sightY: 0.085, muzzle: [0, 0.006, -1.1], mag, bolt, gripR: [0, -0.085, 0.06], gripL: [0, -0.04, -0.4] };
  },
  shotgun(g) {
    box(0.06, 0.08, 0.28, MATS.metal, 0, 0, -0.06, g);
    tube(0.016, 0.55, MATS.metal, 0, 0.022, -0.47, g);
    tube(0.014, 0.42, MATS.metal, 0, -0.016, -0.41, g);
    const pump = new THREE.Group(); pump.position.set(0, -0.016, -0.4); g.add(pump);
    box(0.06, 0.05, 0.17, MATS.wood, 0, 0, 0, pump);
    for (let i = 0; i < 5; i++) box(0.062, 0.004, 0.012, MATS.polymer, 0, 0.012 - (i % 2) * 0.024, -0.06 + i * 0.03, pump);
    box(0.05, 0.08, 0.24, MATS.wood, 0, -0.03, 0.18, g); // stock
    box(0.054, 0.1, 0.03, MATS.polymer, 0, -0.04, 0.31, g);
    const grip = box(0.036, 0.09, 0.05, MATS.wood, 0, -0.07, 0.06, g); grip.rotation.x = 0.4;
    box(0.012, 0.03, 0.05, MATS.metal, 0, -0.05, 0.0, g);
    // ghost ring + bead
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), MATS.sightGlow); bead.position.set(0, 0.044, -0.73); g.add(bead);
    box(0.004, 0.02, 0.004, MATS.metal, 0, 0.034, -0.73, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 18), MATS.metal); ring.position.set(0, 0.044, 0.0); g.add(ring);
    box(0.004, 0.012, 0.01, MATS.metal, 0, 0.034, 0.0, g);
    return { sightY: 0.044, muzzle: [0, 0.022, -0.76], mag: null, pump, gripR: [0, -0.08, 0.07], gripL: [0, -0.04, -0.4] };
  },
  pistol(g) {
    const slide = new THREE.Group(); g.add(slide);
    box(0.03, 0.036, 0.2, MATS.metal, 0, 0.03, -0.07, slide);
    for (let i = 0; i < 5; i++) box(0.032, 0.026, 0.004, MATS.polymer, 0, 0.03, 0.0 + i * 0.008, slide);
    box(0.006, 0.01, 0.006, MATS.metal, 0, 0.053, -0.16, slide);       // front post
    const fdot = new THREE.Mesh(new THREE.CircleGeometry(0.002, 8), MATS.sightGlow); fdot.position.set(0, 0.055, -0.156); slide.add(fdot);
    box(0.007, 0.01, 0.006, MATS.metal, 0.009, 0.053, 0.02, slide);    // rear notch
    box(0.007, 0.01, 0.006, MATS.metal, -0.009, 0.053, 0.02, slide);
    box(0.028, 0.026, 0.17, MATS.polymer, 0, 0.0, -0.06, g);           // frame
    const grip = box(0.03, 0.11, 0.046, MATS.polymer, 0, -0.06, 0.012, g); grip.rotation.x = 0.22;
    box(0.008, 0.024, 0.04, MATS.polymer, 0, -0.02, -0.04, g);
    const mag = new THREE.Group(); mag.position.set(0, -0.115, 0.025); mag.rotation.x = 0.22; g.add(mag);
    box(0.032, 0.012, 0.05, MATS.metal, 0, 0, 0, mag);
    return { sightY: 0.056, muzzle: [0, 0.03, -0.175], mag, slide, gripR: [0, -0.06, 0.02], gripL: [-0.012, -0.068, 0.0], twoHandPistol: true };
  },
};

const flashTex = radialSprite('rgba(255,240,200,1)', 'rgba(255,120,20,0)');
const flashStarTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    x.rotate(Math.PI / 3);
    const g = x.createLinearGradient(0, 0, 60, 0);
    g.addColorStop(0, 'rgba(255,230,160,1)'); g.addColorStop(1, 'rgba(255,120,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -6); x.lineTo(62, 0); x.lineTo(0, 6); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

// World-space gun (held by avatars, menu showcase)
export function buildWeaponModel(id, opts = {}) {
  let withFlash = !!opts.withFlash;
  const g = new THREE.Group();
  let info;
  if (KNIFE_BUILDERS[id]) {
    info = KNIFE_BUILDERS[id](g);
    Object.assign(info, { melee: true, sightY: 0, muzzle: [0, 0, -0.2], mag: null, gripR: [0, -0.004, 0.005], gripL: null });
    withFlash = false;
  } else info = BUILDERS[id](g);
  info.group = g;
  info.muzzleObj = new THREE.Object3D();
  info.muzzleObj.position.fromArray(info.muzzle);
  g.add(info.muzzleObj);
  if (withFlash) {
    const mat = new THREE.SpriteMaterial({ map: flashStarTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const f = new THREE.Sprite(mat); f.scale.setScalar(0.16); f.visible = false;
    const mat2 = new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const f2 = new THREE.Sprite(mat2); f2.scale.setScalar(0.12); f.add(f2);
    f2.scale.setScalar(0.8);
    info.muzzleObj.add(f);
    info.flash = f;
  }
  if (info.mag) info.magBase = info.mag.position.clone();
  return info;
}

// First-person arms, attached to the gun group
function buildArms(info) {
  const arms = new THREE.Group();
  const R = new THREE.Vector3().fromArray(info.gripR);
  const L = info.gripL ? new THREE.Vector3().fromArray(info.gripL) : null;
  const hand = (p, mirror) => {
    const h = new THREE.Group(); h.position.copy(p);
    box(0.048, 0.056, 0.1, MATS.glove, mirror ? -0.01 : 0.012, -0.004, 0.02, h);
    box(0.05, 0.02, 0.05, MATS.glove, mirror ? 0.01 : -0.012, 0.022, -0.012, h); // fingers wrap
    return h;
  };
  if (info.melee) {
    // single fist wrapped around the handle
    const fist = new THREE.Group(); fist.position.copy(R); arms.add(fist);
    box(0.042, 0.05, 0.072, MATS.glove, 0.004, -0.008, 0.004, fist);
    box(0.016, 0.026, 0.045, MATS.glove, -0.02, 0.006, 0.0, fist); // thumb
    const e = R.clone().add(new THREE.Vector3(0.1, -0.2, 0.3));
    limb(R.clone().add(new THREE.Vector3(0.01, -0.012, 0.045)), e, 0.033, MATS.sleeve, arms);
    limb(e, e.clone().add(new THREE.Vector3(0.08, -0.25, 0.2)), 0.04, MATS.sleeve, arms);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 12), MATS.cuff);
    cf.position.copy(R).add(new THREE.Vector3(0.012, -0.024, 0.075)); cf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().sub(R).normalize());
    arms.add(cf);
    return arms;
  }
  const rightHand = hand(R, false); arms.add(rightHand);
  const re = R.clone().add(new THREE.Vector3(0.11, -0.2, 0.34));
  limb(R.clone().add(new THREE.Vector3(0.01, -0.01, 0.06)), re, 0.034, MATS.sleeve, arms);
  const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.02, 12), MATS.cuff);
  cuffR.position.copy(R).add(new THREE.Vector3(0.013, -0.02, 0.1)); cuffR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), re.clone().sub(R).normalize());
  arms.add(cuffR);
  limb(re, re.clone().add(new THREE.Vector3(0.08, -0.25, 0.2)), 0.04, MATS.sleeve, arms);

  const left = new THREE.Group(); arms.add(left);
  left.add(hand(L, true));
  const le = L.clone().add(info.twoHandPistol ? new THREE.Vector3(-0.12, -0.2, 0.32) : new THREE.Vector3(-0.15, -0.18, 0.3));
  limb(L.clone().add(new THREE.Vector3(-0.01, -0.01, 0.05)), le, 0.033, MATS.sleeve, left);
  const cuffL = cuffR.clone(); cuffL.position.copy(L).add(new THREE.Vector3(-0.015, -0.02, 0.09));
  cuffL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), le.clone().sub(L).normalize());
  left.add(cuffL);
  limb(le, le.clone().add(new THREE.Vector3(-0.08, -0.25, 0.2)), 0.04, MATS.sleeve, left);
  info.leftArm = left;
  return arms;
}

export function setOperatorColors(colors) {
  MATS.sleeve.color.set(colors.suit);
  MATS.glove.color.set(colors.glove);
  MATS.cuff.color.set(colors.accent);
  MATS.cuff.emissive.set(colors.accent);
}

const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
// 0 -> 1 between a..b, hold, 1 -> 0 between c..d
const bump = (t, a, b, c, d) => smooth(a, b, t) * (1 - smooth(c, d, t));

// melee keyframes: [t, dx, dy, dz, rx, ry, rz]
const SLASH_KF = [[0, 0, 0, 0, 0, 0, 0], [0.15, 0.09, 0.06, 0.02, 0.15, -0.45, -0.55], [0.42, -0.3, -0.07, -0.12, -0.25, 1.0, 0.75], [1, 0, 0, 0, 0, 0, 0]];
const SLASH2_KF = [[0, 0, 0, 0, 0, 0, 0], [0.15, -0.16, 0.07, 0.0, 0.15, 0.7, 0.65], [0.42, 0.14, -0.06, -0.1, -0.25, -0.65, -0.7], [1, 0, 0, 0, 0, 0, 0]];
const STAB_KF = [[0, 0, 0, 0, 0, 0, 0], [0.3, 0.03, 0.05, 0.13, 0.35, 0.1, 0], [0.48, -0.1, 0.02, -0.3, -0.32, -0.35, 0], [0.66, -0.1, 0.02, -0.28, -0.32, -0.35, 0], [1, 0, 0, 0, 0, 0, 0]];
function sampleKF(kf, t) {
  let i = 0;
  while (i < kf.length - 2 && t > kf[i + 1][0]) i++;
  const a = kf[i], b = kf[i + 1];
  const u = smooth(a[0], b[0], t);
  const out = [];
  for (let j = 1; j < 7; j++) out.push(lerp(a[j], b[j], u));
  return out;
}

// ---------------------------------------------------------------------------
// Viewmodel: renders in its own scene with a fixed-FOV camera
// ---------------------------------------------------------------------------
export class Viewmodel {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.models = {};
    this.cur = null;
    this.sway = new THREE.Vector2();
    this.swayVel = new THREE.Vector2();
    this.bobPhase = 0;
    this.bobAmt = 0;
    this.kick = 0;
    this.kickRot = 0;
    this.flashT = 0;
    this.light = new THREE.PointLight(0xffaa55, 0, 2, 2);
    scene.add(this.light);
    this.adsT = 0;
  }

  prepare(id) {
    if (this.models[id]) return this.models[id];
    const info = buildWeaponModel(id, { withFlash: true });
    info.arms = buildArms(info);
    info.group.add(info.arms);
    info.holder = new THREE.Group();
    if (info.melee) info.holder.rotation.order = 'ZYX'; // pitch & yaw in hand space, roll in view space
    info.holder.add(info.group);
    info.holder.visible = false;
    info.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    this.root.add(info.holder);
    this.models[id] = info;
    return info;
  }

  equip(def) {
    if (this.cur) this.cur.holder.visible = false;
    this.def = def;
    this.cur = this.prepare(def.id);
    this.cur.holder.visible = true;
  }

  fire() {
    this.kick = 1;
    this.kickRot = (Math.random() - 0.5);
    this.flashT = 0.05;
    if (this.cur && this.cur.flash) {
      this.cur.flash.material.rotation = Math.random() * Math.PI;
      const s = (this.def.pellets > 1 ? 0.24 : this.def.id === 'smg' ? 0.08 : 0.16) * (0.8 + Math.random() * 0.4);
      this.cur.flash.scale.setScalar(s);
    }
  }

  // s: { dt, ads(0..1), moving(0..1 speed ratio), grounded, lookDX, lookDY, reloadT(null|0..1), shellT, equipT(0..1), cycleT(null|0..1), visible }
  update(s) {
    const c = this.cur; if (!c) return;
    const d = this.def;
    const dt = s.dt;
    if (d.melee) return this.updateMelee(s);
    const ads = s.ads;
    this.adsT = ads;
    c.holder.visible = s.visible;

    // sway (spring towards look delta)
    const targetX = clamp(-s.lookDX * 0.0009, -0.06, 0.06);
    const targetY = clamp(-s.lookDY * 0.0009, -0.06, 0.06);
    this.sway.x = damp(this.sway.x, targetX, 10, dt);
    this.sway.y = damp(this.sway.y, targetY, 10, dt);

    // bob
    const moving = s.grounded ? s.moving : 0;
    this.bobAmt = damp(this.bobAmt, moving, 8, dt);
    this.bobPhase += dt * (6 + 5 * s.moving) * (moving > 0.05 ? 1 : 0.25);
    const bobScale = lerp(1, 0.12, ads);
    const bx = Math.sin(this.bobPhase) * 0.012 * this.bobAmt * bobScale;
    const by = -Math.abs(Math.cos(this.bobPhase)) * 0.01 * this.bobAmt * bobScale;
    const idle = Math.sin(performance.now() * 0.0016) * 0.003 * (1 - ads);

    this.kick = damp(this.kick, 0, 16, dt);

    const hip = d.hip;
    const adsPos = [0, -c.sightY, -d.ads];
    const px = lerp(hip[0], adsPos[0], ads);
    const py = lerp(hip[1], adsPos[1], ads);
    const pz = lerp(hip[2], adsPos[2], ads);

    // equip
    const eq = 1 - smooth(0, 1, s.equipT);
    // reload
    let rTilt = 0, magDrop = 0, leftDown = 0;
    if (s.reloadT != null) {
      const t = s.reloadT;
      if (d.shellReload) {
        rTilt = 0.6;
        const ph = (s.shellT ?? 0);
        leftDown = bump(ph, 0, 0.3, 0.6, 1) * 0.5;
      } else {
        rTilt = bump(t, 0, 0.15, 0.82, 1);
        magDrop = bump(t, 0.12, 0.3, 0.58, 0.75);
        leftDown = bump(t, 0.2, 0.35, 0.65, 0.8);
      }
    }
    // bolt / pump cycle
    let cyc = 0;
    if (s.cycleT != null) cyc = bump(s.cycleT, 0.15, 0.4, 0.55, 0.85);

    const swayScale = lerp(1, 0.25, ads);
    // weapon inspect: turn the gun to show it off
    const ins = s.inspectT != null ? bump(s.inspectT, 0, 0.2, 0.8, 1) : 0;
    const insRoll = s.inspectT != null ? Math.sin(s.inspectT * Math.PI) : 0;
    c.holder.position.set(
      px + bx + this.sway.x * 0.6 * swayScale,
      py + by + idle - eq * 0.25 - rTilt * 0.05 + this.sway.y * 0.6 * swayScale,
      pz + this.kick * d.kick * lerp(1, 0.6, ads) + ins * 0.1
    );
    c.holder.position.x -= ins * 0.12;
    c.holder.position.y += ins * 0.04;
    c.holder.rotation.set(
      this.sway.y * swayScale + this.kick * 0.07 * lerp(1, 0.3, ads) + rTilt * 0.25 - eq * 0.7 + cyc * 0.1 + ins * 0.15,
      this.sway.x * swayScale + this.kick * this.kickRot * 0.02 - ins * 0.9 + insRoll * ins * 0.3,
      rTilt * 0.55 + eq * 0.3 - this.sway.x * 0.5 * swayScale + cyc * 0.15 + ins * 0.5
    );

    if (c.mag && c.magBase) c.mag.position.y = c.magBase.y - magDrop * 0.3;
    if (c.leftArm) c.leftArm.position.y = -leftDown * 0.12;
    if (c.slide) c.slide.position.z = this.kick > 0.5 ? (this.kick - 0.5) * 0.06 : 0;
    if (c.bolt) { c.bolt.rotation.z = cyc * 1.1; c.bolt.position.z = 0.02 + cyc * 0.07; }
    if (c.pump) c.pump.position.z = -0.4 + cyc * 0.09;

    // flash
    this.flashT -= dt;
    if (c.flash) c.flash.visible = this.flashT > 0 && s.visible;
    this.light.intensity = this.flashT > 0 ? 3 : 0;
    if (c.flash) c.muzzleObj.getWorldPosition(this.light.position);
  }

  // knives: idle pose, draw flourish, slash/stab keyframes and signature inspect
  updateMelee(s) {
    const c = this.cur, d = this.def, dt = s.dt;
    c.holder.visible = s.visible;
    this.sway.x = damp(this.sway.x, clamp(-s.lookDX * 0.0009, -0.06, 0.06), 10, dt);
    this.sway.y = damp(this.sway.y, clamp(-s.lookDY * 0.0009, -0.06, 0.06), 10, dt);
    const moving = s.grounded ? s.moving : 0;
    this.bobAmt = damp(this.bobAmt, moving, 8, dt);
    this.bobPhase += dt * (6 + 5 * s.moving) * (moving > 0.05 ? 1 : 0.25);
    const bx = Math.sin(this.bobPhase) * 0.014 * this.bobAmt;
    const by = -Math.abs(Math.cos(this.bobPhase)) * 0.012 * this.bobAmt + Math.sin(performance.now() * 0.0016) * 0.003;

    let k = [0, 0, 0, 0, 0, 0];
    if (s.swing) k = sampleKF(s.swing.kind === 'stab' ? STAB_KF : s.swing.alt ? SLASH2_KF : SLASH_KF, s.swing.t);
    const eq = 1 - smooth(0, 1, s.equipT);
    const ins = s.inspectT != null ? bump(s.inspectT, 0, 0.12, 0.86, 1) : 0;

    if (s.inspectT != null && c.inspect) c.inspect(s.inspectT);
    else if (s.equipT < 1 && c.draw) c.draw(s.equipT);
    else if (c.reset) c.reset();

    const h = d.hip;
    // inspect pose: bring the knife to centre with the flat of the blade facing the camera
    c.holder.position.set(
      h[0] + bx + this.sway.x * 0.6 + k[0] - ins * 0.07,
      h[1] + by + this.sway.y * 0.6 + k[1] - eq * 0.2 + ins * 0.06,
      h[2] + k[2] + ins * 0.04
    );
    c.holder.rotation.set(
      0.35 + this.sway.y + k[3] - eq * 0.8 - ins * 0.15,
      0.45 + this.sway.x + k[4] + ins * 0.95,
      -0.2 - this.sway.x * 0.5 + k[5] + eq * 0.5 - ins * 0.05
    );
    this.light.intensity = 0;
  }

  // muzzle position in viewmodel camera space (for tracers)
  muzzleView(out) {
    if (!this.cur) return out.set(0, 0, -1);
    return this.cur.muzzleObj.getWorldPosition(out);
  }
}
