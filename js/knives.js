import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Melee weapons. Each model is built around the grip (origin) with the blade
// pointing down -Z, edge down (-Y). Each has a signature inspect animation.
// ---------------------------------------------------------------------------
const MELEE_BASE = {
  slot: 'melee', melee: true, auto: false, pellets: 1, mag: 0, rpm: 120, reload: 1, head: 1.5,
  spread: { hip: 0, ads: 0, move: 0, air: 0, bloom: 0, bloomMax: 0 },
  recoil: { v: 0, h: 0, recover: 10 }, zoom: 1, adsTime: 0.15, speed: 1.15,
  hip: [0.15, -0.15, -0.36], ads: 0.3, kick: 0,
};

export const KNIVES = {
  butterfly: {
    ...MELEE_BASE, id: 'butterfly', name: 'Moth Balisong', cls: 'Butterfly Knife', equip: 0.7, inspectDur: 2.8,
    desc: 'Twin-handle balisong. Flips open on draw, endless fan-and-spin inspect.',
    slash: { dmg: 38, rate: 0.4, range: 2.3 }, stab: { dmg: 72, rate: 0.95, range: 2.0 },
  },
  karambit: {
    ...MELEE_BASE, id: 'karambit', name: 'Talon Karambit', cls: 'Karambit', equip: 0.6, inspectDur: 2.2,
    desc: 'Hooked claw blade with a finger ring — spins around your index finger.',
    slash: { dmg: 40, rate: 0.38, range: 2.1 }, stab: { dmg: 70, rate: 0.9, range: 1.9 },
  },
  dagger: {
    ...MELEE_BASE, id: 'dagger', name: 'Kestrel Dagger', cls: 'Dagger', equip: 0.45, inspectDur: 1.9,
    desc: 'Double-edged balanced dagger. Toss-and-catch flip inspect.',
    slash: { dmg: 36, rate: 0.34, range: 2.2 }, stab: { dmg: 78, rate: 0.85, range: 2.1 },
  },
  bowie: {
    ...MELEE_BASE, id: 'bowie', name: 'Ridgeback Bowie', cls: 'Bowie Knife', equip: 0.55, inspectDur: 2.4, speed: 1.1,
    desc: 'Heavy clip-point bowie with brass guard. Slow, brutal stabs.',
    slash: { dmg: 46, rate: 0.48, range: 2.4 }, stab: { dmg: 90, rate: 1.1, range: 2.1 },
  },
  tanto: {
    ...MELEE_BASE, id: 'tanto', name: 'Shinobi Tanto', cls: 'Tanto', equip: 0.5, inspectDur: 2.1,
    desc: 'Chisel-point tanto with cord wrap. Flips to reverse grip and back.',
    slash: { dmg: 40, rate: 0.4, range: 2.3 }, stab: { dmg: 80, rate: 0.95, range: 2.0 },
  },
};
export const MELEES = Object.keys(KNIVES);

export function meleeRatings(k) {
  const c = (v) => Math.max(0.05, Math.min(1, v));
  return [
    ['Slash dmg', c(k.slash.dmg / 50)], ['Stab dmg', c(k.stab.dmg / 95)], ['Swing speed', c(0.25 / k.slash.rate)],
    ['Reach', c((k.slash.range - 1.6) / 0.9)], ['Mobility', c((k.speed - 0.8) / 0.38)], ['Draw', c(1 - k.equip + 0.25)],
  ];
}

// ---------------------------------------------------------------------------
const steel = new THREE.MeshStandardMaterial({ color: 0xcfd4dc, metalness: 1, roughness: 0.18 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: 1, roughness: 0.3 });
const blackG10 = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.8 });
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.25 });
const wood = new THREE.MeshStandardMaterial({ color: 0x6b3f22, roughness: 0.55 });
const anodized = new THREE.MeshStandardMaterial({ color: 0x5b3cff, metalness: 0.9, roughness: 0.25, emissive: 0x1a0a50 });
const cord = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
const red = new THREE.MeshStandardMaterial({ color: 0xc0242b, roughness: 0.6 });

function bladeMesh(points, mat = steel, thick = 0.004, curves = null) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else s.lineTo(p[0], p[1]);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.0016, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -thick / 2);
  const m = new THREE.Mesh(g, mat);
  m.rotation.y = Math.PI / 2; // shape +X -> world -Z
  m.castShadow = true;
  return m;
}

