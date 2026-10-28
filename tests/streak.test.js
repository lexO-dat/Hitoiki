import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedOn, computeStreak, countsForDay, migrate } from '../src/lib/storage.js';

const at = (date, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const day = (date, solvedDate = date, n = 4) =>
  Object.fromEntries(['zip', 'queens', 'tango', 'bridges', 'sets'].slice(0, n).map((g) => [`${date}|standard|${g}`, { time: 30, solvedAt: at(solvedDate) }]));

test('a daily puzzle counts only when solved on its own day', () => {
  assert.equal(countsForDay('2026-10-27|standard|zip', { solvedAt: at('2026-10-27', 23) }), true);
  assert.equal(countsForDay('2026-10-27|standard|zip', { solvedAt: at('2026-10-28', 0) }), false);
  assert.equal(countsForDay('2026-10-27|standard|zip', { time: 3 }), false);
});

test('late solves do not count toward the day or the streak', () => {
  const s = migrate({ results: { ...day('2026-10-26'), ...day('2026-10-27', '2026-10-28'), ...day('2026-10-28') } });
  assert.equal(completedOn(s, '2026-10-27'), 0);
  assert.equal(completedOn(s, '2026-10-28'), 4);
  assert.deepEqual(computeStreak(s, '2026-10-28'), { streak: 1, best: 1 });
});

test('consecutive same-day solves build the streak', () => {
  const s = migrate({ results: { ...day('2026-10-26'), ...day('2026-10-27'), ...day('2026-10-28', '2026-10-28', 2) } });
  assert.deepEqual(computeStreak(s, '2026-10-28'), { streak: 2, best: 2 });
});
