import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useBoardState, useBoardSize } from '../common.js';
import { box, conflicts, isSolved } from './logic.js';

export default forwardRef(function SudokuBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { givens, solution } = puzzle;
  const initial = { values: givens.slice(), notes: Array(81).fill(0) };
  const b = useBoardState({ initial, saved, onChange, isSolved: (s) => isSolved(s.values), onSolved });
  const [sel, setSel] = useState(() => givens.findIndex((v) => !v));
  const [notesMode, setNotesMode] = useState(false);
  const bad = useMemo(() => conflicts(b.state.values), [b.state.values]);
  const { cell, width } = useBoardSize(9, 9, 440, 120);
  const { values, notes } = b.state;

  const counts = useMemo(() => {
    const k = Array(10).fill(0);
    values.forEach((v) => v && k[v]++);
    return k;
  }, [values]);

  const write = (i, v) => {
    if (i < 0 || givens[i]) return;
    const next = { values: values.slice(), notes: notes.slice() };
    if (notesMode && v) {
      if (next.values[i]) return;
      next.notes[i] ^= 1 << v;
    } else {
      next.values[i] = next.values[i] === v ? 0 : v;
      next.notes[i] = 0;
      if (v) {
        // Remove the placed digit from notes in the same row, column and box.
        const r = Math.floor(i / 9);
        const c = i % 9;
        for (let j = 0; j < 81; j++) {
          const r2 = Math.floor(j / 9);
          const c2 = j % 9;
          if (r2 === r || c2 === c || box(r2, c2) === box(r, c)) next.notes[j] &= ~(1 << v);
        }
        if (conflicts(next.values).has(i)) onMistake?.();
      }
    }
    b.set(next);
  };

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set(initial),
    hint() {
      const target = sel >= 0 && !givens[sel] && values[sel] !== solution[sel] ? sel : values.findIndex((v, i) => v !== solution[i]);
      if (target < 0) return false;
      const next = { values: values.slice(), notes: notes.slice() };
      next.values[target] = solution[target];
      next.notes[target] = 0;
      b.set(next);
      setSel(target);
      return { cells: [[Math.floor(target / 9), target % 9]] };
    },
  }));

  const sr = Math.floor(sel / 9);
  const sc = sel % 9;
  return (
    <div className="sudoku">
      <div className="sgrid" style={{ width, gridTemplateColumns: `repeat(9, ${cell}px)` }} role="grid" aria-label="Sudoku">
        {values.map((v, i) => {
          const r = Math.floor(i / 9);
          const c = i % 9;
          const peer = sel >= 0 && (r === sr || c === sc || box(r, c) === box(sr, sc));
          const same = sel >= 0 && v && v === values[sel];
          const cls = ['scell', givens[i] && 'given', peer && 'peer', same && 'same', i === sel && 'sel', bad.has(i) && 'bad'].filter(Boolean).join(' ');
          return (
            <button
              key={i}
              className={cls}
              style={{
                height: cell,
                fontSize: cell * 0.55,
                borderRightWidth: c % 3 === 2 && c < 8 ? 2.5 : 0.5,
                borderBottomWidth: r % 3 === 2 && r < 8 ? 2.5 : 0.5,
              }}
              onClick={() => setSel(i)}
            >
              {v ? (
                v
              ) : notes[i] ? (
                <span className="notes" style={{ fontSize: cell * 0.22 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                    <i key={d}>{notes[i] & (1 << d) ? d : ''}</i>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="numpad" style={{ width }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} className="btn" disabled={counts[d] >= 9 && !notesMode} onClick={() => write(sel, d)}>
            {d}
          </button>
        ))}
      </div>
      <div className="sudoku-actions" style={{ width }}>
        <button className={`btn${notesMode ? ' primary' : ''}`} onClick={() => setNotesMode((m) => !m)} aria-pressed={notesMode}>
          ✎ Notas {notesMode ? 'ON' : 'OFF'}
        </button>
        <button className="btn" onClick={() => write(sel, 0)}>
          ⌫ Borrar
        </button>
      </div>
    </div>
  );
});
