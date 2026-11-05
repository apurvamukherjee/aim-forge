import { WEAPONS, PRIMARIES, SECONDARIES, MELEES, weaponRatings } from './weapons.js';
import { meleeRatings } from './knives.js';
import { OPERATORS, operatorColors } from './avatar.js';
import { MODES, DIFFICULTIES } from './modes.js';
import { THEMES, MAP_IDS } from './maps.js';
import { DEFAULTS } from './storage.js';
import { fmtTime } from './hud.js';

const $ = (id) => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TIPS = [
  'Lower sensitivity usually means more consistent flicks. Most pros play 25–45 cm/360°.',
  'Hold right mouse to aim down sights. ADS removes most of your spread.',
  'Pull your mouse down while spraying to counter vertical recoil.',
  'Moving and jumping both add spread — stop before you shoot.',
  'Headshots deal bonus damage. The Longbow one-taps heads.',
  'The Breaker reloads shell by shell — you can fire mid-reload.',
  'Crouching tightens your spread and lowers recoil.',
  'Swapping to your sidearm is faster than reloading.',
  'Press 3 for your knife and F to inspect it — every blade has its own flip.',
  'Six themed maps: pick one in the Play tab — every mode plays the same on all of them.',
  'Press F to loop your inspect animation; press it again to stop.',
];

const ACCENTS = ['#00e0ff', '#ff3b3b', '#ffb000', '#9cff57', '#c86bff', '#ff6bd5', '#ffffff'];
const ARMORS = ['#46505e', '#6b1f24', '#7d8699', '#5d6b45', '#2a2a2e', '#8a6a3f', '#23405e'];

const ICONS = {
  ar: '<svg viewBox="0 0 120 40"><path d="M6 16h58l4-4h22v4h24v5H94v4H70l-6 4H50l-4 9h-9l3-9H26l-4 5H8l2-7H6z"/></svg>',
  smg: '<svg viewBox="0 0 120 40"><path d="M14 14h50v-3h10v3h34v6H74v4H58l-4 12h-9l2-12H34v8h-6v-8H14z"/></svg>',
  sniper: '<svg viewBox="0 0 120 40"><path d="M2 20h40l3-3h22v-6h18v6h4v3h29v3H90v3H66l-6 4H48l-3 7h-8l2-7H20l-6 4H2z"/></svg>',
  shotgun: '<svg viewBox="0 0 120 40"><path d="M4 18h52v-2h56v4H90v5H66l-8 3H44l-4 9h-9l2-9H20l-8 4H4z"/></svg>',
  pistol: '<svg viewBox="0 0 120 40"><path d="M30 10h56v9H66l-4 4H52l-6 15h-11l5-15h-6z"/></svg>',
  butterfly: '<svg viewBox="0 0 120 40"><path d="M8 18h50v5H8zM8 25h50v3H8zM58 17l4-2 44 2-6 6H58z"/></svg>',
  karambit: '<svg viewBox="0 0 120 40"><circle cx="16" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M23 16h34l4 2c18 0 32 6 40 18-14-8-26-10-40-8l-4 2H23z"/></svg>',
  dagger: '<svg viewBox="0 0 120 40"><path d="M10 17h30v6H10zM40 9h5v22h-5zM45 15h50l15 5-15 5H45z"/></svg>',
  bowie: '<svg viewBox="0 0 120 40"><path d="M8 16h34v9H8zM42 8h5v24h-5zM47 13h52l14 10-6 2-10-4-50 3z"/></svg>',
  tanto: '<svg viewBox="0 0 120 40"><path d="M8 17h36v7H8zM44 13h4v15h-4zM48 15h50l12 10H48z"/></svg>',
};

