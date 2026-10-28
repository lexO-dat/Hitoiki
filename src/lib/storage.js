import { useSyncExternalStore } from 'react';
import { addDays, todayKey, toKey } from './dates.js';

// Storage key and schema. NEVER rename the key: updates must always find previous data.
// Format changes go through SCHEMA + migrate(), so old saves are upgraded instead of discarded.
export const KEY = 'logica-diaria:v1';
export const SCHEMA = 2;
export const STREAK_REQUIRED = 4; // puzzles per day that keep the streak alive

const defaults = {
  schema: SCHEMA,
  settings: { theme: 'system', showTimer: true, haptics: true, sound: true, music: true, volume: 0.7, reminders: false, reminderHour: 19 },
  results: {}, // `${date}|${mode}|${game}` -> { time, hints, mistakes, solvedAt }
  saves: {}, // in-progress board state, same key
  tutorialsSeen: {},
  updatedAt: 0,
};

// Upgrade any older (or partial) saved object to the current schema without losing fields.
export function migrate(raw) {
  const data = raw && typeof raw === 'object' ? { ...raw } : {};
  const from = Number(data.schema) || 1;
  // v1 -> v2: added schema/updatedAt; everything else is unchanged.
  if (from < 2) data.updatedAt = data.updatedAt || Date.now();
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return {
    ...structuredClone(defaults),
    ...data,
    schema: SCHEMA,
    settings: { ...defaults.settings, ...obj(data.settings) },
    results: obj(data.results),
    saves: obj(data.saves),
    tutorialsSeen: obj(data.tutorialsSeen),
  };
}

export const isEmpty = (s) => !Object.keys(s.results).length && !Object.keys(s.saves).length;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

let state = read();
const listeners = new Set();
const writeHooks = new Set();

function write(next, { touch = true } = {}) {
  state = touch ? { ...next, updatedAt: Date.now() } : next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: keep in memory (native mirror still gets it)
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

export function saveResult(k, result) {
  store.update((s) => {
    s.results[k] = { ...result, solvedAt: Date.now() };
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

export function clearProgress(k) {
  store.update((s) => {
    delete s.saves[k];
    delete s.results[k];
    return s;
  });
}

// A daily puzzle only counts for its day when it was solved on that same day: daily puzzles cannot be
// played afterwards, and anything solved late (before that rule existed) never adds to the streak.
export function countsForDay(key, result) {
  const date = key.split('|')[0];
  return Boolean(result?.solvedAt) && toKey(new Date(result.solvedAt)) === date;
}

export function completedOn(s, date) {
  return Object.entries(s.results).filter(([k, r]) => k.startsWith(date + '|') && countsForDay(k, r)).length;
}

export function computeStreak(s, today = todayKey()) {
  // A day counts once STREAK_REQUIRED puzzles are solved in any mode.
  const done = (d) => completedOn(s, d) >= STREAK_REQUIRED;
  let day = done(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done(day)) {
    streak++;
    day = addDays(day, -1);
  }
  let best = 0;
  let run = 0;
  const days = [...new Set(Object.keys(s.results).map((k) => k.split('|')[0]))].filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort();
  let prev = null;
  for (const d of days) {
    if (!done(d)) continue;
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { streak, best: Math.max(best, streak) };
}
