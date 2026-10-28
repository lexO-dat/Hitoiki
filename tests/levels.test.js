import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { GAME_IDS } from '../src/data/ids.js';

// levels-order.json pins the order of the bundled levels. Progress is saved by level id and the
// unlock rule works by position, so levels may be APPENDED but never reordered, removed or renamed.
// When levels are appended on purpose, regenerate it with: node tests/levels.test.js --update
const dir = new URL('../public/levels/', import.meta.url);
const snapshotFile = new URL('./levels-order.json', import.meta.url);
const load = (g) => JSON.parse(readFileSync(new URL(`${g}.json`, dir), 'utf8')).levels;
const hashOf = (ids) => createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 16);

// The same normalisation the app applies when it loads a pack (see src/lib/levelIds.js).
async function normalised(g) {
  const { uniqueIds } = await import('../src/lib/levelIds.js');
  return uniqueIds(load(g));
}

if (process.argv.includes('--update')) {
  const snap = {};
  for (const g of GAME_IDS) {
    const ids = (await normalised(g)).map((l) => l.id);
    snap[g] = { count: ids.length, hash: hashOf(ids) };
  }
  (await import('node:fs')).writeFileSync(snapshotFile, JSON.stringify(snap, null, 2) + '\n');
  console.log('updated', snapshotFile.pathname);
  process.exit(0);
}

test('every level id is unique inside its game once loaded', async () => {
  for (const g of GAME_IDS) {
    const ids = (await normalised(g)).map((l) => l.id);
    assert.equal(new Set(ids).size, ids.length, `${g} has duplicate ids`);
  }
});

test('the first level keeps its original id and twins get a suffix', async () => {
  const { uniqueIds } = await import('../src/lib/levelIds.js');
  const out = uniqueIds([{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'a' }]).map((l) => l.id);
  assert.deepEqual(out, ['a', 'b', 'a~2', 'a~3']);
});

test('bundled levels are only ever appended: order and ids of existing levels never change', async () => {
  const snap = JSON.parse(readFileSync(snapshotFile, 'utf8'));
  for (const g of GAME_IDS) {
    const ids = (await normalised(g)).map((l) => l.id);
    assert.ok(ids.length >= snap[g].count, `${g}: levels were removed (${ids.length} < ${snap[g].count})`);
    assert.equal(hashOf(ids.slice(0, snap[g].count)), snap[g].hash, `${g}: existing levels were reordered or renamed`);
  }
});
