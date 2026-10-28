import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, store } from '../src/lib/storage.js';
import { achievements, newAchievements, summarize } from '../src/lib/achievements.js';

const at = (date, hour = 12) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime();
const r = (time, extra = {}) => ({ time, hints: 0, mistakes: 0, ...extra });

test('achievements are derived from history', () => {
  const s = migrate({
    results: {
      '2026-10-20|expert|zip': r(25, { solvedAt: at('2026-10-20', 6) }),
      '2026-10-20|standard|queens': r(80, { solvedAt: at('2026-10-20', 2), hints: 1 }),
      'inf|standard|tango|25': r(60, { solvedAt: at('2026-10-21') }),
      'lvl|lits|abc': r(90, { solvedAt: at('2026-10-21') }),
    },
  });
  const t = summarize(s);
  assert.equal(t.total, 4);
  assert.equal(t.expert, 1);
  assert.equal(t.fast, 1);
  assert.equal(t.infinite, 25);
  const done = new Set(achievements(s).filter((a) => a.done).map((a) => a.id));
  for (const id of ['first', 'fast', 'expert', 'infinite', 'early', 'night']) assert.ok(done.has(id), id);
  for (const id of ['day', 'streak3', 'perfect', 'games', 'levels']) assert.ok(!done.has(id), id);
});

test('progress is capped at the goal and new ones exclude those already seen', () => {
  const s = migrate({ results: { 'inf|standard|zip|40': r(10, { solvedAt: at('2026-10-21') }) }, achievementsSeen: ['first'] });
  const inf = achievements(s).find((a) => a.id === 'infinite');
  assert.deepEqual([inf.cur, inf.goal, inf.done], [25, 25, true]);
  const fresh = newAchievements(s).map((a) => a.id);
  assert.ok(!fresh.includes('first'));
  assert.ok(fresh.includes('infinite'));
  assert.ok(store);
});

test('GAME_IDS matches the games list', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../src/data/games.js', import.meta.url), 'utf8');
  const ids = [...src.matchAll(/id: '([a-z]+)', name:/g)].map((m) => m[1]);
  const { GAME_IDS } = await import('../src/data/ids.js');
  assert.deepEqual(ids, GAME_IDS);
});
