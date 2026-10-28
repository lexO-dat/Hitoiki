// Daily loop: one-tap play, stamp + next puzzle, day completion, streak milestones, past days locked, midnight.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { browser, dateKey, page, serve, solveWithHints } from './helpers.mjs';

let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

const daysAgo = (n, base = new Date()) => {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
};
const full = (d) => Object.fromEntries(['zip', 'queens', 'tango', 'bridges'].map((g) => [`${dateKey(d)}|standard|${g}`, { time: 70, hints: 0, mistakes: 0, solvedAt: d.getTime() }]));

test('play from the hero, seal + day progress + next puzzle, then share', async () => {
  const p = await page(b);
  await p.goto(srv.url);
  await p.waitForSelector('.hero .cta');
  const first = (await p.textContent('.hero .cta')).replace('Empezar con', '').trim();
  await p.click('.hero .cta');
  assert.match(await p.textContent('.game-head h1'), new RegExp(first));
  assert.ok(await solveWithHints(p));
  await p.waitForSelector('.day-progress');
  assert.equal(await p.textContent('.day-progress b'), '1 de 4 para tu racha');
  assert.ok(await p.$('.seal.stamp'));
  assert.match(await p.textContent('.result-actions .btn.primary'), /^Siguiente: /);
  await p.click('text=Compartir');
  await p.waitForSelector('.result-actions .muted');
  assert.match(await p.evaluate(() => navigator.clipboard.readText()), /Hitoiki/);
  await p.click('.result-actions .btn.primary');
  await p.waitForSelector('.game-head');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('completing the 4th puzzle seals the day; 7 days earn a rest day', async () => {
  const today = new Date();
  const results = Object.assign({}, ...[1, 2, 3, 4, 5, 6].map((n) => full(daysAgo(n))));
  for (const g of ['shikaku', 'queens', 'lits']) results[`${dateKey(today)}|standard|${g}`] = { time: 50, hints: 0, mistakes: 0, solvedAt: today.getTime() };
  const p = await page(b, { state: { results } });
  await p.goto(`${srv.url}#/play/${dateKey(today)}/standard/tango`);
  assert.ok(await solveWithHints(p));
  await p.waitForSelector('.milestone');
  assert.equal(await p.textContent('.day-progress b'), 'Racha de 7 días');
  assert.match(await p.textContent('.milestone'), /7 días seguidos.*descanso/);
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  assert.equal(await p.textContent('.hero h2'), 'Día completo');
  assert.match(await p.textContent('.streak-chip'), /^7/);
  assert.ok(await p.$('.streak-chip .rests'), 'rest day shown on the chip');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a rest day covers one missed day', async () => {
  const results = Object.assign({}, ...[2, 3, 4, 5, 6, 7, 8].map((n) => full(daysAgo(n))));
  Object.assign(results, full(new Date()));
  const p = await page(b, { state: { results } });
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  assert.match(await p.textContent('.streak-chip'), /^8/);
  await p.context().close();
});

test('past days are history only; old links show the closed screen; midnight moves to the new day', async () => {
  const p = await page(b);
  await p.clock.install({ time: new Date('2026-10-28T23:58:00') });
  await p.goto(srv.url);
  await p.waitForSelector('.cards .card');
  await p.click('.day[aria-label="27 de octubre"]');
  assert.ok(await p.$$eval('.cards .card, .grid-cards .mini', (els) => els.every((e) => e.disabled)));
  assert.equal(await p.textContent('.hero h2'), 'Historial');
  await p.evaluate(() => (location.hash = '/play/2026-10-27/standard/zip'));
  await p.waitForSelector('.screen.closed');
  await p.click('text=Puzzles de hoy');
  await p.click('.hero .cta');
  await p.waitForSelector('.game-head');
  await p.clock.fastForward('03:00');
  await p.waitForSelector('.screen.closed', { timeout: 5000 });
  await p.click('text=Puzzles de hoy');
  assert.match(await p.textContent('.hero .eyebrow'), /29 de octubre/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
