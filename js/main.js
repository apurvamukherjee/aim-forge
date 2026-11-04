import * as THREE from 'three';
import { AudioSys } from './audio.js';
import { loadProfile, saveProfile } from './storage.js';
import { WEAPONS, Viewmodel, setOperatorColors, buildWeaponModel } from './weapons.js';
import { buildAvatar, operatorColors, BOT_LOOK } from './avatar.js';
import { KNIFE_LENGTH } from './knives.js';
import { buildWorld, buildMenuStage, ARENA } from './world.js';
import { Effects } from './effects.js';
import { createMode, MODES, DIFFICULTIES } from './modes.js';
import { Hud } from './hud.js';
import { Menu } from './ui.js';
import { clamp, damp, lerp, rand, nextFrame } from './util.js';

const DEG = Math.PI / 180;
const EYE = 1.65, EYE_CROUCH = 1.15, RADIUS = 0.35;
const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.profile = loadProfile();
    this.audio = new AudioSys();
    this.audio.setVolume(this.profile.settings.volume);
    this.state = 'loading';
    this.clock = 0;
    this.input = { keys: new Set(), fire: false, pressAt: 0, adsHeld: false, adsToggled: false, dx: 0, dy: 0 };
    this.player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, grounded: true, crouch: 0, stepT: 0 };
    this.recoil = { pitch: 0, yaw: 0 };
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 250;
    this.locked = false;
    this.dynSolids = [];
  }

  // ------------------------------------------------------------------ loading
  async load() {
    const bar = $('load-bar-fill'), pct = $('load-pct'), status = $('load-status');
    const steps = [
      ['Initialising renderer', () => this.initRenderer()],
      ['Pouring concrete · building arena', () => this.initWorld()],
      ['Machining weapons', () => this.initWeapons()],
      ['Suiting up operator', () => this.initMenuStage()],
      ['Calibrating training bots', () => { this._warmBot = buildAvatar(BOT_LOOK); }],
      ['Compiling shaders', () => this.compile()],
    ];
    for (let i = 0; i < steps.length; i++) {
      status.textContent = steps[i][0] + '…';
      await nextFrame();
      const t0 = performance.now();
      steps[i][1]();
      // keep each stage on screen briefly so progress is readable
      const spent = performance.now() - t0;
      if (spent < 160) await new Promise(r => setTimeout(r, 160 - spent));
      const k = (i + 1) / steps.length;
      bar.style.width = `${k * 100}%`;
      pct.textContent = `${Math.round(k * 100)}%`;
    }
    status.textContent = 'Systems online';
    this.hud = new Hud();
    this.hud.applyCrosshair(this.profile.settings);
    this.menu = new Menu(this);
    this.bindInput();
    this.last = performance.now();
    requestAnimationFrame(this.loop);
    $('load-enter').classList.remove('hidden');
    const enter = () => {
      window.removeEventListener('keydown', enter);
      $('loading').removeEventListener('click', enter);
      this.audio.unlock();
      this.audio.ui('click');
      $('loading').classList.add('fade-out');
      setTimeout(() => $('loading').classList.add('hidden'), 600);
      this.toMenu();
    };
    $('loading').addEventListener('click', enter);
    window.addEventListener('keydown', enter);
  }

  initRenderer() {
    const canvas = $('c');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.autoClear = false;
    this.renderer = r;
    this.applyQuality();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
    this.camera.rotation.order = 'YXZ';
    this.viewCam = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
    this.menuCam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  applyQuality() {
    const hi = this.profile.settings.quality === 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, hi ? 2 : 1));
    this.renderer.shadowMap.enabled = hi;
  }

  accent() { return operatorColors(this.profile.operator).accent; }

  initWorld() {
    this.scene = new THREE.Scene();
    this.world = buildWorld(this.scene, { accent: this.accent(), quality: this.profile.settings.quality });
    this.fx = new Effects(this.scene);
    this.viewScene = new THREE.Scene();
    this.viewScene.add(new THREE.HemisphereLight(0xdfe8ff, 0x302820, 1.6));
    const vk = new THREE.DirectionalLight(0xffffff, 2.2); vk.position.set(1, 2, 1.5); this.viewScene.add(vk);
    const vr = new THREE.DirectionalLight(0x9fc0ff, 1.0); vr.position.set(-2, 0.5, -1); this.viewScene.add(vr);
    const vf = new THREE.DirectionalLight(0xffffff, 1.2); vf.position.set(-1, 0.6, 0.8); this.viewScene.add(vf);
    this.viewScene.environment = null;
  }

  initWeapons() {
    this.viewmodel = new Viewmodel(this.viewScene);
    for (const id of Object.keys(WEAPONS)) this.viewmodel.prepare(id);
    this.applyOperator();
  }

  initMenuStage() {
    this.menuScene = new THREE.Scene();
    this.stage = buildMenuStage(this.menuScene, this.accent());
    this.camFocus = { pos: new THREE.Vector3(-0.9, 1.5, 4.4), look: new THREE.Vector3(-0.95, 1.05, 0) };
    this.camCur = { pos: this.camFocus.pos.clone(), look: this.camFocus.look.clone() };
    this.avatarSpin = 0.5;
    this.rebuildMenuAvatar();
  }

  rebuildMenuAvatar() {
    if (this.menuAvatar) this.menuScene.remove(this.menuAvatar.group);
    const look = operatorColors(this.profile.operator);
    this.menuAvatar = buildAvatar(look, { weapon: this.profile.loadout.primary });
    this.menuAvatar.group.position.set(0, 0.12, 0);
    this.menuScene.add(this.menuAvatar.group);
  }

  setShowcase(id) {
    const s = this.stage.showcase;
    s.clear();
    if (!id) return;
    const m = buildWeaponModel(id);
    const len = { ar: 1.2, smg: 0.75, sniper: 1.55, shotgun: 1.15, pistol: 0.35, ...KNIFE_LENGTH }[id] || 1;
    m.group.scale.setScalar(Math.min(m.melee ? 3.2 : 2.4, (m.melee ? 0.95 : 1.15) / len));
    this.showcaseInfo = m;
    m.group.position.z = 0.1 * m.group.scale.x;
    s.add(m.group);
  }

  applyOperator() {
    const look = operatorColors(this.profile.operator);
    setOperatorColors(look);
    if (this.world) this.world.setAccent(look.accent);
    if (this.stage) this.stage.setAccent(look.accent);
    document.documentElement.style.setProperty('--accent', look.accent);
  }

  // a small procedural studio, prefiltered into an environment map so metal has something to reflect
  buildEnvironment() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x1a2230, side: THREE.BackSide })));
    const panel = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel(0xffffff, 0, 8, 0, 8, 3);
    panel(0xb0c8ff, -8, 2, 2, 3, 6);
    panel(0xffe2c0, 7, 3, -3, 4, 4);
    panel(0x445066, 0, -6, 0, 12, 12);
    const tex = pm.fromScene(env, 0.03).texture;
    pm.dispose();
    for (const sc of [this.viewScene, this.menuScene]) sc.environment = tex;
  }

  compile() {
    this.buildEnvironment();
    this.renderer.compile(this.scene, this.camera);
    this.renderer.compile(this.viewScene, this.viewCam);
    this.renderer.compile(this.menuScene, this.menuCam);
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.w = w; this.h = h;
    for (const c of [this.camera, this.viewCam, this.menuCam]) { c.aspect = w / h; c.updateProjectionMatrix(); }
    this.baseVfov = this.vfovFromH(this.profile.settings.fov);
  }

  vfovFromH(hdeg) {
    const aspect = (this.w || 16) / (this.h || 9);
    return 2 * Math.atan(Math.tan(hdeg * DEG / 2) / aspect) / DEG;
  }

  // ------------------------------------------------------------------ input
  bindInput() {
    const canvas = $('c');
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      this.ignoreMouseUntil = performance.now() + 120; // Chrome emits a bogus jump right after lock
      $('lock-hint').classList.toggle('hidden', this.locked || !this.inGame());
      if (was && !this.locked && this.inGame()) this.pause();
    });
    document.addEventListener('pointerlockerror', () => { $('lock-hint').classList.toggle('hidden', !this.inGame()); });
    document.addEventListener('mousemove', (e) => {
      if (!this.inGame()) return;
      if (!this.locked && !this.debug) return;
      if (performance.now() < (this.ignoreMouseUntil || 0)) return;
      const mx = e.movementX || 0, my = e.movementY || 0;
      if (Math.abs(mx) > 600 || Math.abs(my) > 600) return; // discard spurious spikes
      this.input.dx += mx;
      this.input.dy += my;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.inGame()) return;
      if (!this.locked && !this.debug) { this.requestLock(); return; }
      if (e.button === 0) { this.input.fire = true; this.input.pressAt = performance.now(); }
      if (e.button === 2) {
        this.input.rmbAt = performance.now();
        if (this.profile.settings.adsToggle) this.input.adsToggled = !this.input.adsToggled;
        this.input.adsHeld = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.fire = false;
      if (e.button === 2) this.input.adsHeld = false;
    });
    window.addEventListener('contextmenu', (e) => { if (this.inGame() || e.target === canvas) e.preventDefault(); });
    window.addEventListener('wheel', (e) => {
      if (!this.inGame() || this.state === 'paused') return;
      const order = ['primary', 'secondary', 'melee'];
      const i = order.indexOf(this.slot);
      this.switchWeapon(order[(i + (e.deltaY > 0 ? 1 : 2)) % 3]);
    }, { passive: true });
    $('lock-hint').addEventListener('click', () => this.requestLock());
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const k = e.code;
      if (this.inGame()) {
        if (['Space', 'Tab', 'ControlLeft', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) e.preventDefault();
        this.input.keys.add(k);
        if (k === 'KeyR') this.startReload();
        if (k === 'Digit1') this.switchWeapon('primary');
        if (k === 'Digit2') this.switchWeapon('secondary');
        if (k === 'Digit3') this.switchWeapon('melee');
        if (k === 'KeyQ') this.switchWeapon(this.lastSlot && this.lastSlot !== this.slot ? this.lastSlot : (this.slot === 'primary' ? 'secondary' : 'primary'));
        if (k === 'KeyF') this.startInspect();
        if (k === 'Escape' && !this.locked) this.pause();
      } else if (this.state === 'paused' && k === 'Escape') {
        this.resume();
      } else if (this.state === 'results' && (k === 'Enter' || k === 'KeyR')) {
        this.startRun();
      }
    });
    window.addEventListener('keyup', (e) => this.input.keys.delete(e.code));
    window.addEventListener('blur', () => { this.input.keys.clear(); this.input.fire = false; this.input.adsHeld = false; });
  }

  requestLock() {
    const c = $('c');
    try {
      const p = c.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { c.requestPointerLock(); } catch { /* ignore */ } });
    } catch { try { c.requestPointerLock(); } catch { /* ignore */ } }
  }

  inGame() { return this.state === 'playing' || this.state === 'countdown'; }

  // ------------------------------------------------------------------ flow
  toMenu() {
    this.state = 'menu';
    this.teardownRun();
    this.hud.show(false);
    $('pause').classList.add('hidden');
    $('results').classList.add('hidden');
    $('lock-hint').classList.add('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    this.menu.show(true);
  }

  teardownRun() {
    if (this.mode) { this.mode.dispose(); this.mode = null; }
    for (const s of this.dynSolids) { const i = this.world.solids.indexOf(s); if (i >= 0) this.world.solids.splice(i, 1); }
    this.dynSolids.length = 0;
    if (this.fx) this.fx.clear();
    if (this.hud) { this.hud.clearFeed(); this.hud.setScope(false); this.hud.countdown(''); }
  }

  addSolid(mesh) { this.world.solids.push(mesh); this.dynSolids.push(mesh); }

  startRun() {
    this.audio.unlock();
    this.teardownRun();
    this.session = { ...this.profile.session };
    const p = this.player;
    p.pos.set(0, 0, 0); p.vel.set(0, 0, 0); p.yaw = 0; p.pitch = 0.04; p.grounded = true; p.crouch = 0;
    this.recoil.pitch = this.recoil.yaw = 0;
    this.stats = { score: 0, shots: 0, hits: 0, headshots: 0, kills: 0, headKills: 0, streak: 0, bestStreak: 0 };
    this.input.fire = false; this.input.pressAt = 0; this.input.adsHeld = false; this.input.adsToggled = false; this.adsT = 0;
    this.loadout = {
      primary: this.makeWeaponState(this.profile.loadout.primary),
      secondary: this.makeWeaponState(this.profile.loadout.secondary),
      melee: this.makeWeaponState(this.profile.loadout.melee || 'butterfly'),
    };
    this.lastSlot = 'secondary';
    this.slot = 'primary';
    this.weapon = this.loadout.primary;
    this.weapon.equipT = 0;
    this.viewmodel.equip(this.weapon.def);
    this.mode = createMode(this.session.mode, this);
    this.timed = MODES[this.session.mode].timed;
    this.timeLeft = this.session.duration;
    this.elapsed = 0;
    this.countT = 3;
    this.lastCount = 4;
    this.state = 'countdown';
    this.menu.show(false);
    $('results').classList.add('hidden');
    $('pause').classList.add('hidden');
    this.hud.show(true);
    this.hud.applyCrosshair(this.profile.settings);
    $('hud-mode').textContent = `${MODES[this.session.mode].name} · ${DIFFICULTIES[this.session.difficulty].label}`;
    $('free-hint').classList.toggle('hidden', this.timed);
    this.updateFov(0);
    if (!this.locked) this.requestLock();
  }

  makeWeaponState(id) {
    const def = WEAPONS[id];
    return { def, ammo: def.mag, reloading: false, reloadT: 0, shellT: 0, nextFire: 0, cycleT: null, equipT: 1, bloom: 0, sfx: {}, swing: null, inspectT: null, alt: false };
  }

  pause() {
    if (!this.inGame()) return;
    this.prevState = this.state;
    this.state = 'paused';
    this.input.fire = false; this.input.keys.clear(); this.input.adsHeld = false;
    $('pause').classList.remove('hidden');
    $('lock-hint').classList.add('hidden');
    this.menu.syncPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.prevState || 'playing';
    $('pause').classList.add('hidden');
    this.hud.applyCrosshair(this.profile.settings);
    this.updateFov(this.adsT);
    this.requestLock();
  }

  endRun() {
    const s = this.stats;
    this.state = 'results';
    if (document.pointerLockElement) document.exitPointerLock();
    this.hud.show(false);
    this.hud.setScope(false);
    const acc = s.shots ? (s.hits / s.shots) * 100 : 0;
    const key = `${this.session.mode}:${this.session.difficulty}:${this.session.duration}`;
    const timed = this.timed;
    const prevBest = this.profile.best[key]?.score ?? 0;
    const isBest = timed && s.score > prevBest;
    if (timed) {
      if (isBest) this.profile.best[key] = { score: s.score, acc: +acc.toFixed(1), date: Date.now(), weapon: this.loadout.primary.def.id };
      this.profile.history.unshift({ mode: this.session.mode, diff: this.session.difficulty, dur: this.session.duration, score: s.score, acc: +acc.toFixed(1), date: Date.now() });
      this.profile.history = this.profile.history.slice(0, 15);
    }
    const T = this.profile.totals;
    T.shots += s.shots; T.hits += s.hits; T.runs += 1; T.seconds += Math.round(this.elapsed); T.kills += s.kills; T.headshots += s.headshots;
    saveProfile(this.profile);
    this.menu.showResults({
      mode: MODES[this.session.mode], diff: DIFFICULTIES[this.session.difficulty], timed,
      score: s.score, acc, shots: s.shots, hits: s.hits, headshots: s.headshots, bestStreak: s.bestStreak,
      extra: this.mode.extra(), isBest, prevBest, time: this.elapsed,
      hps: this.elapsed ? s.hits / this.elapsed : 0,
    });
    this.audio.beep(true);
  }

  addScore(pts, pos) {
    this.stats.score += pts;
    this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
    if (pos && pts >= 50) this.hud.scorePop(pts);
  }

  eye() { return this.camera.position.clone(); }

  // ------------------------------------------------------------------ weapons
  switchWeapon(slot) {
    if (slot === this.slot || this.state === 'paused') return;
    const w = this.weapon;
    w.reloading = false; w.swing = null; w.inspectT = null;
    this.lastSlot = this.slot;
    this.slot = slot;
    this.weapon = this.loadout[slot];
    this.weapon.equipT = 0;
    this.weapon.cycleT = null;
    this.input.adsToggled = false;
    this.viewmodel.equip(this.weapon.def);
    this.audio.equip();
  }

  startInspect() {
    const w = this.weapon;
    if (w.reloading || w.swing || w.equipT < 1 || this.adsT > 0.1 || this.state === 'paused') return;
    w.inspectT = 0;
    if (w.def.melee) this.audio.equip();
  }

  // melee: sweep a small fan of short rays in front of the player
  meleeHit(kind) {
    const w = this.weapon, d = w.def, a = d[kind];
    const cam = this.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const objects = [...this.mode.targets, ...this.world.solids];
    let best = null;
    const fan = kind === 'stab' ? [[0, 0], [-0.08, 0], [0.08, 0], [0, -0.08]] : [[0, 0], [-0.25, 0], [0.25, 0], [-0.12, 0.05], [0.12, -0.05], [0, -0.12]];
    for (const [ox, oy] of fan) {
      const dir = fwd.clone().addScaledVector(right, ox).addScaledVector(up, oy).normalize();
      this.raycaster.set(cam.position, dir);
      this.raycaster.far = a.range;
      const h = this.raycaster.intersectObjects(objects, true)[0];
      if (!h) continue;
      const ref = this.mode.resolve(h.object);
      const score = (ref ? 0 : 10) + h.distance;
      if (!best || score < best.score) best = { h, ref, score, dir };
    }
    this.raycaster.far = 250;
    this.stats.shots++;
    if (!best) return;
    const { h, ref } = best;
    if (ref) {
      const part = h.object.userData.part || 'body';
      const dmg = Math.round(a.dmg * (part === 'head' ? d.head : 1));
      const res = this.mode.onHit(ref, part, dmg, h.point.clone()) || {};
      if (res.consumed !== false || res.noScore) { this.stats.hits++; if (part === 'head') this.stats.headshots++; }
      this.audio.stab();
      this.fx.sparks(h.point, best.dir.clone().negate(), 5, 0xff5040);
    } else {
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : best.dir.clone().negate();
      this.fx.sparks(h.point, n, 8);
      this.audio.clang();
    }
  }

  updateMelee(dt, canFire, pressed) {
    const w = this.weapon, d = w.def, I = this.input;
    if (w.swing) {
      w.swing.t += dt / w.swing.dur;
      if (!w.swing.hitDone && w.swing.t >= w.swing.hitAt) { w.swing.hitDone = true; this.meleeHit(w.swing.kind); }
      if (w.swing.t >= 1) w.swing = null;
    }
    if (!canFire || w.swing || w.equipT < 1) return;
    const now = performance.now();
    const rmb = I.rmbAt > 0 && (I.rmbAt >= (this.prevTickAt || 0) - 1 || now - I.rmbAt < 200);
    if (pressed || I.fire) {
      I.pressAt = 0; w.inspectT = null; w.alt = !w.alt;
      w.swing = { kind: 'slash', t: 0, dur: d.slash.rate, hitAt: 0.32, hitDone: false, alt: w.alt };
      this.audio.swoosh(false);
    } else if (rmb || I.adsHeld) {
      I.rmbAt = 0; w.inspectT = null;
      w.swing = { kind: 'stab', t: 0, dur: d.stab.rate, hitAt: 0.48, hitDone: false };
      this.audio.swoosh(true);
    }
  }

  startReload() {
    const w = this.weapon;
    if (w.def.melee) return;
    w.inspectT = null;
    if (w.reloading || w.ammo >= w.def.mag || w.equipT < 1) return;
    w.reloading = true; w.reloadT = 0; w.shellT = 0; w.sfx = {};
    w.cycleT = null;
  }

  currentSpread() {
    const w = this.weapon, d = w.def, p = this.player;
    const hv = Math.hypot(p.vel.x, p.vel.z);
    const moveK = clamp(hv / 5, 0, 1);
    let s = lerp(d.spread.hip, d.spread.ads, this.adsT);
    s += d.spread.move * moveK * lerp(1, 0.5, this.adsT);
    if (!p.grounded) s += d.spread.air;
    s *= lerp(1, 0.8, p.crouch);
    s += w.bloom;
    return s;
  }

  aimingAt(objects) {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.raycaster.intersectObjects([...objects, ...this.world.solids], true);
    if (!hits.length) return false;
    return !!this.mode.resolve(hits[0].object);
  }

  fire() {
    const w = this.weapon, d = w.def;
    w.ammo--;
    w.nextFire = this.clock + 60 / d.rpm;
    if (d.bolt || d.pump) w.cycleT = 0;
    this.lastShot = this.clock;
    const spread = this.currentSpread();
    const cam = this.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    // muzzle position in world space for tracers
    const mv = this.viewmodel.muzzleView(new THREE.Vector3());
    const muzzleWorld = mv.clone().applyQuaternion(cam.quaternion).add(cam.position);
    const targets = this.mode.targets;
    const objects = [...targets, ...this.world.solids];
    let anyHit = false, anyHead = false, impactSound = false;
    for (let i = 0; i < d.pellets; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      const dir = fwd.clone().addScaledVector(right, Math.cos(a) * Math.tan(r)).addScaledVector(up, Math.sin(a) * Math.tan(r)).normalize();
      this.raycaster.set(cam.position, dir);
      const hits = this.raycaster.intersectObjects(objects, true);
      const h = hits[0];
      let end;
      if (h) {
        end = h.point;
        const ref = this.mode.resolve(h.object);
        if (ref) {
          const part = h.object.userData.part || 'body';
          let dmg = d.dmg * (part === 'head' ? d.head : 1);
          if (d.pellets > 1) dmg *= clamp(1.25 - h.distance / 25, 0.3, 1);
          else if (d.id === 'smg') dmg *= clamp(1.2 - h.distance / 40, 0.6, 1);
          const res = this.mode.onHit(ref, part, Math.round(dmg), h.point.clone()) || {};
          if (res.consumed !== false || res.noScore) { anyHit = true; if (part === 'head') anyHead = true; }
        } else {
          const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dir.clone().negate();
          this.fx.hole(h.point, n);
          this.fx.sparks(h.point, n, 4);
          if (!impactSound) { this.audio.impact(); impactSound = true; }
        }
      } else {
        end = cam.position.clone().addScaledVector(dir, 150);
      }
      if (i < 3 || Math.random() < 0.4) this.fx.tracer(muzzleWorld, end);
    }
    this.stats.shots++;
    if (anyHit) { this.stats.hits++; if (anyHead) this.stats.headshots++; }
    else this.mode.onMiss();

    // recoil
    const k = lerp(1, 0.7, this.adsT) * lerp(1, 0.8, this.player.crouch);
    this.recoil.pitch += d.recoil.v * DEG * k * rand(0.85, 1.15);
    this.recoil.yaw += rand(-1, 1) * d.recoil.h * DEG * k;
    w.bloom = Math.min(d.spread.bloomMax, w.bloom + d.spread.bloom);

    this.viewmodel.fire();
    this.fx.muzzle(muzzleWorld);
    this.audio.shot(d.sound);
  }

  updateWeapon(dt, canFire) {
    const w = this.weapon, d = w.def, I = this.input;
    // a click is buffered briefly so quick taps between frames are never lost
    const now = performance.now();
    const pressed = I.pressAt > 0 && (I.pressAt >= (this.prevTickAt || 0) || now - I.pressAt < 200);
    w.equipT = Math.min(1, w.equipT + dt / d.equip);
    if (w.inspectT != null) { w.inspectT += dt / (d.inspectDur || 2.2); if (w.inspectT >= 1 || this.adsT > 0.3) w.inspectT = null; }
    if (d.melee) { this.updateMelee(dt, canFire, pressed); this.prevTickAt = now; return; }
    this.prevTickAt = now;
    w.bloom = damp(w.bloom, 0, 4, dt);
    if (w.cycleT != null) {
      const prev = w.cycleT;
      w.cycleT += dt / (60 / d.rpm);
      if (prev < 0.35 && w.cycleT >= 0.35) this.audio.reload('rack');
      if (w.cycleT >= 1) w.cycleT = null;
    }
    // reload
    if (w.reloading) {
      if (d.shellReload) {
        w.shellT += dt / d.reload;
        if (w.shellT >= 1) {
          w.shellT = 0; w.ammo++;
          this.audio.reload('in');
          if (w.ammo >= d.mag) { w.reloading = false; w.cycleT = 0; }
        }
        if (pressed && w.ammo > 0) w.reloading = false; // fire interrupts shell reload
      } else {
        const prev = w.reloadT;
        w.reloadT += dt / d.reload;
        const cross = (t) => prev < t && w.reloadT >= t;
        if (cross(0.15)) this.audio.reload('out');
        if (cross(0.62)) this.audio.reload('in');
        if (cross(0.84)) this.audio.reload('rack');
        if (w.reloadT >= 1) { w.reloading = false; w.ammo = d.mag; }
      }
    }
    // fire
    const wantFire = d.auto ? (I.fire || pressed) : pressed;
    if (canFire && wantFire && !w.reloading && w.equipT >= 1 && w.cycleT == null && this.clock >= w.nextFire) {
      if (w.ammo <= 0) {
        if (pressed) this.audio.empty();
        I.pressAt = 0;
        if (this.profile.settings.autoReload) this.startReload();
        return;
      }
      I.pressAt = 0;
      w.inspectT = null;
      this.fire();
      if (w.ammo === 0 && this.profile.settings.autoReload) setTimeout(() => { if (this.weapon === w && w.ammo === 0) this.startReload(); }, 250);
    }
  }

  updateFov(adsT) {
    const d = this.weapon ? this.weapon.def : null;
    const zoom = d ? lerp(1, d.zoom, adsT) : 1;
    const base = this.baseVfov;
    const v = 2 * Math.atan(Math.tan(base * DEG / 2) / zoom) / DEG;
    if (Math.abs(this.camera.fov - v) > 0.01) { this.camera.fov = v; this.camera.updateProjectionMatrix(); }
    return zoom;
  }

  // ------------------------------------------------------------------ movement
  updatePlayer(dt) {
    const p = this.player, K = this.input.keys, d = this.weapon.def;
    const s = this.profile.settings;
    // look
    const zoomK = Math.tan(this.camera.fov * DEG / 2) / Math.tan(this.baseVfov * DEG / 2);
    const adsSens = lerp(1, s.adsMult * zoomK, this.adsT);
    const rad = s.sens * 0.022 * DEG * adsSens;
    let dYaw = -this.input.dx * rad;
    let dPitch = -this.input.dy * rad;
    // pulling down absorbs vertical recoil first
    if (dPitch < 0 && this.recoil.pitch > 0) {
      const absorb = Math.min(this.recoil.pitch, -dPitch);
      this.recoil.pitch -= absorb; dPitch += absorb;
    }
    p.yaw += dYaw;
    p.pitch = clamp(p.pitch + dPitch, -1.5, 1.5);
    this.lookDX = this.input.dx; this.lookDY = this.input.dy;
    this.input.dx = 0; this.input.dy = 0;

    // recoil recovery
    if (this.clock - (this.lastShot || 0) > 60 / d.rpm + 0.04) {
      this.recoil.pitch = damp(this.recoil.pitch, 0, d.recoil.recover, dt);
      this.recoil.yaw = damp(this.recoil.yaw, 0, d.recoil.recover, dt);
    }

    // move
    const f = (K.has('KeyW') ? 1 : 0) - (K.has('KeyS') ? 1 : 0);
    const r = (K.has('KeyD') ? 1 : 0) - (K.has('KeyA') ? 1 : 0);
    const crouching = K.has('ControlLeft') || K.has('KeyC');
    p.crouch = damp(p.crouch, crouching ? 1 : 0, 14, dt);
    const sprint = K.has('ShiftLeft') && f > 0 && this.adsT < 0.2 && !crouching;
    let speed = 5.2 * d.speed;
    if (sprint) speed = 7.4 * d.speed;
    speed *= lerp(1, 0.55, this.adsT) * lerp(1, 0.45, p.crouch);
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const rt = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const wish = fwd.multiplyScalar(f).add(rt.multiplyScalar(r));
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    const accel = p.grounded ? 14 : 2.5;
    p.vel.x = damp(p.vel.x, wish.x, accel, dt);
    p.vel.z = damp(p.vel.z, wish.z, accel, dt);
    if (K.has('Space') && p.grounded) { p.vel.y = 6.4; p.grounded = false; }
    p.vel.y -= 20 * dt;
    const prevY = p.pos.y;
    p.pos.addScaledVector(p.vel, dt);
    // floor
    let ground = 0;
    // colliders
    const h = lerp(1.8, 1.25, p.crouch);
    for (const b of this.world.colliders) {
      if (p.pos.y >= b.max.y - 0.001 || p.pos.y + h <= b.min.y) {
        // possible landing on top
        if (prevY >= b.max.y - 0.05 && p.pos.x > b.min.x - RADIUS * 0.5 && p.pos.x < b.max.x + RADIUS * 0.5 && p.pos.z > b.min.z - RADIUS * 0.5 && p.pos.z < b.max.z + RADIUS * 0.5) ground = Math.max(ground, b.max.y);
        continue;
      }
      const cx = clamp(p.pos.x, b.min.x, b.max.x), cz = clamp(p.pos.z, b.min.z, b.max.z);
      const dx = p.pos.x - cx, dz = p.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 > 1e-6) {
          const dd = Math.sqrt(d2);
          p.pos.x = cx + dx / dd * RADIUS; p.pos.z = cz + dz / dd * RADIUS;
        } else {
          // inside: push out along shortest axis
          const ox = Math.min(p.pos.x - b.min.x, b.max.x - p.pos.x), oz = Math.min(p.pos.z - b.min.z, b.max.z - p.pos.z);
          if (ox < oz) p.pos.x = p.pos.x - b.min.x < b.max.x - p.pos.x ? b.min.x - RADIUS : b.max.x + RADIUS;
          else p.pos.z = p.pos.z - b.min.z < b.max.z - p.pos.z ? b.min.z - RADIUS : b.max.z + RADIUS;
        }
      }
    }
    if (p.pos.y <= ground) {
      if (!p.grounded && p.vel.y < -4) this.audio.footstep();
      p.pos.y = ground; p.vel.y = 0; p.grounded = true;
    } else p.grounded = false;
    p.pos.x = clamp(p.pos.x, ARENA.minX + RADIUS, ARENA.maxX - RADIUS);
    p.pos.z = clamp(p.pos.z, ARENA.minZ + RADIUS, ARENA.maxZ - RADIUS);

    // footsteps
    const hv = Math.hypot(p.vel.x, p.vel.z);
    if (p.grounded && hv > 1.5) {
      p.stepT -= dt * hv;
      if (p.stepT <= 0) { p.stepT = 2.4; this.audio.footstep(); }
    }

    // camera
    const eye = lerp(EYE, EYE_CROUCH, p.crouch);
    this.camera.position.set(p.pos.x, p.pos.y + eye, p.pos.z);
    this.camera.rotation.set(p.pitch + this.recoil.pitch, p.yaw + this.recoil.yaw, 0);
    this.moveRatio = clamp(hv / 5.2, 0, 1.4);
    this.sprinting = sprint && hv > 4;
  }

  // ------------------------------------------------------------------ loop
  loop = (now) => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    const r = this.renderer;
    r.clear();
    if (this.state === 'menu' || this.state === 'results' || !this.mode) {
      this.updateMenu(dt);
      r.render(this.menuScene, this.menuCam);
      return;
    }
    if (this.state !== 'paused') this.tick(dt);
    r.render(this.scene, this.camera);
    if (this.viewmodel.cur && this.viewmodel.cur.holder.visible) {
      r.clearDepth();
      r.render(this.viewScene, this.viewCam);
    }
    this.hud.update(dt, this.camera, this.w, this.h);
  };

  tick(dt) {
    this.clock += dt;
    const I = this.input, w = this.weapon, d = w.def;
    this.updatePlayer(dt);

    // ADS
    const wantAds = (this.profile.settings.adsToggle ? I.adsToggled : I.adsHeld) && !d.melee && !w.reloading && !this.sprinting && w.equipT > 0.6;
    this.adsT = clamp(this.adsT + (wantAds ? 1 : -1) * dt / d.adsTime, 0, 1);
    this.updateFov(this.adsT);
    const scoped = !!d.scope && this.adsT > 0.9;
    this.hud.setScope(scoped);
    this.hud.cross.classList.toggle('ads', !scoped && this.adsT > 0.75);

    if (this.state === 'countdown') {
      this.countT -= dt;
      const n = Math.ceil(this.countT);
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n > 0) { this.hud.countdown(n); this.audio.beep(false); }
        else { this.hud.countdown('GO'); this.audio.beep(true); setTimeout(() => this.hud.countdown(''), 500); }
      }
      if (this.countT <= 0) this.state = 'playing';
    }
    const playing = this.state === 'playing';
    this.updateWeapon(dt, playing && (!this.sprinting || d.melee));
    if (playing) {
      this.mode.update(dt);
      this.elapsed += dt;
      if (this.timed) {
        const before = this.timeLeft;
        this.timeLeft -= dt;
        if (Math.ceil(before) !== Math.ceil(this.timeLeft) && this.timeLeft <= 5 && this.timeLeft > 0) this.audio.beep(false);
        if (this.timeLeft <= 0) { this.endRun(); return; }
      }
    } else if (this.session.mode === 'free') {
      this.mode.update(dt);
    }
    this.fx.update(dt);

    // viewmodel
    this.viewmodel.update({
      dt, ads: this.adsT, moving: this.moveRatio, grounded: this.player.grounded,
      lookDX: this.lookDX, lookDY: this.lookDY,
      reloadT: w.reloading ? (d.shellReload ? 0.5 : w.reloadT) : null, shellT: w.shellT,
      equipT: w.equipT, cycleT: w.cycleT, visible: !scoped, swing: w.swing, inspectT: w.inspectT,
      sprint: this.sprinting,
    });

    // HUD
    const vfov = this.camera.fov * DEG;
    const spread = this.currentSpread();
    this.hud.setGap(clamp(Math.tan(spread) / Math.tan(vfov / 2) * (this.h / 2), 3, 90));
    const S = this.stats;
    this.hud.setStats({ time: this.timeLeft, score: S.score, acc: S.shots ? S.hits / S.shots * 100 : 0, info: this.mode.hud(), timed: this.timed });
    this.hud.setWeapon(d, w.ammo, w.reloading, d.shellReload ? w.ammo / d.mag : w.reloadT, { primary: this.loadout.primary.def.name, secondary: this.loadout.secondary.def.name, melee: this.loadout.melee.def.name }, this.slot);
  }

  updateMenu(dt) {
    const t = performance.now() / 1000;
    const f = this.camFocus;
    this.camCur.pos.x = damp(this.camCur.pos.x, f.pos.x, 4, dt);
    this.camCur.pos.y = damp(this.camCur.pos.y, f.pos.y, 4, dt);
    this.camCur.pos.z = damp(this.camCur.pos.z, f.pos.z, 4, dt);
    this.camCur.look.lerp(f.look, 1 - Math.exp(-4 * dt));
    this.menuCam.position.copy(this.camCur.pos);
    this.menuCam.position.x += Math.sin(t * 0.3) * 0.05;
    this.menuCam.position.y += Math.sin(t * 0.4) * 0.03;
    this.menuCam.lookAt(this.camCur.look);
    if (!this.dragging) this.avatarSpin = damp(this.avatarSpin, 0.35 + Math.sin(t * 0.25) * 0.45, 1.5, dt);
    if (this.menuAvatar) {
      this.menuAvatar.group.rotation.y = this.avatarSpin;
      this.menuAvatar.animate(dt, 0, t);
    }
    this.stage.showcase.rotation.y += dt * 0.5;
    const sc = this.showcaseInfo;
    if (sc && sc.inspect && this.stage.showcase.children.length) {
      const dur = WEAPONS[this.menu?.detailId]?.inspectDur || 2.4;
      const cyc = (t % (dur + 1.2)) / dur;
      if (cyc < 1) sc.inspect(cyc); else sc.reset();
    }
    this.stage.showcase.position.y = 1.35 + Math.sin(t * 1.2) * 0.03;
  }

  focusMenu(which) {
    if (which === 'weapon') {
      this.camFocus.pos.set(1.55, 1.62, 1.15);
      this.camFocus.look.set(2.15, 1.32, -1.2);
    } else if (which === 'operator') {
      this.camFocus.pos.set(-0.6, 1.45, 3.3);
      this.camFocus.look.set(-0.55, 1.15, 0);
    } else {
      this.camFocus.pos.set(-0.9, 1.5, 4.4);
      this.camFocus.look.set(-0.95, 1.05, 0);
    }
  }

  save() { saveProfile(this.profile); }
}

const game = new Game();
window.__aimforge = game;
if (new URLSearchParams(location.search).has('debug')) game.debug = true;
game.load().catch((e) => {
  console.error(e);
  $('load-status').textContent = 'Failed to start: ' + e.message + ' (WebGL required)';
});