export class Menu {
  constructor(game) {
    this.g = game;
    this.p = game.profile;
    this.tab = 'play';
    this.detailId = this.p.loadout.primary;
    $('load-tip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.buildTabs();
    this.buildPlay();
    this.buildLoadout();
    this.buildOperator();
    this.buildSettings();
    this.buildCareer();
    this.buildPauseResults();
    this.updateChip();
    this.bindDrag();
    if (matchMedia('(pointer: coarse)').matches) $('touch-warn').classList.remove('hidden');
    // UI sounds
    document.addEventListener('mouseover', (e) => { if (e.target.closest && e.target.closest('button, .card')) { if (e.target !== this._lastHover) { this._lastHover = e.target; game.audio.ui('hover'); } } });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button, .card')) game.audio.ui('click'); });
  }

  show(v) {
    $('menu').classList.toggle('hidden', !v);
    if (v) { this.refreshPlay(); this.buildCareer(); this.setTab(this.tab); }
  }

  save() { this.g.save(); }

  // ------------------------------------------------------------ tabs
  buildTabs() {
    $('tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      this.setTab(b.dataset.tab);
    });
  }

  setTab(t) {
    this.tab = t;
    for (const b of $('tabs').children) b.classList.toggle('active', b.dataset.tab === t);
    for (const s of document.querySelectorAll('[data-panel]')) s.classList.toggle('hidden', s.dataset.panel !== t);
    this.g.focusMenu(t === 'loadout' ? 'weapon' : t === 'operator' ? 'operator' : 'default');
    this.g.setShowcase(t === 'loadout' ? this.detailId : null);
    document.querySelector('.drag-hint').classList.toggle('hidden', t === 'loadout');
    if (t === 'career') this.buildCareer();
  }

  // ------------------------------------------------------------ play
  buildPlay() {
    const list = $('mode-list');
    for (const [id, m] of Object.entries(MODES)) {
      const c = h('button', 'card mode-card');
      c.dataset.mode = id;
      c.innerHTML = `<div class="mc-top"><span class="mc-name">${m.name}</span><span class="mc-tag">${m.tag}</span></div><div class="mc-desc">${m.desc}</div>`;
      c.addEventListener('click', () => { this.p.session.mode = id; this.save(); this.refreshPlay(); });
      c.addEventListener('dblclick', () => this.g.startRun());
      list.appendChild(c);
    }
    const maps = $('map-list');
    for (const id of MAP_IDS) {
      const t = THEMES[id];
      const c = h('button', 'card map-card');
      c.dataset.map = id;
      c.innerHTML = `<div class="map-thumb" style="background-image:${t.thumb}"><img src="assets/maps/${id}.jpg" alt="" loading="lazy" onerror="this.remove()"></div><div class="mp-n">${t.name}</div><div class="mp-t">${t.tag}</div>`;
      c.addEventListener('click', () => { this.p.session.map = id; this.save(); this.refreshPlay(); });
      c.addEventListener('dblclick', () => this.g.startRun());
      maps.appendChild(c);
    }
    const seg = (el, items, key, fmt) => {
      for (const v of items) {
        const b = h('button', '', fmt(v)); b.dataset.v = v;
        b.addEventListener('click', () => { this.p.session[key] = typeof this.p.session[key] === 'number' ? +v : v; this.save(); this.refreshPlay(); });
        el.appendChild(b);
      }
    };
    seg($('seg-diff'), Object.keys(DIFFICULTIES), 'difficulty', v => DIFFICULTIES[v].label);
    seg($('seg-dur'), [30, 60, 90], 'duration', v => `${v}s`);
    $('btn-deploy').addEventListener('click', () => this.g.startRun());
  }

  refreshPlay() {
    const s = this.p.session;
    for (const c of $('mode-list').children) c.classList.toggle('active', c.dataset.mode === s.mode);
    for (const c of $('map-list').children) c.classList.toggle('active', c.dataset.map === (s.map || 'range'));
    for (const b of $('seg-diff').children) b.classList.toggle('active', b.dataset.v === s.difficulty);
    for (const b of $('seg-dur').children) b.classList.toggle('active', +b.dataset.v === s.duration);
    const timed = MODES[s.mode].timed;
    $('play-mode').textContent = ` · ${MODES[s.mode].name}`;
    $('seg-dur').classList.toggle('disabled', !timed);
    $('dur-untimed').classList.toggle('hidden', timed);
    const best = this.p.best[`${s.mode}:${s.difficulty}:${s.duration}`];
    $('pb-val').innerHTML = !timed ? '<span class="muted">Untimed</span>' : best ? `${best.score.toLocaleString()} <small>${best.acc}% acc</small>` : '<span class="muted">No record yet</span>';
    const L = this.p.loadout;
    $('loadout-mini').innerHTML = `
      <div class="lm"><span class="lm-k">1</span>${ICONS[L.primary]}<div><b>${WEAPONS[L.primary].name}</b><small>${WEAPONS[L.primary].cls}</small></div></div>
      <div class="lm"><span class="lm-k">2</span>${ICONS[L.secondary]}<div><b>${WEAPONS[L.secondary].name}</b><small>${WEAPONS[L.secondary].cls}</small></div></div>
      <div class="lm"><span class="lm-k">3</span>${ICONS[L.melee]}<div><b>${WEAPONS[L.melee].name}</b><small>${WEAPONS[L.melee].cls}</small></div></div>
      <button class="btn-ghost small" id="btn-edit-loadout">Edit loadout</button>`;
    $('btn-edit-loadout').onclick = () => this.setTab('loadout');
  }

