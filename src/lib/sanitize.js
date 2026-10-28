// Validation of the saved state. Everything that enters the app from outside (the browser's storage,
// the native mirror, an imported file, an automatic restore) goes through here, so a damaged or
// hostile entry can never crash a screen: it is repaired when its meaning is clear (a solved level
// stays solved) or dropped when it is not. Pure functions: no storage, no React.
import { toKey } from './dates.js';
import { GAME_IDS } from '../data/ids.js';

export const MODES = ['standard', 'hard', 'expert'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const THEMES = ['system', 'light', 'dark'];

export const LIMITS = {
  results: 250_000, // far above the ~45k bundled levels plus infinite and daily history
  saves: 400,
  saveBytes: 200_000, // one in-progress board
  achievements: 100,
  maxTime: 86_400, // seconds: a day
  maxCount: 9_999,
  maxLevel: 1_000_000,
  importBytes: 12 * 1024 * 1024,
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const int = (v, lo, hi, fallback) => (finite(v) ? Math.round(clamp(v, lo, hi)) : fallback);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MIN_TIME = Date.UTC(2020, 0, 1);

// Result keys: daily `${date}|${mode}|${game}`, infinite `inf|${mode}|${game}|${n}`, classic `lvl|${game}|${id}`.
export function parseKey(k) {
  if (typeof k !== 'string' || k.length > 120) return null;
  const p = k.split('|');
  if (p[0] === 'inf') {
    return p.length === 4 && MODES.includes(p[1]) && GAME_IDS.includes(p[2]) && /^\d{1,7}$/.test(p[3]) && Number(p[3]) <= LIMITS.maxLevel ? { kind: 'inf', mode: p[1], game: p[2], n: Number(p[3]) } : null;
  }
  if (p[0] === 'lvl') return p.length === 3 && GAME_IDS.includes(p[1]) && /^[\w.~-]{1,90}$/.test(p[2]) ? { kind: 'lvl', game: p[1], id: p[2] } : null;
  return p.length === 3 && DAY.test(p[0]) && MODES.includes(p[1]) && GAME_IDS.includes(p[2]) ? { kind: 'daily', date: p[0], mode: p[1], game: p[2] } : null;
}

// One result: always {time, hints, mistakes, solvedAt, solvedDay}. `now` is injectable for tests.
export function sanitizeResult(key, v, now = Date.now()) {
  const info = parseKey(key);
  if (!info || !isObj(v)) return null;
  const time = finite(v.time) && v.time > 0 ? Math.round(clamp(v.time, 1, LIMITS.maxTime)) : 600; // solved, time unknown
  let solvedAt = finite(v.solvedAt) ? clamp(Math.round(v.solvedAt), MIN_TIME, now + 2 * 86_400_000) : null;
  if (solvedAt === null && info.kind === 'daily') solvedAt = new Date(`${info.date}T12:00:00`).getTime();
  // The local date the puzzle was solved on, fixed at that moment: changing the phone's timezone
  // later must not move a solve to another day (that would silently break streaks).
  const solvedDay = typeof v.solvedDay === 'string' && DAY.test(v.solvedDay) ? v.solvedDay : solvedAt !== null ? toKey(new Date(solvedAt)) : undefined;
  const out = { time, hints: int(v.hints, 0, LIMITS.maxCount, 0), mistakes: int(v.mistakes, 0, LIMITS.maxCount, 0), solvedAt: solvedAt ?? 0 };
  if (solvedDay) out.solvedDay = solvedDay;
  return out;
}

export function sanitizeSettings(raw, defaults) {
  const s = isObj(raw) ? raw : {};
  const out = { ...defaults };
  if (THEMES.includes(s.theme)) out.theme = s.theme;
  for (const k of ['showTimer', 'haptics', 'sound', 'music', 'notify', 'notifyAsked']) if (typeof s[k] === 'boolean') out[k] = s[k];
  if (finite(s.volume)) out.volume = clamp(s.volume, 0, 1);
  // Other primitive settings (older versions' keys) are kept as they are.
  for (const [k, v] of Object.entries(s)) if (!(k in out) && ['string', 'number', 'boolean'].includes(typeof v) && k.length < 40 && !['__proto__', 'constructor', 'prototype'].includes(k)) out[k] = v;
  return out;
}

function sanitizeSaves(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= LIMITS.saves) break;
    if (!parseKey(k) || !isObj(v) || !('state' in v) || v.state === null || typeof v.state !== 'object') continue;
    let size = 0;
    try {
      size = JSON.stringify(v).length;
    } catch {
      continue;
    }
    if (size > LIMITS.saveBytes) continue;
    const meta = isObj(v.meta) ? v.meta : {};
    out[k] = { state: v.state, meta: { time: int(meta.time, 0, LIMITS.maxTime, 0), hints: int(meta.hints, 0, LIMITS.maxCount, 0), mistakes: int(meta.mistakes, 0, LIMITS.maxCount, 0) } };
  }
  return out;
}

// The whole state. Returns the clean state plus how many entries were dropped or repaired.
export function sanitizeState(raw, defaults, now = Date.now()) {
  const data = isObj(raw) ? raw : {};
  let dropped = 0;
  let repaired = 0;
  const results = {};
  if (isObj(data.results)) {
    for (const [k, v] of Object.entries(data.results)) {
      if (Object.keys(results).length >= LIMITS.results) {
        dropped++;
        continue;
      }
      const clean = sanitizeResult(k, v, now);
      if (!clean) {
        dropped++;
        continue;
      }
      if (JSON.stringify(clean) !== JSON.stringify(v)) repaired++;
      results[k] = clean;
    }
  }
  const tutorialsSeen = {};
  if (isObj(data.tutorialsSeen)) for (const g of GAME_IDS) if (data.tutorialsSeen[g]) tutorialsSeen[g] = true;
  const state = {
    schema: defaults.schema,
    settings: sanitizeSettings(data.settings, defaults.settings),
    results,
    saves: sanitizeSaves(data.saves),
    tutorialsSeen,
    updatedAt: finite(data.updatedAt) ? clamp(data.updatedAt, 0, now + 86_400_000) : 0,
  };
  if (Array.isArray(data.achievementsSeen)) state.achievementsSeen = [...new Set(data.achievementsSeen.filter((x) => typeof x === 'string' && x.length < 30))].slice(0, LIMITS.achievements);
  if (isObj(data.levelsUi)) {
    const ui = {};
    const last = data.levelsUi.last;
    if (isObj(last) && GAME_IDS.includes(last.game) && DIFFICULTIES.includes(last.difficulty)) ui.last = { game: last.game, difficulty: last.difficulty };
    if (isObj(data.levelsUi.diff)) ui.diff = Object.fromEntries(Object.entries(data.levelsUi.diff).filter(([g, d]) => GAME_IDS.includes(g) && DIFFICULTIES.includes(d)));
    state.levelsUi = ui;
  }
  return { state, dropped, repaired };
}
