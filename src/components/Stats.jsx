import { GAMES } from '../data/games.js';
import { formatTime } from '../lib/dates.js';
import { computeStreak, useStore } from '../lib/storage.js';
import { Back, Flame } from './Icons.jsx';
import Thumb from './Thumb.jsx';

export default function Stats({ navigate }) {
  const s = useStore();
  const { streak, best } = computeStreak(s);
  const entries = Object.entries(s.results).map(([k, v]) => {
    const [date, mode, game] = k.split('|');
    return { date, mode, game, ...v };
  });
  const perGame = GAMES.map((g) => {
    const list = entries.filter((e) => e.game === g.id);
    const best = list.length ? Math.min(...list.map((e) => e.time)) : null;
    const avg = list.length ? list.reduce((a, e) => a + e.time, 0) / list.length : null;
    const flawless = list.filter((e) => !e.hints && !e.mistakes).length;
    return { g, count: list.length, best, avg, flawless };
  });
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Volver">
          <Back />
        </button>
        <h1>Estadísticas</h1>
        <span />
      </header>
      <div className="statgrid">
        <div className="stat">
          <b>
            <Flame width="20" height="20" style={{ verticalAlign: -3 }} /> {streak}
          </b>
          <span>racha actual</span>
        </div>
        <div className="stat">
          <b>{best}</b>
          <span>mejor racha</span>
        </div>
        <div className="stat">
          <b>{entries.length}</b>
          <span>resueltos</span>
        </div>
      </div>
      <table className="games">
        <thead>
          <tr>
            <th>Juego</th>
            <th>Hechos</th>
            <th>Mejor</th>
            <th>Media</th>
            <th>Perfectos</th>
          </tr>
        </thead>
        <tbody>
          {perGame.map(({ g, count, best, avg, flawless }) => (
            <tr key={g.id}>
              <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Thumb game={g} className="thumb tiny" /> {g.name}
              </td>
              <td>{count}</td>
              <td>{best === null ? '–' : formatTime(best)}</td>
              <td>{avg === null ? '–' : formatTime(avg)}</td>
              <td>{flawless}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
