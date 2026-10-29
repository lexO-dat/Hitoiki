import { useSyncExternalStore } from 'react';
import { addDays, todayKey } from './dates.js';
import { CLEAN, sanitizeState, trustedState } from './sanitize.js';
import { countsForDay as countsForDayIn, indexOf, memo } from './indexes.js';

// Storage keys and schema. NEVER rename the key: updates must always find previous data.
// Format changes go through SCHEMA + migrate(), so old saves are upgraded instead of discarded.
//  - KEY holds the progress (settings, results, tutorials, seals): rewritten only when one of those changes.
//  - KEY:saves holds the boards in progress, small and rewritten on every move: playing never
//    re-serializes the (possibly huge) history of results.
export const KEY = 'logica-diaria:v1';
export const SAVES_KEY = `${KEY}:saves`;
export const SCHEMA = 2;
export const STREAK_REQUIRED = 4; // puzzles per day that keep the streak alive

const defaults = {
  schema: SCHEMA,
  settings: { theme: 'system', palette: 'washi', showTimer: true, haptics: true, sound: true, music: true, volume: 0.7, notify: true },
  results: {}, // see resultKey(): -> { time, hints, mistakes, solvedAt, solvedDay }
  saves: {}, // in-progress board state, same keys
  tutorialsSeen: {},
  updatedAt: 0,
};

// Upgrade any older (or partial) saved object to the current schema, validating everything on the
// way (see sanitize.js): damaged entries are repaired or dropped, never allowed to crash a screen.
export function migrate(raw) {
  return migrateReport(raw).state;
}

export function migrateReport(raw) {
  const data = raw && typeof raw === 'object' ? { ...raw } : {};
  // v1 -> v2: added schema/updatedAt; everything else is unchanged.
  if ((Number(data.schema) || 1) < 2) data.updatedAt = data.updatedAt || Date.now();
  return sanitizeState(data, defaults);
}

export const isEmpty = (s) => indexOf(s.results).total === 0 && Object.keys(s.saves).length === 0;

// Unreadable saved data is not overwritten and lost: it is set aside under another key (once), so it
// can still be recovered, and the app starts clean (the native mirror restores it in the background).
function quarantine(raw) {
  try {
    if (raw && raw.length < 3_000_000 && !localStorage.getItem(`${KEY}:corrupt`)) localStorage.setItem(`${KEY}:corrupt`, raw);
  } catch {
    // nothing else to do
  }
}

// The part of the state that is stored under KEY (everything but the boards in progress).
const PROGRESS = ['settings', 'results', 'tutorialsSeen', 'levelsUi', 'achievementsSeen'];
const progressOf = (s) => ({ clean: CLEAN, schema: s.schema, ...Object.fromEntries(PROGRESS.map((k) => [k, s[k]])), updatedAt: s.updatedAt });

// What was last written, by identity: only the branches that changed are serialized again.
let written = {};
// Set when the browser refused a write (storage full or blocked): the app shows a warning.
let saveFailed = false;
export const saveStatus = { failed: () => saveFailed };

function persist(s) {
  try {
    if (PROGRESS.some((k) => s[k] !== written[k])) {
      localStorage.setItem(KEY, JSON.stringify(progressOf(s)));
      PROGRESS.forEach((k) => (written[k] = s[k]));
    }
    if (s.saves !== written.saves) {
      localStorage.setItem(SAVES_KEY, JSON.stringify({ saves: s.saves }));
      written.saves = s.saves;
    }
    saveFailed = false;
  } catch {
    // storage full or blocked: keep in memory (the native mirror still gets it) and warn the player
    saveFailed = true;
  }
}

function read() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    let boards;
    try {
      boards = JSON.parse(localStorage.getItem(SAVES_KEY) ?? 'null')?.saves;
    } catch {
      boards = undefined; // damaged boards only cost the boards, never the progress
    }
    // Older versions kept the boards inside KEY: they are moved to their own key on this first read.
    const data = { ...parsed, saves: boards ?? parsed.saves ?? {} };
    let state = trustedState(data, defaults);
    let rewrite = false;
    if (!state) {
      const rep = migrateReport(data);
      state = rep.state;
      if (rep.dropped || rep.repaired) quarantine(raw);
      rewrite = true;
    }
    if (parsed.saves !== undefined || boards === undefined) rewrite = true;
    if (rewrite) persist(state);
    else {
      PROGRESS.forEach((k) => (written[k] = state[k]));
      written.saves = state.saves;
    }
    return state;
  } catch {
    quarantine(raw);
    return structuredClone(defaults);
  }
}

