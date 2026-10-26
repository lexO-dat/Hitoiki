import { GAME_BY_ID, MODES } from '../data/games.js';
import { dailySelection, SELECTION_SIZE } from '../lib/daily.js';
import { addDays, dayNum, diffDays, formatTime, longDate, todayKey, weekDays, weekdayLong, weekdayShort } from '../lib/dates.js';
import { completedOn, computeStreak, resultKey, STREAK_REQUIRED, useStore } from '../lib/storage.js';
import { Back, Chart, Flame, Gear } from './Icons.jsx';
import Thumb from './Thumb.jsx';
import Nav from './Nav.jsx';

export default function Home({ date, mode, setDate, setMode, navigate }) {
  const s = useStore();
  const today = todayKey();
  const { streak } = computeStreak(s, today);
  const { featured, others } = dailySelection(date);
  const otherIds = date === today ? [...others, 'sudoku'] : others;
  const done = completedOn(s, date);
  const result = (id) => s.results[resultKey(date, mode, id)];
  const started = (id) => s.saves[resultKey(date, mode, id)];
  const days = weekDays(date);

  const status = (id) => {
    const r = result(id);
    if (r) return `✓ ${formatTime(r.time)}`;
    if (started(id)) return 'En curso';
    return 'Jugar';
  };

  const open = (id) => navigate(`/play/${date}/${mode}/${id}`);

  return (
    <div className="screen with-nav">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/stats')} aria-label={`Racha de ${streak} días. Ver estadísticas`}>
          <Flame width="22" height="22" /> {streak}
        </button>
        <h1>Lógica Diaria</h1>
        <div className="right">
          <button className="icon-btn" onClick={() => navigate('/stats')} aria-label="Estadísticas">
            <Chart />
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>

      <div className="weeknav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Semana anterior">
          <Back width="18" height="18" />
        </button>
        <div className="week">
          {days.map((d) => {
            const n = completedOn(s, d);
            const future = diffDays(d, today) > 0;
            const cls = ['day', d === date && 'selected', future && 'future', n >= STREAK_REQUIRED ? 'done' : n > 0 && 'partial'].filter(Boolean).join(' ');
            return (
              <button key={d} className={cls} disabled={future} onClick={() => setDate(d)} aria-label={longDate(d)} aria-current={d === date ? 'date' : undefined}>
                <span className="badge">{future ? '' : `${Math.min(n, STREAK_REQUIRED)}/${STREAK_REQUIRED}`}</span>
                <span>{weekdayShort(d)}</span>
                <span className="num">{dayNum(d)}</span>
              </button>
            );
          })}
        </div>
        <button className="icon-btn flip" onClick={() => setDate(addDays(date, 7) > today ? today : addDays(date, 7))} disabled={days[6] >= today} aria-label="Semana siguiente">
          <Back width="18" height="18" />
        </button>
      </div>

      <div className="dayhead">
        <h2>
          {date === today ? 'Hoy' : weekdayLong(date)}
          <br />
          <small>{longDate(date)}</small>
        </h2>
        <div className="progress">
          <div className="bar">
            <i style={{ width: `${(Math.min(done, STREAK_REQUIRED) / STREAK_REQUIRED) * 100}%` }} />
          </div>
          {Math.min(done, STREAK_REQUIRED)} de {STREAK_REQUIRED} puzzles para la racha
        </div>
      </div>

      <div className="tabs" role="group" aria-label="Dificultad">
        {MODES.map((m) => (
          <button key={m.id} className={`tab ${m.id}`} aria-pressed={mode === m.id} style={{ '--tab-color': m.color }} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="cards">
        {featured.slice(0, SELECTION_SIZE).map((id) => {
          const g = GAME_BY_ID[id];
          return (
            <button key={id} className={`card${result(id) ? ' solved' : ''}`} style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => open(id)}>
              <div>
                <h4>{g.name}</h4>
                <p>{g.tagline}</p>
              </div>
              <Thumb game={g} />
              <span className="status">{status(id)}</span>
            </button>
          );
        })}
      </div>

      <h3 className="section">Otros puzzles</h3>
      <div className="grid-cards">
        {otherIds.map((id) => {
          const g = GAME_BY_ID[id];
          return (
            <button key={id} className="mini" style={{ '--c': g.main, '--cbg': g.bg }} onClick={() => open(id)}>
              {g.todayOnly && <span className="tag">sólo hoy</span>}
              <Thumb game={g} />
              <h4>{g.name}</h4>
              <span className="status">{status(id)}</span>
            </button>
          );
        })}
      </div>
      <Nav current="/" navigate={navigate} />
    </div>
  );
}
