// Trios: cards have 4 features × 3 variants. A trio is three cards where every feature
// is all-equal or all-different. Find every trio on the table.

const CONFIG = { tutorial: { cards: 6, sets: 1 }, standard: { cards: 9, sets: 4 }, hard: { cards: 12, sets: 5 }, expert: { cards: 12, sets: 6 } };

export const isSet = (a, b, c) => [0, 1, 2, 3].every((f) => (a[f] + b[f] + c[f]) % 3 === 0);

export function allSets(cards) {
  const out = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      for (let k = j + 1; k < cards.length; k++) if (isSet(cards[i], cards[j], cards[k])) out.push([i, j, k]);
  return out;
}

const deck = () => {
  const d = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let e = 0; e < 3; e++) d.push([a, b, c, e]);
  return d;
};

export function generate(rng, mode = 'standard', override) {
  const cfg = override ?? CONFIG[mode] ?? CONFIG.standard;
  let best = null;
  for (let i = 0; i < 5000; i++) {
    const cards = rng.shuffle(deck()).slice(0, cfg.cards);
    const sets = allSets(cards);
    if (sets.length === cfg.sets) return { cards, sets };
    if (!best || Math.abs(sets.length - cfg.sets) < Math.abs(best.sets.length - cfg.sets)) best = { cards, sets };
  }
  return best;
}

export const setKey = (s) => s.slice().sort((a, b) => a - b).join('-');
