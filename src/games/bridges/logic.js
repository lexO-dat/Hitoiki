// Bridges (hashiwokakero): link dots with single or double straight lines so each dot has as
// many links as its number, lines never cross, and every dot joins one network.

const CONFIG = {
  standard: { w: 6, h: 7, islands: 9 },
  hard: { w: 7, h: 9, islands: 14 },
  expert: { w: 8, h: 11, islands: 20 },
};
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function generate(rng, mode = 'standard') {
  const cfg = CONFIG[mode] ?? CONFIG.standard;
  const { w, h } = cfg;
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const cell = Array.from({ length: h }, () => Array(w).fill(null)); // {island:i} | 'H' | 'V'
    const islands = [];
    const bridges = {};
    const freeSpot = (r, c) =>
      r >= 0 && c >= 0 && r < h && c < w && !cell[r][c] &&
      DIRS.every(([dr, dc]) => !(cell[r + dr]?.[c + dc]?.island >= 0));
    const add = (r, c) => {
      cell[r][c] = { island: islands.length };
      islands.push({ r, c });
      return islands.length - 1;
    };
    const link = (a, b, n) => {
      const A = islands[a];
      const B = islands[b];
      const horiz = A.r === B.r;
      const [lo, hi] = horiz ? [Math.min(A.c, B.c), Math.max(A.c, B.c)] : [Math.min(A.r, B.r), Math.max(A.r, B.r)];
      for (let k = lo + 1; k < hi; k++) {
        if (horiz) cell[A.r][k] = 'H';
        else cell[k][A.c] = 'V';
      }
      bridges[edgeKey(a, b)] = (bridges[edgeKey(a, b)] ?? 0) + n;
    };
    add(rng.int(0, h - 1), rng.int(0, w - 1));
    let stuck = 0;
    while (islands.length < cfg.islands && stuck < 400) {
      const from = rng.int(0, islands.length - 1);
      const [dr, dc] = rng.pick(DIRS);
      const dist = rng.int(2, Math.max(2, Math.floor(Math.max(w, h) / 2)));
      const { r, c } = islands[from];
      let ok = true;
      for (let k = 1; k < dist; k++) if (cell[r + dr * k]?.[c + dc * k] !== null) ok = false;
      const tr = r + dr * dist;
      const tc = c + dc * dist;
      if (!ok || !freeSpot(tr, tc)) {
        stuck++;
        continue;
      }
      const to = add(tr, tc);
      link(from, to, rng.chance(0.35) ? 2 : 1);
    }
    // Extra links between already-aligned islands create cycles and richer deductions.
    for (let a = 0; a < islands.length; a++) {
      for (const [dr, dc] of DIRS.slice(0, 2)) {
        let r = islands[a].r + dr;
        let c = islands[a].c + dc;
        while (r < h && c < w && cell[r][c] === null) {
          r += dr;
          c += dc;
        }
        const b = cell[r]?.[c]?.island;
        if (b >= 0 && !bridges[edgeKey(a, b)] && (Math.abs(r - islands[a].r) + Math.abs(c - islands[a].c)) > 1 && rng.chance(0.3)) {
          link(a, b, rng.chance(0.3) ? 2 : 1);
        }
      }
    }
    const result = { w, h, islands, solution: bridges };
    result.islands = islands.map((p, i) => ({
      ...p,
      n: Object.entries(bridges).reduce((s, [k, v]) => s + (k.split('-').map(Number).includes(i) ? v : 0), 0),
    }));
    if (islands.length >= cfg.islands) return result;
    if (!best || islands.length > best.islands.length) best = result;
  }
  return best;
}

// For each island, the nearest island in each direction (the only legal partners).
export function neighbours(puzzle) {
  const at = new Map(puzzle.islands.map((p, i) => [`${p.r},${p.c}`, i]));
  return puzzle.islands.map((p) =>
    DIRS.map(([dr, dc]) => {
      let r = p.r + dr;
      let c = p.c + dc;
      while (r >= 0 && c >= 0 && r < puzzle.h && c < puzzle.w) {
        if (at.has(`${r},${c}`)) return at.get(`${r},${c}`);
        r += dr;
        c += dc;
      }
      return -1;
    }),
  );
}

function span(puzzle, key) {
  const [a, b] = key.split('-').map(Number);
  const A = puzzle.islands[a];
  const B = puzzle.islands[b];
  return A.r === B.r
    ? { horiz: true, fixed: A.r, lo: Math.min(A.c, B.c), hi: Math.max(A.c, B.c) }
    : { horiz: false, fixed: A.c, lo: Math.min(A.r, B.r), hi: Math.max(A.r, B.r) };
}

export function crosses(puzzle, k1, k2) {
  const s = span(puzzle, k1);
  const t = span(puzzle, k2);
  if (s.horiz === t.horiz) return false;
  const [hz, vt] = s.horiz ? [s, t] : [t, s];
  return vt.fixed > hz.lo && vt.fixed < hz.hi && hz.fixed > vt.lo && hz.fixed < vt.hi;
}

export function degrees(puzzle, links) {
  const d = puzzle.islands.map(() => 0);
  for (const [k, v] of Object.entries(links)) {
    const [a, b] = k.split('-').map(Number);
    d[a] += v;
    d[b] += v;
  }
  return d;
}

export function isSolved(puzzle, links) {
  const d = degrees(puzzle, links);
  if (d.some((v, i) => v !== puzzle.islands[i].n)) return false;
  const keys = Object.keys(links).filter((k) => links[k]);
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (crosses(puzzle, keys[i], keys[j])) return false;
  const adj = puzzle.islands.map(() => []);
  for (const k of keys) {
    const [a, b] = k.split('-').map(Number);
    adj[a].push(b);
    adj[b].push(a);
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) for (const n of adj[stack.pop()]) if (!seen.has(n)) seen.add(n) && stack.push(n);
  return seen.size === puzzle.islands.length;
}
