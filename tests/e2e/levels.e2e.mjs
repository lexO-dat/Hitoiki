// Niveles: levels open in order inside each difficulty, and "Continuar" jumps straight to the next one.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser, page, serve } from './helpers.mjs';

let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

const levels = JSON.parse(readFileSync(new URL('../../public/levels/queens.json', import.meta.url))).levels;
const easy = levels.map((l, i) => ({ ...l, index: i })).filter((l) => l.difficulty === 'easy');
// A player who solved the first 1999 easy levels of Coronas.
const results = Object.fromEntries(easy.slice(0, 1999).map((l) => [`lvl|queens|${l.id}`, { time: 30, hints: 0, mistakes: 0, solvedAt: 1 }]));

test('Continuar goes straight to level 2000; later levels are locked', async () => {
  const p = await page(b, { state: { results } });
  await p.goto(`${srv.url}#/lvl/queens`);
  await p.waitForSelector('.continue-level');
  assert.match(await p.textContent('.continue-level'), /Continuar.*1999 de \d+ resueltos.*Nivel 2000/);
  // The first page of the grid: solved levels, nothing locked before the frontier.
  assert.equal(await p.locator('.lvlbtn.locked').count(), 0);
  await p.click('.continue-level');
  await p.waitForSelector('.board-wrap');
  assert.match(await p.textContent('.game-meta'), /Nivel 2000/);
  assert.equal(await p.evaluate(() => location.hash), `#/lvl/queens/${easy[1999].index}`);
  await p.context().close();
});

test('a fresh game: only level 1 open, Empezar, and locked links bounce back to the list', async () => {
  const p = await page(b);
  await p.goto(`${srv.url}#/lvl/queens`);
  await p.waitForSelector('.continue-level');
  assert.match(await p.textContent('.continue-level'), /Empezar.*Nivel 1/);
  assert.equal(await p.locator('.lvlbtn:not(.locked)').count(), 1);
  assert.ok(await p.locator('.lvlbtn.locked').first().isDisabled());
  await p.goto(`${srv.url}#/lvl/queens/${easy[5].index}`);
  await p.waitForFunction(() => location.hash === '#/lvl/queens');
  await p.context().close();
});

test('solving a level opens the next one, and Niveles offers to continue that game', async () => {
  const p = await page(b);
  await p.goto(`${srv.url}#/lvl/queens/${easy[0].index}`);
  await p.waitForSelector('.board-wrap');
  for (let i = 0; i < 100 && !(await p.$('.result')); i++) {
    await p.locator('.toolbar .btn').nth(2).click({ timeout: 1000 }).catch(() => {});
    await p.waitForTimeout(40);
  }
  await p.waitForSelector('.result');
  await p.click('.result-actions .btn.primary'); // Siguiente nivel
  await p.waitForSelector('.board-wrap');
  assert.match(await p.textContent('.game-meta'), /Nivel 2/);
  await p.goto(`${srv.url}#/lvl`);
  await p.waitForSelector('.continue-level');
  assert.match(await p.textContent('.continue-level'), /Continuar con Coronas/);
  await p.click('.continue-level');
  await p.waitForSelector('.lvlbtn');
  assert.match(await p.textContent('.continue-level'), /Nivel 2/);
  assert.equal(await p.locator('.lvlbtn:not(.locked)').count(), 2);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
