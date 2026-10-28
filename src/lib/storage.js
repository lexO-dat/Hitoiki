import { useSyncExternalStore } from 'react';
import { addDays, todayKey } from './dates.js';

const KEY = 'logica-diaria:v1';
export const STREAK_REQUIRED = 4; // puzzles per day that keep the streak alive

const defaults = {
  settings: { theme: 'system', showTimer: true, haptics: true, sound: true, volume: 0.7, reminders: false, reminderHour: 19 },
  results: {}, // `${date}|${mode}|${game}` -> { time, hints, mistakes, solvedAt }
  saves: {}, // in-progress board state, same key
  tutorialsSeen: {},
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaults), ...parsed, settings: { ...defaults.settings, ...parsed.settings } };
  } catch {
    return structuredClone(defaults);
  }
}

let state = read();
const listeners = new Set();

function write(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: keep in memory
  }
  listeners.forEach((l) => l());
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

export function completedOn(s, date) {
  return Object.keys(s.results).filter((k) => k.startsWith(date + '|')).length;
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
