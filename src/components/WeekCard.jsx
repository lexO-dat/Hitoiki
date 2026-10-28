import { GAME_BY_ID } from '../data/games.js';
import { formatTime, weekdayShort } from '../lib/dates.js';
import { STREAK_REQUIRED } from '../lib/storage.js';
import { weekComparison } from '../lib/weekly.js';
import Enso from './Enso.jsx';
import Seal from './Seal.jsx';

const diff = (n, word) => (n > 0 ? `${n} ${word} más que la semana anterior` : n < 0 ? `${-n} ${word} menos que la semana anterior` : `igual que la semana anterior`);

// The week at a glance: one seal or ensō per day and what happened, compared with the week before.
export default function WeekCard({ s, day, title }) {
  const w = weekComparison(s, day);
  const fav = w.favorite && GAME_BY_ID[w.favorite];
  return (
    <section className="weekcard">
      <h3>
        {title}
        <small>
          {w.sealed} de 7 días sellados · {diff(w.sealed - w.prev.sealed, w.sealed - w.prev.sealed === 1 || w.sealed - w.prev.sealed === -1 ? 'día' : 'días')}
        </small>
      </h3>
      <div className="weekcard-days">
        {w.days.map((d) => (
          <span key={d.date}>
            {d.n >= STREAK_REQUIRED ? <Seal kanji="済" size={30} /> : <Enso value={d.n} size={28} stroke={3} />}
            <small>{weekdayShort(d.date)}</small>
          </span>
        ))}
      </div>
      <div className="weekcard-facts">
        <p>
          <b className="num">{w.solved}</b> puzzles
        </p>
        <p>
          <b className="num">{w.perfect}</b> perfectos
        </p>
        <p>
          <b className="num">{w.records}</b> {w.records === 1 ? 'récord' : 'récords'}
        </p>
      </div>
      {(fav || w.fastest) && (
        <p className="weekcard-note">
          {fav && (
            <>
              Tu juego de la semana: <b>{fav.name}</b>.{' '}
            </>
          )}
          {w.fastest && (
            <>
              Más rápido: {GAME_BY_ID[w.fastest.game].name} en <b className="num">{formatTime(w.fastest.time)}</b>.
            </>
          )}
        </p>
      )}
    </section>
  );
}
