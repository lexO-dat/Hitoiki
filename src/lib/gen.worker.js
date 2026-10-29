// Generates puzzles away from the screen: a hard board can take seconds on a phone, and doing it on
// the main thread would freeze the whole app. Same code, same seed, same board as on the main thread.
import { createRng } from './rng.js';
import { LOGIC } from '../games/registry.js';

self.onmessage = ({ data: { id, seed, game, mode } }) => {
  try {
    self.postMessage({ id, puzzle: LOGIC[game].generate(createRng(seed), mode) });
  } catch (e) {
    self.postMessage({ id, error: String(e?.message ?? e) });
  }
};
