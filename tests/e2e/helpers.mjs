// Shared helpers for the end-to-end tests: serve the production build and drive it in Chromium.
import { preview } from 'vite';
import { chromium } from 'playwright';

export const GAMES = ['shikaku', 'zip', 'queens', 'pipes', 'bridges', 'tango', 'kami', 'mind', 'lits', 'sets', 'sudoku'];

// Serves dist/ (run `vite build` first) on a free port.
export async function serve() {
  const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'silent' });
  const url = server.resolvedUrls.local[0];
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) };
}

export async function browser() {
  return chromium.launch();
}

export const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A page with a given saved state (tutorials marked as seen, sound off) that records page errors.
// mobile: emulate a phone browser (layout viewport, touch), where horizontal overflow behaves differently.
export async function page(b, { state = {}, viewport = { width: 390, height: 844 }, init, mobile = false } = {}) {
  const ctx = await b.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'], ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  const data = {
    schema: 2,
    settings: { sound: false, notify: false, ...(state.settings ?? {}) },
    results: state.results ?? {},
    saves: {},
    tutorialsSeen: state.tutorialsSeen ?? Object.fromEntries(GAMES.map((g) => [g, true])),
  };
  await ctx.addInitScript((d) => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.setItem('logica-diaria:v1', JSON.stringify(d));
      sessionStorage.setItem('e2e-seeded', '1');
    }
  }, data);
  if (init) await ctx.addInitScript(init[0], init[1]);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && p.errors.push(m.text()));
  return p;
}

// Solve the open board by pressing the hint button until the result screen appears.
export async function solveWithHints(p, max = 200) {
  for (let i = 0; i < max; i++) {
    if (await p.$('.result')) return true;
    const btn = p.locator('.toolbar .btn').nth(2);
    if (await btn.isEnabled().catch(() => false)) await btn.click({ timeout: 1000 }).catch(() => {});
    await p.waitForTimeout(40);
  }
  return !!(await p.waitForSelector('.result', { timeout: 4000 }).catch(() => null));
}
