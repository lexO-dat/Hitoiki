// Achievements: seals earned from the player's history. Everything is derived from the saved
// results, so existing progress counts and nothing extra has to be stored except which ones the
// player has already been shown (`achievementsSeen`).
import { GAME_IDS } from '../data/ids.js';
import { completedOn, computeStreak, countsForDay, STREAK_REQUIRED, store } from './storage.js';

export function parseKey(k) {
  const p = k.split('|');
  if (p[0] === 'inf') return { kind: 'inf', mode: p[1], game: p[2], n: Number(p[3]) };
  if (p[0] === 'lvl') return { kind: 'lvl', game: p[1] };
  return { kind: 'daily', date: p[0], mode: p[1], game: p[2] };
}

export function summarize(s) {
  const entries = Object.entries(s.results).map(([k, v]) => ({ key: k, ...parseKey(k), ...v }));
  const perGame = {};
  for (const e of entries) perGame[e.game] = (perGame[e.game] ?? 0) + 1;
  const days = new Set(entries.filter((e) => e.kind === 'daily').map((e) => e.date));
  const sealedDays = [...days].filter((d) => completedOn(s, d) >= STREAK_REQUIRED).length;
  // Most daily puzzles solved on their own day, for one date and difficulty.
  const perDayMode = {};
  for (const e of entries) if (e.kind === 'daily' && countsForDay(e.key, e)) perDayMode[`${e.date}|${e.mode}`] = (perDayMode[`${e.date}|${e.mode}`] ?? 0) + 1;
  const hour = (e) => (e.solvedAt ? new Date(e.solvedAt).getHours() : -1);
  return {
    total: entries.length,
    perGame,
    gamesPlayed: GAME_IDS.filter((id) => perGame[id]).length,
    maxPerGame: Math.max(0, ...Object.values(perGame)),
    perfect: entries.filter((e) => !e.hints && !e.mistakes).length,
    expert: entries.filter((e) => e.mode === 'expert').length,
    fast: entries.filter((e) => !e.hints && e.time <= 30).length,
    early: entries.filter((e) => hour(e) >= 5 && hour(e) < 8).length,
    night: entries.filter((e) => hour(e) >= 0 && hour(e) < 4).length,
    infinite: Math.max(0, ...entries.filter((e) => e.kind === 'inf').map((e) => e.n)),
    levels: entries.filter((e) => e.kind === 'lvl').length,
    sealedDays,
    fullDay: Math.max(0, ...Object.values(perDayMode)),
    best: computeStreak(s).best,
  };
}

// [id, kanji, name, description, (stats) => [current, goal]]
const LIST = [
  ['first', '初', 'Primer respiro', 'Resuelve tu primer puzzle.', (t) => [t.total, 1]],
  ['day', '済', 'Día sellado', `Completa ${STREAK_REQUIRED} puzzles en un mismo día.`, (t) => [t.sealedDays, 1]],
  ['streak3', '三', 'Tres seguidos', 'Llega a una racha de 3 días.', (t) => [t.best, 3]],
  ['streak7', '七', 'Una semana', 'Llega a una racha de 7 días.', (t) => [t.best, 7]],
  ['streak30', '月', 'Un mes entero', 'Llega a una racha de 30 días.', (t) => [t.best, 30]],
  ['games', '揃', 'Coleccionista', `Resuelve al menos un puzzle de cada uno de los ${GAME_IDS.length} juegos.`, (t) => [t.gamesPlayed, GAME_IDS.length]],
  ['perfect', '完', 'Sin tropiezos', 'Resuelve 10 puzzles sin pistas ni errores.', (t) => [t.perfect, 10]],
  ['fast', '速', 'Relámpago', 'Resuelve un puzzle en 30 segundos o menos, sin pistas.', (t) => [t.fast, 1]],
  ['expert', '達', 'Experto', 'Resuelve un puzzle en dificultad Experto.', (t) => [t.expert, 1]],
  ['expert25', '極', 'Maestría', 'Resuelve 25 puzzles en Experto.', (t) => [t.expert, 25]],
  ['fullday', '全', 'Día entero', 'Resuelve 10 puzzles diarios del mismo día y dificultad.', (t) => [t.fullDay, 10]],
  ['artisan', '匠', 'Artesano', 'Resuelve 25 puzzles de un mismo juego.', (t) => [t.maxPerGame, 25]],
  ['hundred', '百', 'Cien respiros', 'Resuelve 100 puzzles.', (t) => [t.total, 100]],
  ['infinite', '無', 'Sin fin', 'Llega al nivel 25 de cualquier juego en Infinito.', (t) => [t.infinite, 25]],
  ['levels', '段', 'Escalera', 'Resuelve 50 niveles del modo Niveles.', (t) => [t.levels, 50]],
  ['early', '朝', 'Madrugador', 'Resuelve un puzzle entre las 5:00 y las 8:00.', (t) => [t.early, 1]],
  ['night', '夜', 'Noctámbulo', 'Resuelve un puzzle entre la medianoche y las 4:00.', (t) => [t.night, 1]],
];

export function achievements(s = store.get()) {
  const t = summarize(s);
  return LIST.map(([id, kanji, name, desc, fn]) => {
    const [cur, goal] = fn(t);
    return { id, kanji, name, desc, cur: Math.min(cur, goal), goal, done: cur >= goal };
  });
}

// Unlocked but not yet shown to the player.
export function newAchievements(s = store.get()) {
  const seen = new Set(s.achievementsSeen ?? []);
  return achievements(s).filter((a) => a.done && !seen.has(a.id));
}

export function markAchievementsSeen(ids) {
  store.update((s) => ({ ...s, achievementsSeen: [...new Set([...(s.achievementsSeen ?? []), ...ids])] }));
}

// First start of a version with achievements: what was already earned is not announced as new.
export function initAchievements() {
  const s = store.get();
  if (!s.achievementsSeen) markAchievementsSeen(achievements(s).filter((a) => a.done).map((a) => a.id));
}