let state = read();
const listeners = new Set();
const writeHooks = new Set();

function write(next, { touch = true } = {}) {
  state = touch ? { ...next, updatedAt: Date.now() } : next;
  persist(state);
  listeners.forEach((l) => l());
  writeHooks.forEach((h) => h(state));
}

export const store = {
  get: () => state,
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  // Change some branches: `fn(state)` returns only the new branches (e.g. `{ settings: {...} }`).
  // Branches it doesn't return keep their identity, so nothing that depends on them is recomputed
  // or stored again. Branches must be replaced, never edited in place.
  patch(fn) {
    write({ ...state, ...fn(state) });
  },
  // Same, with a draft whose branches are copies that may be edited freely (O(results): for rare uses).
  update(fn) {
    write(fn({ ...state, settings: { ...state.settings }, results: { ...state.results }, saves: { ...state.saves }, tutorialsSeen: { ...state.tutorialsSeen } }));
  },
  // Replace everything (restore/import). Data is migrated first.
  replace(data) {
    write(migrate(data), { touch: false });
  },
  // Called after every write; used by the durable backups in backup.js.
  onWrite(h) {
    writeHooks.add(h);
    return () => writeHooks.delete(h);
  },
};

export function useStore(selector = (s) => s) {
  return selector(useSyncExternalStore(store.subscribe, store.get));
}

// Keys: daily `${date}|${mode}|${game}`, infinite `inf|${mode}|${game}|${n}`, classic `lvl|${game}|${id}`.
export const resultKey = (date, mode, game) => `${date}|${mode}|${game}`;

// Replaying a solved puzzle keeps the better result (a slower replay never loses the record or the day's seal).
export function saveResult(k, result) {
  store.patch((s) => {
    const saves = { ...s.saves };
    delete saves[k];
    const prev = s.results[k];
    if (prev && prev.time <= result.time) return { saves };
    return { results: { ...s.results, [k]: { ...result, solvedAt: Date.now(), solvedDay: todayKey() } }, saves };
  });
}

export function saveProgress(k, data) {
  store.patch((s) => ({ saves: { ...s.saves, [k]: data } }));
}

// Start a board again from scratch. Results are kept: they only improve through saveResult.
export function clearProgress(k) {
  store.patch((s) => {
    if (!(k in s.saves)) return {};
    const saves = { ...s.saves };
    delete saves[k];
    return { saves };
  });
}

// A daily puzzle only counts for its day when it was solved on that same day: daily puzzles cannot be
// played afterwards, and anything solved late (before that rule existed) never adds to the streak.
// `solvedDay` is the local date at the moment of solving; it doesn't move if the timezone changes.
export const countsForDay = countsForDayIn;

export function completedOn(s, date) {
  return indexOf(s.results).daily.get(date) ?? 0;
}

export const REST_EVERY = 7; // streak days that earn one rest day
export const MAX_RESTS = 2;

// Walks the calendar from the first completed day. A day counts once STREAK_REQUIRED puzzles were
// solved on it. Every REST_EVERY streak days earn a rest (up to MAX_RESTS): a missed day then uses
// one instead of breaking the streak, so one bad day does not erase weeks of habit.
// Returns { streak, best, rests (available now), restDays (Set of covered dates) }.
export function computeStreak(s, today = todayKey()) {
  return memo(s.results, 'streak', () => streakOf(indexOf(s.results).daily, today), today);
}

function streakOf(daily, today) {
  const done = (d) => (daily.get(d) ?? 0) >= STREAK_REQUIRED;
  const days = [...daily.keys()].filter((d) => /^\d{4}-\d\d-\d\d$/.test(d) && d <= today && done(d)).sort();
  let streak = 0;
  let best = 0;
  let rests = 0;
  const restDays = new Set();
  if (!days.length) return { streak, best, rests, restDays };
  for (let day = days[0]; day <= today; day = addDays(day, 1)) {
    if (done(day)) {
      streak++;
      best = Math.max(best, streak);
      if (streak % REST_EVERY === 0) rests = Math.min(MAX_RESTS, rests + 1);
    } else if (day === today) {
      // today is still open: the streak runs through yesterday
    } else if (streak > 0 && rests > 0) {
      rests--;
      restDays.add(day);
    } else {
      streak = 0;
      rests = 0;
    }
  }
  return { streak, best, rests, restDays };
}

// Which game a result key belongs to: daily `date|mode|game`, infinite `inf|mode|game|n`, classic `lvl|game|id`.
export function gameOfKey(k) {
  const p = k.split('|');
  return p[0] === 'lvl' ? p[1] : p[2];
}
