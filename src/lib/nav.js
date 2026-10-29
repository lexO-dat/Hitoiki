// Navigation on top of the hash. Entering a screen pushes a history entry (marked with its depth), but
// moving sideways (between the bottom-bar sections, to the next level) replaces the current one, so the
// Back button never has to walk through every section the player visited.
const fire = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const depth = () => window.history.state?.n ?? 0;

export function go(path, { replace = false } = {}) {
  if ((window.location.hash.replace(/^#/, '') || '/') === path) return;
  if (replace) window.history.replaceState({ n: depth() }, '', `#${path}`);
  else window.history.pushState({ n: depth() + 1 }, '', `#${path}`);
  fire();
}

// Up one level: the entry we came from if there is one, otherwise (a screen opened directly) its parent.
export function back(parent = '/') {
  if (depth() > 0) window.history.back();
  else go(parent, { replace: true });
}

// What the system Back button does: leave the screen, then go home, and only then close the app.
export function systemBack(isHome) {
  if (depth() > 0) return window.history.back(), 'back';
  if (!isHome) return go('/', { replace: true }), 'home';
  return 'exit';
}
