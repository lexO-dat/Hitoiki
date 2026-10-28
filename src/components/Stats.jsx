import { useState } from 'react';
import { GAMES } from '../data/games.js';
import { formatTime, toKey, todayKey } from '../lib/dates.js';
import { completedOn, computeStreak, gameOfKey, MAX_RESTS, REST_EVERY, STREAK_REQUIRED, useStore } from '../lib/storage.js';
import { Back, Flame, Gear, Leaf } from './Icons.jsx';
import Thumb from './Thumb.jsx';
import Seal from './Seal.jsx';
import Enso from './Enso.jsx';
import Nav from './Nav.jsx';
import { achievements } from '../lib/achievements.js';
import { recapWeek } from '../lib/weekly.js';
import WeekCard from './WeekCard.jsx';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Stamp book: one month of days, each with its seal (complete), partial ensō, or rest leaf.
function StampBook({ s, restDays }) {
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const today = todayKey();
  const first = (month.getDay() + 6) % 7; // Monday first
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => toKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const sealed = cells.filter((d) => d && completedOn(s, d) >= STREAK_REQUIRED).length;
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const isCurrent = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  return (
    <section className="stampbook">
      <div className="stampbook-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior">
          <Back width="18" height="18" />
        </button>
        <h3>
          {MONTHS[month.getMonth()]} {month.getFullYear()}
          <small>
            {sealed} {sealed === 1 ? 'día sellado' : 'días sellados'}
          </small>
        </h3>
        <button className="icon-btn flip" onClick={() => shift(1)} disabled={isCurrent} aria-label="Mes siguiente">
          <Back width="18" height="18" />
        </button>
      </div>
      <div className="stampgrid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="wd">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const n = completedOn(s, d);
          const future = d > today;
          return (
            <span key={d} className={`stampday${d === today ? ' today' : ''}${future ? ' future' : ''}`} title={d}>
              {restDays.has(d) ? (
                <Leaf width="20" height="20" className="leaf" />
              ) : n >= STREAK_REQUIRED ? (
                <Seal kanji="済" size={30} />
              ) : n > 0 ? (
                <Enso value={n} size={26} stroke={3} />
              ) : null}
              <i>{Number(d.slice(8))}</i>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Achievements({ s }) {
  const list = achievements(s);
  const got = list.filter((a) => a.done).length;
  return (
    <>
      <h3 className="section">
        Sellos
        <small className="muted">
          {got} de {list.length}
        </small>
      </h3>
      <div className="achievements">
        {list.map((a) => (
          <div key={a.id} className={`achievement${a.done ? ' done' : ''}`}>
            <Seal kanji={a.kanji} size={46} color={a.done ? 'var(--shu)' : 'var(--ink-3)'} title={a.name} />
            <b>{a.name}</b>
            <small>{a.desc}</small>
            {!a.done && a.goal > 1 && (
              <span className="meter" aria-label={`${a.cur} de ${a.goal}`}>
                <i style={{ width: `${(a.cur / a.goal) * 100}%` }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function Stats({ navigate }) {
  const s = useStore();
  const { streak, best, rests, restDays } = computeStreak(s);
  const entries = Object.entries(s.results).map(([k, v]) => ({ game: gameOfKey(k), ...v }));
  const perfect = entries.filter((e) => !e.hints && !e.mistakes).length;
  const perGame = GAMES.map((g) => {
    const list = entries.filter((e) => e.game === g.id);
    return {
      g,
      count: list.length,
      best: list.length ? Math.min(...list.map((e) => e.time)) : null,
      avg: list.length ? list.reduce((a, e) => a + e.time, 0) / list.length : null,
    };
  }).sort((a, b) => b.count - a.count);
  const toRest = REST_EVERY - (streak % REST_EVERY);
  return (
    <div className="screen with-nav stats-screen">
      <header className="topbar">
        <span />
        <h1>Tu cuaderno</h1>
        <div className="right">
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Ajustes">
            <Gear />
          </button>
        </div>
      </header>

      <section className="streak-hero">
        <div className="flame-big">
          <Flame width="30" height="30" />
          <b className="num">{streak}</b>
          <span>{streak === 1 ? 'día de racha' : 'días de racha'}</span>
        </div>
        <div className="streak-facts">
          <p>
            <b className="num">{best}</b> mejor racha
          </p>
          <p>
            <b className="num">{entries.length}</b> puzzles resueltos
          </p>
          <p>
            <b className="num">{perfect}</b> perfectos ✦
          </p>
        </div>
      </section>
      <div className="rest-note">
        <Leaf width="18" height="18" />
        <span>
          {rests > 0 ? `Tienes ${rests} ${rests === 1 ? 'descanso guardado' : 'descansos guardados'}. ` : ''}
          {rests < MAX_RESTS
            ? `Cada ${REST_EVERY} días de racha ganas un descanso${streak > 0 ? ` (te faltan ${toRest})` : ''}: cubre un día sin jugar.`
            : 'Ya tienes el máximo de descansos.'}
        </span>
      </div>

      {(() => {
        const recap = recapWeek();
        const last = recap && recap !== todayKey();
        return <WeekCard s={s} day={recap ?? todayKey()} title={last ? 'La semana pasada' : 'Esta semana'} />;
      })()}

      <StampBook s={s} restDays={restDays} />

      <Achievements s={s} />

      <h3 className="section">Por juego</h3>
      <div className="list gamestats">
        {perGame.map(({ g, count, best, avg }) => (
          <div className="row" key={g.id} style={{ '--c': g.main, '--cbg': g.bg }}>
            <span className="gs-name">
              <span className="mini-thumb">
                <Thumb game={g} />
              </span>
              <span>
                {g.name}
                <small>
                  {count} {count === 1 ? 'resuelto' : 'resueltos'}
                </small>
              </span>
            </span>
            <span className="gs-times">
              <span>
                <small>mejor</small>
                <b className="num">{best === null ? '–' : formatTime(best)}</b>
              </span>
              <span>
                <small>media</small>
                <b className="num">{avg === null ? '–' : formatTime(avg)}</b>
              </span>
            </span>
          </div>
        ))}
      </div>
      <Nav current="/stats" navigate={navigate} />
    </div>
  );
}
