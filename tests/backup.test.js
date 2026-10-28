import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, SCHEMA } from '../src/lib/storage.js';
import { merge, parseBackup, serialize } from '../src/lib/backup.js';

const v1 = {
  settings: { theme: 'dark', showTimer: false, haptics: true },
  results: { '2026-10-26|standard|zip': { time: 40, hints: 0, mistakes: 1, solvedAt: new Date('2026-10-26T12:00:00').getTime() } },
  saves: { '2026-10-27|hard|queens': { state: [[0]], meta: { time: 5 } } },
  tutorialsSeen: { zip: true },
};

test('migrate keeps every field of an old save and fills new defaults', () => {
  const m = migrate(v1);
  assert.equal(m.schema, SCHEMA);
  // Results keep their data and gain the fixed local day; saves are normalised (meta always complete).
  assert.deepEqual(m.results, { '2026-10-26|standard|zip': { ...v1.results['2026-10-26|standard|zip'], solvedDay: '2026-10-26' } });
  assert.deepEqual(m.saves, { '2026-10-27|hard|queens': { state: [[0]], meta: { time: 5, hints: 0, mistakes: 0 } } });
  assert.equal(m.settings.theme, 'dark');
  assert.equal(m.settings.showTimer, false);
  assert.equal(m.settings.sound, true); // added later, gets its default
  assert.ok(m.updatedAt > 0);
});

test('migrate survives garbage input', () => {
  for (const bad of [null, 42, 'x', { results: 'oops', settings: [] }]) {
    const m = migrate(bad);
    assert.deepEqual(m.results, {});
    assert.equal(typeof m.settings, 'object');
  }
});

test('export → import round-trip restores the same progress', () => {
  const state = migrate(v1);
  const back = parseBackup(serialize(state));
  assert.deepEqual(back.results, state.results);
  assert.deepEqual(back.saves, state.saves);
});

test('parseBackup rejects files that are not Pausa backups', () => {
  assert.throws(() => parseBackup('{"hello":1}'), /no es una copia/);
  assert.throws(() => parseBackup('not json'));
});

test('merge never loses a solved puzzle and keeps the best time', () => {
  const [a, b, c, d] = ['inf|standard|zip|1', 'inf|standard|zip|2', 'inf|standard|zip|3', 'inf|standard|zip|4'];
  const current = migrate({ results: { [a]: { time: 50 }, [b]: { time: 10 } } });
  const incoming = migrate({ results: { [a]: { time: 30 }, [c]: { time: 70 } }, saves: { [b]: { state: [1] }, [d]: { state: [2] } } });
  const m = merge(current, incoming);
  assert.deepEqual(Object.keys(m.results).sort(), [a, b, c]);
  assert.equal(m.results[a].time, 30);
  assert.equal(m.results[b].time, 10);
  assert.ok(!m.saves[b], 'a save for an already-solved puzzle is not resurrected');
  assert.deepEqual(m.saves[d].state, [2]);
});
