import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useBoardState } from '../common.js';
import { score } from './logic.js';

export const PEG_COLORS = ['#e56c72', '#6fb4e6', '#9fcc9b', '#f6c156', '#b7a8e9', '#f29f78', '#5d6a7a'];

export default forwardRef(function MindBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { length, colors, attempts, code } = puzzle;
  const initial = { guesses: [], current: Array(length).fill(-1), locked: Array(length).fill(-1), failed: false };
  const isWin = (s) => s.guesses.some((g) => score(code, g).exact === length);
  const b = useBoardState({ initial, saved, onChange, isSolved: isWin, onSolved });
  const [msg, setMsg] = useState('');
  const rowsRef = useRef(null);
  const s = b.state;

  // Keep the row being played in view as the list of attempts grows.
  useEffect(() => {
    const el = rowsRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [s.guesses.length, s.failed]);

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set({ ...s, current: s.locked.slice() }),
    hint() {
      const i = s.locked.findIndex((v) => v < 0);
      if (i < 0) return false;
      const locked = s.locked.slice();
      locked[i] = code[i];
      const current = s.current.slice();
      current[i] = code[i];
      b.set({ ...s, locked, current });
      return { cells: [[0, i]] };
    },
  }));

  const put = (color) => {
    const i = s.current.findIndex((v) => v < 0);
    if (i < 0 || s.failed) return;
    const current = s.current.slice();
    current[i] = color;
    b.set({ ...s, current });
  };
  const take = (i) => {
    if (s.locked[i] >= 0 || s.current[i] < 0) return;
    const current = s.current.slice();
    current[i] = -1;
    b.set({ ...s, current });
  };
  const check = () => {
    if (s.current.some((v) => v < 0)) return setMsg('Completa todas las casillas');
    setMsg('');
    const guesses = [...s.guesses, s.current];
    const won = score(code, s.current).exact === length;
    if (!won) onMistake?.();
    const failed = !won && guesses.length >= attempts;
    b.set({ ...s, guesses, current: won ? s.current : s.locked.slice(), failed });
  };
  const retry = () => b.set({ ...initial, locked: s.locked, current: s.locked.slice() });

  const Peg = ({ c, onClick, label }) => (
    <button className={`peg${c < 0 ? ' empty' : ''}`} style={{ background: c >= 0 ? PEG_COLORS[c] : undefined }} onClick={onClick} aria-label={label} />
  );
  const rows = [...s.guesses];
  return (
    <div className="mind">
      <div className={`mind-rows${attempts > 8 ? ' dense' : ''}`} ref={rowsRef}>
        {rows.map((g, k) => {
          const { exact, near } = score(code, g);
          return (
            <div className="mind-row" key={k}>
              <span className="mind-n">{k + 1}</span>
              {g.map((c, i) => (
                <Peg key={i} c={c} label={`intento ${k + 1}`} />
              ))}
              <span
                className="mind-fb"
                style={{ gridTemplateColumns: `repeat(${Math.ceil(length / 2)}, 10px)` }}
                aria-label={`${exact} exactas, ${near} mal ubicadas`}
              >
                {Array.from({ length }, (_, i) => (
                  <i key={i} className={i < exact ? 'exact' : i < exact + near ? 'near' : ''} />
                ))}
              </span>
            </div>
          );
        })}
        {s.failed ? (
          <div className="mind-row reveal">
            <span className="mind-n">=</span>
            {code.map((c, i) => (
              <Peg key={i} c={c} label="código" />
            ))}
          </div>
        ) : (
          !isWin(s) && (
            <div className="mind-row current">
              <span className="mind-n">{rows.length + 1}</span>
              {s.current.map((c, i) => (
                <Peg key={i} c={c} onClick={() => take(i)} label={`casilla ${i + 1}`} />
              ))}
              <span className="mind-left">
                {attempts - rows.length} {attempts - rows.length === 1 ? "restante" : "restantes"}
              </span>
            </div>
          )
        )}
      </div>
      <div className="message">{s.failed ? 'Sin intentos. Este era el código.' : msg}</div>
      {s.failed ? (
        <button className="btn primary" onClick={retry}>
          Reintentar
        </button>
      ) : (
        <>
          <div className="palette">
            {Array.from({ length: colors }, (_, c) => (
              <Peg key={c} c={c} onClick={() => put(c)} label={`color ${c + 1}`} />
            ))}
          </div>
          <button className="btn primary" onClick={check} disabled={isWin(s)}>
            Comprobar
          </button>
        </>
      )}
    </div>
  );
});
