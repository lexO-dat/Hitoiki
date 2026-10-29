// Lookup tables over the results, built once per version of the results object and reused by every
// screen. Results only change when a puzzle is solved (or on import), so a heavy player with tens of
// thousands of results pays one pass, not one per screen, per day on the calendar and per render.
// The cache is keyed by object identity: the store never mutates `results` in place.
import { toKey } from './dates.js';

const cache = new WeakMap();

// The local day a result was solved on (fixed when it was solved; derived from `solvedAt` for old data).
export const dayOf = (r) => r?.solvedDay ?? (r?.solvedAt ? toKey(new Date(r.solvedAt)) : null);

// A daily result counts for its date only when it was solved on that same day.
export const countsForDay = (key, r) => Boolean(r) && dayOf(r) === key.split('|')[0];

export function indexOf(results) {
  let ix = cache.get(results);
  if (ix) return ix;
  ix = {
    total: 0,
    daily: new Map(), // date -> puzzles solved on their own day
    lvl: new Map(), // game -> classic levels solved
    infMax: new Map(), // `${mode}|${game}` -> highest infinite level solved
    byDay: new Map(), // solved day -> keys, for the weekly summary
    perGame: new Map(), // game -> { count, best, sum }
    perfect: 0,
    timeSum: 0,
  };
  for (const k of Object.keys(results)) {
    const r = results[k];
    const p = k.split('|');
    ix.total++;
    let game;
    if (p[0] === 'lvl') {
      game = p[1];
      ix.lvl.set(game, (ix.lvl.get(game) ?? 0) + 1);
    } else if (p[0] === 'inf') {
      game = p[2];
      const id = `${p[1]}|${p[2]}`;
      const n = Number(p[3]);
      if (n > (ix.infMax.get(id) ?? 0)) ix.infMax.set(id, n);
    } else {
      game = p[2];
      if (dayOf(r) === p[0]) ix.daily.set(p[0], (ix.daily.get(p[0]) ?? 0) + 1);
    }
    const day = dayOf(r);
    if (day) {
      const list = ix.byDay.get(day);
      if (list) list.push(k);
      else ix.byDay.set(day, [k]);
    }
    const g = ix.perGame.get(game) ?? { count: 0, best: Infinity, sum: 0 };
    g.count++;
    g.sum += r.time;
    if (r.time < g.best) g.best = r.time;
    ix.perGame.set(game, g);
    ix.timeSum += r.time;
    if (!r.hints && !r.mistakes) ix.perfect++;
  }
  cache.set(results, ix);
  return ix;
}

// Results of a computation that depends only on `results` (and a small argument), kept per version.
export function memo(results, name, compute, arg = '') {
  const ix = indexOf(results);
  ix.memo ??= new Map();
  const key = `${name}|${arg}`;
  if (!ix.memo.has(key)) ix.memo.set(key, compute());
  return ix.memo.get(key);
}
