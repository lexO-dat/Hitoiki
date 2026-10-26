import { useCallback, useRef, useState } from 'react';

// Board state with an undo stack. `set` accepts a value or an updater.
export function useHistory(initial) {
  const current = useRef(initial);
  const past = useRef([]);
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
  const undo = useCallback(() => {
    if (past.current.length) commit(past.current.pop());
  }, []);
  const reset = useCallback((value) => {
    past.current = [];
    commit(value);
  }, []);
  const get = useCallback(() => current.current, []);
  return { state: current.current, get, set, undo, reset, canUndo: past.current.length > 0 };
}
