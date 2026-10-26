import { useEffect, useRef } from 'react';
import { useHistory } from '../lib/useHistory.js';

// Shared wiring for every board: undo history, persistence and solve detection.
export function useBoardState({ initial, saved, onChange, isSolved, onSolved }) {
  const h = useHistory(saved ?? initial);
  const solvedRef = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    // Only persist after the player actually changes something.
    if (mounted.current) onChange?.(h.state);
    mounted.current = true;
    if (!solvedRef.current && isSolved(h.state)) {
      solvedRef.current = true;
      onSolved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.state]);
  return h;
}

// Map a pointer position to a grid cell inside `el`.
export function cellAt(e, el, w, h) {
  const rect = el.getBoundingClientRect();
  const c = Math.floor(((e.clientX - rect.left) / rect.width) * w);
  const r = Math.floor(((e.clientY - rect.top) / rect.height) * h);
  if (r < 0 || c < 0 || r >= h || c >= w) return null;
  return [r, c];
}

export const boardSize = (w, h, max = 440) => {
  const vw = Math.min(window.innerWidth - 32, max);
  const vh = window.innerHeight * 0.58;
  const cell = Math.floor(Math.min(vw / w, vh / h));
  return { cell, width: cell * w, height: cell * h };
};

// Region palette for colour-region puzzles (own palette, light pastels readable in both themes).
export const REGION_COLORS = [
  '#f7c9a9', '#b9dcf2', '#c9e7b8', '#f4b8c8', '#dcc8f2', '#f6e3a1', '#a9e3dc', '#e8c39e', '#c4c9f5', '#f2b7a2', '#bfe0a6', '#e5d4c0',
];

export const clone2 = (g) => g.map((row) => row.slice());
