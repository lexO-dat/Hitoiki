// Hanko (判子): the vermilion seal stamped on solved puzzles. Rough ink edges come from an SVG
// turbulence filter so every seal looks hand-pressed.
import { useId } from 'react';

export default function Seal({ kanji = '済', size = 40, stamp = false, color = 'var(--shu)', round = false, className = '', title }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`seal${stamp ? ' stamp' : ''} ${className}`} style={{ width: size, height: size }} role="img" aria-label={title ?? 'Resuelto'}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <filter id={`ink${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={kanji.charCodeAt(0) % 97} />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
        </defs>
        <g filter={`url(#ink${id})`} fill={color} stroke={color}>
          {round ? (
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" />
          ) : (
            <rect x="9" y="9" width="82" height="82" rx="14" fill="none" strokeWidth="7" />
          )}
          <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="56" fontFamily="'Shippori Mincho', serif" fontWeight="700" stroke="none">
            {kanji}
          </text>
        </g>
      </svg>
    </span>
  );
}
