import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/lib/rng.js';
import * as queens from '../src/games/queens/logic.js';
import * as tango from '../src/games/tango/logic.js';
import * as zip from '../src/games/zip/logic.js';
import * as sudoku from '../src/games/sudoku/logic.js';
import * as shikaku from '../src/games/shikaku/logic.js';
import * as mind from '../src/games/mind/logic.js';
import * as sets from '../src/games/sets/logic.js';
import * as kami from '../src/games/kami/logic.js';
import * as pipes from '../src/games/pipes/logic.js';
import * as bridges from '../src/games/bridges/logic.js';
import * as lits from '../src/games/lits/logic.js';

const MODES = ['standard', 'hard', 'expert'];
const SEEDS = ['2026-10-26', '2026-10-27', '2026-01-01', '2025-12-31', '2026-03-14'];

function each(name, fn, budgetMs = 1500) {
  test(name, () => {
    for (const mode of MODES) {
      for (const seed of SEEDS) {
        const t = performance.now();
        fn(createRng(`${seed}|${mode}|${name}`), mode);
        const ms = performance.now() - t;
        assert.ok(ms < budgetMs, `${name} ${mode} ${seed} took ${ms.toFixed(0)}ms`);
      }
    }
  });
}

each('queens', (rng, mode) => {
  const p = queens.generate(rng, mode);
  const board = Array.from({ length: p.n }, (_, r) => Array.from({ length: p.n }, (_, c) => (p.solution[r] === c ? 2 : 0)));
  assert.ok(queens.isSolved(p, board));
  assert.equal(queens.countSolutions(p.region), 1);
});

each('tango', (rng, mode) => {
  const p = tango.generate(rng, mode);
  assert.ok(tango.isSolved(p, p.solution));
  assert.equal(tango.countSolutions(p.givens, p.cons), 1);
});

each('zip', (rng, mode) => {
  const p = zip.generate(rng, mode);
  assert.ok(zip.isSolved(p, p.solution));
});

each('sudoku', (rng, mode) => {
  const p = sudoku.generate(rng, mode);
  assert.ok(sudoku.isSolved(p.solution));
  assert.equal(sudoku.countSolutions(p.givens), 1);
});

each('shikaku', (rng, mode) => {
  const p = shikaku.generate(rng, mode);
  assert.ok(shikaku.isSolved(p, p.solution));
});

each('mind', (rng, mode) => {
  const p = mind.generate(rng, mode);
  assert.deepEqual(mind.score(p.code, p.code), { exact: p.length, near: 0 });
});

test('mind scoring', () => {
  assert.deepEqual(mind.score([0, 1, 2, 3], [3, 2, 1, 0]), { exact: 0, near: 4 });
  assert.deepEqual(mind.score([0, 0, 1, 1], [0, 1, 0, 2]), { exact: 1, near: 2 });
});

each('sets', (rng, mode) => {
  const p = sets.generate(rng, mode);
  assert.ok(p.sets.length >= 3);
  for (const [a, b, c] of p.sets) assert.ok(sets.isSet(p.cards[a], p.cards[b], p.cards[c]));
});

each('kami', (rng, mode) => {
  const p = kami.generate(rng, mode);
  let g = p.grid;
  for (const [r, c, col] of p.solution) g = kami.paint(g, r, c, col);
  assert.ok(kami.isSolved(g));
  assert.ok(p.solution.length <= p.moves);
}, 4000);

each('pipes', (rng, mode) => {
  const p = pipes.generate(rng, mode);
  assert.ok(pipes.isSolved(p, p.solved));
});

each('bridges', (rng, mode) => {
  const p = bridges.generate(rng, mode);
  assert.ok(p.islands.length >= 5, `only ${p.islands.length} islands`);
  assert.ok(bridges.isSolved(p, p.solution));
});

each('lits', (rng, mode) => {
  const p = lits.generate(rng, mode);
  assert.ok(p.regions >= 3, `only ${p.regions} regions`);
  assert.ok(lits.isSolved(p, p.solution));
});

test('generators are deterministic per seed', () => {
  const a = queens.generate(createRng('x'), 'hard');
  const b = queens.generate(createRng('x'), 'hard');
  assert.deepEqual(a, b);
});

test('Sol y Luna: three in a row and too many in a line are reported with their cells', async () => {
  const { problems, describe } = await import('../src/games/tango/logic.js');
  const puzzle = { n: 6, cons: [] };
  const empty = () => Array.from({ length: 6 }, () => Array(6).fill(0));
  const three = empty();
  three[0][0] = three[0][1] = three[0][2] = 1;
  const p1 = problems(puzzle, three);
  assert.equal(p1.length, 1);
  assert.equal(p1[0].kind, 'three');
  assert.deepEqual(p1[0].cells, [[0, 0], [0, 1], [0, 2]]);
  assert.equal(describe(p1[0], 6), 'No puede haber tres soles seguidos.');
  const four = empty();
  [0, 2, 3, 5].forEach((c) => (four[1][c] = 2)); // 4 moons, never 3 in a row
  const p2 = problems(puzzle, four);
  assert.equal(p2.length, 1);
  assert.equal(p2[0].kind, 'count');
  assert.equal(p2[0].cells.length, 4);
  assert.equal(describe(p2[0], 6), 'Una fila no puede tener más de 3 lunas.');
});
