import { useEffect, useMemo, useState } from 'react';
import { GAMES, GAME_BY_ID } from '../data/games.js';
import { COLLECTION_LABEL, DIFFICULTY_LABEL, loadIndex, loadLevels } from '../lib/levels.js';
import { store, useStore } from '../lib/storage.js';
import { levelKey, progression } from '../lib/progress.js';
import Seal from './Seal.jsx';
import { Arrow, Back, Gear, Lock } from './Icons.jsx';
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
  const last = useStore((s) => s.levelsUi?.last);
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
          {last && GAME_BY_ID[last.game] && (
            <button className="btn primary wide continue-level" onClick={() => navigate(`/lvl/${last.game}`)}>
              <span>
                Continuar con {GAME_BY_ID[last.game].name}
                <small>{DIFFICULTY_LABEL[last.difficulty]}</small>
              </span>
              <Arrow width="18" height="18" />
            </button>
          )}
          <div className="cards">
            {GAMES.filter((g) => index[g.id]).map((g) => {
              const total = Object.values(index[g.id]).reduce((a, b) => a + b, 0);
              const solved = solvedCount(g.id);
              return (
                <button key={g.id} className="card" style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => navigate(`/lvl/${g.id}`)}>
                  <span className="card-kanji" aria-hidden="true">
                    {g.kanji}
                  </span>
                  <span className="card-thumb">
                    <Thumb game={g} />
                  </span>
                  <span className="card-body">
                    <h4>{g.name}</h4>
                    <p>{total.toLocaleString('es')} niveles</p>
                    <span className="meter" aria-label={`${solved} de ${total} resueltos`}>
                      <i style={{ width: `${Math.max(solved ? 2 : 0, (solved / total) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="state">
                    {solved}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const PAGE = 120;

// Remembered per game: the difficulty last browsed, and the last level opened (for "Continuar").
export const rememberLevel = (patch) => store.update((s) => ({ ...s, levelsUi: { ...(s.levelsUi ?? {}), ...patch(s.levelsUi ?? {}) } }));

export function ClassicList({ gameId, navigate }) {
  const game = GAME_BY_ID[gameId];
  const results = useStore((s) => s.results);
  const [levels, setLevels] = useState(null);
  const [error, setError] = useState(false);
  const [diff, setDiffState] = useState(() => store.get().levelsUi?.diff?.[gameId] ?? 'easy');
  const [coll, setColl] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => {
    loadLevels(gameId).then(setLevels, () => setError(true));
  }, [gameId]);
  const setDiff = (d) => {
    setDiffState(d);
    rememberLevel((u) => ({ diff: { ...(u.diff ?? {}), [gameId]: d } }));
  };

  const diffs = useMemo(() => (levels ? Object.keys(DIFFICULTY_LABEL).filter((d) => levels.some((l) => l.difficulty === d)) : []), [levels]);
  const prog = useMemo(() => (levels ? progression(levels, results, gameId, diff) : null), [levels, results, gameId, diff]);
  const inDiff = useMemo(() => (prog ? prog.order.map((index, pos) => ({ ...levels[index], index, pos })) : []), [prog, levels]);
  const colls = useMemo(() => [...new Set(inDiff.map((l) => l.collection))], [inDiff]);
  const shown = coll === 'all' ? inDiff : inDiff.filter((l) => l.collection === coll);
  useEffect(() => {
    if (diffs.length && !diffs.includes(diff)) setDiffState(diffs[0]);
  }, [diffs, diff]);
  const nextLevel = prog && prog.next !== null ? inDiff[prog.next] : null;

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

          {nextLevel ? (
            <button className="btn primary wide continue-level" onClick={() => navigate(`/lvl/${gameId}/${nextLevel.index}`)}>
              <span>
                {prog.solved ? 'Continuar' : 'Empezar'}
                <small>
                  {DIFFICULTY_LABEL[diff]} · {prog.solved} de {prog.total} resueltos
                </small>
              </span>
              <b>Nivel {nextLevel.pos + 1}</b>
              <Arrow width="18" height="18" />
            </button>
          ) : (
            prog && (
              <div className="continue-level done">
                <Seal kanji={game.kanji} size={40} />
                <span>
                  ¡Completaste {DIFFICULTY_LABEL[diff]}!<small>Los {prog.total} niveles resueltos.</small>
                </span>
              </div>
            )
          )}

          {colls.length > 1 && (
            <div className="chips small" role="group" aria-label="Colección">
              {['all', ...colls].map((c) => (
                <button key={c} aria-pressed={c === coll} onClick={() => (setColl(c), setLimit(PAGE))}>
                  {c === 'all' ? 'Todas' : COLLECTION_LABEL[c] ?? c}
                </button>
              ))}
            </div>
          )}
          <div className="levelgrid">
            {shown.slice(0, limit).map((l) => {
              const solved = results[levelKey(gameId, l)];
              const open = prog.isOpen(l.pos);
              const current = l.pos === prog.next;
              return (
                <button
                  key={l.id}
                  className={`lvlbtn${solved ? ' solved' : ''}${current ? ' current' : ''}${open ? '' : ' locked'}`}
                  disabled={!open}
                  onClick={() => navigate(`/lvl/${gameId}/${l.index}`)}
                  aria-label={`Nivel ${l.pos + 1}${solved ? ', resuelto' : open ? '' : ', bloqueado'}`}
                >
                  {open ? l.pos + 1 : <Lock width="14" height="14" />}
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
