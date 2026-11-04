import * as THREE from 'three';
import { box, canvasTex, speckle } from './util.js';

export const ARENA = { minX: -18, maxX: 18, minZ: -72, maxZ: 9, wallH: 7 };

function floorTex() {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#1c1f24'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 6000, 0.12, true);
    speckle(x, w, h, 4000, 0.25);
    x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 6; x.strokeRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,0.07)'; x.lineWidth = 2; x.strokeRect(4, 4, w - 8, h - 8);
    x.strokeStyle = 'rgba(255,255,255,0.04)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
  }, { repeat: [18, 40.5] });
}

function concreteTex(rx, ry) {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#5b5f66'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 9000, 0.18);
    speckle(x, w, h, 5000, 0.12, true);
    for (let i = 0; i < 18; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, Math.random() * 90 + 20, Math.random() * 40 + 10, Math.random() * 3, 0, 7); x.fill();
    }
    x.strokeStyle = 'rgba(20,20,22,0.7)'; x.lineWidth = 3;
    x.strokeRect(1, 1, w - 2, h - 2);
    x.fillStyle = 'rgba(20,20,22,0.55)';
    for (const [px, py] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill(); }
  }, { repeat: [rx, ry] });
}

function crateTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#5a4a32'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${i % 2 ? 0 : 255},${i % 2 ? 0 : 230},${i % 2 ? 0 : 180},0.05)`; x.fillRect(0, i * 32, w, 32); }
    speckle(x, w, h, 2500, 0.2);
    x.strokeStyle = '#2b2218'; x.lineWidth = 16; x.strokeRect(8, 8, w - 16, h - 16);
    x.lineWidth = 12; x.beginPath(); x.moveTo(16, 16); x.lineTo(w - 16, h - 16); x.stroke();
    x.fillStyle = 'rgba(255,200,40,0.6)'; x.font = 'bold 28px monospace'; x.fillText('AF-04', 90, 60);
  });
}

function metalPanelTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#2d333b'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 2000, 0.15, true);
    x.strokeStyle = '#1a1e23'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#f2c200';
    for (let i = -4; i < 10; i++) { x.save(); x.translate(i * 40, 0); x.transform(1, 0, -0.6, 1, 0, 0); x.fillRect(0, h - 36, 20, 36); x.restore(); }
    x.fillStyle = '#111'; for (let i = -4; i < 10; i++) { x.save(); x.translate(i * 40 + 20, 0); x.transform(1, 0, -0.6, 1, 0, 0); x.fillRect(0, h - 36, 20, 36); x.restore(); }
  });
}

export function textPlane(text, { w = 4, h = 1, color = '#ffffff', font = 'bold 180px "Oxanium", "Rajdhani", sans-serif', bg = null, glow = null } = {}) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (x, cw, ch) => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, cw, ch); }
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (glow) { x.shadowColor = glow; x.shadowBlur = 30; }
    x.fillStyle = color; x.fillText(text, cw / 2, ch / 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  return m;
}

