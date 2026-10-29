// Puzzles are generated from a seed by a Web Worker and kept in memory. Two workers: one for what the
// player just asked for, one that prepares the next boards in the background (a long preparation
// never makes a tap wait). Without Worker support (or if it breaks) the same code runs on the main
// thread after the loading screen is shown.
import { useEffect, useReducer, useState } from 'react';
import { createRng } from './rng.js';
import { LOGIC } from '../games/registry.js';

export const dailySeed = (date, mode, game) => `${date}|${mode}|${game}`;
export const infiniteSeed = (mode, game, n) => `inf|${mode}|${game}|${n}`;

const MAX_CACHED = 200;
const JOB_TIMEOUT = 25_000;
const cache = new Map(); // seed -> puzzle (Map keeps insertion order: the oldest goes first)
const pending = new Map(); // seed -> { promise, lane }
const failed = new Set();

export const peekPuzzle = (seed) => cache.get(seed) ?? null;
export const generateHere = (seed, game, mode) => LOGIC[game].generate(createRng(seed), mode);

function remember(seed, puzzle) {
  cache.set(seed, puzzle);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
}

// One worker that runs one job at a time.
class Lane {
  constructor() {
    this.queue = [];
    this.job = null;
    this.worker = null;
    this.broken = false;
  }

  start() {
    if (this.worker || this.broken || typeof Worker === 'undefined') return this.worker;
    try {
      this.worker = new Worker(new URL('./gen.worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => this.finish(data);
      this.worker.onerror = () => {
        this.broken = true; // this device can't run it: the rest is done here
        this.drop();
        // The board it was working on is not lost: it goes back to the front and is made here.
        if (this.job) {
          clearTimeout(this.job.timer);
          this.queue.unshift(this.job);
          this.job = null;
        }
        this.pump();
      };
    } catch {
      this.broken = true;
      this.worker = null;
    }
    return this.worker;
  }

  drop() {
    this.worker?.terminate();
    this.worker = null;
  }

  add(job, first) {
    first ? this.queue.unshift(job) : this.queue.push(job);
    this.pump();
  }

  pump() {
    if (this.job || !this.queue.length) return;
    const job = (this.job = this.queue.shift());
    const w = this.start();
    if (!w) {
      setTimeout(() => {
        try {
          this.finish({ puzzle: generateHere(job.seed, job.game, job.mode) });
        } catch (e) {
          this.finish({ error: String(e?.message ?? e) });
        }
      }, 0);
      return;
    }
    job.timer = setTimeout(() => {
      this.drop(); // stuck: a fresh worker will take the next job
      this.finish({ error: 'La generación tardó demasiado.' });
    }, JOB_TIMEOUT);
    w.postMessage({ id: 1, seed: job.seed, game: job.game, mode: job.mode });
  }

  finish(data) {
    const job = this.job;
    if (!job) return;
    clearTimeout(job.timer);
    this.job = null;
    pending.delete(job.seed);
    if (data.error) {
      failed.add(job.seed);
      job.reject(new Error(data.error));
    } else {
      failed.delete(job.seed);
      remember(job.seed, data.puzzle);
      job.resolve(data.puzzle);
    }
    this.pump();
  }
}

const now = new Lane(); // what the player is waiting for
const later = new Lane(); // preparing what comes next

// Resolves with the puzzle for `seed`. `urgent` = the player is waiting for it.
export function requestPuzzle(seed, game, mode, { urgent = true } = {}) {
  if (cache.has(seed)) return Promise.resolve(cache.get(seed));
  const known = pending.get(seed);
  if (known) {
    // Asked for in the background and now needed: move it to the front lane if it hasn't started.
    if (urgent && known.lane === later && later.queue.includes(known.job)) {
      later.queue.splice(later.queue.indexOf(known.job), 1);
      known.lane = now;
      now.add(known.job);
    }
    return known.promise;
  }
  failed.delete(seed);
  const lane = urgent ? now : later;
  const entry = { lane };
  entry.promise = new Promise((resolve, reject) => {
    entry.job = { seed, game, mode, resolve, reject };
  });
  pending.set(seed, entry);
  lane.add(entry.job);
  return entry.promise;
}

// Prepare a board in the background (never blocks anything; failures are ignored).
export function prefetch(seed, game, mode) {
  if (!cache.has(seed) && !pending.has(seed)) requestPuzzle(seed, game, mode, { urgent: false }).catch(() => {});
}

// The puzzle for a screen: `puzzle` is null while it is being prepared.
export function usePuzzle(seed, game, mode) {
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [tries, setTries] = useState(0);
  const puzzle = peekPuzzle(seed);
  useEffect(() => {
    if (puzzle) return undefined;
    let live = true;
    requestPuzzle(seed, game, mode).then(() => live && redraw(), () => live && redraw());
    return () => {
      live = false;
    };
  }, [seed, game, mode, puzzle, tries]);
  return { puzzle, failed: !puzzle && failed.has(seed), retry: () => (failed.delete(seed), setTries((t) => t + 1)) };
}
