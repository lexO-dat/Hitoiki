const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const icon = (path) =>
  function Icon(props) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
        {path}
      </svg>
    );
  };

export const Back = icon(<path {...S} d="M15 5l-7 7 7 7" />);
export const Close = icon(<path {...S} d="M6 6l12 12M18 6L6 18" />);
export const Gear = icon(
  <g {...S}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" />
  </g>,
);
export const Help = icon(
  <g {...S}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9M12 16.6h.01" />
  </g>,
);
export const Undo = icon(<path {...S} d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />);
export const Eraser = icon(
  <g {...S}>
    <path d="M7 20h11M4.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H8z" />
    <path d="M9.5 10.5l5 5" />
  </g>,
);
export const Bulb = icon(
  <g {...S}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  </g>,
);
export const Chart = icon(<path {...S} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />);
export const Play = icon(<path {...S} d="M8 5.5v13l10-6.5z" />);
export const Check = icon(<path {...S} d="M5 12.5l4.5 4.5L19 7.5" />);

export function Flame(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.5c.6 3-1.8 4.6-3.3 6.6A6.7 6.7 0 0 0 12 21.5a6.6 6.6 0 0 0 6.7-6.6c0-2.3-1-4.3-2.4-5.6-.2 1.6-1 2.6-2 3 .6-3.3-.5-7.4-2.3-9.8z" fill="var(--streak)" stroke="var(--stroke)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function Crown(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M3.5 18.5h17l1-11-5.5 4.3L12 4.5l-4 7.3-5.5-4.3z" fill="#303030" stroke="#303030" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Sun(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tsun" {...props}>
      <circle cx="12" cy="12" r="8" fill="#f6c156" stroke="#303030" strokeWidth="1.6" />
    </svg>
  );
}

export function Moon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tmoon" {...props}>
      <path d="M15.5 3.5a8.8 8.8 0 1 0 5 13.9A7.3 7.3 0 0 1 15.5 3.5z" fill="#6fb4e6" stroke="#303030" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
export const Leaf = icon(
  <g {...S}>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
    <path d="M5 19l8-8" />
  </g>,
);
export const Share = icon(
  <g {...S}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6h14v-6" />
  </g>,
);
export const Arrow = icon(<path {...S} d="M5 12h14M13 6l6 6-6 6" />);
export const Loop = icon(<path {...S} d="M6.5 15.5a3.5 3.5 0 1 1 0-7c3 0 8 7 11 7a3.5 3.5 0 1 0 0-7c-3 0-8 7-11 7z" />);
export const Lock = icon(
  <g {...S}>
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </g>,
);
