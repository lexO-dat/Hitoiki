// Interactive tutorial: shown the first time each game is opened, its practice board can be solved
// (with the help button), and afterwards the real game starts and the tutorial doesn't come back.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { browser, GAMES, page, serve } from './helpers.mjs';

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
  test(`${game}: tutorial on first visit, practice board solvable, then the real game`, async () => {
    const p = await page(b, { state: { tutorialsSeen: {} }, viewport: { width: 390, height: 780 } });
    await p.goto(`${srv.url}#/inf/standard/${game}/1`);
    await p.waitForSelector('.tutorial');
    // The practice board fits inside the sheet.
    const fits = await p.evaluate(() => {
      const t = document.querySelector('.tutorial-board').getBoundingClientRect();
      return [...document.querySelectorAll('.tutorial-board *')].every((el) => {
        const r = el.getBoundingClientRect();
        return !r.width || (r.left >= t.left - 1 && r.right <= t.right + 1);
      });
    });
    assert.ok(fits, 'practice board fits');
    for (let i = 0; i < 80 && !(await p.$('.tutorial-done')); i++) {
      await p.click('.tutorial-actions .btn', { timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(60);
    }
    await p.waitForSelector('.tutorial-done', { timeout: 4000 });
    await p.click('text=Jugar el de verdad');
    await p.waitForSelector('.tutorial', { state: 'detached' });
    assert.ok(await p.isVisible('.board-wrap'));
    // Seen: reopening the game goes straight to the board.
    await p.reload();
    await p.waitForSelector('.board-wrap');
    await p.waitForTimeout(300);
    assert.equal(await p.$('.tutorial'), null);
    assert.deepEqual(p.errors, []);
    await p.context().close();
  });
}

test('the ? button offers practice from the rules sheet', async () => {
  const p = await page(b);
  await p.goto(`${srv.url}#/inf/standard/queens/1`);
  await p.waitForSelector('.board-wrap');
  await p.click('[aria-label="Reglas"]');
  await p.click('text=Practicar con un tablero de prueba');
  await p.waitForSelector('.tutorial');
  await p.click('.tutorial-head .linklike'); // Saltar
  await p.waitForSelector('.tutorial', { state: 'detached' });
  await p.context().close();
});
