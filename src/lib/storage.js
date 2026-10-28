import { useSyncExternalStore } from 'react';
import { addDays, todayKey, toKey } from './dates.js';
import { sanitizeState } from './sanitize.js';

// Storage key and schema. NEVER rename the key: updates must always find previous data.
// Format changes go through SCHEMA + migrate(), so old saves are upgraded instead of discarded.
export const KEY = 'logica-diaria:v1';
export const SCHEMA = 2;
export const STREAK_REQUIRED = 4; // puzzles per day that keep the streak alive

const defaults = {
  schema: SCHEMA,
  settings: { theme: 'system', showTimer: true, haptics: true, sound: true, music: true, volume: 0.7, notify: true },
  results: {}, // `${date}|${mode}|${game}` -> { time, hints, mistakes, solvedAt }
  saves: {}, // in-progress board state, same key
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

export const isEmpty = (s) => !Object.keys(s.results).length && !Object.keys(s.saves).length;

// Unreadable saved data is not overwritten and lost: it is set aside under another key (once), so it
// can still be recovered, and the app starts clean (the native mirror restores it in the background).
function quarantine(raw) {
  try {
    if (raw && raw.length < 3_000_000 && !localStorage.getItem(`${KEY}:corrupt`)) localStorage.setItem(`${KEY}:corrupt`, raw);
  } catch {
    // nothing else to do
  }
}

function read() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const { state: clean, dropped, repaired } = migrateReport(JSON.parse(raw));
    // Old results get their fixed day, damaged entries are removed: persist the repaired copy once.
    if (dropped || repaired) {
      quarantine(raw);
      try {
        localStorage.setItem(KEY, JSON.stringify(clean));
      } catch {
        // keep it in memory
      }
    }
    return clean;
  } catch {
    quarantine(raw);
    return structuredClone(defaults);
  }
}

// Set when the browser refused a write (storage full or blocked): the app shows a warning.
let saveFailed = false;
export const saveStatus = { failed: () => saveFailed };

let state = read();
const listeners = new Set();
const writeHooks = new Set();

function write(next, { touch = true } = {}) {
  state = touch ? { ...next, updatedAt: Date.now() } : next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveFailed = false;
  } catch {
    // storage full or blocked: keep in memory (the native mirror still gets it) and warn the player
    saveFailed = true;
  }
  listeners.forEach((l) => l());
  writeHooks.forEach((h) => h(state));
}

export const store = {
  get: () => state,
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  update(fn) {
    write(fn(structuredClone(state)));
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
  store.update((s) => {
    const prev = s.results[k];
    s.results[k] = prev && prev.time <= result.time ? prev : { ...result, solvedAt: Date.now(), solvedDay: todayKey() };
    delete s.saves[k];
    return s;
  });
}

export function saveProgress(k, data) {
  store.update((s) => {
    s.saves[k] = data;
    return s;
  });
}

// Start a board again from scratch. Results are kept: they only improve through saveResult.
export function clearProgress(k) {
  store.update((s) => {
    delete s.saves[k];
    return s;
  });
}

// A daily puzzle only counts for its day when it was solved on that same day: daily puzzles cannot be
// played afterwards, and anything solved late (before that rule existed) never adds to the streak.
export function countsForDay(key, result) {
  // `solvedDay` is the local date at the moment of solving; it doesn't move if the timezone changes.
  if (!result) return false;
  const day = result.solvedDay ?? (result.solvedAt ? toKey(new Date(result.solvedAt)) : null);
  return day === key.split('|')[0];
}

export function completedOn(s, date) {
  return Object.entries(s.results).filter(([k, r]) => k.startsWith(date + '|') && countsForDay(k, r)).length;
}

export const REST_EVERY = 7; // streak days that earn one rest day
export const MAX_RESTS = 2;

// Walks the calendar from the first completed day. A day counts once STREAK_REQUIRED puzzles were
// solved on it. Every REST_EVERY streak days earn a rest (up to MAX_RESTS): a missed day then uses
// one instead of breaking the streak, so one bad day does not erase weeks of habit.
// Returns { streak, best, rests (available now), restDays (Set of covered dates) }.
export function computeStreak(s, today = todayKey()) {
  const done = (d) => completedOn(s, d) >= STREAK_REQUIRED;
  const days = Object.keys(s.results)
    .map((k) => k.split('|')[0])
    .filter((d) => /^\d{4}-\d\d-\d\d$/.test(d) && d <= today && done(d))
    .sort();
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
