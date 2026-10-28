import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { useBoardState, useBoardSize, clone2 } from '../common.js';
import { describe, errors, isSolved, problems } from './logic.js';
import { Sun, Moon } from '../../components/Icons.jsx';

export default forwardRef(function TangoBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { n, givens, cons, solution } = puzzle;
  const b = useBoardState({ initial: clone2(givens), saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const issues = useMemo(() => problems(puzzle, b.state), [puzzle, b.state]);
  const bad = useMemo(() => new Set(issues.flatMap((p) => p.cells.map(([r, c]) => `${r},${c}`))), [issues]);
  const { cell, width } = useBoardSize(n, n, 420);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(clone2(givens)),
    hint() {
      const cells = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (b.state[r][c] !== solution[r][c]) cells.push([r, c]);
      if (!cells.length) return false;
      const wrong = cells.find(([r, c]) => b.state[r][c]) ?? cells[0];
      const next = clone2(b.state);
      next[wrong[0]][wrong[1]] = solution[wrong[0]][wrong[1]];
      b.set(next);
      return { cells: [wrong] };
    },
  }));

  const tap = (r, c) => {
    if (givens[r][c]) return;
    const next = clone2(b.state);
    next[r][c] = (next[r][c] + 1) % 3;
    b.set(next);
    if (next[r][c] && errors(puzzle, next).has(`${r},${c}`)) onMistake?.();
  };

  return (
    <>
      <div className="tgrid" style={{ width, gridTemplateColumns: `repeat(${n}, ${cell}px)` }} role="group" aria-label="Tablero sol y luna">
        {b.state.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              className={`tcell${givens[r][c] ? ' given' : ''}${bad.has(`${r},${c}`) ? ' bad' : ''}`}
              style={{ height: cell }}
              onClick={() => tap(r, c)}
              aria-label={v === 1 ? 'sol' : v === 2 ? 'luna' : 'vacía'}
            >
              {v === 1 && <Sun />}
              {v === 2 && <Moon />}
            </button>
          )),
        )}
        {cons.map(({ r, c, dir, type }) => (
          <span
            key={`${r}-${c}-${dir}`}
            className="tsign"
            style={{
              left: dir === 'h' ? (c + 1) * cell : c * cell + cell / 2,
              top: dir === 'v' ? (r + 1) * cell : r * cell + cell / 2,
            }}
          >
            {type === '=' ? '=' : '×'}
          </span>
        ))}
      </div>
      <p className="board-msg" role="status" aria-live="polite">
        {issues.length ? [...new Set(issues.map((p) => describe(p, n)))].slice(0, 2).join(' ') : ' '}
      </p>
    </>
  );
});
