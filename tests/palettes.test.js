import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrate } from '../src/lib/storage.js';
import { achievements, activePalette, unlockedPalettes } from '../src/lib/achievements.js';
import { PALETTES, PALETTE_IDS } from '../src/data/palettes.js';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

// Tokens of one palette in one mode, read from styles.css (palette values over the base ones).
function tokens(mode, palette) {
  const grab = (sel) => {
    const m = css.match(new RegExp(`${sel.replace(/[[\]'().]/g, '\\$&')} \\{([^}]*)\\}`));
    return Object.fromEntries([...(m?.[1] ?? '').matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim().replace(/\s*\/\*.*$/, '')]));
  };
  const base = grab(':root');
  const out = { ...base, ...(mode === 'dark' ? grab(":root[data-theme='dark']") : {}) };
  if (palette !== 'washi') Object.assign(out, grab(mode === 'dark' ? `:root[data-theme='dark'][data-palette='${palette}']` : `:root[data-palette='${palette}']`));
  return out;
}

const lum = (hex) => {
  if (hex.length === 4) hex = `#${[...hex.slice(1)].map((c) => c + c).join('')}`;
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('every palette keeps text and the accent readable, in light and dark', () => {
  for (const mode of ['light', 'dark']) {
    for (const id of PALETTE_IDS) {
      const t = tokens(mode, id);
      for (const bg of ['paper', 'paper-2', 'paper-3']) {
        assert.ok(contrast(t.ink, t[bg]) >= 7, `${id}/${mode}: ink on ${bg}`);
        assert.ok(contrast(t['ink-2'], t[bg]) >= 4.5, `${id}/${mode}: ink-2 on ${bg} = ${contrast(t['ink-2'], t[bg]).toFixed(2)}`);
        assert.ok(contrast(t.shu, t[bg]) >= (bg === 'paper-3' ? 3 : 4.5), `${id}/${mode}: accent on ${bg} = ${contrast(t.shu, t[bg]).toFixed(2)}`);
      }
      assert.ok(contrast(t.shu, t['shu-soft']) >= 3, `${id}/${mode}: accent on its soft tint`);
      assert.ok(contrast(t['on-shu'], t.shu) >= 3, `${id}/${mode}: text over the accent = ${contrast(t['on-shu'], t.shu).toFixed(2)}`);
    }
  }
});

test('palettes are unlocked by existing seals, washi is free', () => {
  const seals = new Set(achievements(migrate({})).map((a) => a.id));
  assert.equal(PALETTES.find((p) => p.id === 'washi').seal, null);
  for (const p of PALETTES) if (p.seal) assert.ok(seals.has(p.seal), `${p.id} needs a real seal (${p.seal})`);
  assert.equal(new Set(PALETTES.map((p) => p.seal).filter(Boolean)).size, PALETTES.length - 1, 'one seal per palette');
});

test('a palette that is not unlocked is never applied', () => {
  const none = migrate({ settings: { palette: 'kin' } });
  assert.equal(none.settings.palette, 'kin', 'the choice is stored');
  assert.equal(activePalette(none), 'washi', 'but not shown');
  assert.deepEqual(unlockedPalettes(none).filter((p) => p.unlocked).map((p) => p.id), ['washi']);

  const day = {};
  for (const g of ['zip', 'queens', 'tango', 'shikaku']) day[`2026-10-20|standard|${g}`] = { time: 60, hints: 0, mistakes: 0, solvedAt: new Date('2026-10-20T12:00:00').getTime(), solvedDay: '2026-10-20' };
  const sealed = migrate({ settings: { palette: 'sakura' }, results: day });
  assert.equal(activePalette(sealed), 'sakura');
  assert.equal(migrate({ settings: { palette: 'nope' } }).settings.palette, 'washi', 'unknown ids are dropped');
});
