import * as THREE from 'three';
import { rand, clamp, damp } from './util.js';
import { buildAvatar, BOT_LOOK } from './avatar.js';

export const DIFFICULTIES = {
  easy: { label: 'Easy', size: 1.3, speed: 0.7, life: 1.7 },
  normal: { label: 'Normal', size: 1.0, speed: 1.0, life: 1.15 },
  hard: { label: 'Hard', size: 0.72, speed: 1.4, life: 0.8 },
};

export const MODES = {
  gridshot: { name: 'Gridshot', tag: 'Speed · Clicking', timed: true, desc: 'Three targets on a grid, always. Destroy them as fast as you can — streaks add bonus points.', tip: 'Don\'t chase accuracy over speed: rhythm wins Gridshot.' },
  flick: { name: 'Reflex Flick', tag: 'Reaction · Flicks', timed: true, desc: 'A single target appears anywhere in your view and vanishes quickly. Reaction time is measured.', tip: 'Keep your crosshair centred between targets to minimise flick distance.' },
  tracking: { name: 'Smooth Tracking', tag: 'Tracking · Control', timed: true, desc: 'Keep your crosshair glued to a strafing orb. Scored by time on target — firing is optional.', tip: 'Track with your arm, not your wrist, and anticipate direction changes.' },
  bots: { name: 'Bot Duel', tag: 'Combat · Headshots', timed: true, desc: 'Humanoid bots strafe ADAD at range. Headshots deal bonus damage. Eliminate them fast.', tip: 'Pre-aim head height. Burst at range, spray up close.' },
  free: { name: 'Free Range', tag: 'Practice · Sandbox', timed: false, desc: 'No timer. Steel plates at 10/25/50m, static dummies and a moving lane. Try every gun.', tip: 'Press 1 / 2 or scroll to swap weapons. ESC to leave.' },
};

const sphereGeo = new THREE.SphereGeometry(1, 28, 20);
function orbMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1 });
}

function refOf(obj) {
  while (obj) { if (obj.userData && obj.userData.ref) return obj.userData.ref; obj = obj.parent; }
  return null;
}

class BaseMode {
  constructor(G) {
    this.G = G;
    this.d = DIFFICULTIES[G.session.difficulty] || DIFFICULTIES.normal;
    this.group = new THREE.Group();
    G.scene.add(this.group);
    this.hitList = [];
  }
  get targets() { return this.hitList; }
  resolve(obj) { return refOf(obj); }
  update() {}
  onMiss() {}
  hud() { return ''; }
  extra() { return {}; }
  dispose() { this.G.scene.remove(this.group); }
  pop(pos, color) { this.G.fx.sparks(pos, new THREE.Vector3(0, 0, 1), 10, color); }
}

// ---------------------------------------------------------------------------
class Gridshot extends BaseMode {
  constructor(G) {
    super(G);
    this.cols = 5; this.rows = 4;
    this.r = 0.3 * this.d.size;
    this.spacing = 1.05 * Math.max(1, this.d.size);
    this.center = new THREE.Vector3(0, 2.6, -9);
    this.mat = orbMaterial('#28e0ff');
    this.orbs = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(sphereGeo, this.mat);
      m.castShadow = true;
      m.userData.ref = { kind: 'orb', mesh: m, cell: -1, age: 0 };
      this.group.add(m); this.orbs.push(m); this.hitList.push(m);
      this.place(m);
    }
    // backboard
    const bw = this.cols * this.spacing + 1, bh = this.rows * this.spacing + 1;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.9, transparent: true, opacity: 0.75 }));
    board.position.copy(this.center).add(new THREE.Vector3(0, 0, -0.8));
    this.group.add(board);
    G.addSolid(board, this.group);
  }
  cellPos(c) {
    const x = (c % this.cols) - (this.cols - 1) / 2;
    const y = Math.floor(c / this.cols) - (this.rows - 1) / 2;
    return this.center.clone().add(new THREE.Vector3(x * this.spacing, y * this.spacing, 0));
  }
  place(m) {
    const used = new Set(this.orbs.map(o => o.userData.ref.cell));
    let c;
    do { c = Math.floor(Math.random() * this.cols * this.rows); } while (used.has(c));
    m.userData.ref.cell = c;
    m.userData.ref.age = 0;
    m.position.copy(this.cellPos(c));
    m.scale.setScalar(0.01);
  }
  update(dt) {
    for (const o of this.orbs) {
      const r = o.userData.ref; r.age += dt;
      o.scale.setScalar(this.r * clamp(r.age / 0.08, 0.05, 1));
    }
  }
  onHit(ref) {
    const S = this.G.stats;
    S.streak++;
    const pts = 100 + Math.min(S.streak, 20) * 5;
    this.G.addScore(pts, ref.mesh.position);
    this.G.hud.hitmarker('kill');
    this.G.audio.kill();
    this.pop(ref.mesh.position, 0x28e0ff);
    this.place(ref.mesh);
    return { consumed: true };
  }
  onMiss() { this.G.stats.streak = 0; }
  hud() { return `Streak <b>${this.G.stats.streak}</b>`; }
}

