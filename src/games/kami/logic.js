// Flood: tap a patch to repaint it with the selected colour; make the whole board
// one colour within the move limit.

const CONFIG = {
  standard: { w: 8, h: 10, colors: 3, seeds: 16, minMoves: 3, maxMoves: 5 },
  hard: { w: 9, h: 12, colors: 4, seeds: 30, minMoves: 6, maxMoves: 8 },
  expert: { w: 10, h: 13, colors: 5, seeds: 46, minMoves: 8, maxMoves: 11 },
};
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function regions(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const id = Array.from({ length: h }, () => Array(w).fill(-1));
  const list = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (id[r][c] >= 0) continue;
      const color = grid[r][c];
      const cells = [];
      const stack = [[r, c]];
      id[r][c] = list.length;
      while (stack.length) {
        const [y, x] = stack.pop();
        cells.push([y, x]);
        for (const [dy, dx] of DIRS) {
          const a = y + dy;
          const b = x + dx;
          if (a >= 0 && b >= 0 && a < h && b < w && id[a][b] < 0 && grid[a][b] === color) {
            id[a][b] = list.length;
            stack.push([a, b]);
          }
        }
      }
      list.push({ color, cells });
    }
  }
  return { id, list };
}

export function paint(grid, r, c, color) {
  const g = grid.map((row) => row.slice());
  const { id, list } = regions(grid);
  for (const [y, x] of list[id[r][c]].cells) g[y][x] = color;
  return g;
}

export const isSolved = (grid) => grid.every((row) => row.every((v) => v === grid[0][0]));

// Greedy planner: repeatedly paint the region whose recolour removes the most regions.
export function plan(grid, maxSteps = 60) {
  const moves = [];
  let g = grid;
  while (!isSolved(g) && moves.length < maxSteps) {
    const { list } = regions(g);
    const colors = [...new Set(g.flat())];
    let best = null;
    for (const reg of list) {
      const [r, c] = reg.cells[0];
      for (const col of colors) {
        if (col === reg.color) continue;
        const n = regions(paint(g, r, c, col)).list.length;
        if (!best || n < best.n || (n === best.n && reg.cells.length > best.size)) best = { r, c, col, n, size: reg.cells.length };
      }
    }
    moves.push([best.r, best.c, best.col]);
    g = paint(g, best.r, best.c, best.col);
  }
  return moves;
}

// Exact-ish planner for tight move limits: repaint one growing blob ("pivot") with IDA*.
// Lower bound = max(eccentricity of the blob in the region graph, colours left outside it).
export function solvePivot(grid, maxMoves, nodeLimit = 300000) {
  const { id, list } = regions(grid);
  const n = list.length;
  if (n === 1) return [];
  const h = grid.length;
  const w = grid[0].length;
  const adj = list.map(() => new Set());
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      for (const [dr, dc] of [[1, 0], [0, 1]]) {
        const a = id[r][c];
        const b = id[r + dr]?.[c + dc];
        if (b !== undefined && a !== b) {
          adj[a].add(b);
          adj[b].add(a);
        }
      }
  const nb = adj.map((s) => [...s]);
  const color = list.map((x) => x.color);
  const ecc = (blob) => {
    const dist = new Map();
    const q = [];
    for (const v of blob) {
      dist.set(v, 0);
      q.push(v);
    }
    let far = 0;
    for (let i = 0; i < q.length; i++) {
      const v = q[i];
      for (const u of nb[v])
        if (!dist.has(u)) {
          dist.set(u, dist.get(v) + 1);
          far = Math.max(far, dist.get(u));
          q.push(u);
        }
    }
    return far;
  };
  const bound = (blob) => {
    const left = new Set();
    for (let v = 0; v < n; v++) if (!blob.has(v)) left.add(color[v]);
    return Math.max(ecc(blob), left.size);
  };
  let nodes = 0;
  const search = (blob, col, depth, limit, path) => {
    if (blob.size === n) return path;
    if (depth + bound(blob) > limit || ++nodes > nodeLimit) return null;
    const frontier = new Set();
    for (const v of blob) for (const u of nb[v]) if (!blob.has(u)) frontier.add(color[u]);
    for (const c of frontier) {
      if (c === col) continue;
      const next = new Set(blob);
      const stack = [...blob];
      while (stack.length) {
        const v = stack.pop();
        for (const u of nb[v])
          if (!next.has(u) && color[u] === c) {
            next.add(u);
            stack.push(u);
          }
      }
      const res = search(next, c, depth + 1, limit, [...path, c]);
      if (res) return res;
    }
    return null;
  };
  // Central regions first: they usually give the shortest flood.
  const pivots = [...Array(n).keys()].map((v) => [ecc(new Set([v])), v]).sort((a, b) => a[0] - b[0]).slice(0, 12);
  for (let limit = 1; limit <= maxMoves; limit++) {
    for (const [, p] of pivots) {
      nodes = 0;
      const res = search(new Set([p]), color[p], 0, limit, []);
      if (res) {
        const [r, c] = list[p].cells[0];
        return res.map((col) => [r, c, col]);
      }
    }
  }
  return null;
}

export function generate(rng, mode = 'standard') {
  const cfg = CONFIG[mode] ?? CONFIG.standard;
  const { w, h, colors } = cfg;
  let best = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    // Voronoi blobs give large, irregular patches similar to paper-craft mosaics.
    const seeds = Array.from({ length: cfg.seeds }, () => ({ r: rng.next() * h, c: rng.next() * w, col: rng.int(0, colors - 1) }));
    const grid = Array.from({ length: h }, (_, r) =>
      Array.from({ length: w }, (_, c) => {
        let near = null;
        for (const s of seeds) {
          const d = (s.r - r - 0.5) ** 2 + (s.c - c - 0.5) ** 2 * 1.3;
          if (!near || d < near.d) near = { d, col: s.col };
        }
        return near.col;
      }),
    );
    const greedy = plan(grid);
    const exact = solvePivot(grid, greedy.length);
    const solution = exact && exact.length <= greedy.length ? exact : greedy;
    const slack = mode === 'standard' ? 1 : 0;
    const result = { w, h, colors, grid, moves: Math.max(1, solution.length + slack), solution };
    if (solution.length >= cfg.minMoves && solution.length <= cfg.maxMoves) return result;
    if (!best || Math.abs(solution.length - cfg.minMoves) < Math.abs(best.moves - cfg.minMoves)) best = result;
  }
  return best;
}
