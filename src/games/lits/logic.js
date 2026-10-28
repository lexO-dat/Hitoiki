// LITS: shade exactly one tetromino (L, I, T or S) in every region. All shaded cells form one
// connected group, no 2×2 block is fully shaded, and equal shapes never touch along an edge.

const SIZE = { tutorial: [5, 5], standard: [6, 6], hard: [7, 7], expert: [8, 8] };
const BASE = {
  L: [[0, 0], [1, 0], [2, 0], [2, 1]],
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
};

const norm = (cells) => {
  const mr = Math.min(...cells.map((p) => p[0]));
  const mc = Math.min(...cells.map((p) => p[1]));
  return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const sig = (cells) => norm(cells).map((p) => p.join(',')).join(';');

const ORIENT = [];
const SHAPE_OF = new Map();
for (const [name, base] of Object.entries(BASE)) {
  let cur = base;
  for (let flip = 0; flip < 2; flip++) {
    for (let rot = 0; rot < 4; rot++) {
      const s = sig(cur);
      if (!SHAPE_OF.has(s)) {
        SHAPE_OF.set(s, name);
        ORIENT.push({ name, cells: norm(cur) });
      }
      cur = cur.map(([r, c]) => [c, -r]);
    }
    cur = cur.map(([r, c]) => [r, -c]);
  }
}

export const shapeOf = (cells) => SHAPE_OF.get(sig(cells)) ?? null;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function has2x2(sh, h, w) {
  for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) if (sh[r][c] && sh[r + 1][c] && sh[r][c + 1] && sh[r + 1][c + 1]) return true;
  return false;
}

function buildSolution(w, h, rng) {
  const piece = Array.from({ length: h }, () => Array(w).fill(-1));
  const shade = Array.from({ length: h }, () => Array(w).fill(false));
  const pieces = [];
  const target = Math.floor((w * h) / 6.5);
  const canPlace = (cells, name) => {
    for (const [r, c] of cells) if (r < 0 || c < 0 || r >= h || c >= w || piece[r][c] >= 0) return false;
    // Each piece needs breathing room for its own region: forbid touching more than lightly.
    for (const [r, c] of cells)
      for (const [dr, dc] of DIRS) {
        const p = piece[r + dr]?.[c + dc];
        if (p >= 0 && pieces[p].name === name) return false;
      }
    cells.forEach(([r, c]) => (shade[r][c] = true));
    const bad = has2x2(shade, h, w);
    cells.forEach(([r, c]) => (shade[r][c] = false));
    return !bad;
  };
  const place = (cells, name) => {
    cells.forEach(([r, c]) => {
      piece[r][c] = pieces.length;
      shade[r][c] = true;
    });
    pieces.push({ name, cells });
  };
  const first = rng.pick(ORIENT);
  const r0 = rng.int(0, h - 4);
  const c0 = rng.int(0, w - 4);
  place(first.cells.map(([r, c]) => [r + r0, c + c0]), first.name);
  let fails = 0;
  while (pieces.length < target && fails < 3000) {
    // Grow from a random shaded cell into a neighbouring empty cell, keeping the group connected.
    const p = rng.pick(pieces);
    const [sr, sc] = rng.pick(p.cells);
    const [dr, dc] = rng.pick(DIRS);
    const ar = sr + dr;
    const ac = sc + dc;
    const o = rng.pick(ORIENT);
    const [kr, kc] = rng.pick(o.cells);
    const cells = o.cells.map(([r, c]) => [r - kr + ar, c - kc + ac]);
    if (canPlace(cells, o.name)) place(cells, o.name);
    else fails++;
  }
  return { piece, pieces };
}

export function generate(rng, mode = 'standard') {
  const [w, h] = SIZE[mode] ?? SIZE.standard;
  const { piece, pieces } = buildSolution(w, h, rng);
  // Regions: each piece seeds one region, then regions absorb the unshaded cells around them.
  const region = piece.map((row) => row.slice());
  const frontier = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (region[r][c] >= 0) frontier.push([r, c]);
  while (frontier.length) {
    const i = Math.floor(rng.next() * frontier.length);
    const [r, c] = frontier[i];
    const opts = DIRS.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => region[a]?.[b] === -1);
    if (!opts.length) {
      frontier.splice(i, 1);
      continue;
    }
    const [a, b] = rng.pick(opts);
    region[a][b] = region[r][c];
    frontier.push([a, b]);
  }
  const solution = piece.map((row) => row.map((p) => p >= 0));
  return { w, h, region, regions: pieces.length, solution, shapes: pieces.map((p) => p.name) };
}

export function analyse(puzzle, shade) {
  const { w, h, region, regions } = puzzle;
  const byRegion = Array.from({ length: regions }, () => []);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (shade[r][c]) byRegion[region[r][c]].push([r, c]);
  const shapes = byRegion.map((cells) => (cells.length === 4 ? shapeOf(cells) : null));
  const bad = new Set();
  byRegion.forEach((cells, i) => {
    if (cells.length > 4 || (cells.length === 4 && !shapes[i])) cells.forEach((p) => bad.add(p.join(',')));
  });
  for (let r = 0; r + 1 < h; r++)
    for (let c = 0; c + 1 < w; c++)
      if (shade[r][c] && shade[r + 1][c] && shade[r][c + 1] && shade[r + 1][c + 1])
        [[r, c], [r + 1, c], [r, c + 1], [r + 1, c + 1]].forEach((p) => bad.add(p.join(',')));
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      for (const [dr, dc] of [[1, 0], [0, 1]]) {
        const a = r + dr;
        const b = c + dc;
        if (a >= h || b >= w || !shade[r][c] || !shade[a][b]) continue;
        const g1 = region[r][c];
        const g2 = region[a][b];
        if (g1 !== g2 && shapes[g1] && shapes[g1] === shapes[g2]) {
          byRegion[g1].forEach((p) => bad.add(p.join(',')));
          byRegion[g2].forEach((p) => bad.add(p.join(',')));
        }
      }
  return { shapes, bad, byRegion };
}

export function isSolved(puzzle, shade) {
  const { shapes, bad, byRegion } = analyse(puzzle, shade);
  if (bad.size || shapes.some((s) => !s)) return false;
  const cells = byRegion.flat();
  const key = new Set(cells.map((p) => p.join(',')));
  const seen = new Set([cells[0].join(',')]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of DIRS) {
      const k = `${r + dr},${c + dc}`;
      if (key.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([r + dr, c + dc]);
      }
    }
  }
  return seen.size === key.size;
}
