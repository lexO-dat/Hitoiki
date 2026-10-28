import { useMemo } from 'react';

// Brand colors; most bits are sakura petals.
const PALETTE = ['#d895ac', '#f2c4d0', '#e8975f', '#e2b844', '#94b46f', '#6ea7cf', '#9486d1'];

// Soft confetti burst and glow shown over the board when a puzzle is solved.
export default function Celebration({ color }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => {
        const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 150;
        return {
          '--dx': `${Math.cos(angle) * dist}px`,
          '--dy': `${Math.sin(angle) * dist - 40}px`,
          '--rot': `${Math.round(Math.random() * 540 - 270)}deg`,
          '--delay': `${Math.round(Math.random() * 160)}ms`,
          background: i % 3 === 0 ? color : PALETTE[i % PALETTE.length],
          width: 7 + (i % 3) * 3,
          height: i % 5 === 0 ? 4 : 7 + (i % 3) * 3,
          borderRadius: i % 5 === 0 ? 2 : '70% 0 70% 0',
        };
      }),
    [color],
  );
  return (
    <div className="celebration" aria-live="polite">
      <div className="glow" style={{ '--c': color }} />
      {bits.map((style, i) => (
        <i key={i} className="bit" style={style} />
      ))}
      <div className="solved-badge">
        <span aria-hidden="true">済</span>¡Resuelto!
      </div>
    </div>
  );
}
