import { useCallback, useRef, useState } from 'react';

// Board state with an undo stack. `set` accepts a value or an updater.
// Drag gestures call `begin()` once, then `replace()` for every intermediate state and `end()` when
// the finger lifts, so a whole stroke is a single undo step.
export function useHistory(initial) {
  const current = useRef(initial);
  const past = useRef([]);
  const stroke = useRef(null);
  const [, render] = useState(0);
  const commit = (value) => {
    current.current = value;
    render((n) => n + 1);
  };
  const set = useCallback((next) => {
    const prev = current.current;
    const value = typeof next === 'function' ? next(prev) : next;
    if (value === prev) return;
    past.current.push(prev);
    if (past.current.length > 300) past.current.shift();
    commit(value);
  }, []);
  const begin = useCallback(() => {
    stroke.current = current.current;
  }, []);
  const replace = useCallback((value) => {
    if (value !== current.current) commit(value);
  }, []);
  const end = useCallback(() => {
    const start = stroke.current;
    stroke.current = null;
    if (start !== null && start !== current.current) {
      past.current.push(start);
      if (past.current.length > 300) past.current.shift();
    }
  }, []);
  const undo = useCallback(() => {
    if (past.current.length) commit(past.current.pop());
  }, []);
  const reset = useCallback((value) => {
    past.current = [];
    commit(value);
  }, []);
  const get = useCallback(() => current.current, []);
  return { state: current.current, get, set, begin, replace, end, undo, reset, canUndo: past.current.length > 0 };
}
