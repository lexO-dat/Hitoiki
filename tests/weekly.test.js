import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/lib/storage.js';
import { recapWeek, weekSummary } from '../src/lib/weekly.js';

const at = (date, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const day = (date, times = [60, 70, 80, 90]) =>
  Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].map((g, i) => [`${date}|standard|${g}`, { time: times[i], hints: 0, mistakes: 0, solvedAt: at(date) }]));

test('summary of a Monday–Sunday week, with records against earlier bests', () => {
  // Week of Mon 2026-10-26 … Sun 2026-11-01; an earlier week sets the bests.
  const s = migrate({ results: { ...day('2026-10-19'), ...day('2026-10-26', [50, 99, 99, 99]), ...day('2026-10-27', [99, 65, 99, 99]) } });
  const w = weekSummary(s, '2026-10-29');
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0].date, '2026-10-26');
  assert.equal(w.sealed, 2);
  assert.equal(w.solved, 8);
  assert.equal(w.records, 2);
  assert.deepEqual(w.fastest, { game: 'zip', time: 50 });
});

test('recap shows on Sunday evening (this week) and on Monday (last week)', () => {
  assert.equal(recapWeek(new Date(2026, 10, 1, 19)), '2026-11-01');
  assert.equal(recapWeek(new Date(2026, 10, 1, 10)), null);
  assert.equal(recapWeek(new Date(2026, 10, 2, 9)), '2026-11-01');
  assert.equal(recapWeek(new Date(2026, 10, 4, 9)), null);
});
