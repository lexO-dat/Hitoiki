// Sun & Moon (binairo): equal suns/moons per line, never three alike in a row,
// '=' joins equal cells and '×' opposite cells.

const N = 6;
const GIVENS = { standard: 0.3, hard: 0.18, expert: 0.08 };
const SIGNS = { standard: 0.12, hard: 0.16, expert: 0.2 };

function validLine(line) {
  const half = line.length / 2;
  let a = 0;
  let b = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) a++;
    if (line[i] === 2) b++;
    if (i >= 2 && line[i] && line[i] === line[i - 1] && line[i] === line[i - 2]) return false;
  }
  return a <= half && b <= half;
}

const col = (g, c) => g.map((row) => row[c]);

function fullSolution(rng) {
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  const go = (i) => {
    if (i === N * N) return true;
    const r = Math.floor(i / N);
    const c = i % N;
    for (const v of rng.shuffle([1, 2])) {
      g[r][c] = v;
      if (validLine(g[r]) && validLine(col(g, c)) && go(i + 1)) return true;
    }
    g[r][c] = 0;
    return false;
  };
  go(0);
  return g;
}

// Constraints: list of {r, c, dir: 'h'|'v', type: '='|'x'} between (r,c) and its right/down neighbour.
function satisfies(g, cons) {
  for (const { r, c, dir, type } of cons) {
    const a = g[r][c];
    const b = dir === 'h' ? g[r][c + 1] : g[r + 1][c];
    if (!a || !b) continue;
    if (type === '=' ? a !== b : a === b) return false;
  }
  return true;
}

export function countSolutions(givens, cons, limit = 2) {
  const g = givens.map((row) => row.slice());
  let count = 0;
  const go = (i) => {
    if (count >= limit) return;
    if (i === N * N) {
      count++;
      return;
    }
    const r = Math.floor(i / N);
    const c = i % N;
    if (givens[r][c]) return go(i + 1);
    for (const v of [1, 2]) {
      g[r][c] = v;
      if (validLine(g[r]) && validLine(col(g, c)) && satisfies(g, cons)) go(i + 1);
    }
    g[r][c] = 0;
  };
  go(0);
  return count;
}

export function generate(rng, mode = 'standard') {
  const solution = fullSolution(rng);
  const cons = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const dir of ['h', 'v']) {
        if ((dir === 'h' && c === N - 1) || (dir === 'v' && r === N - 1)) continue;
        if (!rng.chance(SIGNS[mode] ?? SIGNS.standard)) continue;
        const b = dir === 'h' ? solution[r][c + 1] : solution[r + 1][c];
        cons.push({ r, c, dir, type: solution[r][c] === b ? '=' : 'x' });
      }
    }
  }
  const givens = solution.map((row) => row.slice());
  const keep = GIVENS[mode] ?? GIVENS.standard;
  for (const i of rng.shuffle([...Array(N * N).keys()])) {
    const r = Math.floor(i / N);
    const c = i % N;
    const v = givens[r][c];
    givens[r][c] = 0;
    if (countSolutions(givens, cons) !== 1) givens[r][c] = v;
  }
  // Optionally put back some clues to make easier modes friendlier.
  const extra = Math.round(N * N * keep);
  let filled = givens.flat().filter(Boolean).length;
  for (const i of rng.shuffle([...Array(N * N).keys()])) {
    if (filled >= extra) break;
    const r = Math.floor(i / N);
    const c = i % N;
    if (!givens[r][c]) {
      givens[r][c] = solution[r][c];
      filled++;
    }
  }
  return { n: N, givens, cons, solution };
}

export function errors(puzzle, board) {
  const bad = new Set();
  const { n, cons } = puzzle;
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push([...Array(n).keys()].map((c) => [i, c]));
    lines.push([...Array(n).keys()].map((r) => [r, i]));
  }
  for (const cells of lines) {
    const vals = cells.map(([r, c]) => board[r][c]);
    for (let i = 2; i < n; i++) {
      if (vals[i] && vals[i] === vals[i - 1] && vals[i] === vals[i - 2]) {
        [i - 2, i - 1, i].forEach((k) => bad.add(cells[k].join(',')));
      }
    }
    for (const v of [1, 2]) {
      if (vals.filter((x) => x === v).length > n / 2) cells.forEach(([r, c]) => board[r][c] === v && bad.add(`${r},${c}`));
    }
  }
  for (const { r, c, dir, type } of cons) {
    const [r2, c2] = dir === 'h' ? [r, c + 1] : [r + 1, c];
    const a = board[r][c];
    const b = board[r2][c2];
    if (a && b && (type === '=' ? a !== b : a === b)) {
      bad.add(`${r},${c}`);
      bad.add(`${r2},${c2}`);
    }
  }
  return bad;
}

export const isSolved = (puzzle, board) => board.every((row) => row.every(Boolean)) && errors(puzzle, board).size === 0;
