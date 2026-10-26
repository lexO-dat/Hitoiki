import { useEffect, useMemo, useState } from 'react';
import { GAMES, GAME_BY_ID } from '../data/games.js';
import { COLLECTION_LABEL, DIFFICULTY_LABEL, loadIndex, loadLevels } from '../lib/levels.js';
import { useStore } from '../lib/storage.js';
import { Back, Chart, Gear } from './Icons.jsx';
import Nav from './Nav.jsx';
import Thumb from './Thumb.jsx';

function Missing() {
  return (
    <div className="empty-state">
      <h3>No se pudieron cargar los niveles</h3>
      <p>Revisa tu conexión e inténtalo de nuevo.</p>
    </div>
  );
}

export function ClassicHome({ navigate }) {
  const results = useStore((s) => s.results);
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    loadIndex().then(setIndex, () => setError(true));
  }, []);
  const solvedCount = (id) => Object.keys(results).filter((k) => k.startsWith(`lvl|${id}|`)).length;
  return (
    <div className="screen with-nav">
      <header className="topbar">
        <span />
        <h1>Niveles</h1>
        <div className="right">
          <button className="icon-btn" onClick={() => navigate('/stats')} aria-label="Estadísticas">
            <Chart />
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>
      {error ? (
        <Missing />
      ) : !index ? (
        <p className="lead">Cargando…</p>
      ) : (
        <>
          <p className="lead">
            {Object.values(index)
              .flatMap((d) => Object.values(d))
              .reduce((a, b) => a + b, 0)
              .toLocaleString('es')}{' '}
            niveles.
          </p>
          <div className="cards">
            {GAMES.filter((g) => index[g.id]).map((g) => {
              const total = Object.values(index[g.id]).reduce((a, b) => a + b, 0);
              const solved = solvedCount(g.id);
              return (
                <button key={g.id} className="card" style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => navigate(`/lvl/${g.id}`)}>
                  <div>
                    <h4>{g.name}</h4>
                    <p>{total.toLocaleString('es')} niveles</p>
                  </div>
                  <Thumb game={g} />
                  <span className="status">
                    {solved} / {total} resueltos
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <Nav current="/lvl" navigate={navigate} />
    </div>
  );
}

const PAGE = 120;

export function ClassicList({ gameId, navigate }) {
  const game = GAME_BY_ID[gameId];
  const results = useStore((s) => s.results);
  const [levels, setLevels] = useState(null);
  const [error, setError] = useState(false);
  const [diff, setDiff] = useState('easy');
  const [coll, setColl] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => {
    loadLevels(gameId).then(setLevels, () => setError(true));
  }, [gameId]);

  const diffs = useMemo(() => (levels ? Object.keys(DIFFICULTY_LABEL).filter((d) => levels.some((l) => l.difficulty === d)) : []), [levels]);
  const inDiff = useMemo(() => (levels ?? []).map((l, i) => ({ ...l, index: i })).filter((l) => l.difficulty === diff), [levels, diff]);
  const colls = useMemo(() => [...new Set(inDiff.map((l) => l.collection))], [inDiff]);
  const shown = coll === 'all' ? inDiff : inDiff.filter((l) => l.collection === coll);
  useEffect(() => {
    if (diffs.length && !diffs.includes(diff)) setDiff(diffs[0]);
  }, [diffs, diff]);

  return (
    <div className="screen" style={{ '--c': game.main, '--cbg': game.bg }}>
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/lvl')} aria-label="Volver">
          <Back />
        </button>
        <h1>{game.name}</h1>
        <Thumb game={game} className="thumb tiny right" />
      </header>
      {error && <Missing />}
      {!levels && !error && <p className="lead">Cargando…</p>}
      {levels && (
        <>
          <div className="chips" role="group" aria-label="Dificultad">
            {diffs.map((d) => (
              <button key={d} aria-pressed={d === diff} onClick={() => (setDiff(d), setColl('all'), setLimit(PAGE))}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          {colls.length > 1 && (
            <div className="chips small" role="group" aria-label="Colección">
              {['all', ...colls].map((c) => (
                <button key={c} aria-pressed={c === coll} onClick={() => (setColl(c), setLimit(PAGE))}>
                  {c === 'all' ? 'Todas' : COLLECTION_LABEL[c] ?? c}
                </button>
              ))}
            </div>
          )}
          <p className="lead">
            {shown.filter((l) => results[`lvl|${gameId}|${l.id}`]).length} / {shown.length} resueltos
          </p>
          <div className="levelgrid">
            {shown.slice(0, limit).map((l, k) => {
              const solved = results[`lvl|${gameId}|${l.id}`];
              return (
                <button key={l.id} className={`lvlbtn${solved ? ' solved' : ''}`} onClick={() => navigate(`/lvl/${gameId}/${l.index}`)} title={l.id}>
                  {k + 1}
                </button>
              );
            })}
          </div>
          {shown.length > limit && (
            <button className="btn wide" style={{ marginTop: 14 }} onClick={() => setLimit((n) => n + PAGE * 4)}>
              Mostrar más ({shown.length - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}
