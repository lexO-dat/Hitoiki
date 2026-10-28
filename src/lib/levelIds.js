// Pure helper (no UI imports) so tests can use it.
// Progress is saved per level id, so ids must be unique. A few bundled levels share an id with a
// different puzzle (72 in Shikaku, 9 in LITS); solving one would mark its twin as solved too, even in
// another difficulty. The first level keeps its id (so saved progress stays valid), later ones get ~2, ~3…
const normalized = new WeakSet();
export function uniqueIds(levels) {
  if (normalized.has(levels)) return levels;
  const seen = new Map();
  for (const l of levels) {
    const n = (seen.get(l.id) ?? 0) + 1;
    seen.set(l.id, n);
    if (n > 1) l.id = `${l.id}~${n}`;
  }
  normalized.add(levels);
  return levels;
}
