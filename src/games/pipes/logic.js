// Pipes: rotate tiles so every pipe connects into one network fed by the source, with no open ends.
// Tile connections are a 4-bit mask: 1 = up, 2 = right, 4 = down, 8 = left.

const SIZE = { standard: [5, 5], hard: [6, 7], expert: [7, 8] };
const DIRS = [
  [-1, 0, 1, 4],
  [0, 1, 2, 8],
  [1, 0, 4, 1],
  [0, -1, 8, 2],
];

export const rotate = (mask, times = 1) => {
  let m = mask;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};

export function generate(rng, mode = 'standard') {
  const [lo, hi] = SIZE[mode] ?? SIZE.standard;
  const w = rng.int(lo, hi);
  const h = rng.int(lo, hi);
  const solved = Array.from({ length: h }, () => Array(w).fill(0));
  const source = [Math.floor(h / 2), Math.floor(w / 2)];
  // Random spanning tree (randomised Prim) so the whole board is one network.
  const inTree = Array.from({ length: h }, () => Array(w).fill(false));
  inTree[source[0]][source[1]] = true;
  const edges = [];
  const addEdges = (r, c) => {
    for (const [dr, dc, a, b] of DIRS) {
      const y = r + dr;
      const x = c + dc;
      if (y >= 0 && x >= 0 && y < h && x < w) edges.push([r, c, y, x, a, b]);
    }
  };
  addEdges(...source);
  const degree = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  while (edges.length) {
    // Sample a few candidate edges and grow from the least-connected tile:
    // this keeps 3- and 4-way junctions rare, which makes boards less trivial.
    let i = Math.floor(rng.next() * edges.length);
    for (let k = 0; k < 2; k++) {
      const j = Math.floor(rng.next() * edges.length);
      if (degree(solved[edges[j][0]][edges[j][1]]) < degree(solved[edges[i][0]][edges[i][1]])) i = j;
    }
    const [r, c, y, x, a, b] = edges.splice(i, 1)[0];
    if (inTree[y][x]) continue;
    solved[r][c] |= a;
    solved[y][x] |= b;
    inTree[y][x] = true;
    addEdges(y, x);
  }
  const rotations = solved.map((row) => row.map(() => rng.int(0, 3)));
  const tiles = solved.map((row, r) => row.map((m, c) => rotate(m, rotations[r][c])));
  return { w, h, source, tiles, solved };
}

// wrap: 0 none, 1 left/right edges joined, 2 top/bottom joined, 3 both (torus).
export function connected(puzzle, tiles) {
  const { w, h, source, wrap = 0 } = puzzle;
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [source];
  seen[source[0]][source[1]] = true;
  let leaks = 0;
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc, a, b] of DIRS) {
      if (!(tiles[r][c] & a)) continue;
      let y = r + dr;
      let x = c + dc;
      if (wrap & 1) x = (x + w) % w;
      if (wrap & 2) y = (y + h) % h;
      if (y < 0 || x < 0 || y >= h || x >= w || !(tiles[y][x] & b)) {
        leaks++;
        continue;
      }
      if (!seen[y][x]) {
        seen[y][x] = true;
        stack.push([y, x]);
      }
    }
  }
  return { seen, leaks };
}

// Find rotations that connect everything: edge-consistency propagation plus backtracking.
export function solve(puzzle, tiles, maxNodes = 200000) {
  const { w, h, wrap = 0 } = puzzle;
  const n = w * h;
  const cand = [];
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) cand.push([...new Set([0, 1, 2, 3].map((t) => rotate(tiles[r][c], t)))]);
  const neighbour = (i, d) => {
    let y = Math.floor(i / w) + DIRS[d][0];
    let x = (i % w) + DIRS[d][1];
    if (wrap & 1) x = (x + w) % w;
    if (wrap & 2) y = (y + h) % h;
    return y < 0 || x < 0 || y >= h || x >= w ? -1 : y * w + x;
  };
  const prune = (doms) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        const before = doms[i].length;
        doms[i] = doms[i].filter((m) =>
          DIRS.every(([, , a, b], d) => {
            const j = neighbour(i, d);
            if (j < 0) return !(m & a);
            return doms[j].some((o) => !!(m & a) === !!(o & b));
          }),
        );
        if (!doms[i].length) return false;
        if (doms[i].length !== before) changed = true;
      }
    }
    return true;
  };
  let nodes = 0;
  const go = (doms) => {
    if (++nodes > maxNodes || !prune(doms)) return null;
    let pick = -1;
    for (let i = 0; i < n; i++) if (doms[i].length > 1 && (pick < 0 || doms[i].length < doms[pick].length)) pick = i;
    if (pick < 0) {
      const grid = Array.from({ length: h }, (_, r) => doms.slice(r * w, r * w + w).map((d) => d[0]));
      return isSolved(puzzle, grid) ? grid : null;
    }
    for (const m of doms[pick]) {
      const next = doms.map((d) => d.slice());
      next[pick] = [m];
      const res = go(next);
      if (res) return res;
    }
    return null;
  };
  return go(cand);
}

export function isSolved(puzzle, tiles) {
  const { seen, leaks } = connected(puzzle, tiles);
  return leaks === 0 && seen.every((row) => row.every(Boolean));
}
