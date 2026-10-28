// Queens: one crown per row, column and colour region; crowns may not touch, not even diagonally.

const SIZE = { tutorial: [5, 5], standard: [6, 7], hard: [8, 8], expert: [9, 10] };

function placement(n, rng) {
  // Column per row, no shared column, no diagonal adjacency between consecutive rows.
  const cols = [];
  const used = new Set();
  const go = (r) => {
    if (r === n) return true;
    for (const c of rng.shuffle([...Array(n).keys()])) {
      if (used.has(c) || (r && Math.abs(cols[r - 1] - c) < 2)) continue;
      cols.push(c);
      used.add(c);
      if (go(r + 1)) return true;
      cols.pop();
      used.delete(c);
    }
    return false;
  };
  go(0);
  return cols;
}

function growRegions(n, cols, rng) {
  const region = Array.from({ length: n }, () => Array(n).fill(-1));
  const frontier = [];
  cols.forEach((c, r) => {
    region[r][c] = r;
    frontier.push([r, c]);
  });
  let left = n * n - n;
  while (left > 0) {
    const i = Math.floor(rng.next() * frontier.length);
    const [r, c] = frontier[i];
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && region[a][b] < 0);
    if (!opts.length) {
      frontier.splice(i, 1);
      continue;
    }
    const [a, b] = rng.pick(opts);
    region[a][b] = region[r][c];
    frontier.push([a, b]);
    left--;
  }
  return region;
}

export const countSolutions = (region, limit = 2) => solutions(region, limit).length;

function solutions(region, limit = 2) {
  const n = region.length;
  const usedCol = Array(n).fill(false);
  const usedReg = Array(n).fill(false);
  const cols = [];
  const found = [];
  const go = (r) => {
    if (found.length >= limit) return;
    if (r === n) {
      found.push(cols.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      const g = region[r][c];
      if (usedCol[c] || usedReg[g] || (r && Math.abs(cols[r - 1] - c) < 2)) continue;
      usedCol[c] = usedReg[g] = true;
      cols.push(c);
      go(r + 1);
      cols.pop();
      usedCol[c] = usedReg[g] = false;
    }
  };
  go(0);
  return found;
}

function stillConnected(region, n, g, skip) {
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (region[r][c] === g && !(r === skip[0] && c === skip[1])) cells.push([r, c]);
  const key = new Set(cells.map((p) => p.join(',')));
  const seen = new Set([cells[0].join(',')]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${r + dr},${c + dc}`;
      if (key.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([r + dr, c + dc]);
      }
    }
  }
  return seen.size === key.size;
}

// Break alternative solutions by moving one of their crown cells into a neighbouring region.
function repair(n, region, cols, rng, steps = 300) {
  for (let i = 0; i < steps; i++) {
    const sols = solutions(region, 2);
    const alt = sols.find((s) => s.some((c, r) => c !== cols[r]));
    if (!alt) return true;
    const rows = rng.shuffle([...Array(n).keys()]).filter((r) => alt[r] !== cols[r]);
    let moved = false;
    for (const r of rows) {
      const c = alt[r];
      const g = region[r][c];
      const opts = rng
        .shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])
        .map(([dr, dc]) => region[r + dr]?.[c + dc])
        .filter((g2) => g2 !== undefined && g2 !== g);
      if (!opts.length || !stillConnected(region, n, g, [r, c])) continue;
      region[r][c] = opts[0];
      moved = true;
      break;
    }
    if (!moved) return false;
  }
  return false;
}

export function generate(rng, mode = 'standard') {
  const [lo, hi] = SIZE[mode] ?? SIZE.standard;
  const n = rng.int(lo, hi);
  let best = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const cols = placement(n, rng);
    const region = growRegions(n, cols, rng);
    if (repair(n, region, cols, rng)) return { n, region, solution: cols };
    best ??= { n, region, solution: cols };
  }
  return best;
}

// Board state: cell values 0 empty, 1 marked (x), 2 crown.
export function conflicts(puzzle, board) {
  const { n, region } = puzzle;
  const bad = new Set();
  const crowns = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c] === 2) crowns.push([r, c]);
  for (let i = 0; i < crowns.length; i++) {
    for (let j = i + 1; j < crowns.length; j++) {
      const [a, b] = crowns[i];
      const [c, d] = crowns[j];
      const touch = Math.abs(a - c) <= 1 && Math.abs(b - d) <= 1;
      if (a === c || b === d || region[a][b] === region[c][d] || touch) {
        bad.add(`${a},${b}`);
        bad.add(`${c},${d}`);
      }
    }
  }
  return bad;
}

export function isSolved(puzzle, board) {
  const { n } = puzzle;
  let crowns = 0;
  for (const row of board) for (const v of row) if (v === 2) crowns++;
  return crowns === n && conflicts(puzzle, board).size === 0;
}