  // ------------------------------------------------------------ loadout
  buildLoadout() {
    const make = (grid, ids, slot) => {
      grid.innerHTML = '';
      for (const id of ids) {
        const w = WEAPONS[id];
        const c = h('button', 'card weapon-card');
        c.dataset.id = id;
        c.innerHTML = `<div class="wc-icon">${ICONS[id]}</div><div class="wc-name">${w.name}</div><div class="wc-cls">${w.cls}</div>`;
        c.addEventListener('click', () => {
          this.p.loadout[slot] = id; this.detailId = id; this.save();
          this.refreshLoadout();
          this.g.setShowcase(id);
          if (slot === 'primary') this.g.rebuildMenuAvatar();
        });
        c.addEventListener('mouseenter', () => { if (this.detailId !== id) { this.detailId = id; this.renderDetail(); this.g.setShowcase(id); } });
        grid.appendChild(c);
      }
      grid.addEventListener('mouseleave', () => {
        const id = this.p.loadout[slot];
        if (this.detailId !== id) { this.detailId = id; this.renderDetail(); this.g.setShowcase(id); }
      });
    };
    make($('primary-grid'), PRIMARIES, 'primary');
    make($('secondary-grid'), SECONDARIES, 'secondary');
    make($('melee-grid'), MELEES, 'melee');
    this.refreshLoadout();
  }

  refreshLoadout() {
    for (const c of document.querySelectorAll('.weapon-card')) {
      const id = c.dataset.id;
      c.classList.toggle('active', Object.values(this.p.loadout).includes(id));
    }
    this.renderDetail();
    this.refreshPlay();
  }

