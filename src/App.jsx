import { useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import GameScreen from './components/GameScreen.jsx';
import Settings from './components/Settings.jsx';
import Stats from './components/Stats.jsx';
import InfiniteHome from './components/InfiniteHome.jsx';
import { ClassicHome, ClassicList } from './components/Classic.jsx';
import { GAME_BY_ID, MODES } from './data/games.js';
import { getPuzzle } from './lib/daily.js';
import { longDate, todayKey } from './lib/dates.js';
import { DIFFICULTY_LABEL, infinitePuzzle, loadLevels, toPuzzle } from './lib/levels.js';
import { resultKey, useStore } from './lib/storage.js';
import { useApplyTheme } from './lib/theme.js';

const parse = () => (window.location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
const modeLabel = (m) => MODES.find((x) => x.id === m)?.label ?? m;
// Classic difficulties map onto the visual mode badges.
const CLASSIC_MODE = { easy: 'standard', medium: 'standard', hard: 'hard', expert: 'expert' };

function ClassicPlay({ gameId, index, navigate }) {
  // Keep the game id with its data so a route change never renders one game's levels on another board.
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    loadLevels(gameId).then((levels) => setLoaded({ gameId, levels }), () => navigate('/lvl'));
  }, [gameId, navigate]);
  const levels = loaded?.gameId === gameId ? loaded.levels : null;
  if (!levels) return <p className="lead" style={{ padding: 24 }}>Cargando…</p>;
  const level = levels[index];
  if (!level) return null;
  const sameDiff = levels.map((l, i) => [l, i]).filter(([l]) => l.difficulty === level.difficulty);
  const pos = sameDiff.findIndex(([, i]) => i === index);
  const nextIdx = sameDiff[pos + 1]?.[1];
  return (
    <GameScreen
      key={`${gameId}|${index}`}
      game={GAME_BY_ID[gameId]}
      puzzle={toPuzzle(gameId, level)}
      storageKey={`lvl|${gameId}|${level.id}`}
      mode={CLASSIC_MODE[level.difficulty]}
      modeLabel={DIFFICULTY_LABEL[level.difficulty]}
      subtitle={`Nivel ${pos + 1}`}
      onBack={() => navigate(`/lvl/${gameId}`)}
      next={nextIdx !== undefined ? { label: 'Siguiente nivel', onClick: () => navigate(`/lvl/${gameId}/${nextIdx}`) } : undefined}
    />
  );
}

export default function App() {
  const theme = useStore((s) => s.settings.theme);
  useApplyTheme(theme);
  const [route, setRoute] = useState(parse);
  const [date, setDate] = useState(todayKey);
  const [mode, setMode] = useState('standard');

  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  const [page, ...args] = route;
  let content;
  if (page === 'play' && args.length === 3 && GAME_BY_ID[args[2]]) {
    const [d, m, g] = args;
    content = (
      <GameScreen
        key={args.join('|')}
        game={GAME_BY_ID[g]}
        puzzle={getPuzzle(d, m, g)}
        storageKey={resultKey(d, m, g)}
        mode={m}
        modeLabel={modeLabel(m)}
        subtitle={longDate(d)}
        onBack={() => navigate('/')}
        showStreak
      />
    );
  } else if (page === 'inf' && args.length === 3 && GAME_BY_ID[args[1]]) {
    const [m, g, nStr] = args;
    const n = Math.max(1, Number(nStr) || 1);
    content = (
      <GameScreen
        key={args.join('|')}
        game={GAME_BY_ID[g]}
        puzzle={infinitePuzzle(g, m, n)}
        storageKey={`inf|${m}|${g}|${n}`}
        mode={m}
        modeLabel={modeLabel(m)}
        subtitle={`Nivel ${n}`}
        onBack={() => navigate('/inf')}
        next={{ label: `Nivel ${n + 1}`, onClick: () => navigate(`/inf/${m}/${g}/${n + 1}`) }}
      />
    );
  } else if (page === 'inf') content = <InfiniteHome mode={mode} setMode={setMode} navigate={navigate} />;
  else if (page === 'lvl' && args.length === 2 && GAME_BY_ID[args[0]]) content = <ClassicPlay gameId={args[0]} index={Number(args[1])} navigate={navigate} />;
  else if (page === 'lvl' && args.length === 1 && GAME_BY_ID[args[0]]) content = <ClassicList key={args[0]} gameId={args[0]} navigate={navigate} />;
  else if (page === 'lvl') content = <ClassicHome navigate={navigate} />;
  else if (page === 'settings') content = <Settings navigate={navigate} />;
  else if (page === 'stats') content = <Stats navigate={navigate} />;
  else content = <Home date={date} mode={mode} setDate={setDate} setMode={setMode} navigate={navigate} />;

  return <div className="app">{content}</div>;
}
