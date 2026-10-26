import { createRng } from './rng.js';
import { GAMES, GAME_BY_ID } from '../data/games.js';

export const SELECTION_SIZE = 4;
const cache = new Map();

// Featured games rotate daily; the rest are listed under "Otros puzzles".
export function dailySelection(date) {
  const pool = GAMES.filter((g) => !g.todayOnly).map((g) => g.id);
  const picked = createRng(`selection|${date}`).shuffle(pool);
  return { featured: picked.slice(0, SELECTION_SIZE), others: picked.slice(SELECTION_SIZE) };
}

export function getPuzzle(date, mode, gameId) {
  const key = `${date}|${mode}|${gameId}`;
  if (!cache.has(key)) {
    const rng = createRng(key);
    cache.set(key, GAME_BY_ID[gameId].logic.generate(rng, mode));
  }
  return cache.get(key);
}

// Result praise, chosen from speed, hints, mistakes and difficulty.
const PAR = { shikaku: 150, zip: 90, queens: 150, pipes: 120, bridges: 210, tango: 150, kami: 120, mind: 180, lits: 240, sets: 150, sudoku: 420 };
const MODE_FACTOR = { standard: 1, hard: 1.6, expert: 2.4 };

export function praise({ game, mode, time, hints, mistakes }) {
  const par = (PAR[game] ?? 150) * (MODE_FACTOR[mode] ?? 1);
  const r = time / par;
  const pick = (arr) => arr[Math.floor(time) % arr.length];
  if (hints >= 3) return pick([['¡Lo lograste!', 'Las pistas son parte del aprendizaje. La próxima saldrá más fluida.'], ['¡Resuelto!', 'No te rendiste, y eso es lo que cuenta.']]);
  if (hints > 0) return pick([['¡Bien jugado!', 'Un pequeño empujón y el resto fue todo tuyo.'], ['¡Buena estrategia!', 'Saber cuándo pedir ayuda también es lógica.']]);
  if (r < 0.35) return pick([['¡Relámpago!', 'Casi instantáneo. Lo viste antes de empezar.'], ['¡Increíble!', 'Tuvimos que revisar el cronómetro dos veces.']]);
  if (r < 0.7) return pick([['¡Mente afilada!', 'Rápido y preciso: una gran combinación.'], ['¡Veloz!', 'Ni un movimiento de más.']]);
  if (mistakes === 0) return pick([['¡Impecable!', 'Cero errores. Pura deducción de principio a fin.'], ['¡Lógica pura!', 'Cada movimiento fue intencional.']]);
  if (mode === 'expert') return ['¡Gran maestro!', 'Pocos jugadores se atreven con Experto. Tú lo resolviste.'];
  if (mode === 'hard') return ['¡Brillante!', 'Difícil no fue un problema para ti.'];
  if (r > 2) return ['¡Perseverancia!', 'Este puzzle dio pelea, y ganaste tú.'];
  return pick([['¡Bien hecho!', 'Concentración y constancia. Eso es lo que importa.'], ['¡Buen trabajo!', 'Otro puzzle resuelto.']]);
}
