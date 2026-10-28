import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/lib/storage.js';
import { AWAY_HOURS, plan } from '../src/lib/notify.js';

test('reminders are on by default, even when an old version saved the switch off', () => {
  const s = migrate({ settings: { reminders: false, reminderHour: 19 }, results: {} });
  assert.ok(plan(s, new Date(2026, 9, 28, 10, 0)).length > 0);
});

test('a 00:01 new-puzzles reminder for each of the next 7 days', () => {
  const daily = plan(migrate({}), new Date(2027, 2, 3, 10, 0)).filter((n) => n.id < 200);
  assert.equal(daily.length, 7);
  for (const n of daily) assert.deepEqual([n.when.getHours(), n.when.getMinutes()], [0, 1]);
  assert.equal(daily[0].when.getDate(), 4);
});

test('one reminder 8 hours after the last visit', () => {
  const now = new Date(2026, 9, 28, 10, 0);
  const away = plan(migrate({}), now).find((n) => n.id === 300);
  assert.equal(away.when - now, AWAY_HOURS * 3600 * 1000);
});

test('the away reminder is skipped when it would land next to the 00:01 one', () => {
  const away = plan(migrate({}), new Date(2026, 9, 28, 16, 20)).find((n) => n.id === 300);
  assert.equal(away, undefined);
});

test('nothing is scheduled when reminders are turned off', () => {
  assert.equal(plan(migrate({ settings: { notify: false } })).length, 0);
});
