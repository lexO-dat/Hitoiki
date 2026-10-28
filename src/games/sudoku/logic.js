// Classic 9×9 sudoku with a unique solution.

const GIVENS = { tutorial: 74, standard: 36, hard: 30, expert: 25 };
const box = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

function solve(grid, rng, limit = 2) {
  const g = grid.slice();
  const rows = Array(9).fill(0);
  const cols = Array(9).fill(0);
  const boxes = Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v;
    const r = Math.floor(i / 9);
    const c = i % 9;
    if ((rows[r] | cols[c] | boxes[box(r, c)]) & bit) return { count: 0 };
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[box(r, c)] |= bit;
  }
  let count = 0;
  let first = null;
  const go = () => {
    if (count >= limit) return;
    // Most-constrained cell first
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const r = Math.floor(i / 9);
      const c = i % 9;
      const mask = ~(rows[r] | cols[c] | boxes[box(r, c)]) & 0x3fe;
      let n = 0;
      for (let m = mask; m; m &= m - 1) n++;
      if (n < bestN) {
        best = i;
        bestMask = mask;
        bestN = n;
        if (n <= 1) break;
      }
    }
    if (best < 0) {
      count++;
      first ??= g.slice();
      return;
    }
    const r = Math.floor(best / 9);
    const c = best % 9;
    let vals = [];
    for (let v = 1; v <= 9; v++) if (bestMask & (1 << v)) vals.push(v);
    if (rng) vals = rng.shuffle(vals);
    for (const v of vals) {
      const bit = 1 << v;
      g[best] = v;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[box(r, c)] |= bit;
      go();
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[box(r, c)] &= ~bit;
      g[best] = 0;
    }
  };
  go();
  return { count, solution: first };
}

export const countSolutions = (grid) => solve(grid, null).count;

export function generate(rng, mode = 'standard') {
  const solution = solve(Array(81).fill(0), rng, 1).solution;
  const puzzle = solution.slice();
  const target = GIVENS[mode] ?? GIVENS.standard;
  let filled = 81;
  for (const i of rng.shuffle([...Array(81).keys()])) {
    if (filled <= target) break;
    const v = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[i] = v;
    else filled--;
  }
  return { givens: puzzle, solution };
}

export function conflicts(values) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (let j = i + 1; j < 81; j++) {
      if (values[i] !== values[j]) continue;
      const [r1, c1, r2, c2] = [Math.floor(i / 9), i % 9, Math.floor(j / 9), j % 9];
      if (r1 === r2 || c1 === c2 || box(r1, c1) === box(r2, c2)) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

export const isSolved = (values) => values.every(Boolean) && conflicts(values).size === 0;
export { box };
