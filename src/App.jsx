import { useEffect, useLayoutEffect, useState } from 'react';
import Home from './components/Home.jsx';
import GameScreen from './components/GameScreen.jsx';
import Settings from './components/Settings.jsx';
import Stats from './components/Stats.jsx';
import InfiniteHome from './components/InfiniteHome.jsx';
import { ClassicHome, ClassicList, rememberLevel } from './components/Classic.jsx';
import { progression } from './lib/progress.js';
import { GAME_BY_ID, MODES } from './data/games.js';
import { nextDaily } from './lib/daily.js';
import { dailySeed, infiniteSeed, prefetch, usePuzzle } from './lib/puzzles.js';
import { PuzzleError, PuzzleLoading } from './components/PuzzleLoading.jsx';
import { formatTime, longDate } from './lib/dates.js';
import { useToday } from './lib/useToday.js';
import { DIFFICULTY_LABEL, loadLevels, toPuzzle } from './lib/levels.js';
import { resultKey, saveStatus, store, useStore } from './lib/storage.js';
import { useApplyTheme } from './lib/theme.js';
import { sfx } from './lib/sound.js';
import { askPermissionOnce, syncReminders } from './lib/notify.js';
import { markAppReady } from './lib/updates.js';
import { onRestore } from './lib/backup.js';
import { initAchievements } from './lib/achievements.js';
import { syncWidget } from './lib/widget.js';
import { Capacitor } from '@capacitor/core';
import Nav, { TABS } from './components/Nav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const parse = () => (window.location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);

// The four main sections live in the bottom bar; everything else is a screen on top of them.
const tabOf = ([page, ...args]) =>
  !page ? '/' : page === 'inf' && !args.length ? '/inf' : page === 'lvl' && !args.length ? '/lvl' : page === 'stats' ? '/stats' : null;
const depthOf = (r) => (tabOf(r) ? 0 : r.length);

// In-progress boards that belong to a route: if the screen crashes, they are the likely cause.
function savesOf(route) {
  const [page, ...args] = route;
  if (page === 'play' && args.length === 3) return { exact: resultKey(...args) };
  if (page === 'inf' && args.length === 3) return { exact: `inf|${args[0]}|${args[1]}|${args[2]}` };
  if (page === 'lvl' && args.length === 2) return { prefix: `lvl|${args[0]}|` };
  return null;
}

function discardSaves(route) {
  const target = savesOf(route);
  if (!target) return false;
  const keys = Object.keys(store.get().saves).filter((k) => (target.exact ? k === target.exact : k.startsWith(target.prefix)));
  if (!keys.length) return false;
  store.patch((s) => {
    const saves = { ...s.saves };
    keys.forEach((k) => delete saves[k]);
    return { saves };
  });
  return true;
}

// Direction of a route change, for the page transition: sideways between tabs, rising into a screen.
function direction(from, to) {
  const a = tabOf(from);
  const b = tabOf(to);
  if (a && b) return TABS.indexOf(b) > TABS.indexOf(a) ? 'right' : TABS.indexOf(b) < TABS.indexOf(a) ? 'left' : 'none';
  return depthOf(to) >= depthOf(from) ? 'in' : 'out';
}
const modeLabel = (m) => MODES.find((x) => x.id === m)?.label ?? m;
// Classic difficulties map onto the visual mode badges.
const CLASSIC_MODE = { easy: 'standard', medium: 'standard', hard: 'hard', expert: 'expert' };

