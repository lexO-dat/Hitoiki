import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useBoardState, cellAt, boardSize, REGION_COLORS, clone2 } from '../common.js';
import { conflicts, isSolved } from './logic.js';
import { Crown } from '../../components/Icons.jsx';

export default forwardRef(function QueensBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { n, region, solution } = puzzle;
  const empty = () => Array.from({ length: n }, () => Array(n).fill(0));
  const b = useBoardState({ initial: empty(), saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const bad = useMemo(() => conflicts(puzzle, b.state), [puzzle, b.state]);
  const el = useRef(null);
  const drag = useRef(null);
  const { cell, width } = boardSize(n, n);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(empty()),
    hint() {
      const r = solution.findIndex((c, row) => b.state[row][c] !== 2 || b.state[row].some((v, k) => v === 2 && k !== c));
      if (r < 0) return false;
      const next = clone2(b.state);
      next[r] = next[r].map((v) => (v === 2 ? 0 : v));
      next[r][solution[r]] = 2;
      b.set(next);
      return { cells: [[r, solution[r]]] };
    },
  }));

  const down = (e) => {
    const p = cellAt(e, el.current, n, n);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: p, moved: false, painted: new Set() };
  };
  const move = (e) => {
    const d = drag.current;
    const p = cellAt(e, el.current, n, n);
    if (!d || !p) return;
    const key = p.join(',');
    if (key === d.start.join(',') && !d.moved) return;
    // Dragging marks empty cells with an ×, like pencil marks.
    const next = clone2(b.get());
    let changed = false;
    for (const q of d.moved ? [p] : [d.start, p]) {
      const k = q.join(',');
      if (d.painted.has(k)) continue;
      d.painted.add(k);
      if (next[q[0]][q[1]] === 0) {
        next[q[0]][q[1]] = 1;
        changed = true;
      }
    }
    if (!d.moved) b.begin();
    d.moved = true;
    if (changed) b.replace(next);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) b.end();
    if (!d || d.moved) return;
    const [r, c] = d.start;
    const next = clone2(b.get());
    next[r][c] = (next[r][c] + 1) % 3;
    b.set(next);
    if (next[r][c] === 2 && conflicts(puzzle, next).has(`${r},${c}`)) onMistake?.();
  };

  return (
    <div
      ref={el}
      className="qgrid"
      style={{ width, gridTemplateColumns: `repeat(${n}, ${cell}px)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        if (drag.current?.moved) b.end();
        drag.current = null;
      }}
      role="grid"
      aria-label="Tablero de coronas"
    >
      {region.map((row, r) =>
        row.map((g, c) => {
          const v = b.state[r][c];
          const edge = (dr, dc) => region[r + dr]?.[c + dc] !== undefined && region[r + dr][c + dc] !== g;
          return (
            <div
              key={`${r}-${c}`}
              className={`qcell${bad.has(`${r},${c}`) ? ' bad' : ''}`}
              style={{
                height: cell,
                background: REGION_COLORS[g % REGION_COLORS.length],
                borderTopWidth: edge(-1, 0) ? 2.5 : 0.5,
                borderLeftWidth: edge(0, -1) ? 2.5 : 0.5,
                borderRightWidth: edge(0, 1) ? 2.5 : 0.5,
                borderBottomWidth: edge(1, 0) ? 2.5 : 0.5,
              }}
            >
              {v === 1 && <span className="qx">×</span>}
              {v === 2 && <Crown className="qcrown" />}
            </div>
          );
        }),
      )}
    </div>
  );
});