const bx = (w, h, d, mat, x, y, z, parent) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
};
const cyl = (r, len, mat, x, y, z, parent, axis = 'z') => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat);
  if (axis === 'z') m.rotation.x = Math.PI / 2; else if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
};

const sm = (a, b, t) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const bump = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));

// Each builder fills `spin` (the part that animates) and returns extras + inspect(t) / draw(k)
export const KNIFE_BUILDERS = {
  butterfly(g) {
    const spin = new THREE.Group(); g.add(spin);
    // blade + tang pivot at z=-0.06
    const bladeRoot = new THREE.Group(); bladeRoot.position.z = -0.06; spin.add(bladeRoot);
    const blade = bladeMesh([[0, -0.009], [0.11, -0.009], [0.15, 0.002], [0.125, 0.01], [0, 0.01]]);
    bladeRoot.add(blade);
    cyl(0.005, 0.03, darkSteel, 0, 0, 0, bladeRoot, 'x');
    const handles = [];
    for (const side of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(side * 0.009, 0, -0.06); spin.add(piv);
      const hg = new THREE.Group(); piv.add(hg);
      bx(0.007, 0.022, 0.13, side > 0 ? anodized : darkSteel, 0, 0, 0.065, hg);
      for (let i = 0; i < 4; i++) bx(0.0075, 0.008, 0.016, blackG10, 0, 0, 0.025 + i * 0.026, hg);
      cyl(0.0045, 0.012, darkSteel, 0, 0, 0.128, hg, 'x');
      handles.push(piv);
    }
    const latch = bx(0.004, 0.005, 0.02, darkSteel, 0.012, -0.012, 0.07, handles[1].children[0]);
    latch.rotation.x = 0.2;
    const setHandles = (a, b) => { handles[0].rotation.x = a; handles[1].rotation.x = -b; };
    return {
      spin,
      // draw: flip open from closed
      draw(k) { const c = 1 - sm(0, 0.85, k); setHandles(Math.PI * c, Math.PI * (1 - sm(0.15, 1, k))); spin.rotation.x = -Math.PI * 2 * sm(0, 1, k); },
      inspect(t) {
        const env = bump(t, 0, 0.08, 0.9, 1);
        const k = t * 5;
        setHandles(Math.PI * Math.sin(k * Math.PI) ** 2 * env, Math.PI * Math.sin((k + 0.5) * Math.PI) ** 2 * env);
        spin.rotation.x = -Math.PI * 2 * 3 * sm(0.04, 0.92, t);
        spin.rotation.z = Math.sin(t * Math.PI * 4) * 0.5 * env;
      },
      reset() { setHandles(0, 0); spin.rotation.set(0, 0, 0); spin.position.set(0, 0, 0); },
    };
  },

  karambit(g) {
    // pivot at the finger ring (z=+0.06) so it can spin around it
    const spin = new THREE.Group(); spin.position.z = 0.06; g.add(spin);
    const body = new THREE.Group(); body.position.z = -0.06; spin.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0055, 8, 22), darkSteel);
    ring.rotation.y = Math.PI / 2; ring.position.set(0, 0, 0.06); body.add(ring);
    const handle = bx(0.012, 0.026, 0.08, blackG10, 0, -0.004, 0.0, body); handle.rotation.x = 0.25;
    for (let i = 0; i < 3; i++) cyl(0.003, 0.014, darkSteel, 0, -0.004, -0.025 + i * 0.025, body, 'x');
    const blade = bladeMesh([[0, -0.006], [0.07, -0.03, 0.1, -0.075], [0.07, -0.05, 0.05, -0.028], [0.03, -0.012, 0, 0.012]], steel, 0.004);
    blade.position.set(0, 0.004, -0.04); body.add(blade);
    return {
      spin,
      draw(k) { spin.rotation.x = Math.PI * 2 * (1 - sm(0, 1, k)); },
      inspect(t) {
        spin.rotation.x = Math.PI * 2 * 3 * sm(0.1, 0.78, t) + Math.sin(t * Math.PI * 2) * 0.2 * bump(t, 0.78, 0.85, 0.9, 1);
        spin.rotation.y = bump(t, 0.8, 0.86, 0.95, 1) * 0.6;
      },
      reset() { spin.rotation.set(0, 0, 0); },
    };
  },

  dagger(g) {
    const spin = new THREE.Group(); g.add(spin);
    bx(0.014, 0.022, 0.09, wood, 0, 0, 0.0, spin).material = blackG10;
    for (let i = 0; i < 4; i++) bx(0.016, 0.024, 0.006, brass, 0, 0, -0.035 + i * 0.022, spin);
    bx(0.016, 0.05, 0.012, brass, 0, 0, -0.05, spin);               // cross guard
    cyl(0.01, 0.012, brass, 0, 0, 0.05, spin);                         // pommel
    const blade = bladeMesh([[0, -0.012], [0.16, -0.004], [0.19, 0], [0.16, 0.004], [0, 0.012]], steel, 0.005);
    blade.position.z = -0.056; spin.add(blade);
    bx(0.007, 0.002, 0.15, darkSteel, 0, 0, -0.13, spin);              // fuller ridge
    return {
      spin,
      draw(k) { spin.rotation.x = -Math.PI * 2 * (1 - sm(0, 1, k)); },
      inspect(t) {
        const air = sm(0.18, 0.45, t) * (1 - sm(0.45, 0.72, t));
        spin.position.y = air * 0.2;
        spin.position.x = -air * 0.03;
        spin.rotation.x = -Math.PI * 2 * 2 * sm(0.18, 0.72, t);
        spin.rotation.z = bump(t, 0.72, 0.8, 0.88, 1) * 0.5;
      },
      reset() { spin.rotation.set(0, 0, 0); spin.position.set(0, 0, 0); },
    };
  },

  bowie(g) {
    const spin = new THREE.Group(); g.add(spin);
    bx(0.018, 0.028, 0.1, wood, 0, -0.002, 0.005, spin);
    for (const z of [-0.025, 0.02]) cyl(0.0035, 0.02, brass, 0, -0.002, z, spin, 'x');
    bx(0.022, 0.03, 0.012, brass, 0, -0.002, 0.058, spin);             // butt cap
    const guard = bx(0.02, 0.07, 0.01, brass, 0, 0.0, -0.05, spin);
    guard.scale.y = 1;
    const blade = bladeMesh([[0, -0.018], [0.15, -0.02], [0.215, 0.006, 0.225, 0.012], [0.17, 0.012], [0.14, 0.02], [0, 0.02]], steel, 0.006);
    blade.position.z = -0.055; spin.add(blade);
    bx(0.0075, 0.004, 0.12, darkSteel, 0, 0.016, -0.12, spin);          // spine
    return {
      spin,
      draw(k) { spin.rotation.z = Math.PI * (1 - sm(0, 1, k)); },
      inspect(t) {
        spin.rotation.z = Math.PI * sm(0.2, 0.42, t) - Math.PI * sm(0.6, 0.82, t);
        spin.rotation.x = -bump(t, 0.05, 0.2, 0.85, 0.98) * 0.35;
      },
      reset() { spin.rotation.set(0, 0, 0); },
    };
  },

  tanto(g) {
    const spin = new THREE.Group(); g.add(spin);
    bx(0.015, 0.024, 0.1, cord, 0, 0, 0.0, spin);
    for (let i = 0; i < 6; i++) { const r = bx(0.017, 0.026, 0.006, red, 0, 0, -0.042 + i * 0.017, spin); r.rotation.x = 0.4 * (i % 2 ? 1 : -1); }
    bx(0.02, 0.034, 0.008, darkSteel, 0, 0, -0.052, spin);             // tsuba
    cyl(0.009, 0.01, darkSteel, 0, 0, 0.054, spin);
    const blade = bladeMesh([[0, -0.014], [0.15, -0.014], [0.18, 0.006], [0.165, 0.014], [0, 0.014]], steel, 0.005);
    blade.position.z = -0.056; spin.add(blade);
    bx(0.0062, 0.002, 0.15, darkSteel, 0, 0.006, -0.13, spin);
    return {
      spin,
      draw(k) { spin.rotation.x = Math.PI * (1 - sm(0, 1, k)); },
      inspect(t) {
        spin.rotation.x = Math.PI * sm(0.12, 0.3, t) - Math.PI * sm(0.68, 0.86, t);
        spin.rotation.z = bump(t, 0.32, 0.42, 0.58, 0.66) * 1.2;
      },
      reset() { spin.rotation.set(0, 0, 0); },
    };
  },
};

export const KNIFE_LENGTH = { butterfly: 0.36, karambit: 0.22, dagger: 0.3, bowie: 0.34, tanto: 0.3 };
