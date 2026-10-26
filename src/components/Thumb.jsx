// Small hand-drawn previews for each puzzle type.
const frame = { fill: '#fff', stroke: '#303030', strokeWidth: 3 };
const line = { stroke: '#303030', strokeWidth: 2.5, fill: 'none' };

const drawings = {
  queens: (c) => (
    <>
      <rect x="4" y="4" width="32" height="32" fill="#f7c9a9" />
      <rect x="36" y="4" width="32" height="32" fill={c} />
      <rect x="4" y="36" width="64" height="32" fill="#b9dcf2" />
      <path d="M45 27h16l1-12-5 4-4-7-4 7-5-4z" fill="#303030" />
      <path d="M36 4v32M4 36h64" {...line} />
      <circle cx="20" cy="52" r="3" fill="#303030" />
    </>
  ),
  tango: (c) => (
    <>
      <path d="M36 4v64M4 36h64" {...line} />
      <circle cx="20" cy="20" r="9" fill="#f6c156" stroke="#303030" strokeWidth="2" />
      <path d="M58 44a10 10 0 1 0 4 16 8 8 0 0 1-4-16z" fill="#6fb4e6" stroke="#303030" strokeWidth="2" />
      <text x="36" y="24" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="#303030">=</text>
      <rect x="44" y="12" width="16" height="16" rx="3" fill={c} stroke="#303030" strokeWidth="2" />
    </>
  ),
  zip: (c) => (
    <>
      <path d="M18 18H54V36H18V54H54" stroke={c} strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="18" r="8" fill="#303030" />
      <circle cx="54" cy="54" r="8" fill="#303030" />
      <text x="18" y="22" textAnchor="middle" fontSize="11" fill="#fff" fontFamily="monospace">1</text>
      <text x="54" y="58" textAnchor="middle" fontSize="11" fill="#fff" fontFamily="monospace">2</text>
    </>
  ),
  shikaku: (c) => (
    <>
      <rect x="4" y="4" width="22" height="42" fill={c} />
      <rect x="26" y="4" width="42" height="42" fill="#f6c193" />
      <rect x="4" y="46" width="64" height="22" fill="#81a2d4" />
      <path d="M26 4v42M4 46h64" {...line} />
      {[['2', 15, 30], ['4', 47, 30], ['3', 36, 62]].map(([t, x, y]) => (
        <text key={t} x={x} y={y} textAnchor="middle" fontSize="14" fontFamily="monospace" fill="#303030">{t}</text>
      ))}
    </>
  ),
  pipes: (c) => (
    <>
      <path d="M36 36H4M36 36V68M36 36H68" stroke="#303030" strokeWidth="14" />
      <path d="M36 36H4M36 36V68M36 36H68" stroke={c} strokeWidth="8" />
      <rect x="26" y="26" width="20" height="20" rx="5" fill={c} stroke="#303030" strokeWidth="2.5" />
    </>
  ),
  bridges: (c) => (
    <>
      <path d="M18 15h36M18 21h36M18 18v36" {...line} />
      {[[18, 18, 3], [54, 18, 2], [18, 54, 1]].map(([x, y, n]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="10" fill={c} stroke="#303030" strokeWidth="2.5" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontFamily="monospace" fill="#303030">{n}</text>
        </g>
      ))}
      <circle cx="54" cy="54" r="10" fill="#fff" stroke="#303030" strokeWidth="2.5" />
    </>
  ),
  kami: () => (
    <>
      <rect x="4" y="4" width="32" height="32" fill="#db5856" />
      <rect x="36" y="4" width="32" height="32" fill="#6396e7" />
      <rect x="4" y="36" width="32" height="32" fill="#b376cf" />
      <rect x="36" y="36" width="32" height="32" fill="#6396e7" />
      <path d="M36 4v32M4 36h32" stroke="#303030" strokeWidth="1.5" />
    </>
  ),
  mind: () => (
    <>
      {[[22, 22, '#e56c72'], [50, 22, '#6fb4e6'], [22, 50, '#9fcc9b'], [50, 50, '#303030']].map(([x, y, f]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="9" fill={f} stroke="#303030" strokeWidth="2" />
      ))}
    </>
  ),
  lits: (c) => (
    <>
      <rect x="4" y="4" width="16" height="48" fill={c} />
      <rect x="4" y="52" width="32" height="16" fill={c} />
      <rect x="36" y="4" width="32" height="16" fill="#81a2d4" />
      <path d="M20 4v48h16v16M4 52h16M36 20h32" {...line} />
    </>
  ),
  sets: (c) => (
    <>
      <rect x="10" y="10" width="24" height="34" rx="4" fill="#fff" stroke="#303030" strokeWidth="2" />
      <rect x="38" y="28" width="24" height="34" rx="4" fill="#fff" stroke="#303030" strokeWidth="2" />
      <ellipse cx="22" cy="27" rx="5" ry="10" fill={c} stroke="#303030" strokeWidth="1.5" />
      <path d="M50 35l6 10-6 10-6-10z" fill="none" stroke="#e56c72" strokeWidth="2.5" />
    </>
  ),
  sudoku: (c) => (
    <>
      <path d="M26 4v64M46 4v64M4 26h64M4 46h64" {...line} />
      <rect x="27" y="27" width="18" height="18" fill={c} />
      {[['5', 15, 20], ['3', 57, 40], ['9', 36, 40], ['1', 15, 61]].map(([t, x, y]) => (
        <text key={t} x={x} y={y} textAnchor="middle" fontSize="13" fontFamily="monospace" fill="#303030">{t}</text>
      ))}
    </>
  ),
};

export default function Thumb({ game, className = 'thumb' }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`clip-${game.id}`}>
          <rect x="4" y="4" width="64" height="64" rx="14" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width="64" height="64" rx="14" {...frame} />
      <g clipPath={`url(#clip-${game.id})`}>{drawings[game.id]?.(game.main)}</g>
      <rect x="4" y="4" width="64" height="64" rx="14" fill="none" stroke="#303030" strokeWidth="3" />
    </svg>
  );
}
