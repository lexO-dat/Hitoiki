import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/lib/storage.js';
import { widgetData } from '../src/lib/widget.js';

const at = (date) => new Date(`${date}T12:00:00`).getTime();
const day = (date, n = 4) => Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].slice(0, n).map((g) => [`${date}|standard|${g}`, { time: 60, solvedAt: at(date) }]));

test('widget data: today done and streak alive until the day after', () => {
  const w = widgetData(migrate({ results: { ...day('2026-10-27'), ...day('2026-10-28') } }), '2026-10-28');
  assert.deepEqual(w, { date: '2026-10-28', done: 4, streak: 2, validThrough: '2026-10-29' });
});

test('widget data: today pending, streak can still be saved today', () => {
  const w = widgetData(migrate({ results: { ...day('2026-10-27'), ...day('2026-10-28', 1) } }), '2026-10-28');
  assert.deepEqual(w, { date: '2026-10-28', done: 1, streak: 1, validThrough: '2026-10-28' });
});

test('widget data: no streak', () => {
  assert.equal(widgetData(migrate({}), '2026-10-28').validThrough, '');
});
