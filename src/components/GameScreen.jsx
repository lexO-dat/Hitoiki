import { useCallback, useEffect, useRef, useState } from 'react';
import { praise } from '../lib/daily.js';
import { formatTime } from '../lib/dates.js';
import { clearProgress, computeStreak, saveProgress, saveResult, store, useStore } from '../lib/storage.js';
import { vibrate } from '../lib/theme.js';
import { Back, Bulb, Eraser, Flame, Help, Play, Undo } from './Icons.jsx';
import Thumb from './Thumb.jsx';

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

function Result({ game, mode, subtitle, modeLabel, result, onBack, onReplay, next, showStreak }) {
  const s = useStore();
  const { streak } = computeStreak(s);
  const [title, statement] = praise({ game: game.id, mode, ...result });
  return (
    <div className="screen" style={{ '--c': game.main }}>
      <div className="result">
        <div className="game-meta">{subtitle}</div>
        <Thumb game={game} className="thumb big" />
        <div className="praise">{title}</div>
        <p className="statement">{statement}</p>
        <div className="stats">
          <div>
            <small>Completado en</small>
            <b>{formatTime(result.time)}</b>
            <small>{modeLabel}</small>
          </div>
          <div>
            <small>Pistas · Errores</small>
            <b>
              {result.hints} · {result.mistakes}
            </b>
            {showStreak && (
              <small>
                <Flame width="14" height="14" style={{ verticalAlign: -2 }} /> racha {streak}
              </small>
            )}
          </div>
        </div>
        {next ? (
          <button className="btn primary wide" onClick={next.onClick}>
            {next.label} <Play width="18" height="18" />
          </button>
        ) : (
          <button className="btn primary wide" onClick={onBack}>
            Continuar <Play width="18" height="18" />
          </button>
        )}
        {next && (
          <button className="btn wide" onClick={onBack}>
            Volver
          </button>
        )}
        <button className="btn wide" onClick={onReplay}>
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}

// Generic puzzle screen shared by the daily, infinite and classic-level modes.
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
  const meta = useRef({ time: elapsed, hints, mistakes });
  meta.current = { time: elapsed, hints, mistakes };

  useEffect(() => {
    if (done || showRules) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [done, showRules]);

  const closeRules = () => {
    setShowRules(false);
    store.update((s) => ({ ...s, tutorialsSeen: { ...s.tutorialsSeen, [game.id]: true } }));
  };

  const onChange = useCallback(
    (state) => {
      if (!done) saveProgress(storageKey, { state, meta: meta.current });
    },
    [storageKey, done],
  );
  const onSolved = useCallback(() => {
    const result = { ...meta.current };
    vibrate(store.get().settings.haptics, [20, 40, 20]);
    setTimeout(() => {
      saveResult(storageKey, result);
      setDone(result);
    }, 650);
  }, [storageKey]);
  const onMistake = useCallback(() => {
    setMistakes((m) => m + 1);
    vibrate(store.get().settings.haptics, 30);
  }, []);

  const hint = () => {
    if (board.current?.hint()) setHints((h) => h + 1);
  };
  const replay = () => {
    clearProgress(storageKey);
    saved.current = undefined;
    setElapsed(0);
    setHints(0);
    setMistakes(0);
    setDone(null);
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
        <h1>{game.name}</h1>
        <button className="icon-btn" onClick={() => setShowRules(true)} aria-label="Reglas">
          <Help />
        </button>
      </header>
      <div className="game-meta">
        <span className={`mode ${mode}`}>{modeLabel}</span>
        {settings.showTimer && <span aria-label="Tiempo">{formatTime(elapsed)}</span>}
        <span>{subtitle}</span>
      </div>
      <div className="board-wrap">
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
      </div>
      <div className="toolbar">
        <button className="btn" onClick={() => board.current?.undo()}>
          <Undo /> Deshacer
        </button>
        <button className="btn" onClick={() => board.current?.clear()}>
          <Eraser /> Limpiar
        </button>
        <button className="btn" onClick={hint}>
          <Bulb /> Pista
          <span className="hint-count">{hints ? `usadas: ${hints}` : 'gratis'}</span>
        </button>
      </div>
      {showRules && <Rules game={game} onClose={closeRules} />}
    </div>
  );
}
