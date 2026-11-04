import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();

export class Hud {
  constructor() {
    this.el = $('hud');
    this.cross = $('crosshair');
    this.hm = $('hitmarker');
    this.dmgLayer = $('dmg-layer');
    this.feedEl = $('killfeed');
    this.msg = $('center-msg');
    this.scope = $('scope');
    this.dmgPool = [];
    this.dmgActive = [];
    this.msgT = 0;
    this.fpsAcc = 0; this.fpsN = 0;
  }

  show(v) { this.el.classList.toggle('hidden', !v); }

  applyCrosshair(s) {
    const c = this.cross;
    c.dataset.style = s.crossStyle;
    c.style.setProperty('--ch-color', s.crossColor);
    c.style.setProperty('--ch-scale', s.crossSize);
    this.dynamic = s.crossDynamic;
    $('fps').classList.toggle('hidden', !s.showFps);
  }

  setGap(px) {
    this.cross.style.setProperty('--ch-gap', `${this.dynamic ? px : 4}px`);
  }

  trackingState(on) { this.cross.classList.toggle('on-target', on); }

  hitmarker(kind) {
    const h = this.hm;
    h.className = '';
    void h.offsetWidth; // restart animation
    h.className = `show ${kind}`;
  }

  flashMsg(text, color = '#fff', dur = 0.6) {
    this.msg.textContent = text;
    this.msg.style.color = color;
    this.msg.classList.remove('pop'); void this.msg.offsetWidth; this.msg.classList.add('pop');
    this.msgT = dur;
  }

  countdown(n) {
    const el = $('countdown');
    el.textContent = n;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
    el.classList.toggle('hidden', n === '');
  }

  dmgNumber(worldPos, amount, head) {
    const el = this.dmgPool.pop() || Object.assign(document.createElement('div'), { className: 'dmg' });
    el.textContent = Math.round(amount);
    el.classList.toggle('head', head);
    this.dmgLayer.appendChild(el);
    this.dmgActive.push({ el, pos: worldPos.clone(), t: 0, dx: (Math.random() - 0.5) * 40 });
  }

  scorePop(pts) {
    const el = $('score-pop');
    el.textContent = `+${pts}`;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  feed(killer, weapon, victim, head) {
    const row = document.createElement('div');
    row.className = 'feed-row';
    row.innerHTML = `<span class="k"></span><span class="w"></span>${head ? '<span class="hs">◎</span>' : ''}<span class="v"></span>`;
    row.querySelector('.k').textContent = killer;
    row.querySelector('.w').textContent = weapon;
    row.querySelector('.v').textContent = victim;
    this.feedEl.prepend(row);
    while (this.feedEl.children.length > 5) this.feedEl.lastChild.remove();
    setTimeout(() => row.classList.add('fade'), 3500);
    setTimeout(() => row.remove(), 4200);
  }

  clearFeed() { this.feedEl.innerHTML = ''; for (const d of this.dmgActive) d.el.remove(); this.dmgActive.length = 0; }

  setStats({ time, score, acc, info, timed }) {
    $('hud-time').textContent = timed ? fmtTime(time) : '∞';
    $('hud-time').classList.toggle('low', timed && time <= 10);
    $('hud-score').textContent = score.toLocaleString();
    $('hud-acc').textContent = `${acc.toFixed(1)}%`;
    $('hud-info').innerHTML = info;
  }

  setWeapon(def, ammo, reloading, reloadK, slots, current) {
    $('ammo-cur').textContent = def.melee ? '∞' : ammo;
    $('ammo-mag').textContent = def.melee ? '' : `/ ${def.mag}`;
    $('ammo-cur').classList.toggle('low', !def.melee && ammo <= Math.ceil(def.mag * 0.25));
    $('weapon-name').textContent = def.name;
    $('weapon-class').textContent = def.cls + (def.melee ? ' · MELEE' : def.auto ? ' · AUTO' : def.bolt ? ' · BOLT' : def.pump ? ' · PUMP' : ' · SEMI');
    $('melee-hint').classList.toggle('hidden', !def.melee);
    const rb = $('reload-bar');
    rb.classList.toggle('hidden', !reloading);
    rb.firstElementChild.style.width = `${Math.round(reloadK * 100)}%`;
    $('slot-1').classList.toggle('active', current === 'primary');
    $('slot-2').classList.toggle('active', current === 'secondary');
    $('slot-3').classList.toggle('active', current === 'melee');
    $('slot-1-name').textContent = slots.primary;
    $('slot-2-name').textContent = slots.secondary;
    $('slot-3-name').textContent = slots.melee;
    const hint = $('reload-hint');
    hint.classList.toggle('hidden', def.melee || !(ammo === 0 && !reloading));
  }

  setScope(v) { this.scope.classList.toggle('hidden', !v); this.cross.classList.toggle('hidden', v); }

  update(dt, camera, w, h) {
    // floating damage numbers
    for (let i = this.dmgActive.length - 1; i >= 0; i--) {
      const d = this.dmgActive[i];
      d.t += dt;
      _v.copy(d.pos).project(camera);
      if (d.t > 0.8 || _v.z > 1) { d.el.remove(); this.dmgPool.push(d.el); this.dmgActive.splice(i, 1); continue; }
      const x = (_v.x * 0.5 + 0.5) * w + d.dx * d.t;
      const y = (-_v.y * 0.5 + 0.5) * h - d.t * 70;
      d.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.2 - d.t) * 2})`;
      d.el.style.opacity = String(1 - Math.max(0, d.t - 0.5) / 0.3);
    }
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.msg.classList.remove('pop'); }
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { $('fps').textContent = `${Math.round(this.fpsN / this.fpsAcc)} FPS`; this.fpsAcc = 0; this.fpsN = 0; }
  }
}

export function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
