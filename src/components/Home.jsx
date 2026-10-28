import { GAME_BY_ID, MODES } from '../data/games.js';
import { dailySelection, nextDaily, SELECTION_SIZE } from '../lib/daily.js';
import { addDays, dayNum, diffDays, formatTime, longDate, weekDays, weekdayLong, weekdayShort } from '../lib/dates.js';
import { completedOn, computeStreak, resultKey, STREAK_REQUIRED, useStore } from '../lib/storage.js';
import { Arrow, Back, Flame, Gear, Leaf } from './Icons.jsx';
import Thumb from './Thumb.jsx';
import Nav from './Nav.jsx';
import Logo from './Logo.jsx';
import Enso from './Enso.jsx';
import Seal from './Seal.jsx';

// What the day looks like, in a warm voice: one clear next step, and how close the streak is.
function headline({ done, streak, rests, past }) {
  const left = STREAK_REQUIRED - done;
  if (past) return done >= STREAK_REQUIRED ? ['Día completo', 'Sellaste este día en tu racha.'] : ['Historial', 'Así quedó este día.'];
  if (done >= STREAK_REQUIRED)
    return ['Día completo', `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}. Si te quedan ganas, hay más puzzles abajo.`];
  if (done === 0)
    return streak > 0
      ? ['Tu respiro de hoy', `${STREAK_REQUIRED} puzzles mantienen tu racha de ${streak} ${streak === 1 ? 'día' : 'días'}.${rests ? ` Tienes ${rests} ${rests === 1 ? 'descanso guardado' : 'descansos guardados'}.` : ''}`]
      : ['Tu respiro de hoy', `Resuelve ${STREAK_REQUIRED} puzzles para empezar una racha.`];
  return [left === 1 ? '¡Falta uno!' : `Te faltan ${left}`, `para sumar hoy a tu racha${streak ? ` de ${streak} ${streak === 1 ? 'día' : 'días'}` : ''}.`];
}

