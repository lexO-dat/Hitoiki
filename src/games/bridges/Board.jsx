import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useBoardState, boardSize } from '../common.js';
import { crosses, degrees, edgeKey, isSolved, neighbours } from './logic.js';

export default forwardRef(function BridgesBoard({ puzzle, saved, onChange, onSolved, onMistake, color }, ref) {
  const { w, h, islands, solution } = puzzle;
  const b = useBoardState({ initial: {}, saved, onChange, isSolved: (s) => isSolved(puzzle, s), onSolved });
  const nb = useMemo(() => neighbours(puzzle), [puzzle]);
  const deg = useMemo(() => degrees(puzzle, b.state), [puzzle, b.state]);
  const [sel, setSel] = useState(-1);
  const [msg, setMsg] = useState('');
  const svg = useRef(null);
  const press = useRef(null);
  const { cell, width, height } = boardSize(w, h, 420, 0, 12);
  const links = b.state;
  const pos = (i) => [islands[i].c * cell + cell / 2, islands[i].r * cell + cell / 2];

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set({}),
    hint() {
      const keys = new Set([...Object.keys(solution), ...Object.keys(links)]);
      for (const k of keys) {
        if ((links[k] ?? 0) !== (solution[k] ?? 0)) {
          const next = { ...links, [k]: solution[k] ?? 0 };
          if (!next[k]) delete next[k];
          // Remove player lines that would cross the revealed one.
          for (const k2 of Object.keys(next)) if (k2 !== k && next[k] && crosses(puzzle, k, k2)) delete next[k2];
          b.set(next);
          return { cells: k.split('-').map((i) => [islands[i].r, islands[i].c]) };
        }
      }
      return false;
    },
  }));

  const cycle = (a, c) => {
    if (!nb[a].includes(c)) return setMsg('Sólo se puede unir en línea recta con el punto más cercano.');
    const k = edgeKey(a, c);
    const v = ((links[k] ?? 0) + 1) % 3;
    if (v && Object.keys(links).some((k2) => links[k2] && k2 !== k && crosses(puzzle, k, k2))) {
      onMistake?.();
      return setMsg('Las conexiones no pueden cruzarse.');
    }
    setMsg('');
    const next = { ...links, [k]: v };
    if (!v) delete next[k];
    b.set(next);
  };

  const islandAt = (e) => {
    const rect = svg.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    let best = -1;
    let bestD = (cell * 0.55) ** 2;
    islands.forEach((_, i) => {
      const [px, py] = pos(i);
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    if (best >= 0) return { island: best };
    // Tapping the gap between two aligned islands toggles the link between them.
    for (const [a, list] of nb.entries()) {
      for (const c of list.slice(0, 2)) {
        if (c < 0) continue;
        const [x1, y1] = pos(a);
        const [x2, y2] = pos(c);
        const horiz = y1 === y2;
        const inside = horiz
          ? Math.abs(y - y1) < cell * 0.35 && x > Math.min(x1, x2) && x < Math.max(x1, x2)
          : Math.abs(x - x1) < cell * 0.35 && y > Math.min(y1, y2) && y < Math.max(y1, y2);
        if (inside) return { gap: [a, c] };
      }
    }
    return null;
  };

  const down = (e) => {
    const hit = islandAt(e);
    press.current = hit;
    if (hit) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const up = (e) => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    const end = islandAt(e);
    if (start.gap) return cycle(...start.gap);
    if (end?.island !== undefined && end.island !== start.island) {
      setSel(-1);
      return cycle(start.island, end.island);
    }
    if (sel >= 0 && sel !== start.island) {
      setSel(-1);
      return cycle(sel, start.island);
    }
    setSel(sel === start.island ? -1 : start.island);
  };

  return (
    <div className="bridges">
      <svg ref={svg} className="bsvg" width={width} height={height} onPointerDown={down} onPointerUp={up} style={{ touchAction: 'none' }}>
        {Array.from({ length: h }, (_, r) =>
          Array.from({ length: w }, (_, c) => <circle key={`${r}-${c}`} cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={1.6} className="bdot" />),
        )}
        {Object.entries(links).map(([k, v]) => {
          const [a, c] = k.split('-').map(Number);
          const [x1, y1] = pos(a);
          const [x2, y2] = pos(c);
          const horiz = y1 === y2;
          const off = v === 2 ? cell * 0.09 : 0;
          return [0, 1].slice(0, v).map((i) => {
            const d = i ? off : -off;
            return (
              <line
                key={`${k}-${i}`}
                x1={x1 + (horiz ? 0 : d)}
                y1={y1 + (horiz ? d : 0)}
                x2={x2 + (horiz ? 0 : d)}
                y2={y2 + (horiz ? d : 0)}
                className="bline"
              />
            );
          });
        })}
        {islands.map((p, i) => {
          const [x, y] = pos(i);
          const state = deg[i] === p.n ? 'done' : deg[i] > p.n ? 'over' : '';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={cell * 0.36} className={`bisland ${state}${sel === i ? ' sel' : ''}`} style={state === 'done' ? { fill: color } : undefined} />
              <text x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={cell * 0.38} className="bnum">
                {p.n}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="message">{msg}</div>
    </div>
  );
});
