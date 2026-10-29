import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, migrateReport, completedOn, computeStreak } from '../src/lib/storage.js';
import { parseBackup, merge } from '../src/lib/backup.js';
import { parseKey, sanitizeResult } from '../src/lib/sanitize.js';

const NOW = new Date('2026-10-28T12:00:00').getTime();

test('a damaged result keeps being "solved" but never carries unusable numbers', () => {
  const r = sanitizeResult('inf|standard|zip|1', { time: 'abc', hints: 'x', mistakes: -5, solvedAt: 'now' }, NOW);
  assert.equal(r.time, 600);
  assert.equal(r.hints, 0);
  assert.equal(r.mistakes, 0);
  assert.equal(r.solvedAt, 0);
  assert.equal(sanitizeResult('inf|standard|zip|1', { time: 1e300, solvedAt: 1e300 }, NOW).time, 86400);
  assert.ok(sanitizeResult('inf|standard|zip|1', { time: 5, solvedAt: 1e300 }, NOW).solvedAt <= NOW + 2 * 86400000, 'future dates are capped');
});

test('entries that are not results, or have malformed keys, are dropped and counted', () => {
  const { state, dropped } = migrateReport({
    results: { 'lvl|zip|x': null, 'lvl|zip|y': 7, 'lvl|nope|id': { time: 3 }, 'x|y': { time: 3 }, 'inf|standard|zip|Infinity': { time: 3 }, 'inf|standard|zip|5': { time: 9, solvedAt: NOW } },
  });
  assert.deepEqual(Object.keys(state.results), ['inf|standard|zip|5']);
  assert.equal(dropped, 5);
});

test('settings with the wrong types fall back to safe defaults', () => {
  const s = migrate({ settings: { theme: 'neon', volume: 'loud', sound: 'yes', notify: 7, showTimer: false, volume2: 3 } }).settings;
  assert.equal(s.theme, 'system');
  assert.equal(s.volume, 0.7);
  assert.equal(s.sound, true);
  assert.equal(s.showTimer, false);
  assert.equal(migrate({ settings: { volume: 5 } }).settings.volume, 1);
  assert.equal(migrate({ settings: { volume: Infinity } }).settings.volume, 0.7);
});

test('hostile keys never reach the prototype or add unknown top-level data', () => {
  const m = migrate(JSON.parse('{"__proto__":{"polluted":1},"huge":"x","results":{"__proto__":{"x":1},"constructor":{"prototype":{"y":1}}},"settings":{"__proto__":{"z":1},"constructor":"c"}}'));
  assert.equal({}.polluted, undefined);
  assert.equal({}.x, undefined);
  assert.equal({}.z, undefined);
  assert.equal(m.huge, undefined);
  assert.deepEqual(m.results, {});
});

test('a save must have an object state and a sane size', () => {
  const m = migrate({ saves: { 'inf|standard|zip|1': { state: null }, 'inf|standard|zip|2': { state: [[1]], meta: { time: 'x' } }, 'inf|standard|zip|3': { state: { big: 'x'.repeat(300000) } } } });
  assert.deepEqual(Object.keys(m.saves), ['inf|standard|zip|2']);
  assert.equal(m.saves['inf|standard|zip|2'].meta.time, 0);
});

test('importing: bad files are rejected with a clear message, damaged entries are reported', () => {
  assert.throws(() => parseBackup('not json'), /dañado/);
  assert.throws(() => parseBackup('[1,2]'), /no es una copia/);
  assert.throws(() => parseBackup('x'.repeat(13 * 1024 * 1024)), /demasiado grande/);
  const report = {};
  const state = parseBackup(JSON.stringify({ app: 'hitoiki', data: { results: { 'inf|standard|zip|1': { time: 10, solvedAt: NOW }, bad: { time: 1 } } } }), report);
  assert.equal(report.dropped, 1);
  assert.equal(Object.keys(state.results).length, 1);
});

test('parseKey recognizes the three key kinds', () => {
  assert.equal(parseKey('2026-10-28|expert|zip').kind, 'daily');
  assert.equal(parseKey('inf|hard|queens|12').n, 12);
  assert.equal(parseKey('lvl|sets|sets_journey_easy_3').kind, 'lvl');
  assert.equal(parseKey('inf|hard|queens|99999999'), null);
});

// --- streaks must survive a change of timezone (run the suite with different TZ values) ---
const solve = (day, hour) => Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].map((g) => [`${day}|standard|${g}`, { time: 60, solvedAt: new Date(`${day}T${hour}:00:00-03:00`).getTime() }]));

test('legacy results (saved before solvedDay existed) get their day pinned once, in the zone active at that moment', () => {
  const at = new Date('2026-10-27T22:00:00-03:00').getTime();
  const m = migrate({ results: { '2026-10-27|standard|zip': { time: 60, solvedAt: at } } });
  const pinned = m.results['2026-10-27|standard|zip'].solvedDay;
  assert.match(pinned, /^\d{4}-\d{2}-\d{2}$/);
  // Loading the already-pinned state again never changes it, whatever the timezone is then.
  assert.equal(migrate(m).results['2026-10-27|standard|zip'].solvedDay, pinned);
});

test('a result saved with its day counts for that day in any timezone', () => {
  const s = migrate({ results: Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].map((g) => [`2026-10-27|standard|${g}`, { time: 60, solvedAt: new Date('2026-10-28T01:00:00Z').getTime(), solvedDay: '2026-10-27' }])) });
  assert.equal(completedOn(s, '2026-10-27'), 4);
  assert.equal(computeStreak(s, '2026-10-27').streak, 1);
});

test('merging keeps the day credit when a faster time came from a late solve', () => {
  const k = '2026-10-27|standard|zip';
  const current = migrate({ results: { [k]: { time: 90, solvedAt: new Date('2026-10-27T20:00:00').getTime(), solvedDay: '2026-10-27' } } });
  const incoming = migrate({ results: { [k]: { time: 40, solvedAt: new Date('2026-10-30T20:00:00').getTime(), solvedDay: '2026-10-30' } } });
  const m = merge(current, incoming);
  assert.equal(m.results[k].time, 40);
  assert.equal(m.results[k].solvedDay, '2026-10-27');
});

test('sanitizing scales linearly: 45,000 results load in well under a second', () => {
  const games = ['zip', 'queens', 'tango', 'pipes'];
  const results = {};
  for (let i = 0; i < 45000; i++) results[`lvl|${games[i % 4]}|level_${i}`] = { time: 30 + (i % 100), hints: 0, mistakes: 0, solvedAt: NOW - i * 1000, solvedDay: '2026-10-28' };
  const t = performance.now();
  const { state, dropped, repaired } = migrateReport({ results });
  const ms = performance.now() - t;
  assert.equal(Object.keys(state.results).length, 45000);
  assert.equal(dropped + repaired, 0, 'clean data is not touched');
  assert.ok(ms < 800, `took ${Math.round(ms)} ms (was quadratic: several minutes)`);
});
