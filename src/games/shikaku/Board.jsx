import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useBoardState, cellAt, useBoardSize, REGION_COLORS } from '../common.js';
import { isSolved, rectStatus } from './logic.js';

const normRect = ([r1, c1], [r2, c2]) => ({ r: Math.min(r1, r2), c: Math.min(c1, c2), h: Math.abs(r1 - r2) + 1, w: Math.abs(c1 - c2) + 1 });
const overlaps = (a, b) => a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;
const contains = (q, r, c) => r >= q.r && r < q.r + q.h && c >= q.c && c < q.c + q.w;

export default forwardRef(function ShikakuBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { w, h, clues, solution } = puzzle;
  const b = useBoardState({ initial: [], saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const el = useRef(null);
  const [drag, setDrag] = useState(null);
  const { cell, width, height } = useBoardSize(w, h, 440);
  const rects = b.state;

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set([]),
    hint() {
      const missing = solution.find((q) => !rects.some((p) => p.r === q.r && p.c === q.c && p.w === q.w && p.h === q.h));
      if (!missing) return false;
      b.set([...rects.filter((p) => !overlaps(p, missing)), missing]);
      return { cells: [[missing.r, missing.c]] };
    },
  }));

  const down = (e) => {
    const p = cellAt(e, el.current, w, h);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ a: p, b: p });
  };
  const move = (e) => {
    if (!drag) return;
    const p = cellAt(e, el.current, w, h);
    if (p && (p[0] !== drag.b[0] || p[1] !== drag.b[1])) setDrag({ ...drag, b: p });
  };
  const up = () => {
    if (!drag) return;
    const q = normRect(drag.a, drag.b);
    setDrag(null);
    if (q.w * q.h === 1) {
      // A tap removes the rectangle under the finger, or places a 1×1 rectangle on a "1".
      const hit = rects.find((p) => contains(p, q.r, q.c));
      if (hit) return b.set(rects.filter((p) => p !== hit));
    }
    if (rectStatus(puzzle, q) === 'bad') onMistake?.();
    b.set([...rects.filter((p) => !overlaps(p, q)), q]);
  };

  const preview = drag && normRect(drag.a, drag.b);
  return (
    <div
      ref={el}
      className="kgrid"
      style={{ width, height }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setDrag(null)}
      role="grid"
      aria-label="Tablero shikaku"
    >
      <svg width={width} height={height}>
        {Array.from({ length: h * w }, (_, i) => (
          <rect key={i} x={(i % w) * cell} y={Math.floor(i / w) * cell} width={cell} height={cell} className="kcell" />
        ))}
        {puzzle.holes?.map(([r, c]) => (
          <rect key={`h${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} className="khole" />
        ))}
        {rects.map((q, i) => {
          const ok = rectStatus(puzzle, q) === 'ok';
          return (
            <rect
              key={`${q.r}-${q.c}-${q.w}-${q.h}`}
              x={q.c * cell + 3}
              y={q.r * cell + 3}
              width={q.w * cell - 6}
              height={q.h * cell - 6}
              rx={8}
              className={`krect${ok ? '' : ' bad'}`}
              style={{ fill: ok ? REGION_COLORS[i % REGION_COLORS.length] : undefined }}
            />
          );
        })}
        {preview && (
          <g>
            <rect x={preview.c * cell + 3} y={preview.r * cell + 3} width={preview.w * cell - 6} height={preview.h * cell - 6} rx={8} className="kpreview" />
            <text x={(preview.c + preview.w / 2) * cell} y={(preview.r + preview.h / 2) * cell} dy="0.35em" textAnchor="middle" className="ksize" fontSize={cell * 0.36}>
              {preview.w * preview.h}
            </text>
          </g>
        )}
        {clues.map((k) => (
          <text key={`${k.r}-${k.c}`} x={k.c * cell + cell / 2} y={k.r * cell + cell / 2} dy="0.36em" textAnchor="middle" className="kclue" fontSize={cell * 0.44}>
            {k.n}
          </text>
        ))}
      </svg>
    </div>
  );
});