// ---------------------------------------------------------------------------
class Flick extends BaseMode {
  constructor(G) {
    super(G);
    this.mat = orbMaterial('#ffb000');
    this.orb = new THREE.Mesh(sphereGeo, this.mat);
    this.orb.castShadow = true;
    this.orb.userData.ref = { kind: 'orb', mesh: this.orb };
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 40), new THREE.MeshBasicMaterial({ color: 0xffb000, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
    this.ring.raycast = () => {};
    this.orb.add(this.ring);
    this.group.add(this.orb);
    this.hitList.push(this.orb);
    this.orb.visible = false;
    this.wait = 0.6;
    this.alive = 0;
    this.expired = 0;
    this.reactions = [];
  }
  spawn() {
    const G = this.G;
    const yaw = G.player.yaw + rand(-0.75, 0.75);
    const pitch = rand(-0.05, 0.32);
    const dist = rand(8, 20);
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const p = G.eye().addScaledVector(dir, dist);
    p.y = clamp(p.y, 0.6, 6.5);
    p.x = clamp(p.x, -16, 16);
    this.orb.position.copy(p);
    this.r = 0.28 * this.d.size * (dist / 12) ** 0.35;
    this.orb.visible = true;
    this.alive = 0;
  }
  update(dt) {
    if (!this.orb.visible) {
      this.wait -= dt;
      if (this.wait <= 0) this.spawn();
      return;
    }
    this.alive += dt;
    const k = this.alive / this.d.life;
    this.orb.scale.setScalar(this.r * clamp(this.alive / 0.06, 0.1, 1));
    this.ring.scale.setScalar(1 + (1 - k) * 0.8);
    this.ring.lookAt(this.G.camera.position);
    this.ring.material.opacity = 0.9 * (1 - k);
    if (k >= 1) {
      this.orb.visible = false;
      this.expired++;
      this.G.stats.streak = 0;
      this.G.hud.flashMsg('TOO SLOW', '#ff5050');
      this.wait = rand(0.25, 0.55);
    }
  }
  onHit(ref) {
    if (!this.orb.visible) return { consumed: false };
    const rt = this.alive;
    this.reactions.push(rt);
    const S = this.G.stats; S.streak++;
    const pts = Math.round(100 + 200 * Math.max(0, 1 - rt / this.d.life));
    this.G.addScore(pts, this.orb.position);
    this.G.hud.hitmarker('kill');
    this.G.audio.kill();
    this.pop(this.orb.position, 0xffb000);
    this.orb.visible = false;
    this.wait = rand(0.2, 0.5);
    return { consumed: true };
  }
  onMiss() { this.G.stats.streak = 0; }
  avgReaction() { return this.reactions.length ? this.reactions.reduce((a, b) => a + b, 0) / this.reactions.length : 0; }
  hud() {
    const a = this.avgReaction();
    return `Reaction <b>${a ? Math.round(a * 1000) + 'ms' : '—'}</b> · Missed <b>${this.expired}</b>`;
  }
  extra() { return { 'Avg reaction': this.reactions.length ? Math.round(this.avgReaction() * 1000) + ' ms' : '—', 'Targets expired': this.expired }; }
}

// ---------------------------------------------------------------------------
class Tracking extends BaseMode {
  constructor(G) {
    super(G);
    this.matOff = orbMaterial('#ff3b5c');
    this.matOn = orbMaterial('#3bff8a');
    this.orb = new THREE.Mesh(sphereGeo, this.matOff);
    this.orb.castShadow = true;
    this.orb.userData.ref = { kind: 'orb', mesh: this.orb };
    this.r = 0.45 * this.d.size;
    this.orb.scale.setScalar(this.r);
    this.orb.position.set(0, 2.2, -12);
    this.group.add(this.orb);
    this.hitList.push(this.orb);
    this.vx = 0; this.targetVx = 4; this.vy = 0; this.timer = 0.8;
    this.onTime = 0; this.total = 0;
    this.trail = [];
    // rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x334, transparent: true, opacity: 0.5 }));
    rail.position.set(0, 0.9, -12); this.group.add(rail);
  }
  update(dt) {
    const sp = this.d.speed;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = rand(0.35, 1.2) / Math.sqrt(sp);
      const mag = rand(2.5, 6.5) * sp;
      this.targetVx = (Math.random() < 0.5 ? -1 : 1) * mag;
      this.targetVy = rand(-1.2, 1.2) * sp;
    }
    const p = this.orb.position;
    if (p.x > 7) this.targetVx = -Math.abs(this.targetVx);
    if (p.x < -7) this.targetVx = Math.abs(this.targetVx);
    if (p.y > 4) this.targetVy = -Math.abs(this.targetVy || 1);
    if (p.y < 1.2) this.targetVy = Math.abs(this.targetVy || 1);
    this.vx = damp(this.vx, this.targetVx, 7, dt);
    this.vy = damp(this.vy, this.targetVy || 0, 4, dt);
    p.x += this.vx * dt; p.y += this.vy * dt;

