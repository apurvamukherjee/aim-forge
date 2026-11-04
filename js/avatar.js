import * as THREE from 'three';
import { box, limb } from './util.js';
import { buildWeaponModel } from './weapons.js';

export const OPERATORS = {
  specter: {
    id: 'specter', name: 'Specter', role: 'Recon',
    bio: 'Ex-special-recon. Moves quiet, sees first. Signature full-face optical visor.',
    suit: '#2b2f36', armor: '#46505e', accent: '#00e0ff', glove: '#15161a', skin: '#c99b7a', helmet: 'visor',
  },
  ronin: {
    id: 'ronin', name: 'Ronin', role: 'Assault',
    bio: 'Breacher with no unit and no fear. First through every door.',
    suit: '#1c1c1f', armor: '#6b1f24', accent: '#ff3b3b', glove: '#101012', skin: '#8d5a3b', helmet: 'mask',
  },
  nova: {
    id: 'nova', name: 'Nova', role: 'Support',
    bio: 'Orbital-drop medic. Gold visor, steady hands, never misses a callout.',
    suit: '#d9dbe2', armor: '#7d8699', accent: '#ffb000', glove: '#3a3d44', skin: '#e8c3a6', helmet: 'dome',
  },
  moss: {
    id: 'moss', name: 'Moss', role: 'Marksman',
    bio: 'Woodland sharpshooter. Patient, precise, and always on overwatch.',
    suit: '#3b4a2f', armor: '#5d6b45', accent: '#9cff57', glove: '#26291f', skin: '#b07a55', helmet: 'cap',
  },
};

export const BOT_LOOK = {
  id: 'bot', suit: '#2c2f35', armor: '#d2552b', accent: '#ffd23f', glove: '#222', skin: '#d2552b', helmet: 'dummy',
};

export function operatorColors(profileOp) {
  const base = OPERATORS[profileOp.preset] || OPERATORS.specter;
  return { ...base, accent: profileOp.accent || base.accent, armor: profileOp.armor || base.armor };
}

function mats(look) {
  return {
    suit: new THREE.MeshStandardMaterial({ color: look.suit, roughness: 0.85 }),
    armor: new THREE.MeshStandardMaterial({ color: look.armor, roughness: 0.55, metalness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.7, metalness: 0.2 }),
    glove: new THREE.MeshStandardMaterial({ color: look.glove, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.6 }),
    accent: new THREE.MeshStandardMaterial({ color: look.accent, emissive: look.accent, emissiveIntensity: 0.9, roughness: 0.3 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x050608, emissive: look.accent, emissiveIntensity: 0.25, metalness: 1, roughness: 0.08 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a24a, emissive: 0x3a2a05, metalness: 1, roughness: 0.12 }),
  };
}

/**
 * Builds a ~1.8m operator facing +Z.
 * Every mesh gets userData.part = 'head' | 'body' for hit detection.
 */
