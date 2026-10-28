// Every game opens, can be solved with hints, and shows the result screen (no page errors).
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

for (const game of GAMES) {
  test(`${game}: solvable with hints, result screen shown`, async () => {
    const p = await page(b);
    await p.goto(`${srv.url}#/inf/standard/${game}/1`);
    await p.waitForSelector('.board-wrap');
    assert.ok(await solveWithHints(p), 'the board was not solved with hints');
    await p.waitForSelector('.result .praise');
    assert.match(await p.textContent('.result-actions .btn.primary'), /Nivel 2/);
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('the clock pauses while the app is in the background', async () => {
  const p = await page(b);
  await p.goto(`${srv.url}#/inf/standard/queens/2`);
  await p.waitForSelector('.timer');
  await p.waitForTimeout(2200);
  const hide = (hidden) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  await p.evaluate(hide, true);
  const before = await p.textContent('.timer');
  await p.waitForTimeout(2500);
  assert.equal(await p.textContent('.timer'), before);
  await p.evaluate(hide, false);
  await p.waitForTimeout(1500);
  assert.notEqual(await p.textContent('.timer'), before);
  await p.context().close();
});
