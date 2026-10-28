import { useCallback, useEffect, useRef, useState } from 'react';
import { praise } from '../lib/daily.js';
import { formatTime } from '../lib/dates.js';
import { clearProgress, completedOn, computeStreak, gameOfKey, saveProgress, saveResult, store, STREAK_REQUIRED, useStore } from '../lib/storage.js';
import { resultText, shareImage, shareText } from '../lib/share.js';
import { renderResultCard } from '../lib/shareCard.js';
import Seal from './Seal.jsx';
import Enso from './Enso.jsx';
import { markAchievementsSeen, newAchievements } from '../lib/achievements.js';
import { todayKey } from '../lib/dates.js';
import { vibrate } from '../lib/theme.js';
import { sfx } from '../lib/sound.js';
import Celebration from './Celebration.jsx';
import { syncReminders } from '../lib/notify.js';
import { syncWidget } from '../lib/widget.js';
import { Arrow, Back, Bulb, Eraser, Help, Share, Undo } from './Icons.jsx';
import Thumb from './Thumb.jsx';

// Rough "how much is on the board": counts filled leaves of any board state. Its change tells
// placing (up) from erasing (down) for the sound, whatever the game.
function amount(v) {
  if (Array.isArray(v)) return v.reduce((n, x) => n + amount(x), 0);
  if (v && typeof v === 'object') return Object.values(v).reduce((n, x) => n + amount(x), 0);
  return v ? 1 : 0;
}

