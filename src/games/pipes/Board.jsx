import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useBoardState, boardSize, clone2 } from '../common.js';
import { connected, isSolved, rotate } from './logic.js';

const ARMS = [
  [1, 'M50 50 V0'],
  [2, 'M50 50 H100'],
  [4, 'M50 50 V100'],
  [8, 'M50 50 H0'],
];

// One tile. Memoized: a tap only redraws the tile turned and those whose connection changed.
const PipeCell = memo(function PipeCell({ r, c, mask, on, isSource, spin, cell, color, onTap }) {
  const ends = [1, 2, 4, 8].filter((k) => mask & k).length;
  return (
    <button className="pcell" style={{ height: cell }} onClick={() => onTap(r, c)} aria-label="girar tubería">
      <svg key={spin} className={spin ? 'spin' : undefined} viewBox="0 0 100 100" width="100%" height="100%">
        {ARMS.filter(([bit]) => mask & bit).map(([bit, d]) => (
          <path key={bit} d={d} className="pipe-outline" />
        ))}
        {ARMS.filter(([bit]) => mask & bit).map(([bit, d]) => (
          <path key={bit} d={d} className="pipe-fill" style={{ stroke: on ? color : undefined }} />
        ))}
        {isSource ? (
          <rect x="28" y="28" width="44" height="44" rx="10" className="pipe-source" style={{ fill: color }} />
        ) : (
          ends === 1 && <circle cx="50" cy="50" r="17" className="pipe-end" style={{ fill: on ? color : undefined }} />
        )}
        {ends > 1 && !isSource && <circle cx="50" cy="50" r="9.5" className="pipe-joint" style={{ fill: on ? color : undefined }} />}
      </svg>
    </button>
  );
});

export default forwardRef(function PipesBoard({ puzzle, saved, onChange, onSolved, color }, ref) {
  const { w, h, source, tiles, solved } = puzzle;
  const b = useBoardState({ initial: tiles, saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const { seen } = useMemo(() => connected(puzzle, b.state), [puzzle, b.state]);
  const { cell, width } = boardSize(w, h, 420);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(tiles),
    hint() {
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++)
          if (b.state[r][c] !== solved[r][c]) {
            const next = clone2(b.state);
            next[r][c] = solved[r][c];
            b.set(next);
            return { cells: [[r, c]] };
          }
      return false;
    },
  }));

  // Each tap turns the piece a quarter clockwise: the new orientation is drawn at once and animated
  // in from the previous one (-90°), so the turn reads as one smooth motion.
  const spins = useRef({});
  const latest = useRef(b);
  latest.current = b;
  const onTap = useCallback((r, c) => {
    spins.current[`${r}-${c}`] = (spins.current[`${r}-${c}`] ?? 0) + 1;
    const next = clone2(latest.current.state);
    next[r][c] = rotate(next[r][c]);
    latest.current.set(next);
  }, []);

  return (
    <div className="pgrid" style={{ width, gridTemplateColumns: `repeat(${w}, ${cell}px)` }} role="grid" aria-label="Tablero de tuberías">
      {b.state.map((row, r) =>
        row.map((m, c) => (
          <PipeCell
            key={`${r}-${c}`}
            r={r}
            c={c}
            mask={m}
            on={seen[r][c]}
            isSource={r === source[0] && c === source[1]}
            spin={spins.current[`${r}-${c}`] ?? 0}
            cell={cell}
            color={color}
            onTap={onTap}
          />
        )),
      )}
    </div>
  );
});
