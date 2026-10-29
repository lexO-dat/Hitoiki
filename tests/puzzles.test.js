import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/lib/rng.js';
import { LOGIC } from '../src/games/registry.js';
import { dailySeed, generateHere, infiniteSeed } from '../src/lib/puzzles.js';
import { GAME_IDS } from '../src/data/ids.js';

test('the registry has the rules of every game', () => {
  assert.deepEqual(Object.keys(LOGIC).sort(), [...GAME_IDS].sort());
  for (const g of GAME_IDS) assert.equal(typeof LOGIC[g].generate, 'function', g);
});

test('seeds are exactly the keys the app has always used', () => {
  assert.equal(dailySeed('2026-10-28', 'hard', 'zip'), '2026-10-28|hard|zip');
  assert.equal(infiniteSeed('expert', 'queens', 4), 'inf|expert|queens|4');
});

// The worker file talks through `self`: a stand-in that records its answers (the module loads only once).
const sent = [];
globalThis.self = { postMessage: (m) => sent.push(m) };
await import('../src/lib/gen.worker.js');

test('the worker code answers with the same board as the main thread, and the board survives the message', () => {
  sent.length = 0;
  const cases = GAME_IDS.flatMap((g) => [
    [dailySeed('2026-10-28', 'standard', g), g, 'standard'],
    [infiniteSeed('hard', g, 3), g, 'hard'],
  ]);
  cases.forEach(([seed, game, mode], i) => self.onmessage({ data: { id: i, seed, game, mode } }));
  assert.equal(sent.length, cases.length);
  cases.forEach(([seed, game, mode], i) => {
    assert.equal(sent[i].error, undefined, `${seed}: ${sent[i].error}`);
    const here = generateHere(seed, game, mode);
    assert.deepEqual(sent[i].puzzle, here, `${seed} differs`);
    assert.deepEqual(structuredClone(sent[i].puzzle), here, `${seed} is not cloneable intact`); // what postMessage does
  });
});

test('a failing generator answers with an error instead of hanging the player', () => {
  sent.length = 0;
  self.onmessage({ data: { id: 9, seed: 'x', game: 'no-such-game', mode: 'standard' } });
  assert.equal(sent[0].id, 9);
  assert.match(sent[0].error, /generate|undefined|Cannot/);
});

test('tutorial boards are tiny and fast', () => {
  for (const g of GAME_IDS) {
    const t = performance.now();
    LOGIC[g].generate(createRng(`tutorial|${g}|0`), 'tutorial');
    assert.ok(performance.now() - t < 100, g);
  }
});
