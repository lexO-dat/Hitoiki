import { useEffect, useState } from 'react';
import Home from './components/Home.jsx';
import GameScreen from './components/GameScreen.jsx';
import Settings from './components/Settings.jsx';
import Stats from './components/Stats.jsx';
import InfiniteHome from './components/InfiniteHome.jsx';
import { ClassicHome, ClassicList } from './components/Classic.jsx';
import { GAME_BY_ID, MODES } from './data/games.js';
import { getPuzzle, nextDaily } from './lib/daily.js';
import { formatTime, longDate } from './lib/dates.js';
import { useToday } from './lib/useToday.js';
import { DIFFICULTY_LABEL, infinitePuzzle, loadLevels, toPuzzle } from './lib/levels.js';
import { resultKey, store, useStore } from './lib/storage.js';
import { useApplyTheme } from './lib/theme.js';
import { sfx } from './lib/sound.js';
import { syncReminders } from './lib/notify.js';
import { markAppReady } from './lib/updates.js';
import { Capacitor } from '@capacitor/core';

const parse = () => (window.location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
const modeLabel = (m) => MODES.find((x) => x.id === m)?.label ?? m;
// Classic difficulties map onto the visual mode badges.
const CLASSIC_MODE = { easy: 'standard', medium: 'standard', hard: 'hard', expert: 'expert' };

// A daily puzzle opened after its day (old link, or the app left open past midnight).
function DailyClosed({ date, mode, game, onToday, navigate }) {
  const result = store.get().results[resultKey(date, mode, game.id)];
  return (
    <div className="screen closed" style={{ '--c': game.main, '--cbg': game.bg }}>
      <h1>Este puzzle ya cerró</h1>
      <p className="lead">
        Los puzzles diarios solo se pueden jugar el mismo día. {game.name} del {longDate(date)}{' '}
        {result ? `lo resolviste en ${formatTime(result.time)}.` : 'quedó sin jugar.'}
      </p>
      <div className="closed-actions">
        <button className="btn primary" onClick={onToday}>
          Puzzles de hoy
        </button>
        <button className="btn" onClick={() => navigate('/inf')}>
          Modo infinito
        </button>
      </div>
    </div>
  );
}

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
  const reminders = useStore((s) => `${s.settings.reminders}|${s.settings.reminderHour}`);
  const [route, setRoute] = useState(parse);

  // Keep scheduled reminders in sync with settings, and refresh them whenever the app comes back.
  useEffect(() => {
    syncReminders().catch(() => {});
    const on = () => document.visibilityState === 'visible' && syncReminders().catch(() => {});
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [reminders]);

  // Tell the live-update plugin this bundle started fine (otherwise it rolls back to the previous one).
  useEffect(() => {
    markAppReady().catch(() => {});
  }, []);

  // Android back button: go back inside the app, close it from the home screen.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle;
    import('@capacitor/app').then(({ App: NativeApp }) => {
      handle = NativeApp.addListener('backButton', () => {
        if (parse().length) window.history.back();
        else NativeApp.exitApp();
      });
    });
    return () => handle?.then?.((h) => h.remove());
  }, []);
  const today = useToday();
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState('standard');
  // At midnight the home screen moves on to the new day's puzzles.
  const [shownToday, setShownToday] = useState(today);
  if (shownToday !== today) {
    setShownToday(today);
    if (date === shownToday) setDate(today);
  }

  // Audio can only start after a user gesture; menu buttons get a tiny soft click.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    const click = (e) => {
      if (e.target.closest?.('.card, .mini, .tab, .nav button, .chips button, .lvlbtn, .icon-btn, .day, .result .btn')) sfx.ui();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', click, true);
    };
  }, []);

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

  // After a daily puzzle: straight into the next one of the day (keeps the flow going).
  const dailyNext = (d, m, g) => {
    const id = nextDaily(store.get(), d, m, g);
    return id ? { label: `Siguiente: ${GAME_BY_ID[id].name}`, onClick: () => navigate(`/play/${d}/${m}/${id}`) } : undefined;
  };

  const [page, ...args] = route;
  let content;
  if (page === 'play' && args.length === 3 && GAME_BY_ID[args[2]]) {
    const [d, m, g] = args;
    const toToday = () => {
      setDate(today);
      navigate('/');
    };
    content =
      d !== today ? (
        <DailyClosed date={d} mode={m} game={GAME_BY_ID[g]} onToday={toToday} navigate={navigate} />
      ) : (
        <GameScreen
          key={args.join('|')}
          game={GAME_BY_ID[g]}
          puzzle={getPuzzle(d, m, g)}
          storageKey={resultKey(d, m, g)}
          mode={m}
          modeLabel={modeLabel(m)}
          subtitle={longDate(d)}
          onBack={() => navigate('/')}
          next={dailyNext(d, m, g)}
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
  else content = <Home date={date} today={today} mode={mode} setDate={setDate} setMode={setMode} navigate={navigate} />;

  return <div className="app">{content}</div>;
}
