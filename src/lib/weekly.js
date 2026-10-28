// Weekly summary (Monday to Sunday): sealed days, puzzles, perfect games, records and favorite game,
// compared with the week before.
import { GAME_IDS } from '../data/ids.js';
import { addDays, fromKey, toKey, weekDays } from './dates.js';
import { completedOn, gameOfKey, STREAK_REQUIRED } from './storage.js';

// Solves that beat the player's previous best time for that game (no hints; the first ever doesn't count).
function recordTimes(s) {
  const best = {};
  const out = [];
  const list = Object.entries(s.results)
    .filter(([, v]) => !v.hints && v.solvedAt)
    .sort((a, b) => a[1].solvedAt - b[1].solvedAt);
  for (const [k, v] of list) {
    const g = gameOfKey(k);
    if (best[g] !== undefined && v.time < best[g]) out.push(v.solvedAt);
    best[g] = Math.min(best[g] ?? Infinity, v.time);
  }
  return out;
}

export function weekSummary(s, anyDayOfWeek) {
  const days = weekDays(anyDayOfWeek);
  const from = fromKey(days[0]).getTime();
  const to = fromKey(addDays(days[6], 1)).getTime();
  const inWeek = Object.entries(s.results).filter(([, v]) => v.solvedAt >= from && v.solvedAt < to);
  const perGame = {};
  for (const [k] of inWeek) perGame[gameOfKey(k)] = (perGame[gameOfKey(k)] ?? 0) + 1;
  const favorite = GAME_IDS.filter((g) => perGame[g]).sort((a, b) => perGame[b] - perGame[a])[0] ?? null;
  const fastest = inWeek.filter(([, v]) => !v.hints).sort((a, b) => a[1].time - b[1].time)[0];
  return {
    days: days.map((d) => ({ date: d, n: Math.min(completedOn(s, d), STREAK_REQUIRED) })),
    sealed: days.filter((d) => completedOn(s, d) >= STREAK_REQUIRED).length,
    solved: inWeek.length,
    perfect: inWeek.filter(([, v]) => !v.hints && !v.mistakes).length,
    records: recordTimes(s).filter((t) => t >= from && t < to).length,
    favorite,
    fastest: fastest ? { game: gameOfKey(fastest[0]), time: fastest[1].time } : null,
  };
}

export function weekComparison(s, today) {
  const now = weekSummary(s, today);
  const prev = weekSummary(s, addDays(today, -7));
  return { ...now, prev };
}

// Sunday from 18:00 and all Monday: time to look back at the week (on Monday, the one that just ended).
export function recapWeek(now = new Date()) {
  const day = now.getDay();
  if (day === 0 && now.getHours() >= 18) return toKey(now);
  if (day === 1) return addDays(toKey(now), -1);
  return null;
}
