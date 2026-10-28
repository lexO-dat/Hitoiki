// Automated accessibility audit (axe-core): no serious or critical problems on the main screens,
// in both themes. Moderate findings (heading order) are tracked but not blocking.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { browser, dateKey, GAMES, page, serve } from './helpers.mjs';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const results = Object.fromEntries(
  [1, 2, 3, 4].flatMap((n) => ['zip', 'queens', 'tango', 'bridges'].map((g) => [`${dateKey(day(n))}|standard|${g}`, { time: 60, hints: 0, mistakes: 0, solvedAt: day(n).getTime(), solvedDay: dateKey(day(n)) }])),
);

for (const theme of ['light', 'dark']) {
  test(`axe: no serious or critical accessibility problems (${theme} theme)`, async () => {
    const p = await page(b, { state: { settings: { theme }, results } });
    const found = {};
    for (const hash of ['#/', '#/inf', '#/lvl', '#/stats', '#/settings', '#/lvl/zip', ...GAMES.slice(0, 3).map((g) => `#/inf/standard/${g}/2`)]) {
      await p.goto(srv.url + hash);
      await p.waitForSelector('#boot', { state: 'detached' }).catch(() => {});
      await p.waitForTimeout(900);
      await p.evaluate(axeSource);
      const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
      for (const v of r.violations.filter((x) => ['serious', 'critical'].includes(x.impact))) {
        (found[v.id] ??= new Set()).add(`${hash}: ${v.nodes[0].target.join(' ').slice(0, 70)}`);
      }
    }
    assert.deepEqual(Object.fromEntries(Object.entries(found).map(([k, v]) => [k, [...v].slice(0, 3)])), {});
    await p.context().close();
  });
}
