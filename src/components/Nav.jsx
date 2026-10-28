// Bottom bar between the four sections. It is rendered once by App (never re-mounted with the
// screens), and a pill slides under the active icon.
export const TABS = ['/', '/inf', '/lvl', '/stats'];

const ITEMS = {
  '/': ['Diario', <path key="d" d="M5 5h14v15H5zM5 9h14M9 3v4M15 3v4" />],
  '/inf': ['Infinito', <path key="i" d="M6.5 15.5a3.5 3.5 0 1 1 0-7c3 0 8 7 11 7a3.5 3.5 0 1 0 0-7c-3 0-8 7-11 7z" />],
  '/lvl': ['Niveles', <path key="l" d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />],
  '/stats': ['Cuaderno', <path key="s" d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zM5 18a2 2 0 0 1 2-2h11M9 8h5" />],
};

export default function Nav({ current, navigate }) {
  const index = Math.max(0, TABS.indexOf(current));
  return (
    <nav className="nav" aria-label="Secciones" style={{ '--i': index }}>
      <span className="nav-pill" aria-hidden="true" />
      {TABS.map((path) => {
        const [label, icon] = ITEMS[path];
        const on = path === current;
        return (
          <button key={path} className={on ? 'on' : ''} onClick={() => !on && navigate(path)} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
              {icon}
            </svg>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
