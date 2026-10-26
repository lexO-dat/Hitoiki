import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useBoardState, cellAt, boardSize } from '../common.js';
import { adjacent, isSolved } from './logic.js';

export default forwardRef(function ZipBoard({ puzzle, saved, onChange, onSolved, onMistake, color }, ref) {
  const { w, h, numbers, solution } = puzzle;
  const b = useBoardState({ initial: [], saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const el = useRef(null);
  const drawing = useRef(false);
  const { cell, width, height } = boardSize(w, h, 420);
  const path = b.state;
  const key = (p) => p.join(',');

  // Highest number already collected along the path decides which number may come next.
  const reached = (p) => p.reduce((m, [r, c]) => Math.max(m, numbers[r][c]), 0);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set([]),
    hint() {
      let k = 0;
      while (k < path.length && key(path[k]) === key(solution[k])) k++;
      if (k >= solution.length) return false;
      const next = solution.slice(0, Math.min(solution.length, k + 3));
      b.set(next);
      return { cells: next.slice(k) };
    },
  }));

  const extend = (p) => {
    const cur = b.get();
    const i = cur.findIndex((q) => key(q) === key(p));
    if (i !== undefined) {
      // Moving back over the line rewinds it.
      if (i < cur.length - 1) b.set(cur.slice(0, i + 1));
      return;
    }
    const last = cur[cur.length - 1];
    if (!last || !adjacent(last, p)) return;
    const n = numbers[p[0]][p[1]];
    if (n && n !== reached(cur) + 1) {
      onMistake?.();
      return;
    }
    b.set([...cur, p]);
  };

  const down = (e) => {
    const p = cellAt(e, el.current, w, h);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const i = path.findIndex((q) => key(q) === key(p));
    if (i >= 0) b.set(path.slice(0, i + 1));
    else if (numbers[p[0]][p[1]] === 1) b.set([p]);
    else if (path.length && adjacent(path[path.length - 1], p)) extend(p);
    else drawing.current = false;
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = cellAt(e, el.current, w, h);
    if (p) extend(p);
  };

  const pts = path.map(([r, c]) => `${c * cell + cell / 2},${r * cell + cell / 2}`).join(' ');
  return (
    <div
      ref={el}
      className="zgrid"
      style={{ width, height, gridTemplateColumns: `repeat(${w}, ${cell}px)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => (drawing.current = false)}
      onPointerCancel={() => (drawing.current = false)}
      role="grid"
      aria-label="Tablero de ruta"
    >
      {numbers.map((row, r) => row.map((_, c) => <div key={`${r}-${c}`} className="zcell" style={{ height: cell }} />))}
      <svg className="zsvg" width={width} height={height}>
        {path.length > 1 && (
          <polyline points={pts} fill="none" stroke={color} strokeWidth={cell * 0.42} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {path.length === 1 && <circle cx={path[0][1] * cell + cell / 2} cy={path[0][0] * cell + cell / 2} r={cell * 0.21} fill={color} />}
        {numbers.flatMap((row, r) =>
          row.map((n, c) =>
            n ? (
              <g key={`${r}-${c}`}>
                <circle cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.3} className="znum" />
                <text x={c * cell + cell / 2} y={r * cell + cell / 2} dy="0.36em" textAnchor="middle" fontSize={cell * 0.32}>
                  {n}
                </text>
              </g>
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
});