    const on = this.G.aimingAt(this.hitList);
    this.total += dt;
    if (on) { this.onTime += dt; this.G.stats.score = Math.round(this.onTime * 100); }
    this.orb.material = on ? this.matOn : this.matOff;
    this.G.hud.trackingState(on);
  }
  onHit(ref, part, dmg, point) {
    this.G.hud.hitmarker('hit');
    this.G.audio.hit(false);
    this.G.fx.sparks(point, new THREE.Vector3(0, 0, 1), 2, 0x3bff8a);
    return { consumed: false, noScore: true };
  }
  pct() { return this.total ? (this.onTime / this.total) * 100 : 0; }
  hud() { return `On target <b>${this.pct().toFixed(1)}%</b>`; }
  extra() { return { 'Time on target': this.pct().toFixed(1) + '%' }; }
}

// ---------------------------------------------------------------------------
function makeHealthBar() {
  const g = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, opacity: 0.6, transparent: true, depthTest: false }));
  bg.scale.set(0.62, 0.075, 1); bg.center.set(0, 0.5); bg.position.x = -0.31;
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x5dff7a, depthTest: false, transparent: true }));
  fg.scale.set(0.6, 0.055, 1); fg.center.set(0, 0.5); fg.position.x = -0.3;
  bg.renderOrder = 10; fg.renderOrder = 11;
  bg.raycast = fg.raycast = () => {}; // UI only, never blocks bullets
  g.add(bg, fg);
  g.userData.fg = fg;
  g.set = (k) => {
    fg.scale.x = 0.6 * clamp(k, 0, 1);
    fg.material.color.set(k > 0.5 ? 0x5dff7a : k > 0.25 ? 0xffc23d : 0xff4040);
  };
  return g;
}

