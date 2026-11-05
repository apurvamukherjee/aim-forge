// Persistent profile: settings, loadout, operator, personal bests and history.
const KEY = 'aimforge.profile.v1';

export const DEFAULTS = {
  settings: {
    sens: 1.2,          // CS-style yaw scale (0.022 deg per count)
    adsMult: 1.0,
    fov: 103,           // horizontal FOV
    crossStyle: 'cross',
    crossColor: '#00ff9c',
    crossSize: 1,
    crossDynamic: true,
    volume: 0.6,
    adsToggle: false,
    autoReload: true,
    showFps: true,
    quality: 'high',
  },
  loadout: { primary: 'ar', secondary: 'pistol', melee: 'butterfly' },
  operator: { preset: 'specter', name: 'Recruit', accent: null, armor: null },
  session: { mode: 'gridshot', difficulty: 'normal', duration: 60, map: 'range' },
  best: {},
  history: [],
  totals: { shots: 0, hits: 0, runs: 0, seconds: 0, kills: 0, headshots: 0 },
};

export function mergeProfile(over) {
  return merge(structuredClone(DEFAULTS), over || {});
}

function merge(base, over) {
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k of Object.keys(over)) {
    const b = base ? base[k] : undefined;
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, over[k]) : over[k];
  }
  return out;
}

export function loadProfile() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  return mergeProfile(saved);
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}
