// The saved-data layout: progress and boards in progress live under separate keys, old data is
// migrated, and a heavy history doesn't make anything slow.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { browser, GAMES, page, serve, solveWithHints } from './helpers.mjs';

let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

const KEY = 'logica-diaria:v1';
const SAVES = `${KEY}:saves`;
const seen = Object.fromEntries(GAMES.map((g) => [g, true]));
// Counts writes per localStorage key.
const countWrites = () => {
  const orig = Storage.prototype.setItem;
  window.__writes = {};
  Storage.prototype.setItem = function (k, v) {
    window.__writes[k] = (window.__writes[k] ?? 0) + 1;
    return orig.call(this, k, v);
  };
};
const results = (n, extra = {}) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`inf|standard|zip|${i + 1}`, { time: 40 + (i % 50), hints: 0, mistakes: 0, solvedAt: 1761600000000 + i * 1000, ...extra }]));

test('old single-key data is migrated: boards move to their own key, results gain their fixed day', async () => {
  const legacy = { schema: 2, settings: { theme: 'dark' }, results: results(3), saves: { 'inf|standard|queens|1': { state: [[0]], meta: { time: 4 } } }, tutorialsSeen: seen };
  const p = await page(b, { state: legacy });
  await p.addInitScript(() => localStorage.getItem('logica-diaria:v1') && 0);
  // The helper seeds the legacy shape, but with `saves` empty: write the old layout by hand.
  await p.addInitScript((d) => sessionStorage.getItem('legacy') || (localStorage.setItem('logica-diaria:v1', JSON.stringify(d)), sessionStorage.setItem('legacy', '1')), legacy);
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  const stored = await p.evaluate(([k, s]) => ({ main: JSON.parse(localStorage.getItem(k)), boards: JSON.parse(localStorage.getItem(s)) }), [KEY, SAVES]);
  assert.equal(stored.main.saves, undefined, 'boards are no longer inside the progress key');
  assert.equal(stored.main.clean, 1);
  assert.equal(Object.keys(stored.main.results).length, 3);
  assert.ok(Object.values(stored.main.results).every((r) => /^\d{4}-\d\d-\d\d$/.test(r.solvedDay)));
  assert.equal(stored.main.settings.theme, 'dark');
  assert.deepEqual(Object.keys(stored.boards.saves), ['inf|standard|queens|1']);
  await p.context().close();
});

test('moving on a board rewrites only the small boards key; solving rewrites the progress once', async () => {
  const p = await page(b, { state: { results: results(2000) }, init: [countWrites] });
  await p.goto(`${srv.url}#/inf/standard/queens/3`);
  await p.waitForSelector('.board-wrap');
  await p.waitForTimeout(500);
  await p.evaluate(() => (window.__writes = {}));
  for (let i = 0; i < 8; i++) {
    await p.locator('.qcell').nth(i).click();
    await p.waitForTimeout(450); // longer than the save debounce
  }
  const moving = await p.evaluate(() => window.__writes);
  assert.equal(moving['logica-diaria:v1'] ?? 0, 0, 'no progress rewrite while only a board changes');
  assert.ok(moving['logica-diaria:v1:saves'] >= 3, 'the board is saved as it changes');
  assert.ok(await solveWithHints(p));
  await p.waitForTimeout(800);
  const solved = await p.evaluate(() => window.__writes);
  assert.ok(solved['logica-diaria:v1'] >= 1 && solved['logica-diaria:v1'] <= 2, `solving writes the progress (${solved['logica-diaria:v1']})`);
  await p.context().close();
});

test('a damaged boards key only costs the boards in progress, never the results', async () => {
  const p = await page(b, { state: { results: results(5) } });
  await p.addInitScript(() => localStorage.setItem('logica-diaria:v1:saves', '{"saves":{"a":'));
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  await p.goto(`${srv.url}#/stats`);
  await p.waitForSelector('.streak-hero');
  assert.match(await p.textContent('.streak-facts'), /5\s*puzzles resueltos/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a player with 44,000 solved levels still opens the app and every screen quickly', async () => {
  const games = ['zip', 'queens', 'tango', 'pipes'];
  const big = Object.fromEntries(Array.from({ length: 44000 }, (_, i) => [`lvl|${games[i % 4]}|level_${i}`, { time: 30 + (i % 100), hints: 0, mistakes: 0, solvedAt: 1761600000000 + i * 60000, solvedDay: '2026-10-28' }]));
  const p = await page(b, { state: { results: big } });
  const t0 = Date.now();
  await p.goto(srv.url);
  await p.waitForSelector('.hero', { timeout: 20000 });
  const start = Date.now() - t0;
  const open = async (hash, sel) => {
    const t = Date.now();
    await p.evaluate((h) => (location.hash = h), hash);
    await p.waitForSelector(sel, { timeout: 20000 });
    return Date.now() - t;
  };
  const stats = await open('#/stats', '.streak-hero');
  const home = await open('#/', '.hero');
  const inf = await open('#/inf', '.grid-cards');
  console.log(`   44,000 results: start ${start} ms, Cuaderno ${stats} ms, Inicio ${home} ms, Infinito ${inf} ms`);
  assert.ok(start < 8000 && stats < 4000 && home < 3000 && inf < 3000, 'screens stay fast with a huge history');
  await p.context().close();
});