class Bot {
  constructor(mode, idx) {
    this.mode = mode;
    this.av = buildAvatar(BOT_LOOK, { weapon: idx % 2 ? 'smg' : 'ar' });
    this.group = this.av.group;
    this.group.userData.ref = this;
    this.kind = 'bot';
    this.name = `BOT-${String(Math.floor(rand(10, 99)))}`;
    this.bar = makeHealthBar();
    this.bar.position.y = 2.05;
    this.group.add(this.bar);
    this.flashT = 0;
    this.active = false;
    this.group.visible = false;
    mode.group.add(this.group);
  }
  spawn(pos, { moving = true, regen = false } = {}) {
    this.hp = 100; this.dead = false; this.deadT = 0; this.active = true;
    this.moving = moving; this.regen = regen; this.regenT = 0;
    this.group.visible = true;
    this.group.position.copy(pos);
    this.home = pos.clone();
    this.group.rotation.set(0, 0, 0);
    this.av.body.rotation.set(0, 0, 0);
    this.bar.set(1);
    this.vx = 0; this.dir = Math.random() < 0.5 ? -1 : 1; this.switchT = rand(0.3, 1);
    this.spawnTime = this.mode.G.clock;
  }
  damage(n, head) {
    if (this.dead) return false;
    this.hp -= n;
    this.flashT = 0.08;
    this.regenT = 2;
    this.bar.set(this.hp / 100);
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; return true; }
    return false;
  }
  update(dt) {
    if (!this.active) return;
    const G = this.mode.G;
    const sp = this.mode.d.speed;
    // face player
    const eye = G.camera.position;
    const yaw = Math.atan2(eye.x - this.group.position.x, eye.z - this.group.position.z);
    this.group.rotation.y = yaw;
    if (this.dead) {
      this.deadT += dt;
      this.av.body.rotation.x = -Math.min(1, this.deadT / 0.35) * 1.45;
      this.bar.visible = false;
      if (this.deadT > 0.8) { this.active = false; this.group.visible = false; }
      return;
    }
    this.bar.visible = true;
    let strafe = 0;
    if (this.moving) {
      this.switchT -= dt;
      if (this.switchT <= 0) {
        this.switchT = rand(0.25, 1.1) / sp;
        this.dir = Math.random() < 0.15 ? 0 : (Math.random() < 0.7 ? -Math.sign(this.dir || 1) : Math.sign(this.dir || 1));
      }
      const maxV = 3.6 * sp;
      this.vx = damp(this.vx, this.dir * maxV, 9, dt);
      // move perpendicular to line of sight
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      this.group.position.addScaledVector(right, this.vx * dt);
      const off = this.group.position.x - this.home.x;
      if (Math.abs(off) > 5 || this.group.position.x < -15 || this.group.position.x > 15) { this.dir = -Math.sign(off); this.switchT = rand(0.3, 0.8); }
      strafe = this.vx / maxV;
    }
    if (this.regen && this.hp < 100) {
      this.regenT -= dt;
      if (this.regenT <= 0) { this.hp = 100; this.bar.set(1); }
    }
    this.av.animate(dt, strafe);
    this.flashT -= dt;
    this.av.materials.armor.emissive.set(this.flashT > 0 ? 0xffffff : 0x000000);
    this.av.materials.armor.emissiveIntensity = this.flashT > 0 ? 0.6 : 0;
  }
}

class Bots extends BaseMode {
  constructor(G) {
    super(G);
    this.count = G.session.difficulty === 'hard' ? 2 : 1;
    this.bots = [];
    for (let i = 0; i < 3; i++) { const b = new Bot(this, i); this.bots.push(b); this.hitList.push(b.group); }
    this.respawnQ = [];
    for (let i = 0; i < this.count; i++) this.spawnOne(0.6 + i * 0.3);
    this.ttk = [];
  }
  spawnOne(delay) { this.respawnQ.push(delay); }
  update(dt) {
    for (let i = this.respawnQ.length - 1; i >= 0; i--) {
      this.respawnQ[i] -= dt;
      if (this.respawnQ[i] <= 0) {
        this.respawnQ.splice(i, 1);
        const b = this.bots.find(x => !x.active);
        if (b) b.spawn(new THREE.Vector3(rand(-9, 9), 0, -rand(11, 26)));
      }
    }
    for (const b of this.bots) b.update(dt);
  }
  onHit(bot, part, dmg, point) {
    if (bot.dead || !bot.active) return { consumed: false };
    const head = part === 'head';
    const G = this.G;
    const killed = bot.damage(dmg, head);
    G.hud.dmgNumber(point, dmg, head);
    G.addScore(head ? 25 : 10, null);
    if (killed) {
      const t = G.clock - bot.spawnTime;
      this.ttk.push(t);
      G.stats.kills++;
      if (head) G.stats.headKills++;
      G.stats.streak++;
      G.addScore(300 + (head ? 150 : 0) + Math.round(Math.max(0, 2.5 - t) * 80), point);
      G.hud.hitmarker(head ? 'headkill' : 'kill');
      G.audio.kill();
      G.hud.feed(G.profile.operator.name, G.weapon.def.name, bot.name, head);
      this.spawnOne(rand(0.25, 0.6));
    } else {
      G.hud.hitmarker(head ? 'head' : 'hit');
      G.audio.hit(head);
    }
    return { consumed: true, killed };
  }
  onMiss() { }
  hud() { return `Kills <b>${this.G.stats.kills}</b>`; }
  extra() {
    const avg = this.ttk.length ? this.ttk.reduce((a, b) => a + b, 0) / this.ttk.length : 0;
    return { Eliminations: this.G.stats.kills, 'Headshot kills': this.G.stats.headKills, 'Avg time-to-kill': avg ? avg.toFixed(2) + ' s' : '—' };
  }
}

