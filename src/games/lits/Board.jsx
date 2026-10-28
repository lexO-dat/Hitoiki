import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useBoardState, cellAt, useBoardSize, clone2 } from '../common.js';
import { analyse, isSolved } from './logic.js';

// One tint per tetromino shape.
const SHAPE_COLORS = { L: '#fccc9c', I: '#81a2d4', T: '#9fcc9b', S: '#b7a8e9' };

export default forwardRef(function LitsBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { w, h, region, solution } = puzzle;
  const empty = () => Array.from({ length: h }, () => Array(w).fill(0)); // 0 empty, 1 shaded, 2 dot
  const shadeOf = (s) => s.map((row) => row.map((v) => v === 1));
  const b = useBoardState({ initial: empty(), saved, onChange, isSolved: (s) => isSolved(puzzle, shadeOf(s)), onSolved });
  const { shapes, bad } = useMemo(() => analyse(puzzle, shadeOf(b.state)), [puzzle, b.state]);
  const [markMode, setMarkMode] = useState(false);
  const el = useRef(null);
  const drag = useRef(null);
  const { cell, width, height } = useBoardSize(w, h, 420, 64);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(empty()),
    hint() {
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++)
          if ((b.state[r][c] === 1) !== solution[r][c]) {
            const next = clone2(b.state);
            next[r][c] = solution[r][c] ? 1 : 2;
            b.set(next);
            return { cells: [[r, c]] };
          }
      return false;
    },
  }));

  // Drag paints every touched cell with the value chosen on the first cell.
  const down = (e) => {
    const p = cellAt(e, el.current, w, h);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cur = b.get()[p[0]][p[1]];
    const target = markMode ? (cur === 2 ? 0 : 2) : cur === 1 ? 0 : 1;
    drag.current = { target, seen: new Set() };
    b.begin();
    apply(p);
  };
  const apply = (p) => {
    const d = drag.current;
    const k = p.join(',');
    if (!d || d.seen.has(k)) return;
    d.seen.add(k);
    const next = clone2(b.get());
    next[p[0]][p[1]] = d.target;
    b.replace(next);
  };
  const move = (e) => {
    const p = drag.current && cellAt(e, el.current, w, h);
    if (p) apply(p);
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    b.end();
    if (analyse(puzzle, shadeOf(b.get())).bad.size) onMistake?.();
  };

  return (
    <div className="lits">
      <div
        ref={el}
        className="lgrid"
        style={{ width, height, gridTemplateColumns: `repeat(${w}, ${cell}px)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {b.state.map((row, r) =>
          row.map((v, c) => {
            const g = region[r][c];
            const edge = (dr, dc) => region[r + dr]?.[c + dc] !== undefined && region[r + dr][c + dc] !== g;
            const isBad = bad.has(`${r},${c}`);
            const fill = v === 1 ? (isBad ? 'var(--wrong)' : SHAPE_COLORS[shapes[g]] ?? '#bababa') : undefined;
            return (
              <div
                key={`${r}-${c}`}
                className={`lcell${v === 1 ? ' on' : ''}`}
                style={{
                  height: cell,
                  background: fill,
                  borderTopWidth: edge(-1, 0) ? 3 : 0.5,
                  borderLeftWidth: edge(0, -1) ? 3 : 0.5,
                  borderRightWidth: edge(0, 1) ? 3 : 0.5,
                  borderBottomWidth: edge(1, 0) ? 3 : 0.5,
                }}
              >
                {v === 2 && <span className="ldot" />}
              </div>
            );
          }),
        )}
      </div>
      <button className={`btn${markMode ? ' primary' : ''}`} onClick={() => setMarkMode((m) => !m)} aria-pressed={markMode}>
        {markMode ? '• Marcando vacías' : '■ Rellenando'}
      </button>
    </div>
  );
});
