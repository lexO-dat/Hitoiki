const ITEMS = [
  ['/', 'Diario', <path key="d" d="M5 5h14v15H5zM5 9h14M9 3v4M15 3v4" />],
  ['/inf', 'Infinito', <path key="i" d="M6.5 15.5a3.5 3.5 0 1 1 0-7c3 0 8 7 11 7a3.5 3.5 0 1 0 0-7c-3 0-8 7-11 7z" />],
  ['/lvl', 'Niveles', <path key="l" d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />],
];

export default function Nav({ current, navigate }) {
  return (
    <nav className="nav" aria-label="Modos de juego">
      {ITEMS.map(([path, label, icon]) => (
        <button key={path} className={current === path ? 'on' : ''} onClick={() => navigate(path)} aria-current={current === path ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            {icon}
          </svg>
          {label}
        </button>
      ))}
    </nav>
  );
}