function skyDome() {
  const tex = canvasTex(16, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05070c');
    g.addColorStop(0.35, '#0e1622');
    g.addColorStop(0.5, '#2a2f3a');
    g.addColorStop(0.53, '#3b2a24');
    g.addColorStop(1, '#0b0c10');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  return m;
}

/**
 * Indoor/outdoor shooting range. Returns raycast solids and AABB colliders.
 */
export function buildWorld(scene, { accent = '#ff3b3b', quality = 'high' } = {}) {
  const solids = [];
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);
  scene.fog = new THREE.Fog(0x0d1118, 60, 160);
  scene.add(skyDome());

  const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x2a2018, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-20, 40, 15);
  sun.target.position.set(0, 0, -30);
  sun.castShadow = quality === 'high';
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 50, bottom: -50, near: 1, far: 120 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const W = ARENA.maxX - ARENA.minX;
  const L = ARENA.maxZ - ARENA.minZ;
  const cz = (ARENA.maxZ + ARENA.minZ) / 2;

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.85, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, cz); floor.receiveShadow = true;
  group.add(floor); solids.push(floor);
  // outer ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; group.add(ground);

  // walls
  const wallMat = (rx, ry) => new THREE.MeshStandardMaterial({ map: concreteTex(rx, ry), roughness: 0.9 });
  const H = ARENA.wallH;
  const walls = [
    [1, H, L, ARENA.minX - 0.5, H / 2, cz, L / 4, H / 4],
    [1, H, L, ARENA.maxX + 0.5, H / 2, cz, L / 4, H / 4],
    [W + 2, H + 3, 1, 0, (H + 3) / 2, ARENA.minZ - 0.5, W / 4, (H + 3) / 4],
    [W + 2, H, 1, 0, H / 2, ARENA.maxZ + 0.5, W / 4, H / 4],
  ];
  for (const [w, h, d, x, y, z, rx, ry] of walls) {
    const m = box(w, h, d, wallMat(rx, ry), x, y, z, group);
    solids.push(m);
  }
  // neon trims
  const neon = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
  const trims = [];
  for (const sx of [ARENA.minX + 0.02, ARENA.maxX - 0.02]) {
    const t1 = box(0.06, 0.08, L, neon, sx, H - 0.4, cz, group); t1.castShadow = false;
    const t2 = box(0.06, 0.05, L, neon, sx, 0.15, cz, group); t2.castShadow = false;
    trims.push(t1, t2);
  }
  const backTrim = box(W, 0.1, 0.06, neon, 0, H + 2.4, ARENA.minZ + 0.02, group); backTrim.castShadow = false; trims.push(backTrim);

  // back wall branding
  const logo = textPlane('AIMFORGE', { w: 22, h: 4, color: '#f3f5f8', glow: accent, font: '900 300px "Oxanium", "Rajdhani", sans-serif' });
  logo.position.set(0, 6.4, ARENA.minZ + 0.03); group.add(logo);
  const sub = textPlane('TRAINING FACILITY  ·  RANGE 01', { w: 14, h: 1, color: accent, font: '600 70px "Oxanium", "Rajdhani", sans-serif' });
  sub.position.set(0, 4.1, ARENA.minZ + 0.03); group.add(sub);

  // distance markers
  for (const d of [10, 25, 50]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.012, -d); group.add(line);
    for (const sx of [-14, 14]) {
      const label = textPlane(`${d}M`, { w: 2.4, h: 1.2, color: 'rgba(255,255,255,0.55)', font: 'bold 340px "Oxanium", sans-serif' });
      label.rotation.x = -Math.PI / 2; label.position.set(sx, 0.014, -d + 1); group.add(label);
    }
  }
  // spawn pad
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.25, 48), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, toneMapped: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.015, 0); group.add(pad);
  const startLine = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.25), new THREE.MeshBasicMaterial({ map: metalPanelTex(), transparent: true }));
  startLine.rotation.x = -Math.PI / 2; startLine.position.set(0, 0.013, -2.2); group.add(startLine);

  // cover: crates & barriers
  const crateMat = new THREE.MeshStandardMaterial({ map: crateTex(), roughness: 0.8 });
  const panelMat = new THREE.MeshStandardMaterial({ map: metalPanelTex(), roughness: 0.6, metalness: 0.5 });
  const concrete = wallMat(1, 0.5);
  const addSolid = (w, h, d, mat, x, y, z, ry = 0) => {
    const m = box(w, h, d, mat, x, y, z, group); m.rotation.y = ry;
    solids.push(m);
    m.updateMatrixWorld();
    colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  };
  const crateStacks = [[-12.5, -18], [12, -27], [-10, -39], [14, -46], [-14.5, -55], [6, -60], [-4, -33]];
  for (const [x, z] of crateStacks) {
    addSolid(1.6, 1.6, 1.6, crateMat, x, 0.8, z, Math.random() * 0.3);
    if (Math.random() > 0.4) addSolid(1.2, 1.2, 1.2, crateMat, x + 0.1, 2.2, z - 0.1, Math.random());
    if (Math.random() > 0.5) addSolid(1.2, 1.2, 1.2, crateMat, x + 1.6, 0.6, z + 0.3, Math.random());
  }
  for (const [x, z] of [[-6, -14], [7, -21], [0, -44], [-15, -30], [15, -36]]) addSolid(2.8, 1.1, 0.5, concrete, x, 0.55, z);
  // side containers
  for (const [x, z] of [[-16.2, -8], [16.2, -64]]) {
    const c = addSolid(3, 3, 6.5, panelMat, x, 1.5, z);
    c.material = new THREE.MeshStandardMaterial({ color: x < 0 ? 0x234a6b : 0x6b2a23, roughness: 0.6, metalness: 0.4 });
  }

  // flood light poles
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22262c, metalness: 0.7, roughness: 0.4 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false });
  for (const z of [-10, -35, -60]) {
    for (const sx of [-1, 1]) {
      const x = sx * (ARENA.maxX - 0.6);
      box(0.25, H + 4, 0.25, poleMat, x, (H + 4) / 2, z, group);
      const head = box(1.6, 0.25, 0.6, poleMat, x - sx * 0.6, H + 4, z, group);
      head.rotation.z = sx * 0.3;
      const lamp = box(1.4, 0.05, 0.45, lampMat, x - sx * 0.6, H + 3.86, z, group); lamp.rotation.z = sx * 0.3; lamp.castShadow = false;
    }
  }
  if (quality === 'high') {
    for (const z of [-12, -40]) {
      const p = new THREE.PointLight(0xffe7c4, 30, 40, 1.6);
      p.position.set(0, H + 2, z);
      scene.add(p);
    }
  }

  return {
    solids, colliders, group, trims, neon,
    spawn: { pos: new THREE.Vector3(0, 0, 0), yaw: 0 },
    setAccent(c) { neon.color.set(c); pad.material.color.set(c); },
  };
}

