import { Back } from './Icons.jsx';
import Seal from './Seal.jsx';

// Shown while a board is being prepared in the background. It fades in after a moment, so boards that
// are ready almost at once (the usual case, thanks to preparing them ahead) never flash it.
export function PuzzleLoading({ game, onBack }) {
  return (
    <div className="screen game puzzle-loading" style={{ '--c': game.main, '--cbg': game.bg }} aria-busy="true">
      <header className="game-head">
        <button className="icon-btn" onClick={onBack} aria-label="Volver">
          <Back />
        </button>
        <h1>{game.name}</h1>
        <span />
      </header>
      <div className="loading-body" role="status">
        <span className="loading-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" />
          </svg>
          <Seal kanji={game.kanji} size={54} />
        </span>
        <p>Preparando tu tablero…</p>
      </div>
    </div>
  );
}

export function PuzzleError({ game, onBack, onRetry }) {
  return (
    <div className="screen closed" role="alert" style={{ '--c': game.main, '--cbg': game.bg }}>
      <h1>No se pudo preparar el tablero</h1>
      <p className="lead">Tu progreso está a salvo. Inténtalo otra vez.</p>
      <div className="closed-actions">
        <button className="btn primary" onClick={onRetry}>
          Reintentar
        </button>
        <button className="btn" onClick={onBack}>
          Volver
        </button>
      </div>
    </div>
  );
}
