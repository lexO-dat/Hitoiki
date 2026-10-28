// Bottom bar, page transitions, swipe between sections and the loading screen.
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

test('loading screen shows first, then fades away', async () => {
  const p = await page(b);
  await p.goto(srv.url);
  assert.ok(await p.isVisible('#boot'), 'loading screen visible on start');
  await p.waitForSelector('#boot', { state: 'detached', timeout: 5000 });
  assert.ok(await p.isVisible('.hero'));
  await p.context().close();
});

test('the bar stays put while switching sections and the pill follows', async () => {
  const p = await page(b);
  await p.goto(srv.url);
  await p.waitForSelector('#boot', { state: 'detached' });
  await p.evaluate(() => (document.querySelector('.nav').dataset.mark = 'same'));
  for (const label of ['Infinito', 'Niveles', 'Cuaderno', 'Diario']) {
    await p.click(`.nav button:has-text("${label}")`);
    await p.waitForFunction((l) => document.querySelector('.nav .on')?.textContent === l, label);
    // Sampled during the page transition: the bar is the same element and fully opaque.
    const s = await p.evaluate(() => {
      const nav = document.querySelector('.nav');
      return { mark: nav?.dataset.mark, opacity: getComputedStyle(nav).opacity, active: nav.querySelector('.on')?.textContent };
    });
    assert.deepEqual(s, { mark: 'same', opacity: '1', active: label });
  }
  await p.context().close();
});

const swipe = (p, fromX, toX, y = 400) =>
  p.evaluate(
    ([fromX, toX, y]) => {
      const el = document.elementFromPoint(fromX, y) ?? document.body;
      const touch = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(fromX)], changedTouches: [touch(fromX)] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(toX)] }));
    },
    [fromX, toX, y],
  );

test('swiping sideways moves between sections, but not inside a game', async () => {
  const p = await page(b);
  await p.goto(srv.url);
  await p.waitForSelector('#boot', { state: 'detached' });
  await swipe(p, 300, 100);
  await p.waitForFunction(() => location.hash === '#/inf');
  await swipe(p, 300, 100);
  await p.waitForFunction(() => location.hash === '#/lvl');
  await swipe(p, 100, 300);
  await p.waitForFunction(() => location.hash === '#/inf');
  await swipe(p, 150, 170); // too short: nothing happens
  await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => location.hash), '#/inf');
  await p.goto(`${srv.url}#/inf/standard/queens/1`);
  await p.waitForSelector('.board-wrap');
  await swipe(p, 300, 100);
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => location.hash), '#/inf/standard/queens/1');
  assert.equal(await p.$('.nav'), null, 'no bar inside a game');
  await p.context().close();
});

test('no visible scrollbars', async () => {
  const p = await page(b, { viewport: { width: 390, height: 600 } });
  await p.goto(`${srv.url}#/stats`);
  await p.waitForSelector('#boot', { state: 'detached' });
  const w = await p.evaluate(() => innerWidth - document.documentElement.clientWidth);
  assert.equal(w, 0);
  await p.context().close();
});