function Rules({ game, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Reglas de ${game.name}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Thumb game={game} className="thumb big" />
          <h2>{game.name}</h2>
        </div>
        <ul>
          {game.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <button className="btn primary wide" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function Result({ game, mode, subtitle, modeLabel, result, storageKey, onBack, onReplay, next, showStreak, fresh }) {
  const s = useStore();
  const { streak } = computeStreak(s);
  const [title, statement] = praise({ game: game.id, mode, ...result });
  const [shared, setShared] = useState('');
  const perfect = !result.hints && !result.mistakes;
  // Compare with every other solve of this game: a record or the first time are worth celebrating.
  // Records only count solves without hints.
  const previous = Object.entries(s.results)
    .filter(([k, v]) => k !== storageKey && gameOfKey(k) === game.id && !v.hints)
    .map(([, v]) => v.time);
  const best = previous.length ? Math.min(...previous) : null;
  const record = result.hints ? null : best === null ? 'first' : result.time < best ? 'record' : null;
  const date = showStreak ? storageKey.split('|')[0] : null;
  const dayDone = date ? Math.min(completedOn(s, date), STREAK_REQUIRED) : 0;
  const milestone = fresh && showStreak && dayDone === STREAK_REQUIRED && MILESTONES.includes(streak) ? streak : null;

  // Seals earned with this solve, announced once.
  const [earned] = useState(() => (fresh ? newAchievements() : []));
  useEffect(() => {
    if (fresh) sfx.stamp();
    if (earned.length) {
      markAchievementsSeen(earned.map((a) => a.id));
      setTimeout(() => sfx.streak(), 1700);
    }
  }, [fresh, earned]);

  const share = async () => {
    setShared('Preparando imagen…');
    const st = showStreak ? streak : 0;
    const text = resultText({ game, modeLabel, subtitle, result, streak: st });
    const blob = await renderResultCard({ game, modeLabel, subtitle, result, streak: st, dayDone: showStreak ? dayDone : null }).catch(() => null);
    const r = blob ? await shareImage(blob, text) : await shareText(text);
    const msg = { copied: 'Texto copiado al portapapeles', downloaded: 'Imagen descargada y texto copiado', failed: 'No se pudo compartir' };
    setShared(msg[r] ?? '');
  };

  return (
    <div className="screen result-screen" style={{ '--c': game.main, '--cbg': game.bg }}>
      <div className="result">
        <p className="eyebrow">
          {game.name} · {modeLabel} · {subtitle}
        </p>
        <Seal kanji={game.kanji} size={104} stamp={fresh} title={`${game.name} resuelto`} />
        <h1 className="praise">{title}</h1>
        <p className="statement">{statement}</p>
        <div className="result-stats">
          <div className="big">
            <small>Tiempo</small>
            <b className="num">{formatTime(result.time)}</b>
            {record === 'record' && <span className="badge shu">Nuevo récord</span>}
            {record === 'first' && <span className="badge">Primera vez</span>}
            {!record && best !== null && <span className="muted">Tu mejor: {formatTime(best)}</span>}
          </div>
          <div>
            <small>Pistas</small>
            <b className="num">{result.hints}</b>
          </div>
          <div>
            <small>Errores</small>
            <b className="num">{result.mistakes}</b>
          </div>
        </div>
        {perfect && <p className="perfect">✦ Perfecto: sin pistas ni errores</p>}
        {showStreak && (
          <div className="day-progress">
            <Enso value={dayDone} size={58} animateFrom={fresh ? dayDone - 1 : undefined} />
            <div>
              <b>{dayDone >= STREAK_REQUIRED ? `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}` : `${dayDone} de ${STREAK_REQUIRED} para tu racha`}</b>
              <small>
                {dayDone >= STREAK_REQUIRED
                  ? 'El día de hoy ya está sellado.'
                  : STREAK_REQUIRED - dayDone === 1
                    ? '¡Solo uno más!'
                    : `Te faltan ${STREAK_REQUIRED - dayDone}.`}
              </small>
            </div>
          </div>
        )}
        {earned.map((a) => (
          <div key={a.id} className="earned" role="status">
            <Seal kanji={a.kanji} size={44} stamp />
            <div>
              <small>Nuevo sello</small>
              <b>{a.name}</b>
              <span>{a.desc}</span>
            </div>
          </div>
        ))}
        {milestone && (
          <div className="milestone" role="status">
            <b>¡{milestone} días seguidos!</b>
            {milestone % 7 === 0 && <span>Ganaste un día de descanso: si un día no puedes jugar, tu racha te espera.</span>}
          </div>
        )}
        <div className="result-actions">
          <button className="btn primary wide" onClick={next ? next.onClick : onBack}>
            {next ? next.label : 'Continuar'} <Arrow width="18" height="18" />
          </button>
          <div className="pair">
            <button className="btn" onClick={share}>
              <Share width="18" height="18" /> Compartir
            </button>
            <button className="btn" onClick={onReplay}>
              <Undo width="18" height="18" /> Repetir
            </button>
          </div>
          {next && (
            <button className="linklike" onClick={onBack}>
              Volver
            </button>
          )}
          {shared && <p className="muted">{shared}</p>}
        </div>
      </div>
    </div>
  );
}

export default function GameScreen({ game, puzzle, storageKey, mode, modeLabel, subtitle, onBack, next, showStreak = false }) {
  const settings = useStore((s) => s.settings);
  const existing = useStore((s) => s.results[storageKey]);
  const saved = useRef(store.get().saves[storageKey]);
  const board = useRef(null);
  const [elapsed, setElapsed] = useState(saved.current?.meta?.time ?? 0);
  const [hints, setHints] = useState(saved.current?.meta?.hints ?? 0);
  const [mistakes, setMistakes] = useState(saved.current?.meta?.mistakes ?? 0);
  const [done, setDone] = useState(existing ?? null);
  const [showRules, setShowRules] = useState(() => !store.get().tutorialsSeen[game.id]);
  const [round, setRound] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [fresh, setFresh] = useState(false); // solved just now (vs. reopening a solved puzzle)
  const wrap = useRef(null);
  const meta = useRef({ time: elapsed, hints, mistakes });
  meta.current = { time: elapsed, hints, mistakes };

  // Instrument, key and ambient pad for this game while the board is being played.
  const music = settings.sound && settings.music;
  useEffect(() => {
    if (done) return;
    sfx.enterGame(game.id);
    return () => sfx.leaveGame();
  }, [game.id, done, music]);

  // The clock only runs while the board is on screen: leaving the app (or locking the phone) pauses it.
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useEffect(() => {
    if (done || showRules || celebrating || !visible) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [done, showRules, celebrating, visible]);

  const closeRules = () => {
    setShowRules(false);
    store.update((s) => ({ ...s, tutorialsSeen: { ...s.tutorialsSeen, [game.id]: true } }));
  };

  // Persist in-progress boards at most a few times per second (drags change state on every cell).
  const pending = useRef(null);
  const flush = useCallback(() => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    saveProgress(storageKey, pending.current.data);
    pending.current = null;
  }, [storageKey]);
  const lastAmount = useRef(null);
  const onChange = useCallback(
    (state) => {
      if (done) return;
      // Ruta plays its own notes following the path; every other board plays the move as music.
      const n = amount(state);
      // Pintura and Tuberías change cells in place (colors, rotations): every move moves forward.
      const inPlace = game.id === 'kami' || game.id === 'pipes';
      if (game.id !== 'zip') sfx.move(inPlace || lastAmount.current === null ? 1 : n - lastAmount.current);
      lastAmount.current = n;
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = { data: { state, meta: meta.current }, timer: setTimeout(flush, 400) };
    },
    [done, flush, game.id],
  );
  useEffect(() => {
    const hide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      flush();
    };
  }, [flush]);
  const onSolved = useCallback(() => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
    const result = { ...meta.current };
    saveResult(storageKey, result);
    syncReminders().catch(() => {});
    syncWidget();
    vibrate(store.get().settings.haptics, [20, 40, 20]);
    sfx.solve({ perfect: !result.hints && !result.mistakes });
    // This solve completed today's puzzles for the streak: play the streak motif after the cadence.
    if (showStreak && completedOn(store.get(), todayKey()) === STREAK_REQUIRED) setTimeout(() => sfx.streak(), 1500);
    setCelebrating(true);
    // Let the board celebrate before switching to the result screen.
    setTimeout(() => {
      setCelebrating(false);
      setFresh(true);
      setDone(result);
    }, 1900);
  }, [storageKey, showStreak]);
  const onMistake = useCallback(() => {
    setMistakes((m) => m + 1);
    sfx.error();
    vibrate(store.get().settings.haptics, 30);
  }, []);

  // Wave across the cells, rippling out from the centre of the board.
  useEffect(() => {
    if (!celebrating || !wrap.current) return;
    const area = wrap.current.getBoundingClientRect();
    const cx = area.left + area.width / 2;
    const cy = area.top + area.height / 2;
    const cells = wrap.current.querySelectorAll('.qcell, .tcell, .zcell, .scell, .pcell, .lcell, .kamicell, .krect, .bisland, .setcard, .peg');
    cells.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
      el.style.animationDelay = `${Math.round(d * 1.6)}ms`;
      el.classList.add('wave');
    });
  }, [celebrating]);

  const hint = () => {
    if (board.current?.hint()) {
      setHints((h) => h + 1);
      sfx.hint();
    }
  };
  const replay = () => {
    clearProgress(storageKey);
    saved.current = undefined;
    setElapsed(0);
    setHints(0);
    setMistakes(0);
    setDone(null);
    setFresh(false);
    setRound((r) => r + 1);
  };

  if (done)
    return (
      <Result
        game={game}
        mode={mode}
        subtitle={subtitle}
        modeLabel={modeLabel}
        result={done}
        storageKey={storageKey}
        fresh={fresh}
        onBack={onBack}
        onReplay={replay}
        next={next}
        showStreak={showStreak}
      />
    );

  const { Board } = game;
  return (
    <div className="screen game" style={{ '--c': game.main, '--cbg': game.bg }}>
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          <Back />
        </button>
        <h1>
          <span className="head-kanji" aria-hidden="true">
            {game.kanji}
          </span>
          {game.name}
        </h1>
        <button className="icon-btn" onClick={() => setShowRules(true)} aria-label="Reglas">
          <Help />
        </button>
      </header>
      <div className="game-meta">
        <span className={`mode ${mode}`}>{modeLabel}</span>
        {settings.showTimer && (
          <span className="timer num" aria-label="Tiempo">
            {formatTime(elapsed)}
          </span>
        )}
        <span>{subtitle}</span>
      </div>
      <div ref={wrap} className={`board-wrap${celebrating ? ' celebrate' : ''}`}>
        <Board
          key={round}
          ref={board}
          puzzle={puzzle}
          saved={saved.current?.state}
          color={game.main}
          onChange={onChange}
          onSolved={onSolved}
          onMistake={onMistake}
        />
        {celebrating && <Celebration color={game.main} />}
      </div>
      <div className="toolbar">
        <button
          className="btn"
          disabled={celebrating}
          onClick={() => {
            sfx.undo();
            board.current?.undo();
          }}
        >
          <Undo /> Deshacer
        </button>
        <button
          className="btn"
          disabled={celebrating}
          onClick={() => {
            sfx.undo();
            board.current?.clear();
          }}
        >
          <Eraser /> Limpiar
        </button>
        <button className="btn" onClick={hint} disabled={celebrating}>
          <Bulb /> Pista
          <span className="hint-count">{hints ? `usadas: ${hints}` : 'gratis'}</span>
        </button>
      </div>
      {showRules && <Rules game={game} onClose={closeRules} />}
    </div>
  );
}