// The 3D stage shown behind the main menu
export function buildMenuStage(scene, accent) {
  scene.background = new THREE.Color(0x07090d);
  scene.fog = new THREE.Fog(0x07090d, 8, 22);
  const hemi = new THREE.HemisphereLight(0x9fb4d8, 0x100c0a, 0.55);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xffffff, 60, 20, 0.5, 0.6, 1.5);
  key.position.set(2.5, 5, 4); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(accent, 80, 15, 0.6, 0.5, 1.5);
  rim.position.set(-3, 3.5, -3); rim.target.position.set(0, 1.2, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.PointLight(0x4060ff, 4, 8); fill.position.set(-2, 1, 3); scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.35, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.4, metalness: 0.7 }));
  plat.position.y = 0.06; plat.receiveShadow = true; plat.castShadow = true; scene.add(plat);
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.012, 8, 96), ringMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.125; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.008, 8, 128), ringMat);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.01; scene.add(ring2);

  // backdrop pillars
  const pm = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.6 + (i / 8) * Math.PI * 0.8 + Math.PI;
    const p = box(0.5, 6, 0.5, pm, Math.cos(a) * 7, 3, Math.sin(a) * 7, scene);
    p.lookAt(0, 3, 0);
    const strip = box(0.04, 5, 0.04, ringMat, Math.cos(a) * 6.72, 3, Math.sin(a) * 6.72, scene);
    strip.castShadow = false;
  }
  // weapon showcase stand (loadout tab)
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.9, 32), new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.4, metalness: 0.7 }));
  stand.position.set(2.6, 0.45, -1.2); stand.castShadow = true; stand.receiveShadow = true; scene.add(stand);
  const standRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.01, 8, 64), ringMat);
  standRing.rotation.x = Math.PI / 2; standRing.position.set(2.6, 0.9, -1.2); scene.add(standRing);
  const showcase = new THREE.Group(); showcase.position.set(2.6, 1.35, -1.2); scene.add(showcase);
  const showLight = new THREE.PointLight(0xffffff, 6, 4); showLight.position.set(2.6, 2.4, 0); scene.add(showLight);

  return { ringMat, rim, showcase, setAccent(c) { ringMat.color.set(c); rim.color.set(c); } };
}