export function buildAvatar(look, { weapon = 'ar' } = {}) {
  const M = mats(look);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  let part = 'body';
  const tag = (o) => { o.traverse(c => { if (c.isMesh) c.userData.part = part; }); return o; };

  // legs (pivot at hip for animation)
  const legs = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.11, 0.95, 0); body.add(pivot);
    limb(new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.01, -0.45, 0.02), 0.075, M.suit, pivot);
    limb(new THREE.Vector3(side * 0.01, -0.45, 0.02), new THREE.Vector3(side * 0.01, -0.86, -0.01), 0.06, M.suit, pivot);
    box(0.14, 0.12, 0.1, M.armor, side * 0.01, -0.45, 0.06, pivot);   // knee pad
    box(0.12, 0.1, 0.24, M.dark, side * 0.01, -0.9, 0.04, pivot);     // boot
    tag(pivot); legs.push(pivot);
  }

  // torso
  const torso = new THREE.Group(); body.add(torso);
  box(0.36, 0.16, 0.22, M.suit, 0, 1.0, 0, torso);                     // pelvis
  box(0.4, 0.05, 0.24, M.dark, 0, 1.06, 0, torso);                     // belt
  box(0.05, 0.06, 0.03, M.accent, 0, 1.06, 0.125, torso);              // buckle
  box(0.36, 0.48, 0.21, M.suit, 0, 1.3, 0, torso);
  box(0.42, 0.38, 0.27, M.armor, 0, 1.3, 0.005, torso);                // plate carrier
  for (let i = -1; i <= 1; i++) box(0.1, 0.1, 0.06, M.dark, i * 0.12, 1.18, 0.15, torso); // pouches
  box(0.3, 0.018, 0.01, M.accent, 0, 1.44, 0.142, torso);              // accent stripe
  box(0.32, 0.4, 0.14, M.dark, 0, 1.3, -0.19, torso);                  // backpack
  box(0.06, 0.2, 0.02, M.accent, 0.1, 1.33, -0.265, torso);
  box(0.13, 0.08, 0.06, M.dark, 0, 1.56, 0, torso);                    // neck guard
  tag(torso);

  // head
  part = 'head';
  const head = new THREE.Group(); head.position.set(0, 1.68, 0.01); body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), look.helmet === 'dummy' ? M.armor : M.dark);
  skull.scale.set(1, 1.1, 1.05); head.add(skull);
  const h = look.helmet;
  if (h === 'visor') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), M.armor);
    shell.position.y = 0.01; head.add(shell);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.128, 20, 12, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.32, Math.PI * 0.36), M.visor);
    visor.rotation.y = 0; head.add(visor);
    box(0.17, 0.012, 0.02, M.accent, 0, 0.0, 0.122, head);
    box(0.03, 0.06, 0.06, M.dark, 0.13, 0.0, 0, head);
    box(0.03, 0.06, 0.06, M.dark, -0.13, 0.0, 0, head);
  } else if (h === 'mask') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.armor);
    shell.position.y = 0.02; head.add(shell);
    box(0.2, 0.1, 0.1, M.dark, 0, -0.06, 0.07, head);                  // respirator
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), M.dark);
      c.rotation.z = Math.PI / 2; c.rotation.y = s * 0.5; c.position.set(s * 0.08, -0.07, 0.1); head.add(c);
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 14), M.accent);
      g.rotation.x = Math.PI / 2; g.position.set(s * 0.048, 0.025, 0.11); head.add(g);
    }
    box(0.24, 0.025, 0.04, M.dark, 0, 0.025, 0.09, head);
  } else if (h === 'dome') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.142, 22, 16), M.armor);
    shell.position.y = 0.01; head.add(shell);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 12, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.28, Math.PI * 0.4), M.gold);
    head.add(visor);
    box(0.02, 0.1, 0.02, M.accent, 0.12, 0.13, -0.04, head);           // antenna
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M.accent); tip.position.set(0.12, 0.19, -0.04); head.add(tip);
  } else if (h === 'cap') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.08, 18), M.armor);
    cap.position.y = 0.075; head.add(cap);
    const brim = box(0.2, 0.012, 0.12, M.armor, 0, 0.045, 0.12, head); brim.rotation.x = 0.12;
    box(0.2, 0.1, 0.08, M.suit, 0, -0.06, 0.08, head);                // face wrap
    for (const s of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), M.dark);
      cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.125, 0.0, 0); head.add(cup);
    }
    box(0.26, 0.015, 0.03, M.dark, 0, 0.12, 0, head);
    const lens = box(0.17, 0.035, 0.02, M.visor, 0, 0.015, 0.115, head); lens.rotation.x = -0.1;
  } else { // dummy
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 20), M.accent);
    ring.position.set(0, 0.01, 0.118); head.add(ring);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), M.accent); dot.position.set(0, 0.01, 0.124); head.add(dot);
  }
  tag(head);
  part = 'body';

  // weapon + arms
  const gunPivot = new THREE.Group();
  gunPivot.position.set(0.08, 1.24, 0.22);
  gunPivot.rotation.y = Math.PI - 0.35;
  body.add(gunPivot);
  let gunInfo = null;
  const arms = new THREE.Group(); body.add(arms);

  function buildArmsFor(info) {
    arms.clear();
    const shoulders = [new THREE.Vector3(0.24, 1.46, 0), new THREE.Vector3(-0.24, 1.46, 0)];
    const hands = [];
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
    if (info) {
      hands.push(info.group.localToWorld(new THREE.Vector3().fromArray(info.gripR)).applyMatrix4(inv));
      hands.push(info.group.localToWorld(new THREE.Vector3().fromArray(info.gripL)).applyMatrix4(inv));
    } else {
      hands.push(new THREE.Vector3(0.28, 0.98, 0.05), new THREE.Vector3(-0.28, 0.98, 0.05));
    }
    shoulders.forEach((s, i) => {
      const side = i === 0 ? 1 : -1;
      const hnd = hands[i];
      const elbow = s.clone().lerp(hnd, 0.5).add(new THREE.Vector3(side * 0.12, -0.14, -0.04));
      limb(s, elbow, 0.058, M.suit, arms);
      limb(elbow, hnd, 0.048, M.suit, arms);
      box(0.11, 0.07, 0.15, M.armor, s.x - side * 0.01, s.y + 0.02, s.z, arms); // shoulder pad
      const g = box(0.07, 0.08, 0.1, M.glove, hnd.x, hnd.y, hnd.z, arms);
      g.lookAt(elbow.clone().applyMatrix4(body.matrixWorld));
    });
    tag(arms);
  }

  function setWeapon(id) {
    gunPivot.clear();
    gunInfo = id ? buildWeaponModel(id) : null;
    if (gunInfo) {
      gunInfo.group.rotation.x = -0.32;
      gunInfo.group.position.set(0, 0, 0.1);
      gunPivot.add(gunInfo.group);
      tag(gunInfo.group);
    }
    buildArmsFor(gunInfo);
  }
  setWeapon(weapon);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  let phase = Math.random() * 10;
  return {
    group: root, body, head, legs, torso, materials: M, setWeapon,
    // strafe: -1..1 lateral speed ratio
    animate(dt, strafe = 0, t = performance.now() / 1000) {
      phase += dt * (2 + Math.abs(strafe) * 10);
      const s = Math.sin(phase) * Math.min(1, Math.abs(strafe)) * 0.35;
      legs[0].rotation.z = s; legs[1].rotation.z = -s;
      legs[0].rotation.x = Math.cos(phase) * Math.abs(strafe) * 0.15;
      legs[1].rotation.x = -legs[0].rotation.x;
      body.position.y = Math.abs(Math.sin(phase)) * 0.03 * Math.abs(strafe);
      torso.scale.y = 1 + Math.sin(t * 2.2) * 0.008;
      head.rotation.y = Math.sin(t * 0.6) * 0.06;
      body.rotation.z = -strafe * 0.05;
    },
  };
}
