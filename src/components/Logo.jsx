// "Pausa" mark: a rounded puzzle tile split in four pastel quadrants, a crescent and a small spark.
export function LogoMark({ size = 32, ...props }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" {...props}>
      <defs>
        <clipPath id="pausa-clip">
          <rect x="4" y="4" width="56" height="56" rx="15" />
        </clipPath>
      </defs>
      <g clipPath="url(#pausa-clip)">
        <rect x="4" y="4" width="28" height="28" fill="#f4b8c8" />
        <rect x="32" y="4" width="28" height="28" fill="#cfc4f4" />
        <rect x="4" y="32" width="28" height="28" fill="#bfe0a6" />
        <rect x="32" y="32" width="28" height="28" fill="#f6d983" />
      </g>
      <path d="M32 4v56M4 32h56" stroke="#303030" strokeWidth="3" />
      <path d="M49.5 11.5a8 8 0 1 0 3.6 12.6 6.4 6.4 0 0 1-3.6-12.6z" fill="#303030" />
      <path d="M18 39.5l1.6 4.1 4.1 1.6-4.1 1.6L18 50.9l-1.6-4.1-4.1-1.6 4.1-1.6z" fill="#303030" />
      <circle cx="18" cy="18" r="4.2" fill="#303030" />
      <rect x="42" y="42" width="8" height="8" rx="2" fill="#303030" />
      <rect x="4" y="4" width="56" height="56" rx="15" fill="none" stroke="#303030" strokeWidth="3.5" />
    </svg>
  );
}

export default function Logo({ size = 30 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">Pausa</span>
    </span>
  );
}
