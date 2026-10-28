import { useMemo, useRef, useState } from 'react';
import { BoardLimit } from '../games/common.js';
import { createRng } from '../lib/rng.js';
import { sfx } from '../lib/sound.js';
import { vibrate } from '../lib/theme.js';
import { store } from '../lib/storage.js';
import { Arrow, Bulb } from './Icons.jsx';
import Seal from './Seal.jsx';

// Interactive tutorial: the rules as short steps next to a real, tiny board of the same game that
// the player solves by hand. A help button plays one move when stuck; solving it stamps the seal.
export default function Tutorial({ game, onDone }) {
  const [round, setRound] = useState(0);
  const puzzle = useMemo(() => game.logic.generate(createRng(`tutorial|${game.id}|${round}`), 'tutorial'), [game, round]);
  const board = useRef(null);
  const [solved, setSolved] = useState(false);
  const [helped, setHelped] = useState(0);
  const [step, setStep] = useState(0);
  const { Board } = game;

  // The board shares the sheet with the steps and the buttons.
  const limit = useMemo(() => ({ width: Math.min(window.innerWidth - 80, 300), height: Math.max(170, window.innerHeight - 430) }), []);

  const help = () => {
    if (board.current?.hint()) {
      setHelped((n) => n + 1);
      sfx.hint();
    }
  };
  const win = () => {
    sfx.solve({ perfect: !helped });
    vibrate(store.get().settings.haptics, [20, 40, 20]);
    setTimeout(() => {
      setSolved(true);
      sfx.stamp();
    }, 700);
  };

  return (
    <div className="overlay tutorial-overlay">
      <div className="tutorial" role="dialog" aria-modal="true" aria-label={`Tutorial de ${game.name}`} style={{ '--c': game.main, '--cbg': game.bg }}>
        <header className="tutorial-head">
          <span className="head-kanji" aria-hidden="true">
            {game.kanji}
          </span>
          <div>
            <p className="eyebrow">Aprende a jugar</p>
            <h2>{game.name}</h2>
          </div>
          {!solved && (
            <button className="linklike" onClick={onDone}>
              Saltar
            </button>
          )}
        </header>

        <ol className="tutorial-steps">
          {game.rules.map((r, i) => (
            <li key={r} className={i === step ? 'on' : i < step ? 'seen' : ''} onClick={() => setStep(i)}>
              {r}
            </li>
          ))}
        </ol>

        <div className={`tutorial-board${solved ? ' done' : ''}`}>
          <BoardLimit.Provider value={limit}>
            <Board
              key={round}
              ref={board}
              puzzle={puzzle}
              color={game.main}
              onChange={() => {
                sfx.move(1);
                // Each move moves the focus along the steps, so all of them get read while playing.
                setStep((s) => Math.min(s + 1, game.rules.length - 1));
              }}
              onSolved={win}
              onMistake={() => sfx.error()}
            />
          </BoardLimit.Provider>
        </div>

        {solved ? (
          <div className="tutorial-done" role="status">
            <Seal kanji={game.kanji} size={64} stamp />
            <div>
              <b>¡Así se juega!</b>
              <span>{helped ? 'Con un poco de ayuda, pero ya le tomaste la mano.' : 'Lo resolviste solo. Estás listo.'}</span>
            </div>
            <button className="btn primary wide" onClick={onDone}>
              Jugar el de verdad <Arrow width="18" height="18" />
            </button>
            <button className="linklike" onClick={() => (setSolved(false), setHelped(0), setStep(0), setRound((r) => r + 1))}>
              Practicar otro
            </button>
          </div>
        ) : (
          <div className="tutorial-actions">
            <p className="muted">Resuelve este tablero de práctica. Si te trabas, te muestro un paso.</p>
            <button className="btn" onClick={help}>
              <Bulb width="18" height="18" /> Ayúdame
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
