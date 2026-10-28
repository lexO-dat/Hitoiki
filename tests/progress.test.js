import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progression } from '../src/lib/progress.js';

const levels = [
  { id: 'a', difficulty: 'easy' },
  { id: 'b', difficulty: 'hard' },
  { id: 'c', difficulty: 'easy' },
  { id: 'd', difficulty: 'easy' },
  { id: 'e', difficulty: 'easy' },
];
const solved = (...ids) => Object.fromEntries(ids.map((id) => [`lvl|zip|${id}`, { time: 1 }]));

test('fresh start: only the first level of the difficulty is open', () => {
  const p = progression(levels, {}, 'zip', 'easy');
  assert.deepEqual(p.order, [0, 2, 3, 4]);
  assert.equal(p.next, 0);
  assert.deepEqual([0, 1, 2, 3].map(p.isOpen), [true, false, false, false]);
});

test('solving in order opens the next one', () => {
  const p = progression(levels, solved('a', 'c'), 'zip', 'easy');
  assert.equal(p.next, 2);
  assert.deepEqual([0, 1, 2, 3].map(p.isOpen), [true, true, true, false]);
  assert.equal(p.position(3), 2);
});

test('progress made out of order keeps everything up to it open', () => {
  const p = progression(levels, solved('d'), 'zip', 'easy');
  assert.equal(p.next, 3);
  assert.deepEqual([0, 1, 2, 3].map(p.isOpen), [true, true, true, true]);
});

test('a finished difficulty has no next level; others are independent', () => {
  assert.equal(progression(levels, solved('a', 'c', 'd', 'e'), 'zip', 'easy').next, null);
  assert.equal(progression(levels, solved('a', 'c', 'd', 'e'), 'zip', 'hard').next, 0);
});
