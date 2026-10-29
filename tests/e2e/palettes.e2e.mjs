// Palettes earned with seals: the picker, locked ones, persistence, and the colors really change.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
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

const day = '2026-10-20';
const solved = (g) => [`${day}|standard|${g}`, { time: 60, hints: 0, mistakes: 0, solvedAt: new Date(`${day}T12:00:00`).getTime(), solvedDay: day }];
const state = (settings = {}) => ({ settings, results: Object.fromEntries(['zip', 'queens', 'tango', 'shikaku'].map(solved)) });

test('an earned palette can be picked, applies and survives a reload; a locked one explains itself', async () => {
  const p = await page(b, { state: state(), mobile: true });
  await p.goto(`${srv.url}#/settings`);
  await p.waitForSelector('.swatch');
  const paper = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  const before = await paper();

  assert.match(await p.getAttribute('.swatch[data-palette="kin"]', 'class'), /locked/);
  await p.click('.swatch[data-palette="kin"]');
  assert.match(await p.textContent('.palette-hint'), /Un mes entero/);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.palette), 'washi', 'a locked palette is not applied');

  await p.click('.swatch[data-palette="sakura"]');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.palette), 'sakura');
  assert.notEqual(await paper(), before, 'the colors changed');
  assert.equal(await p.getAttribute('.swatch[data-palette="sakura"]', 'aria-pressed'), 'true');

  await p.reload();
  await p.waitForSelector('.swatch');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.palette), 'sakura', 'remembered');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a saved choice that is not unlocked falls back to washi', async () => {
  const p = await page(b, { state: { settings: { palette: 'kin' } } });
  await p.goto(srv.url);
  await p.waitForSelector('.hero');
  assert.equal(await p.evaluate(() => document.documentElement.dataset.palette), 'washi');
  await p.context().close();
});