// A generated board (daily / infinite): prepared in the background; `render` gets it when it's ready.
// `ahead` = the boards the player will want next, prepared while this one is played.
function PuzzleScreen({ seed, game, mode, onBack, render, ahead = [] }) {
  const { puzzle, failed, retry } = usePuzzle(seed, game.id, mode);
  const aheadKey = ahead.map((a) => a.seed).join();
  useEffect(() => {
    if (puzzle) ahead.forEach((a) => prefetch(a.seed, a.game, a.mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, aheadKey]);
  if (puzzle) return render(puzzle);
  return failed ? <PuzzleError game={game} onBack={onBack} onRetry={retry} /> : <PuzzleLoading game={game} onBack={onBack} />;
}

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
  const results = useStore((s) => s.results);
  const levels = loaded?.gameId === gameId ? loaded.levels : null;
  const level = levels?.[index];
  const prog = level ? progression(levels, results, gameId, level.difficulty) : null;
  const pos = prog ? prog.position(index) : -1;
  const open = prog ? prog.isOpen(pos) : false;
  // Remember where the player is, for "Continuar" in Niveles.
  useEffect(() => {
    if (level && open) rememberLevel((u) => ({ last: { game: gameId, difficulty: level.difficulty }, diff: { ...(u.diff ?? {}), [gameId]: level.difficulty } }));
  }, [gameId, level, open]);
  // Locked levels can't be opened (old links, typed URLs): back to the list.
  useEffect(() => {
    if (level && !open) navigate(`/lvl/${gameId}`);
  }, [level, open, gameId, navigate]);
  if (!levels) return <p className="lead" style={{ padding: 24 }}>Cargando…</p>;
  if (!level || !open) return null;
  const nextIdx = prog.order[pos + 1];
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
  const reminders = useStore((s) => s.settings.notify);
  const [route, setRoute] = useState(parse);
  const [dir, setDir] = useState('none');
  const saveFailed = useStore(() => saveStatus.failed());
  // Progress that came back on its own (new phone, reinstall, wiped storage) is announced once.
  const [restored, setRestored] = useState(null);
  useEffect(() => onRestore((r) => setRestored(r)), []);
  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => setRestored(null), 6000);
    return () => clearTimeout(t);
  }, [restored]);

  // Keep scheduled reminders in sync with settings, and refresh them whenever the app comes back.
  useEffect(() => {
    askPermissionOnce().catch(() => {});
    syncReminders().catch(() => {});
    syncWidget();
    // Opening or leaving the app pushes the "8 hours away" reminder back and refreshes the widget.
    const on = () => {
      syncReminders().catch(() => {});
      syncWidget();
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [reminders]);

  // Tell the live-update plugin this bundle started fine (otherwise it rolls back to the previous one).
  useEffect(() => {
    markAppReady().catch(() => {});
    initAchievements();
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
    let last = parse();
    const on = () => {
      const next = parse();
      setDir(direction(last, next));
      last = next;
      setRoute(next);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // Every screen opens at the top. Done after the new page is in the DOM, and the scroll momentum
  // of the gesture that navigated (a swipe or fling, which Android keeps applying) is cut, so the
  // new screen doesn't inherit it. Repeated briefly during the transition unless the user touches again.
  const routeKey = route.join('/');
  useLayoutEffect(() => {
    const root = document.documentElement;
    const top = () => {
      window.scrollTo(0, 0);
      root.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    root.style.overflow = 'hidden'; // stops an in-flight fling
    top();
    let touched = false;
    const touch = () => (touched = true);
    window.addEventListener('touchstart', touch, { passive: true });
    const frame = requestAnimationFrame(() => {
      root.style.overflow = '';
      top();
    });
    const later = [120, 300, 480].map((ms) => setTimeout(() => !touched && top(), ms));
    return () => {
      cancelAnimationFrame(frame);
      later.forEach(clearTimeout);
      root.style.overflow = '';
      window.removeEventListener('touchstart', touch);
    };
  }, [routeKey]);

  // Swipe sideways between the four sections (only on them, never over a board or a dialog).
  const tab = tabOf(route);
  useEffect(() => {
    if (!tab) return;
    let start = null;
    const down = (e) => {
      const t = e.touches[0];
      // Leave the screen edges to the system back gesture, and sliders/inputs alone.
      start = t.clientX < 24 || t.clientX > innerWidth - 24 || e.target.closest?.('input, .overlay') ? null : { x: t.clientX, y: t.clientY, at: Date.now() };
    };
    const up = (e) => {
      const s0 = start;
      start = null;
      if (!s0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s0.x;
      const dy = t.clientY - s0.y;
      // A quick, clearly horizontal swipe; vertical scrolling never changes section.
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - s0.at > 800) return;
      const i = TABS.indexOf(tab) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < TABS.length) window.location.hash = TABS[i];
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', up);
    };
  }, [tab]);

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
        <PuzzleScreen
          key={args.join('|')}
          seed={dailySeed(d, m, g)}
          game={GAME_BY_ID[g]}
          mode={m}
          onBack={() => navigate('/')}
          ahead={(() => {
            const nx = nextDaily(store.get(), d, m, g);
            return nx ? [{ seed: dailySeed(d, m, nx), game: nx, mode: m }] : [];
          })()}
          render={(puzzle) => (
            <GameScreen
              game={GAME_BY_ID[g]}
              puzzle={puzzle}
              storageKey={resultKey(d, m, g)}
              mode={m}
              modeLabel={modeLabel(m)}
              subtitle={longDate(d)}
              onBack={() => navigate('/')}
              next={dailyNext(d, m, g)}
              showStreak
            />
          )}
        />
      );
  } else if (page === 'inf' && args.length === 3 && GAME_BY_ID[args[1]]) {
    const [m, g, nStr] = args;
    const n = Math.max(1, Number(nStr) || 1);
    content = (
      <PuzzleScreen
        key={args.join('|')}
        seed={infiniteSeed(m, g, n)}
        game={GAME_BY_ID[g]}
        mode={m}
        onBack={() => navigate('/inf')}
        ahead={[{ seed: infiniteSeed(m, g, n + 1), game: g, mode: m }]}
        render={(puzzle) => (
          <GameScreen
            game={GAME_BY_ID[g]}
            puzzle={puzzle}
            storageKey={`inf|${m}|${g}|${n}`}
            mode={m}
            modeLabel={modeLabel(m)}
            subtitle={`Nivel ${n}`}
            onBack={() => navigate('/inf')}
            next={{ label: `Nivel ${n + 1}`, onClick: () => navigate(`/inf/${m}/${g}/${n + 1}`) }}
          />
        )}
      />
    );
  } else if (page === 'inf') content = <InfiniteHome mode={mode} setMode={setMode} navigate={navigate} />;
  else if (page === 'lvl' && args.length === 2 && GAME_BY_ID[args[0]]) content = <ClassicPlay gameId={args[0]} index={Number(args[1])} navigate={navigate} />;
  else if (page === 'lvl' && args.length === 1 && GAME_BY_ID[args[0]]) content = <ClassicList key={args[0]} gameId={args[0]} navigate={navigate} />;
  else if (page === 'lvl') content = <ClassicHome navigate={navigate} />;
  else if (page === 'settings') content = <Settings navigate={navigate} />;
  else if (page === 'stats') content = <Stats navigate={navigate} />;
  else content = <Home date={date} today={today} mode={mode} setDate={setDate} setMode={setMode} navigate={navigate} />;

  return (
    <div className="app">
      {restored && (
        <button className="toast" role="status" onClick={() => setRestored(null)}>
          {restored.results > 0 ? `Recuperamos tu progreso: ${restored.results} ${restored.results === 1 ? 'puzzle' : 'puzzles'}.` : 'Recuperamos tus ajustes.'}
        </button>
      )}
      {saveFailed && (
        <div className="save-warning" role="alert">
          No se pudo guardar tu progreso en este dispositivo. Libera espacio o exporta una copia en Ajustes.
        </div>
      )}
      <main className={`page enter-${dir}`} key={routeKey}>
        <ErrorBoundary
          key={routeKey}
          onError={() => discardSaves(route)}
          fallback={(error, retry) => (
            <div className="screen closed" role="alert">
              <h1>Algo salió mal</h1>
              <p className="lead">Esta pantalla tuvo un problema, pero tu progreso está a salvo.</p>
              <div className="closed-actions">
                <button className="btn primary" onClick={() => (navigate('/'), retry())}>
                  Ir al inicio
                </button>
                <button className="btn" onClick={retry}>
                  Reintentar
                </button>
              </div>
            </div>
          )}
        >
          {content}
        </ErrorBoundary>
      </main>
      {tab && <Nav current={tab} navigate={navigate} />}
    </div>
  );
}
