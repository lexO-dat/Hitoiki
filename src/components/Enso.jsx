// Ensō (円相): the brush circle used for daily progress. One stroke per puzzle; strokes that were
// just completed draw themselves in. `children` sits in the middle.
const TAU = Math.PI * 2;

export default function Enso({ value = 0, total = 4, size = 120, stroke, color = 'var(--shu)', track = 'var(--line)', animateFrom, label, children, className = '' }) {
  const w = stroke ?? Math.max(3, size * 0.085);
  const r = size / 2 - w;
  const c = size / 2;
  const gap = total > 1 ? 0.22 : 0; // radians between strokes
  const seg = TAU / total;
  const from = animateFrom ?? value;
  const arc = (i) => {
    // Start at the top, slightly rotated like a brush entering the paper.
    const a0 = -Math.PI / 2 + 0.12 + i * seg + gap / 2;
    const a1 = a0 + seg - gap;
    const p = (a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
    return { d: `M${p(a0)} A${r} ${r} 0 ${seg - gap > Math.PI ? 1 : 0} 1 ${p(a1)}`, len: r * (seg - gap) };
  };
  return (
    <span className={`enso ${className}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.min(value, total)} de ${total}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const { d, len } = arc(i);
          const filled = i < value;
          const fresh = filled && i >= from;
          return (
            <g key={i}>
              <path d={d} stroke={track} strokeWidth={w * 0.55} fill="none" strokeLinecap="round" />
              {filled && (
                <path
                  d={d}
                  className={fresh ? 'enso-draw' : undefined}
                  style={fresh ? { '--len': len, animationDelay: `${(i - from) * 180 + 250}ms` } : undefined}
                  stroke={color}
                  strokeWidth={w * (1 - 0.12 * (i % 2))}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={fresh ? len : undefined}
                />
              )}
            </g>
          );
        })}
      </svg>
      {children !== undefined && <span className="enso-center">{children}</span>}
    </span>
  );
}
