import { createRng } from './rng.js';
import { uniqueIds } from './levelIds.js';
import { GAME_BY_ID } from '../data/games.js';

// Level packs live in public/levels/*.json and are loaded on demand.
const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`./levels/${path}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  try {
    return await cache.get(path);
  } catch (e) {
    cache.delete(path);
    throw e;
  }
}

export const loadIndex = () => getJson('index.json');

export async function loadLevels(gameId) {
  const data = await getJson(`${gameId}.json`);
  return uniqueIds(data.levels);
}

// Convert stored records into the exact puzzle shape each Board expects.
export function toPuzzle(gameId, level) {
  const p = level.puzzle;
  if (gameId === 'sets') {
    // Trios levels store a seed and table size; cards are dealt from that seed.
    return GAME_BY_ID.sets.logic.generate(createRng(p.seed), null, { cards: p.cards, sets: p.setsToFind });
  }
  return p;
}

export const DIFFICULTY_LABEL = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto' };
export const COLLECTION_LABEL = {
  tutorial: 'Tutorial', daily: 'Diario', journey: 'Viaje', impossible: 'Imposible', challenge: 'Desafío',
  pack: 'Pack', training: 'Entrenamiento', test: 'Prueba', classic: 'Clásico',
};

// Infinite mode: endless numbered levels from our generators.
const infCache = new Map();
export function infinitePuzzle(gameId, mode, n) {
  const key = `inf|${mode}|${gameId}|${n}`;
  if (!infCache.has(key)) infCache.set(key, GAME_BY_ID[gameId].logic.generate(createRng(key), mode));
  return infCache.get(key);
}
