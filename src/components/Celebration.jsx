import { useMemo } from 'react';

const PALETTE = ['#f6c156', '#9fcc9b', '#81a2d4', '#f29f78', '#b7a8e9', '#f4b8c8'];

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
          width: 6 + (i % 3) * 3,
          height: i % 2 ? 6 + (i % 3) * 3 : 4,
          borderRadius: i % 4 === 0 ? '50%' : 2,
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
      <div className="solved-badge">¡Resuelto!</div>
    </div>
  );
}
