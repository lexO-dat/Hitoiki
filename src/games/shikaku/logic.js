// Shikaku: split the grid into rectangles, each containing exactly one number equal to its area.

const SIZE = { tutorial: [[4, 4], [4, 4]], standard: [[6, 6], [7, 7]], hard: [[8, 7], [9, 8]], expert: [[10, 8], [12, 10]] };
const MAX_AREA = { tutorial: 4, standard: 8, hard: 10, expert: 12 };

function partition(w, h, rng, maxArea) {
  const owner = Array.from({ length: h }, () => Array(w).fill(-1));
  const rects = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (owner[r][c] >= 0) continue;
      // Candidate rectangles anchored at the first free cell (top-left scan order).
      const cands = [];
      for (let rh = 1; r + rh <= h; rh++) {
        for (let rw = 1; c + rw <= w; rw++) {
          if (rw * rh > maxArea) break;
          let free = true;
          for (let y = r; y < r + rh && free; y++) for (let x = c; x < c + rw; x++) if (owner[y][x] >= 0) free = false;
          if (!free) break;
          cands.push([rw, rh]);
        }
      }
      // Prefer mid-sized rectangles, avoid lots of 1×1.
      const weighted = cands.flatMap(([rw, rh]) => {
        const a = rw * rh;
        const wgt = a === 1 ? 1 : a <= 3 ? 4 : 6;
        return Array(wgt).fill([rw, rh]);
      });
      const [rw, rh] = rng.pick(weighted);
      const id = rects.length;
      for (let y = r; y < r + rh; y++) for (let x = c; x < c + rw; x++) owner[y][x] = id;
      rects.push({ r, c, w: rw, h: rh });
    }
  }
  return rects;
}

export function generate(rng, mode = 'standard') {
  const [[w1, h1], [w2, h2]] = SIZE[mode] ?? SIZE.standard;
  const w = rng.int(Math.min(w1, w2), Math.max(w1, w2));
  const h = rng.int(Math.min(h1, h2), Math.max(h1, h2));
  let rects;
  for (let i = 0; i < 30; i++) {
    rects = partition(w, h, rng, MAX_AREA[mode] ?? 8);
    if (rects.filter((q) => q.w * q.h === 1).length <= Math.floor(rects.length / 8)) break;
  }
  const clues = rects.map((q) => ({ r: q.r + rng.int(0, q.h - 1), c: q.c + rng.int(0, q.w - 1), n: q.w * q.h }));
  return { w, h, clues, solution: rects };
}

export const rectCells = (q) => {
  const out = [];
  for (let y = q.r; y < q.r + q.h; y++) for (let x = q.c; x < q.c + q.w; x++) out.push([y, x]);
  return out;
};

const isHole = (puzzle, r, c) => !!puzzle.holes?.some(([y, x]) => y === r && x === c);

export function rectStatus(puzzle, q) {
  if (puzzle.holes && rectCells(q).some(([y, x]) => isHole(puzzle, y, x))) return 'bad';
  const inside = puzzle.clues.filter((k) => k.r >= q.r && k.r < q.r + q.h && k.c >= q.c && k.c < q.c + q.w);
  return inside.length === 1 && inside[0].n === q.w * q.h ? 'ok' : 'bad';
}

export function isSolved(puzzle, rects) {
  const covered = new Set();
  for (const q of rects) {
    if (rectStatus(puzzle, q) !== 'ok') return false;
    for (const [y, x] of rectCells(q)) covered.add(`${y},${x}`);
  }
  return covered.size === puzzle.w * puzzle.h - (puzzle.holes?.length ?? 0);
}
