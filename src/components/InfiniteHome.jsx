import { GAMES, MODES } from '../data/games.js';
import { useStore } from '../lib/storage.js';
import { Chart, Gear } from './Icons.jsx';
import Nav from './Nav.jsx';
import Thumb from './Thumb.jsx';

// Highest solved infinite level per game & difficulty.
export function infiniteProgress(results, gameId, mode) {
  let best = 0;
  const prefix = `inf|${mode}|${gameId}|`;
  for (const k of Object.keys(results)) if (k.startsWith(prefix)) best = Math.max(best, Number(k.slice(prefix.length)));
  return best;
}

export default function InfiniteHome({ mode, setMode, navigate }) {
  const results = useStore((s) => s.results);
  return (
    <div className="screen with-nav">
      <header className="topbar">
        <span />
        <h1>Infinito</h1>
        <div className="right">
          <button className="icon-btn" onClick={() => navigate('/stats')} aria-label="Estadísticas">
            <Chart />
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>
      <p className="lead">Niveles sin fin generados al momento. Cada nivel resuelto desbloquea el siguiente.</p>
      <div className="tabs" role="group" aria-label="Dificultad">
        {MODES.map((m) => (
          <button key={m.id} className={`tab ${m.id}`} aria-pressed={mode === m.id} style={{ '--tab-color': m.color }} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid-cards">
        {GAMES.map((g) => {
          const done = infiniteProgress(results, g.id, mode);
          return (
            <button key={g.id} className="mini" style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => navigate(`/inf/${mode}/${g.id}/${done + 1}`)}>
              <Thumb game={g} />
              <h4>{g.name}</h4>
              <span className="status">Nivel {done + 1}</span>
            </button>
          );
        })}
      </div>
      <Nav current="/inf" navigate={navigate} />
    </div>
  );
}
