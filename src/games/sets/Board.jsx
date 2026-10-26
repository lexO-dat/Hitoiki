import { forwardRef, useImperativeHandle, useState } from 'react';
import { useBoardState } from '../common.js';
import { isSet, setKey } from './logic.js';

const COLORS = ['#e56c72', '#3f9a5a', '#6a5acd'];

function Symbol({ shape, color, fill, x }) {
  const id = `st-${color}`;
  const fillValue = fill === 0 ? color : fill === 1 ? `url(#${id})` : 'none';
  const common = { stroke: color, strokeWidth: 3, fill: fillValue };
  const g = (child) => <g transform={`translate(${x},0)`}>{child}</g>;
  if (shape === 0) return g(<ellipse cx="0" cy="0" rx="11" ry="20" {...common} />);
  if (shape === 1) return g(<path d="M0 -21 L13 0 L0 21 L-13 0 Z" {...common} />);
  return g(<rect x="-11" y="-19" width="22" height="38" rx="3" {...common} />);
}

function Card({ card, selected, found, onClick, hinted }) {
  const [shape, color, fill, count] = card;
  const c = COLORS[color];
  const n = count + 1;
  const xs = n === 1 ? [0] : n === 2 ? [-16, 16] : [-30, 0, 30];
  return (
    <button className={`setcard${selected ? ' sel' : ''}${found ? ' found' : ''}${hinted ? ' hinted' : ''}`} onClick={onClick}>
      <svg viewBox="-50 -28 100 56" width="100%" height="100%">
        <defs>
          <pattern id={`st-${c}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="2" fill={c} />
          </pattern>
        </defs>
        {xs.map((x) => (
          <Symbol key={x} shape={shape} color={c} fill={fill} x={x} />
        ))}
      </svg>
    </button>
  );
}

export default forwardRef(function SetsBoard({ puzzle, saved, onChange, onSolved, onMistake }, ref) {
  const { cards, sets } = puzzle;
  const b = useBoardState({ initial: { found: [] }, saved, onChange, isSolved: (s) => s.found.length === sets.length, onSolved });
  const [sel, setSel] = useState([]);
  const [hinted, setHinted] = useState([]);
  const [msg, setMsg] = useState('');
  const found = b.state.found;

  useImperativeHandle(ref, () => ({
    undo: b.undo,
    clear: () => b.set({ found: [] }),
    hint() {
      const missing = sets.find((s) => !found.includes(setKey(s)));
      if (!missing) return false;
      setHinted(missing.slice(0, 2));
      setSel([]);
      return { cells: [] };
    },
  }));

  const tap = (i) => {
    setMsg('');
    const next = sel.includes(i) ? sel.filter((k) => k !== i) : [...sel, i];
    if (next.length < 3) return setSel(next);
    setSel([]);
    const [a, c, d] = next.map((k) => cards[k]);
    const key = setKey(next);
    if (!isSet(a, c, d)) {
      onMistake?.();
      return setMsg('No es un trío: cada rasgo debe ser todo igual o todo distinto.');
    }
    if (found.includes(key)) return setMsg('Ese trío ya lo encontraste.');
    setHinted([]);
    b.set({ found: [...found, key] });
  };

  const inFound = new Set(found.flatMap((k) => k.split('-').map(Number)));
  return (
    <div className="sets">
      <div className="sets-count">
        {found.length} / {sets.length} tríos
      </div>
      <div className={`setgrid cols-${cards.length > 9 ? 4 : 3}`}>
        {cards.map((card, i) => (
          <Card key={i} card={card} selected={sel.includes(i)} found={inFound.has(i)} hinted={hinted.includes(i)} onClick={() => tap(i)} />
        ))}
      </div>
      <div className="message">{msg}</div>
      <div className="sets-found">
        {found.map((k) => (
          <div className="sets-trio" key={k}>
            {k.split('-').map((i) => (
              <Card key={i} card={cards[i]} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
