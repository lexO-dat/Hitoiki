// Level progression in the Niveles mode: inside each difficulty the levels are played in order.
// A level is open when it comes right after the furthest one solved, so the next level to play is
// always the frontier (and progress made out of order before this rule keeps everything up to it open).

export const levelKey = (gameId, level) => `lvl|${gameId}|${level.id}`;

export function progression(levels, results, gameId, difficulty) {
  const order = [];
  levels.forEach((l, i) => l.difficulty === difficulty && order.push(i));
  let highest = -1;
  order.forEach((i, pos) => {
    if (results[levelKey(gameId, levels[i])]) highest = pos;
  });
  const solved = order.filter((i) => results[levelKey(gameId, levels[i])]).length;
  return {
    order, // level indices in play order
    solved,
    total: order.length,
    // Position (in `order`) of the next level to play, or null when the difficulty is complete.
    next: highest + 1 < order.length ? highest + 1 : null,
    isOpen: (pos) => pos <= highest + 1,
    position: (index) => order.indexOf(index),
  };
}
