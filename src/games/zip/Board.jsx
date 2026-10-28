import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useBoardState, useBoardSize } from '../common.js';
import { adjacent, isSolved } from './logic.js';
import { sfx } from '../../lib/sound.js';

export default forwardRef(function ZipBoard({ puzzle, saved, onChange, onSolved, onMistake, color }, ref) {
  const { w, h, numbers, solution } = puzzle;
  const b = useBoardState({ initial: [], saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const el = useRef(null);
  const drawing = useRef(false);
  const { cell, width, height } = useBoardSize(w, h, 420);
  const path = b.state;
  const key = (p) => p.join(',');
  const same = (a, z) => a[0] === z[0] && a[1] === z[1];

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

  // Pointer position in fractional cell units.
  // The board's position is measured once per stroke (not on every move: that forces a layout each time).
  const rectRef = useRef(null);
  const locate = (e) => {
    const rect = rectRef.current ?? el.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * w, y: ((e.clientY - rect.top) / rect.height) * h };
  };
  const cellOf = ({ x, y }) => {
    const r = Math.floor(y);
    const c = Math.floor(x);
    return r < 0 || c < 0 || r >= h || c >= w ? null : [r, c];
  };

  // One orthogonal step; returns false when the move is not allowed.
  const step = (p) => {
    const cur = b.get();
    const i = cur.findIndex((q) => same(q, p));
    if (i >= 0) {
      // Moving back over the line rewinds it to that cell.
      if (i < cur.length - 1) {
        b.replace(cur.slice(0, i + 1));
        sfx.rewind(i + 1, w * h);
      }
      return true;
    }
    const last = cur[cur.length - 1];
    if (!last || !adjacent(last, p)) return false;
    const n = numbers[p[0]][p[1]];
    if (n && n !== reached(cur) + 1) {
      onMistake?.();
      return false;
    }
    b.replace([...cur, p]);
    sfx.step(cur.length + 1, w * h);
    return true;
  };

  // Try to make `target` the new head. Handles neighbours, diagonal corner-cuts and longer jumps.
  const reach = (target) => {
    const cur = b.get();
    const last = cur[cur.length - 1];
    if (!last || same(last, target)) return;
    if (cur.some((q) => same(q, target)) || adjacent(last, target)) return void step(target);
    const dr = target[0] - last[0];
    const dc = target[1] - last[1];
    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
      // Finger cut a corner: go through whichever of the two corner cells is still free.
      const prev = cur[cur.length - 2];
      const vertical = prev ? last[0] !== prev[0] : false;
      // Prefer continuing in the current direction, then turning.
      const corners = vertical ? [[last[0] + dr, last[1]], [last[0], last[1] + dc]] : [[last[0], last[1] + dc], [last[0] + dr, last[1]]];
      const free = corners.filter((m) => !cur.some((q) => same(q, m)) && (!numbers[m[0]][m[1]] || numbers[m[0]][m[1]] === reached(cur) + 1));
      for (const m of free) {
        if (step(m)) return void step(target);
      }
      return;
    }
    // Longer jump: walk one cell at a time along the larger gap first.
    for (let guard = 0; guard < w + h; guard++) {
      const now = b.get();
      const head = now[now.length - 1];
      if (same(head, target)) return;
      const r = target[0] - head[0];
      const c = target[1] - head[1];
      const next = Math.abs(r) >= Math.abs(c) ? [head[0] + Math.sign(r), head[1]] : [head[0], head[1] + Math.sign(c)];
      if (!step(next)) return;
    }
  };

  // Follow the finger between two pointer events in quarter-cell samples, so fast swipes keep their shape.
  const lastPos = useRef(null);
  const trace = (pos) => {
    const from = lastPos.current ?? pos;
    lastPos.current = pos;
    const dist = Math.hypot(pos.x - from.x, pos.y - from.y);
    const n = Math.max(1, Math.ceil(dist / 0.25));
    for (let k = 1; k <= n; k++) {
      const s2 = { x: from.x + ((pos.x - from.x) * k) / n, y: from.y + ((pos.y - from.y) * k) / n };
      const p = cellOf(s2);
      if (!p) continue;
      // Ignore jitter near cell borders: only react once the sample is well inside a cell.
      const fx = s2.x - p[1];
      const fy = s2.y - p[0];
      if (fx < 0.15 || fx > 0.85 || fy < 0.15 || fy > 0.85) continue;
      reach(p);
    }
  };

  // Live tail: from the head of the line towards the finger (one row or column, at most one cell),
  // drawn straight on the SVG so the line follows the finger without re-rendering the board.
  const tail = useRef(null);
  const drawTail = (pos) => {
    const t = tail.current;
    const cur = b.get();
    const head = cur[cur.length - 1];
    if (!t) return;
    if (!pos || !head) return t.setAttribute('visibility', 'hidden');
    const hx = head[1] + 0.5;
    const hy = head[0] + 0.5;
    let dx = pos.x - hx;
    let dy = pos.y - hy;
    if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
    else dx = 0;
    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));
    // Towards a wall or a cell already used (other than the previous one): just a small nudge.
    const next = [head[0] + Math.sign(dy), head[1] + Math.sign(dx)];
    const prev = cur[cur.length - 2];
    const blocked = !cellOf({ x: next[1] + 0.5, y: next[0] + 0.5 }) || (cur.some((q) => same(q, next)) && !(prev && same(prev, next)));
    const k = blocked ? Math.min(1, 0.3 / Math.max(Math.abs(dx), Math.abs(dy), 0.01)) : 1;
    t.setAttribute('x1', hx * cell);
    t.setAttribute('y1', hy * cell);
    t.setAttribute('x2', (hx + dx * k) * cell);
    t.setAttribute('y2', (hy + dy * k) * cell);
    t.setAttribute('visibility', Math.hypot(dx, dy) < 0.12 ? 'hidden' : 'visible');
  };

  const down = (e) => {
    rectRef.current = el.current.getBoundingClientRect();
    const pos = locate(e);
    const p = cellOf(pos);
    if (!p) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    b.begin();
    drawing.current = true;
    lastPos.current = pos;
    const cur = b.get();
    const i = cur.findIndex((q) => same(q, p));
    if (i >= 0) b.replace(cur.slice(0, i + 1));
    else if (numbers[p[0]][p[1]] === 1) b.replace([p]);
    else if (cur.length && adjacent(cur[cur.length - 1], p)) step(p);
    else {
      drawing.current = false;
      b.end();
    }
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    // Coalesced events carry the intermediate touch samples the browser batched together.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e]) trace(locate(ev));
    drawTail(locate(e));
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    rectRef.current = null;
    drawTail(null);
    b.end();
  };

  // The grid cells never change while drawing: built once, so each step only updates the line.
  const cells = useMemo(() => numbers.map((row, r) => row.map((_, c) => <div key={`${r}-${c}`} className="zcell" style={{ height: cell }} />)), [numbers, cell]);
  const pts = path.map(([r, c]) => `${c * cell + cell / 2},${r * cell + cell / 2}`).join(' ');
  const head = path[path.length - 1];
  return (
    <div
      ref={el}
      className="zgrid"
      style={{ width, height, gridTemplateColumns: `repeat(${w}, ${cell}px)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      role="grid"
      aria-label="Tablero de ruta"
    >
      {cells}
      <svg className="zsvg" width={width} height={height}>
        {path.length > 1 && (
          <polyline points={pts} fill="none" stroke={color} strokeWidth={cell * 0.42} strokeLinecap="round" strokeLinejoin="round" />
        )}
        <line ref={tail} stroke={color} strokeWidth={cell * 0.42} strokeLinecap="round" visibility="hidden" />
        {head && <circle cx={head[1] * cell + cell / 2} cy={head[0] * cell + cell / 2} r={cell * 0.24} fill={color} className="zhead" />}
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
