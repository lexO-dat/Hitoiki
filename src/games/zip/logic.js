// Path: draw one line through every cell, visiting the numbered cells in order.

const SIZE = { standard: [5, 6], hard: [6, 7], expert: [7, 8] };
const POINTS = { standard: [8, 10], hard: [7, 9], expert: [6, 9] };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function hamiltonPath(w, h, rng) {
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const path = [];
  const total = w * h;
  const deg = (r, c) =>
    DIRS.filter(([dr, dc]) => {
      const a = r + dr;
      const b = c + dc;
      return a >= 0 && b >= 0 && a < h && b < w && !seen[a][b];
    }).length;
  let steps = 0;
  const go = (r, c) => {
    if (++steps > 200000) return false;
    seen[r][c] = true;
    path.push([r, c]);
    if (path.length === total) return true;
    // Warnsdorff ordering with random tie-breaks keeps search fast and paths varied.
    const next = rng
      .shuffle(DIRS)
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < h && b < w && !seen[a][b])
      .sort((p, q) => deg(...p) - deg(...q));
    for (const [a, b] of next) if (go(a, b)) return true;
    seen[r][c] = false;
    path.pop();
    return false;
  };
  for (let tries = 0; tries < 50; tries++) {
    steps = 0;
    if (go(rng.int(0, h - 1), rng.int(0, w - 1))) return path;
  }
  // Fallback: boustrophedon
  const p = [];
  for (let r = 0; r < h; r++) for (let i = 0; i < w; i++) p.push([r, r % 2 ? w - 1 - i : i]);
  return p;
}

export function generate(rng, mode = 'standard') {
  const [lo, hi] = SIZE[mode] ?? SIZE.standard;
  const w = rng.int(lo, hi);
  const h = rng.int(lo, hi);
  const path = hamiltonPath(w, h, rng);
  const [pl, ph] = POINTS[mode] ?? POINTS.standard;
  const count = Math.min(path.length, rng.int(pl, ph));
  const idx = new Set([0, path.length - 1]);
  while (idx.size < count) idx.add(rng.int(1, path.length - 2));
  const ordered = [...idx].sort((a, b) => a - b);
  const numbers = Array.from({ length: h }, () => Array(w).fill(0));
  ordered.forEach((i, k) => {
    const [r, c] = path[i];
    numbers[r][c] = k + 1;
  });
  return { w, h, numbers, last: count, solution: path };
}

export const adjacent = ([a, b], [c, d]) => Math.abs(a - c) + Math.abs(b - d) === 1;

export function isSolved(puzzle, path) {
  const { w, h, numbers, last } = puzzle;
  if (path.length !== w * h) return false;
  const seen = new Set();
  let expect = 1;
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    const k = `${r},${c}`;
    if (seen.has(k) || (i && !adjacent(path[i - 1], path[i]))) return false;
    seen.add(k);
    const n = numbers[r][c];
    if (n) {
      if (n !== expect) return false;
      expect++;
    }
  }
  return expect === last + 1;
}
