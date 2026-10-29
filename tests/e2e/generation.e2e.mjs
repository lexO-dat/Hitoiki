// Boards are generated in a Web Worker: nothing freezes, it still works where Workers are not
// available, and preparing boards ahead makes opening them instant.
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

// Long main-thread tasks (over 50 ms) recorded in the page, with their length.
const watchLongTasks = () => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] });
};

test('a slow board (2+ seconds to generate) does not freeze the app', async () => {
  const p = await page(b, { init: [watchLongTasks] });
  await p.goto(`${srv.url}#/inf/expert/queens/4`); // the slowest board known: ~2.4 s on a desktop
  const started = Date.now();
  await p.waitForSelector('.puzzle-loading', { timeout: 3000 });
  // While it is prepared the page keeps animating: the loading ring spins and the main thread answers.
  const turned = await p.evaluate(async () => {
    const t = performance.now();
    let frames = 0;
    while (performance.now() - t < 1000) await new Promise((r) => requestAnimationFrame(() => (frames++, r())));
    return frames;
  });
  assert.ok(turned > 30, `only ${turned} frames in a second while generating`);
  await p.waitForSelector('.board-wrap', { timeout: 20000 });
  const long = await p.evaluate(() => window.__long);
  console.log(`   board ready after ${Date.now() - started} ms; longest main-thread task ${Math.max(0, ...long)} ms`);
  assert.ok(Math.max(0, ...long) < 600, `main thread blocked for ${Math.max(0, ...long)} ms`);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('without Worker support the board is still prepared (after the loading screen shows)', async () => {
  const p = await page(b, { init: [() => delete window.Worker] });
  await p.goto(`${srv.url}#/inf/standard/zip/2`);
  await p.waitForSelector('.board-wrap', { timeout: 10000 });
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('a broken worker falls back to the main thread', async () => {
  const p = await page(b, {
    init: [
      () => {
        window.Worker = class {
          constructor() {
            setTimeout(() => this.onerror?.(new Event('error')), 0);
          }
          postMessage() {}
          terminate() {}
        };
      },
    ],
  });
  await p.goto(`${srv.url}#/inf/standard/tango/2`);
  await p.waitForSelector('.board-wrap', { timeout: 10000 });
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('boards prepared ahead open instantly: the daily cards and the next infinite level', async () => {
  const p = await page(b);
  await p.goto(srv.url);
  await p.waitForSelector('.hero .cta');
  await p.waitForTimeout(2500); // the featured boards are prepared in the background
  await p.click('.cards .card >> nth=0');
  // Ready on the first frame: the loading screen never even exists.
  await p.waitForSelector('.board-wrap, .puzzle-loading');
  assert.equal(await p.locator('.puzzle-loading').count(), 0, 'the board was not ready');
  // Infinite: starting level n prepares n+1, so "Nivel 2" opens instantly too.
  await p.goto(`${srv.url}#/inf/standard/pipes/1`);
  await p.waitForSelector('.board-wrap');
  await p.waitForTimeout(1200);
  await p.evaluate(() => (location.hash = '#/inf/standard/pipes/2'));
  await p.waitForSelector('.board-wrap, .puzzle-loading');
  assert.equal(await p.locator('.puzzle-loading').count(), 0, 'level 2 was not ready');
  await p.context().close();
});

test('a failed preparation offers to try again', async () => {
  const p = await page(b, {
    init: [
      () => {
        let n = 0;
        window.Worker = class {
          constructor() {
            this.onmessage = null;
          }
          postMessage({ id }) {
            // The first answer is an error, then a (useless but valid) retry is never needed: fail twice.
            setTimeout(() => this.onmessage?.({ data: { id, error: 'boom' + n++ } }), 20);
          }
          terminate() {}
        };
      },
    ],
  });
  await p.goto(`${srv.url}#/inf/standard/zip/3`);
  await p.waitForSelector('[role="alert"]:has-text("No se pudo preparar")', { timeout: 5000 });
  await p.click('text=Volver');
  await p.waitForSelector('.grid-cards');
  await p.context().close();
});