// ---------------------------------------------------------------------------
class FreeRange extends BaseMode {
  constructor(G) {
    super(G);
    this.plates = [];
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.6, roughness: 0.35 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333840, metalness: 0.6, roughness: 0.5 });
    const rows = [[10, 0.3, 5], [25, 0.35, 5], [50, 0.45, 4]];
    for (const [z, r, n] of rows) {
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 2.2;
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), poleMat);
        pole.position.set(x, 0.7, -z); pole.castShadow = true; this.group.add(pole);
        G.addSolid(pole, this.group);
        const pivot = new THREE.Group(); pivot.position.set(x, 1.4, -z); this.group.add(pivot);
        const mat = plateMat.clone();
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 28), mat);
        plate.rotation.x = Math.PI / 2; plate.position.y = r + 0.02; plate.castShadow = true;
        const bull = new THREE.Mesh(new THREE.CircleGeometry(r * 0.35, 20), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
        bull.position.set(0, r + 0.02, 0.017); pivot.add(bull);
        pivot.add(plate);
        const ref = { kind: 'plate', pivot, mat, swing: 0, vel: 0, flash: 0 };
        plate.userData.ref = ref; bull.userData.ref = ref;
        this.hitList.push(plate, bull);
        this.plates.push(ref);
      }
    }
    // static dummies + one mover
    this.bots = [];
    const spots = [[-7, -15, false], [7, -18, false], [-3, -32, false], [4, -45, false], [0, -22, true]];
    spots.forEach(([x, z, moving], i) => {
      const b = new Bot(this, i);
      b.spawn(new THREE.Vector3(x, 0, z), { moving, regen: true });
      b.respawnAt = 0;
      this.bots.push(b); this.hitList.push(b.group);
    });
  }
  update(dt) {
    for (const p of this.plates) {
      p.vel += (-p.swing * 60 - p.vel * 4) * dt;
      p.swing += p.vel * dt;
      p.pivot.rotation.x = -p.swing;
      p.flash = Math.max(0, p.flash - dt * 4);
      p.mat.emissive.setRGB(p.flash, p.flash * 0.3, 0);
    }
    for (const b of this.bots) {
      b.update(dt);
      if (!b.active) {
        b.respawnAt += dt;
        if (b.respawnAt > 1.5) { b.respawnAt = 0; b.spawn(b.home, { moving: b.moving, regen: true }); }
      }
    }
  }
  onHit(ref, part, dmg, point) {
    const G = this.G;
    if (ref.kind === 'plate') {
      ref.vel += 6 + dmg * 0.05; ref.flash = 1;
      G.audio.plate();
      G.hud.hitmarker('hit');
      G.addScore(1, null);
      G.fx.sparks(point, new THREE.Vector3(0, 0, 1), 4);
      return { consumed: true };
    }
    if (ref.dead || !ref.active) return { consumed: false };
    const head = part === 'head';
    const killed = ref.damage(dmg, head);
    G.hud.dmgNumber(point, dmg, head);
    G.addScore(1, null);
    if (killed) { G.stats.kills++; G.hud.hitmarker(head ? 'headkill' : 'kill'); G.audio.kill(); G.hud.feed(G.profile.operator.name, G.weapon.def.name, ref.name, head); }
    else { G.hud.hitmarker(head ? 'head' : 'hit'); G.audio.hit(head); }
    return { consumed: true };
  }
  hud() { return `Hits <b>${this.G.stats.hits}</b> · Kills <b>${this.G.stats.kills}</b>`; }
}

export function createMode(id, G) {
  switch (id) {
    case 'gridshot': return new Gridshot(G);
    case 'flick': return new Flick(G);
    case 'tracking': return new Tracking(G);
    case 'bots': return new Bots(G);
    default: return new FreeRange(G);
  }
}
