import { useEffect } from 'react';
import { GAMES, MODES } from '../data/games.js';
import { infiniteSeed, prefetch } from '../lib/puzzles.js';
import { useStore } from '../lib/storage.js';
import { indexOf } from '../lib/indexes.js';
import { Gear } from './Icons.jsx';
import Thumb from './Thumb.jsx';

// Highest solved infinite level per game & difficulty.
export function infiniteProgress(results, gameId, mode) {
  return indexOf(results).infMax.get(`${mode}|${gameId}`) ?? 0;
}

export default function InfiniteHome({ mode, setMode, navigate }) {
  const results = useStore((s) => s.results);
  // The next level of every game (for this difficulty) is prepared while the player chooses.
  useEffect(() => {
    const t = setTimeout(() => GAMES.forEach((g) => prefetch(infiniteSeed(mode, g.id, infiniteProgress(results, g.id, mode) + 1), g.id, mode)), 400);
    return () => clearTimeout(t);
  }, [mode, results]);
  return (
    <div className="screen with-nav">
      <header className="topbar">
        <span />
        <h1>Infinito</h1>
        <div className="right">
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>
      <p className="lead">Niveles sin fin generados al momento. Cada nivel resuelto desbloquea el siguiente.</p>
      <div className="seg-tabs" role="group" aria-label="Dificultad">
        {MODES.map((m) => (
          <button key={m.id} className={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid-cards">
        {GAMES.map((g) => {
          const done = infiniteProgress(results, g.id, mode);
          return (
            <button key={g.id} className="mini" style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => navigate(`/inf/${mode}/${g.id}/${done + 1}`)}>
              <span className="mini-thumb">
                <Thumb game={g} />
              </span>
              <h4>{g.name}</h4>
              <span className="mini-state">{done ? `${done} resueltos · nivel ${done + 1}` : 'Nivel 1'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