export default function Home({ date, today, mode, setDate, setMode, navigate }) {
  const s = useStore();
  // Daily puzzles can only be played on their own day; earlier days only show what was solved.
  const past = date !== today;
  const { streak, rests, restDays } = computeStreak(s, today);
  const { featured, others } = dailySelection(date);
  const otherIds = date === today ? [...others, 'sudoku'] : others;
  const done = completedOn(s, date);
  const result = (id) => s.results[resultKey(date, mode, id)];
  const started = (id) => s.saves[resultKey(date, mode, id)];
  const days = weekDays(date);
  const next = past ? null : nextDaily(s, date, mode);
  const [title, sub] = headline({ done, streak, rests, past });

  const open = (id) => !past && navigate(`/play/${date}/${mode}/${id}`);
  const state = (id) => {
    const r = result(id);
    if (r)
      return (
        <span className="state solved">
          <Seal kanji={GAME_BY_ID[id].kanji} size={30} title={`Resuelto en ${formatTime(r.time)}`} />
          {formatTime(r.time)}
        </span>
      );
    if (past) return <span className="state">No jugado</span>;
    if (started(id)) return <span className="state going">En curso · {formatTime(started(id).meta?.time ?? 0)}</span>;
    return (
      <span className="state play">
        Jugar <Arrow width="15" height="15" />
      </span>
    );
  };

  return (
    <div className="screen with-nav home">
      <header className="topbar home-bar">
        <Logo size={30} />
        <div className="right">
          <button className={`streak-chip${done >= STREAK_REQUIRED && !past ? ' lit' : ''}`} onClick={() => navigate('/stats')} aria-label={`Racha de ${streak} días. Ver estadísticas`}>
            <Flame width="18" height="18" />
            <b>{streak}</b>
            {rests > 0 && (
              <span className="rests" aria-label={`${rests} descansos`}>
                <Leaf width="13" height="13" />
                {rests > 1 && rests}
              </span>
            )}
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>

      <section className="hero" aria-live="polite">
        <Enso value={Math.min(done, STREAK_REQUIRED)} size={104} label={`${Math.min(done, STREAK_REQUIRED)} de ${STREAK_REQUIRED} puzzles`}>
          {done >= STREAK_REQUIRED ? (
            <Seal kanji="済" size={46} stamp />
          ) : (
            <>
              <b>{done}</b>
              <small>de {STREAK_REQUIRED}</small>
            </>
          )}
        </Enso>
        <div className="hero-text">
          <p className="eyebrow">
            {past ? weekdayLong(date) : 'Hoy'} · {longDate(date)}
          </p>
          <h2>{title}</h2>
          <p className="hero-sub">{sub}</p>
        </div>
        {next ? (
          <button className="btn primary wide cta" onClick={() => open(next)} style={{ '--c': GAME_BY_ID[next].main }}>
            <span className="cta-dot" aria-hidden="true" />
            {started(next) ? 'Seguir con' : done ? 'Siguiente:' : 'Empezar con'} {GAME_BY_ID[next].name}
            <Arrow width="18" height="18" />
          </button>
        ) : (
          !past && (
            <button className="btn wide cta" onClick={() => navigate('/inf')}>
              Todo resuelto · seguir en Infinito <Arrow width="18" height="18" />
            </button>
          )
        )}
        {past && (
          <button className="btn wide cta" onClick={() => setDate(today)}>
            Volver a hoy <Arrow width="18" height="18" />
          </button>
        )}
      </section>

      <div className="weeknav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Semana anterior">
          <Back width="18" height="18" />
        </button>
        <div className="week">
          {days.map((d) => {
            const n = completedOn(s, d);
            const future = diffDays(d, today) > 0;
            const rest = restDays.has(d);
            const cls = ['day', d === date && 'selected', d === today && 'today', future && 'future'].filter(Boolean).join(' ');
            return (
              <button key={d} className={cls} disabled={future} onClick={() => setDate(d)} aria-label={`${longDate(d)}${rest ? ', día de descanso' : ''}`} aria-current={d === date ? 'date' : undefined}>
                <span className="wd">{weekdayShort(d)}</span>
                <span className="mini-enso">
                  {rest ? (
                    <Leaf width="18" height="18" className="leaf" />
                  ) : n >= STREAK_REQUIRED ? (
                    <Seal kanji="済" size={30} />
                  ) : (
                    <Enso value={Math.min(n, STREAK_REQUIRED)} size={30} stroke={3.4} />
                  )}
                </span>
                <span className="num">{dayNum(d)}</span>
              </button>
            );
          })}
        </div>
        <button className="icon-btn flip" onClick={() => setDate(addDays(date, 7) > today ? today : addDays(date, 7))} disabled={days[6] >= today} aria-label="Semana siguiente">
          <Back width="18" height="18" />
        </button>
      </div>

      <div className="seg-tabs" role="group" aria-label="Dificultad">
        {MODES.map((m) => (
          <button key={m.id} className={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {past && <p className="closed-note">Los puzzles de este día ya cerraron: solo se podían jugar ese día.</p>}

      <h3 className="section">{past ? 'Puzzles del día' : 'Destacados de hoy'}</h3>
      <div className="cards">
        {featured.slice(0, SELECTION_SIZE).map((id) => {
          const g = GAME_BY_ID[id];
          return (
            <button key={id} className={`card${result(id) ? ' solved' : ''}${past ? ' locked' : ''}`} style={{ '--c': g.main, '--cbg': g.bg }} disabled={past} onClick={() => open(id)}>
              <span className="card-kanji" aria-hidden="true">
                {g.kanji}
              </span>
              <span className="card-thumb">
                <Thumb game={g} />
              </span>
              <span className="card-body">
                <h4>{g.name}</h4>
                <p>{g.tagline}</p>
              </span>
              {state(id)}
            </button>
          );
        })}
      </div>

      <h3 className="section">Más puzzles</h3>
      <div className="grid-cards">
        {otherIds.map((id) => {
          const g = GAME_BY_ID[id];
          const r = result(id);
          return (
            <button key={id} className={`mini${r ? ' solved' : ''}${past ? ' locked' : ''}`} style={{ '--c': g.main, '--cbg': g.bg }} disabled={past} onClick={() => open(id)}>
              {g.todayOnly && <span className="tag">sólo hoy</span>}
              {r && <Seal kanji={g.kanji} size={26} className="corner" />}
              <span className="mini-thumb">
                <Thumb game={g} />
              </span>
              <h4>{g.name}</h4>
              <span className="mini-state">{r ? formatTime(r.time) : past ? 'No jugado' : started(id) ? 'En curso' : 'Jugar'}</span>
            </button>
          );
        })}
      </div>
      <Nav current="/" navigate={navigate} />
    </div>
  );
}
