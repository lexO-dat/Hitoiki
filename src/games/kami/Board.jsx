import { forwardRef, useImperativeHandle, useState } from 'react';
import { useBoardState, boardSize } from '../common.js';
import { paint, plan, isSolved, regions, solvePivot } from './logic.js';

export const PAINT = ['#db5856', '#6396e7', '#54ae57', '#b376cf', '#54576c', '#70f7ca'];

export default forwardRef(function KamiBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { w, h, colors, grid, moves } = puzzle;
  const initial = { grid, used: 0 };
  const b = useBoardState({ initial, saved, onChange, isSolved: (s) => isSolved(s.grid), onSolved });
  const [color, setColor] = useState(0);
  const [flash, setFlash] = useState(null);
  const { cell, width, height } = boardSize(w, h, 400, 140);
  const s = b.state;
  const left = moves - s.used;
  const out = left <= 0 && !isSolved(s.grid);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(initial),
    hint() {
      // Best move within the remaining budget; greedy fallback when no exact plan is found.
      const [mv] = solvePivot(s.grid, Math.max(1, left)) ?? plan(s.grid, 1);
      if (!mv) return false;
      const [r, c, col] = mv;
      setColor(col);
      const { id } = regions(s.grid);
      setFlash(id[r][c]);
      setTimeout(() => setFlash(null), 1200);
      return { cells: [[r, c]] };
    },
  }));

  const tap = (r, c) => {
    if (out || s.grid[r][c] === color) return;
    const next = { grid: paint(s.grid, r, c, color), used: s.used + 1 };
    b.set(next);
    if (next.used >= moves && !isSolved(next.grid)) onMistake?.();
  };

  const ids = flash !== null ? regions(s.grid).id : null;
  return (
    <div className="kami">
      <div className={`kami-moves${out ? ' out' : ''}`}>{out ? 'Sin movimientos' : `${left} ${left === 1 ? 'movimiento' : 'movimientos'}`}</div>
      <div className="kamigrid" style={{ width, height, gridTemplateColumns: `repeat(${w}, ${cell}px)` }}>
        {s.grid.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              className={`kamicell${ids && ids[r][c] === flash ? ' flash' : ''}`}
              style={{ height: cell, background: PAINT[v] }}
              onClick={() => tap(r, c)}
              aria-label={`color ${v + 1}`}
            />
          )),
        )}
      </div>
      {out ? (
        <button className="btn primary" onClick={() => b.set(initial)}>
          Reintentar
        </button>
      ) : (
        <div className="palette">
          {Array.from({ length: colors }, (_, k) => (
            <button
              key={k}
              className={`paint${k === color ? ' sel' : ''}`}
              style={{ background: PAINT[k] }}
              onClick={() => setColor(k)}
              aria-label={`pintura ${k + 1}`}
              aria-pressed={k === color}
            />
          ))}
        </div>
      )}
    </div>
  );
});
