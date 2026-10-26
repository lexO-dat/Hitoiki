// Rule checks for bundled levels: each stored solution must satisfy the game validators.
import * as queens from '../src/games/queens/logic.js';
import * as tango from '../src/games/tango/logic.js';
import * as zip from '../src/games/zip/logic.js';
import * as sudoku from '../src/games/sudoku/logic.js';
import * as shikaku from '../src/games/shikaku/logic.js';
import * as pipes from '../src/games/pipes/logic.js';
import * as bridges from '../src/games/bridges/logic.js';
import * as lits from '../src/games/lits/logic.js';

export const checks = {
  queens: (p) => queens.isSolved(p, p.solution.map((c, r) => Array.from({ length: p.n }, (_, k) => (k === c ? 2 : 0)))),
  tango: (p) => tango.isSolved(p, p.solution) && p.givens.every((row, r) => row.every((v, c) => !v || v === p.solution[r][c])),
  zip: (p) => zip.isSolved(p, p.solution),
  sudoku: (p) => sudoku.isSolved(p.solution) && p.givens.every((v, i) => !v || v === p.solution[i]),
  shikaku: (p) => shikaku.isSolved(p, p.solution),
  pipes: (p) => pipes.isSolved(p, p.solved),
  bridges: (p) => bridges.isSolved(p, p.solution),
  lits: (p) => lits.isSolved(p, p.solution),
  kami: (p) => p.grid.length > 0 && p.moves > 0,
  mind: (p) => p.code.length === p.length && p.code.every((v) => v >= 0 && v < p.colors),
  sets: (p) => p.cards >= 3 && p.setsToFind >= 1,
};

export function isValid(game, puzzle) {
  try {
    return !!checks[game]?.(puzzle);
  } catch {
    return false;
  }
}
