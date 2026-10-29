// Damaged or hostile saved data must never leave the app unusable.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { browser, GAMES, serve } from './helpers.mjs';

let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

const seen = Object.fromEntries(GAMES.map((g) => [g, true]));
const base = (extra) => ({ schema: 2, settings: { sound: false, notify: false }, results: {}, saves: {}, tutorialsSeen: seen, ...extra });
const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

async function open(data) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(([d]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('logica-diaria:v1', d);
      sessionStorage.setItem('seeded', '1');
    }
  }, [typeof data === 'string' ? data : JSON.stringify(data)]);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  return p;
}
const alive = (p) => p.evaluate(() => document.getElementById('root').childElementCount > 0 && !document.getElementById('fatal-error'));

const BAD = {
  'invalid JSON': '{"schema":2,"results":{"a":',
  'null / numeric / unknown results': base({ results: { [`${today}|standard|zip`]: { time: 'abc', hints: 'x', mistakes: -5, solvedAt: 'now' }, 'lvl|zip|x': null, 'lvl|zip|y': 7, 'inf|standard|queens|2': { time: 1e300, solvedAt: 1e300 } } }),
  'results as array, saves as string': base({ results: [1, 2], saves: 'oops' }),
  'settings with wrong types': base({ settings: { theme: 'neon', volume: 'loud', sound: 'yes', notify: 7 } }),
  'prototype pollution attempt': '{"schema":2,"__proto__":{"polluted":1},"results":{"__proto__":{"x":1}},"settings":{"__proto__":{"z":1}}}',
  'year-3000 results': base({ results: Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].map((g) => [`3000-01-01|standard|${g}`, { time: 5, solvedAt: 32503680000000 }])) }),
};

for (const [name, data] of Object.entries(BAD)) {
  test(`damaged data (${name}): every screen and game still opens`, async () => {
    const p = await open(data);
    for (const hash of ['#/', '#/inf', '#/lvl', '#/stats', '#/settings']) {
      await p.goto(srv.url + hash);
      await p.waitForTimeout(500);
      assert.ok(await alive(p), `${hash} is blank`);
    }
    for (const g of GAMES) {
      await p.goto(`${srv.url}#/inf/standard/${g}/1`);
      await p.waitForSelector('.board-wrap', { timeout: 4000 });
    }
    assert.equal(await p.evaluate(() => ({}).polluted ?? ({}).x ?? ({}).z ?? 'clean'), 'clean');
    await p.context().close();
  });
}

test('a damaged in-progress board heals itself: the save is discarded and the board starts fresh', async () => {
  const saves = { 'inf|standard|tango|1': { state: [[9, 9]], meta: { time: 5 } }, 'inf|standard|pipes|1': { state: {}, meta: {} }, 'inf|standard|zip|1': { state: { a: 1 } } };
  const p = await open(base({ saves }));
  for (const g of ['tango', 'pipes', 'zip']) {
    await p.goto(`${srv.url}#/inf/standard/${g}/1`);
    await p.waitForSelector('.board-wrap', { timeout: 4000 });
    assert.equal(await p.$('[role="alert"]'), null, `${g} shows the crash screen`);
  }
  const left = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('logica-diaria:v1:saves') ?? '{"saves":{}}').saves));
  assert.deepEqual(left, [], 'damaged saves are removed');
  await p.context().close();
});

test('unreadable saved data is set aside, not erased', async () => {
  const p = await open('{"schema":2,"results":{"a":');
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  assert.equal(await p.evaluate(() => localStorage.getItem('logica-diaria:v1:corrupt')), '{"schema":2,"results":{"a":');
  await p.context().close();
});