  renderDetail() {
    const w = WEAPONS[this.detailId];
    if (w.melee) return this.renderMeleeDetail(w);
    const bars = weaponRatings(w).map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`).join('');
    const fire = w.auto ? 'Full-auto' : w.bolt ? 'Bolt-action' : w.pump ? 'Pump-action' : 'Semi-auto';
    $('weapon-detail').innerHTML = `
      <div class="wd-head"><div><div class="wd-name">${w.name}</div><div class="wd-cls">${w.cls} · ${fire}</div></div>
      <div class="wd-equipped">${this.p.loadout.primary === w.id || this.p.loadout.secondary === w.id ? 'EQUIPPED' : ''}</div></div>
      <p class="wd-desc">${w.desc}</p>
      <div class="stats">${bars}</div>
      <div class="specs">
        <div><small>Damage</small><b>${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''}</b></div>
        <div><small>Headshot</small><b>×${w.head}</b></div>
        <div><small>RPM</small><b>${w.rpm}</b></div>
        <div><small>Magazine</small><b>${w.mag}</b></div>
        <div><small>Reload</small><b>${w.shellReload ? w.reload + 's/shell' : w.reload + 's'}</b></div>
        <div><small>Zoom</small><b>${w.zoom}×</b></div>
      </div>`;
  }

  renderMeleeDetail(w) {
    const bars = meleeRatings(w).map(([k, v]) => `<div class="stat"><span>${k}</span><div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div></div>`).join('');
    $('weapon-detail').innerHTML = `
      <div class="wd-head"><div><div class="wd-name">${w.name}</div><div class="wd-cls">${w.cls} · Melee</div></div>
      <div class="wd-equipped">${this.p.loadout.melee === w.id ? 'EQUIPPED' : ''}</div></div>
      <p class="wd-desc">${w.desc} Press <kbd>F</kbd> in-game to inspect.</p>
      <div class="stats">${bars}</div>
      <div class="specs">
        <div><small>Slash</small><b>${w.slash.dmg}</b></div>
        <div><small>Stab</small><b>${w.stab.dmg}</b></div>
        <div><small>Headshot</small><b>×${w.head}</b></div>
        <div><small>Slash rate</small><b>${w.slash.rate}s</b></div>
        <div><small>Reach</small><b>${w.slash.range}m</b></div>
        <div><small>Move speed</small><b>${Math.round(w.speed * 100)}%</b></div>
      </div>`;
  }

  // ------------------------------------------------------------ operator
  buildOperator() {
    const grid = $('op-grid');
    for (const o of Object.values(OPERATORS)) {
      const c = h('button', 'card op-card');
      c.dataset.id = o.id;
      c.style.setProperty('--op', o.accent);
      c.innerHTML = `<div class="op-portrait" style="background:linear-gradient(160deg, ${o.armor}, ${o.suit})"><span style="background:${o.accent}"></span></div><div class="op-n">${o.name}</div><div class="op-r">${o.role}</div>`;
      c.addEventListener('click', () => {
        this.p.operator.preset = o.id; this.p.operator.accent = null; this.p.operator.armor = null;
        this.applyOp();
      });
      grid.appendChild(c);
    }
    const sw = (el, colors, key) => {
      for (const col of colors) {
        const b = h('button', 'swatch'); b.style.background = col; b.dataset.c = col;
        b.addEventListener('click', () => { this.p.operator[key] = col; this.applyOp(); });
        el.appendChild(b);
      }
    };
    sw($('sw-accent'), ACCENTS, 'accent');
    sw($('sw-armor'), ARMORS, 'armor');
    const cs = $('callsign');
    cs.value = this.p.operator.name;
    cs.addEventListener('input', () => {
      this.p.operator.name = cs.value.trim().slice(0, 16) || 'Recruit';
      this.save(); this.updateChip();
    });
    this.refreshOperator();
  }

  applyOp() {
    this.save();
    this.g.applyOperator();
    this.g.rebuildMenuAvatar();
    this.refreshOperator();
    this.updateChip();
  }

  refreshOperator() {
    const look = operatorColors(this.p.operator);
    for (const c of $('op-grid').children) c.classList.toggle('active', c.dataset.id === this.p.operator.preset);
    for (const b of $('sw-accent').children) b.classList.toggle('active', b.dataset.c === look.accent);
    for (const b of $('sw-armor').children) b.classList.toggle('active', b.dataset.c === look.armor);
    $('op-bio').innerHTML = `<b>${look.name}</b> — ${look.role}. ${look.bio}`;
  }

  updateChip() {
    const look = operatorColors(this.p.operator);
    $('chip-name').textContent = this.p.operator.name;
    $('chip-sub').textContent = `${look.name} · ${look.role}`;
    $('chip-badge').style.background = `linear-gradient(135deg, ${look.accent}, ${look.armor})`;
    $('hud-op').textContent = `${this.p.operator.name} · ${look.name}`;
  }

  // ------------------------------------------------------------ settings
  settingsSchema() {
    return [
      { k: 'sens', label: 'Sensitivity (CS scale)', type: 'range', exact: true, min: 0.1, max: 6, step: 0.01, fmt: v => v.toFixed(2), hint: v => `${(2.54 * 360 / (v * 0.022 * 800)).toFixed(1)} cm/360 @ 800 DPI` },
      { k: 'adsMult', label: 'ADS sensitivity ×', type: 'range', min: 0.3, max: 2, step: 0.01, fmt: v => v.toFixed(2) },
      { k: 'fov', label: 'Field of view (horizontal)', type: 'range', min: 80, max: 120, step: 1, fmt: v => `${v}°` },
      { k: 'volume', label: 'Master volume', type: 'range', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
      { k: 'crossStyle', label: 'Crosshair', type: 'select', options: [['cross', 'Cross'], ['crossdot', 'Cross + dot'], ['dot', 'Dot'], ['circle', 'Circle'], ['t', 'T-shape']] },
      { k: 'crossColor', label: 'Crosshair colour', type: 'color' },
      { k: 'crossSize', label: 'Crosshair size', type: 'range', min: 0.5, max: 2, step: 0.05, fmt: v => `${v.toFixed(2)}×` },
      { k: 'crossDynamic', label: 'Dynamic crosshair (shows spread)', type: 'toggle' },
      { k: 'adsToggle', label: 'Toggle ADS (instead of hold)', type: 'toggle' },
      { k: 'autoReload', label: 'Auto reload when empty', type: 'toggle' },
      { k: 'showFps', label: 'Show FPS', type: 'toggle' },
      { k: 'quality', label: 'Graphics quality', type: 'select', options: [['high', 'High (shadows, 2× res)'], ['low', 'Performance']] },
    ];
  }

  buildSettings() {
    this.renderSettingsInto($('settings-form'), this.settingsSchema());
    const reset = h('button', 'btn-ghost small', 'Restore defaults');
    reset.addEventListener('click', () => {
      this.p.settings = structuredClone(DEFAULTS.settings);
      this.applySettings(); this.buildSettingsAgain();
    });
    $('settings-form').appendChild(reset);
    this.applySettings();
  }

  buildSettingsAgain() { $('settings-form').innerHTML = ''; this.buildSettings(); }

  renderSettingsInto(root, schema) {
    const S = this.p.settings;
    for (const f of schema) {
      const row = h('label', 'set-row');
      const lab = h('span', 'set-l', f.label);
      row.appendChild(lab);
      let input;
      const val = h('span', 'set-v');
      if (f.type === 'range') {
        input = h('input'); Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step, value: S[f.k] });
        const upd = () => { val.textContent = f.fmt(+input.value); if (f.hint) lab.dataset.hint = f.hint(+input.value); };
        upd();
        input.addEventListener('input', () => { S[f.k] = +input.value; upd(); if (num) num.value = input.value; this.applySettings(); });
        let num = null;
        if (f.exact) {
          num = h('input', 'num-in'); Object.assign(num, { type: 'number', min: f.min, max: f.max, step: f.step, value: S[f.k] });
          num.addEventListener('change', () => {
            const v = Math.min(f.max, Math.max(f.min, +num.value || S[f.k]));
            num.value = input.value = S[f.k] = v; upd(); this.applySettings();
          });
        }
        row.append(input, num ?? val);
      } else if (f.type === 'select') {
        input = h('select', 'sel');
        for (const [v, l] of f.options) { const o = h('option', '', l); o.value = v; if (S[f.k] === v) o.selected = true; input.appendChild(o); }
        input.addEventListener('change', () => { S[f.k] = input.value; this.applySettings(); if (f.k === 'quality') this.g.applyQuality(); });
        row.append(input);
      } else if (f.type === 'color') {
        input = h('input'); Object.assign(input, { type: 'color', value: S[f.k] });
        input.addEventListener('input', () => { S[f.k] = input.value; this.applySettings(); });
        row.append(input);
      } else if (f.type === 'toggle') {
        input = h('input'); Object.assign(input, { type: 'checkbox', checked: !!S[f.k] }); input.className = 'tog';
        input.addEventListener('change', () => { S[f.k] = input.checked; this.applySettings(); });
        row.append(input);
      }
      root.appendChild(row);
    }
  }

  applySettings() {
    const S = this.p.settings;
    this.g.audio.setVolume(S.volume);
    this.g.onResize();
    if (this.g.hud) this.g.hud.applyCrosshair(S);
    const pv = $('ch-preview');
    pv.dataset.style = S.crossStyle;
    pv.style.setProperty('--ch-color', S.crossColor);
    pv.style.setProperty('--ch-scale', S.crossSize);
    pv.style.setProperty('--ch-gap', '4px');
    this.save();
  }

  // ------------------------------------------------------------ career
  buildCareer() {
    const T = this.p.totals;
    const acc = T.shots ? (T.hits / T.shots * 100).toFixed(1) + '%' : '—';
    $('career-totals').innerHTML = [
      ['Sessions', T.runs], ['Time trained', fmtTime(T.seconds)], ['Shots fired', T.shots.toLocaleString()],
      ['Accuracy', acc], ['Eliminations', T.kills], ['Headshots', T.headshots],
    ].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
    const bests = Object.entries(this.p.best).sort((a, b) => a[0].localeCompare(b[0]));
    $('career-best').innerHTML = bests.length ? bests.map(([key, b]) => {
      const [m, d, dur] = key.split(':');
      return `<div class="tr"><span>${MODES[m]?.name ?? m}</span><span>${DIFFICULTIES[d]?.label ?? d} · ${dur}s</span><span>${WEAPONS[b.weapon]?.name ?? ''}</span><b>${b.score.toLocaleString()}</b></div>`;
    }).join('') : '<div class="tr muted">Play a timed mode to set a record.</div>';
    const hist = this.p.history;
    $('career-history').innerHTML = hist.length ? hist.map(r => `<div class="tr"><span>${MODES[r.mode]?.name ?? r.mode}</span><span>${THEMES[r.map]?.name ?? 'Training Facility'} · ${DIFFICULTIES[r.diff]?.label ?? r.diff}</span><span>${r.acc}%</span><b>${r.score.toLocaleString()}</b></div>`).join('') : '<div class="tr muted">No sessions yet.</div>';
    const btn = $('btn-reset');
    btn.onclick = () => {
      if (!confirm('Reset all career stats and personal bests?')) return;
      this.p.best = {}; this.p.history = []; this.p.totals = structuredClone(DEFAULTS.totals);
      this.save(); this.buildCareer(); this.refreshPlay();
    };
  }

  // ------------------------------------------------------------ pause / results
  buildPauseResults() {
    $('btn-resume').addEventListener('click', () => this.g.resume());
    $('btn-restart').addEventListener('click', () => this.g.startRun());
    $('btn-finish').addEventListener('click', () => this.g.endRun());
    $('btn-quit').addEventListener('click', () => this.g.toMenu());
    $('btn-again').addEventListener('click', () => this.g.startRun());
    $('btn-menu').addEventListener('click', () => this.g.toMenu());
  }

  syncPause() {
    const root = $('pause-quick');
    root.innerHTML = '';
    const keys = ['sens', 'adsMult', 'fov', 'volume', 'crossStyle', 'crossColor'];
    this.renderSettingsInto(root, this.settingsSchema().filter(f => keys.includes(f.k)));
  }

  showResults(r) {
    $('res-mode').textContent = `${r.mode.name} · ${r.diff.label} · ${r.map}${r.timed ? '' : ' · Free'}`;
    $('res-score').textContent = r.score.toLocaleString();
    $('res-best').classList.toggle('hidden', !r.isBest);
    const d = r.score - r.prevBest;
    $('res-delta').textContent = r.timed && r.prevBest ? `${d >= 0 ? '+' : '−'}${Math.abs(d).toLocaleString()} vs PB` : '';
    $('res-delta').classList.toggle('up', d >= 0);
    const rows = [
      ['Accuracy', r.acc.toFixed(1) + '%'],
      ['Hits / shots', `${r.hits} / ${r.shots}`],
      ['Hits per second', r.hps.toFixed(2)],
      ['Best streak', r.bestStreak],
      ['Headshot hits', r.headshots],
      ['Previous best', r.timed ? (r.prevBest ? r.prevBest.toLocaleString() : '—') : 'n/a'],
      ...Object.entries(r.extra),
    ];
    $('res-grid').innerHTML = rows.map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('');
    $('results').classList.remove('hidden');
  }

  // ------------------------------------------------------------ drag-rotate avatar
  bindDrag() {
    const c = $('c');
    let lx = 0;
    c.addEventListener('pointerdown', (e) => { if (this.g.state !== 'menu') return; this.g.dragging = true; lx = e.clientX; });
    window.addEventListener('pointermove', (e) => { if (!this.g.dragging) return; this.g.avatarSpin += (e.clientX - lx) * 0.006; lx = e.clientX; });
    window.addEventListener('pointerup', () => { this.g.dragging = false; });
  }
}
