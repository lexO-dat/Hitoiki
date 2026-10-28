// Small phones: no horizontal scroll on any screen, and the game toolbar always fits.
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

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`${viewport.width}×${viewport.height}: screens fit`, async () => {
    for (const theme of ['light', 'dark']) {
      const p = await page(b, { viewport, state: { settings: { theme } } });
      const screens = ['', '#/inf', '#/lvl', '#/stats', '#/settings', ...GAMES.flatMap((g) => [`#/inf/standard/${g}/3`, `#/inf/expert/${g}/3`])];
      for (const hash of screens) {
        await p.goto(srv.url + hash);
        await p.waitForTimeout(350);
        const r = await p.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          toolbar: document.querySelector('.toolbar')?.getBoundingClientRect().bottom ?? 0,
          // The board area clips what doesn't fit: nothing may be wider than it.
          boardClipped: (() => {
            const wrap = document.querySelector('.board-wrap');
            return !!wrap && wrap.scrollWidth > wrap.clientWidth + 1;
          })(),
          h: innerHeight,
        }));
        assert.equal(r.overflow, false, `horizontal scroll on ${hash || 'home'} (${theme})`);
        assert.equal(r.boardClipped, false, `board cut off at the sides on ${hash} (${theme})`);
        assert.ok(r.toolbar <= r.h + 1, `toolbar cut off on ${hash} (${theme})`);
      }
      assert.deepEqual(p.errors, []);
      await p.context().close();
    }
  });
}
