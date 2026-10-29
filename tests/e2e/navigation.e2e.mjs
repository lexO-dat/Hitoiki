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

test('the bar stays put while switching sections and the pill follows (phone)', async () => {
  const p = await page(b, { mobile: true });
  await p.goto(srv.url);
  await p.waitForSelector('#boot', { state: 'detached' });
  await p.evaluate(() => (document.querySelector('.nav').dataset.mark = 'same'));
  for (const label of ['Infinito', 'Niveles', 'Cuaderno', 'Diario']) {
    await p.click(`.nav button:has-text("${label}")`);
    await p.waitForFunction((l) => document.querySelector('.nav .on')?.textContent === l, label);
    // Sampled on every frame of the page transition: same element, fully opaque, on screen at the bottom.
    const s = await p.evaluate(async () => {
      const seen = { mark: new Set(), opacity: new Set(), offscreen: 0 };
      const t0 = performance.now();
      while (performance.now() - t0 < 500) {
        const nav = document.querySelector('.nav');
        seen.mark.add(nav?.dataset.mark);
        seen.opacity.add(getComputedStyle(nav).opacity);
        const r = nav.getBoundingClientRect();
        const vw = visualViewport.width;
        if (r.bottom > innerHeight || r.top < innerHeight - 140 || r.left < 0 || r.right > vw + 1 || document.documentElement.scrollWidth > vw + 1) seen.offscreen++;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return { mark: [...seen.mark].join(), opacity: [...seen.opacity].join(), offscreen: seen.offscreen, active: document.querySelector('.nav .on')?.textContent };
    });
    assert.deepEqual(s, { mark: 'same', opacity: '1', offscreen: 0, active: label });
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

test('every section opens at the top, even if the previous one was still scrolling (fling)', async () => {
  const p = await page(b, { viewport: { width: 390, height: 700 } });
  await p.goto(`${srv.url}#/stats`);
  await p.waitForSelector('#boot', { state: 'detached' });
  for (const target of ['#/', '#/inf', '#/lvl', '#/stats']) {
    await p.evaluate(() => window.scrollTo(0, 500));
    // A smooth scroll still running when the section changes: like the momentum of a swipe on Android.
    await p.evaluate((t) => {
      window.scrollTo({ top: 3000, behavior: 'smooth' });
      location.hash = t;
    }, target);
    await p.waitForTimeout(900);
    assert.equal(await p.evaluate(() => Math.round(scrollY)), 0, `${target} did not open at the top`);
  }
  await p.context().close();
});

test('headers stay sticky while scrolling', async () => {
  const p = await page(b, { mobile: true, viewport: { width: 390, height: 600 } });
  await p.goto(`${srv.url}#/lvl`);
  await p.waitForSelector('#boot', { state: 'detached' });
  await p.evaluate(() => window.scrollTo(0, 800));
  await p.waitForTimeout(100);
  assert.ok((await p.evaluate(() => scrollY)) > 0, 'the page scrolls');
  assert.ok(Math.abs(await p.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().top)) < 2, 'the header stays at the top');
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

test('Back never walks through the sections: tabs replace, screens pop', async () => {
  const p = await page(b, { mobile: true });
  await p.goto(srv.url);
  await p.waitForSelector('#boot', { state: 'detached' });
  const start = await p.evaluate(() => history.length);
  for (const label of ['Infinito', 'Niveles', 'Cuaderno', 'Diario', 'Niveles']) {
    await p.click(`.nav button:has-text("${label}")`);
    await p.waitForFunction((l) => document.querySelector('.nav .on')?.textContent === l, label);
  }
  assert.equal(await p.evaluate(() => history.length), start, 'switching sections adds no history entries');
  // A screen opened from a section is one entry on top: its arrow returns to where it came from.
  await p.click('.card >> nth=0');
  await p.waitForSelector('.icon-btn[aria-label="Volver"]');
  assert.equal(await p.evaluate(() => history.length), start + 1);
  await p.click('.icon-btn[aria-label="Volver"]');
  await p.waitForFunction(() => document.querySelector('.nav .on')?.textContent === 'Niveles');
  assert.equal(await p.evaluate(() => location.hash), '#/lvl');
  // Opened directly (no history behind it), the arrow goes to its parent instead of leaving.
  await p.goto(`${srv.url}#/lvl/${await p.evaluate(() => 'shikaku')}`);
  await p.reload();
  await p.waitForSelector('.icon-btn[aria-label="Volver"]');
  await p.click('.icon-btn[aria-label="Volver"]');
  await p.waitForFunction(() => location.hash === '#/lvl');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});
