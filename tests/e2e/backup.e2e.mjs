// Progress backup on Android, with a simulated native bridge that has a working Preferences store.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { browser, GAMES, page, serve, solveWithHints } from './helpers.mjs';

let srv, b;
before(async () => {
  srv = await serve();
  b = await browser();
});
after(async () => {
  await b?.close();
  await srv?.close();
});

// A bridge whose Preferences really stores values (window.__prefs); Filesystem and Share are recorded.
// `arg` = { prefs: {key: value}, shareCancels: bool }
const bridge = (arg) => {
  window.androidBridge = { postMessage() {} };
  const methods = (names) => names.map((name) => ({ name, rtype: 'promise' }));
  // The store survives page reloads, like the real SharedPreferences.
  window.__prefs = JSON.parse(sessionStorage.getItem('__prefs') ?? 'null') ?? { ...(arg.prefs ?? {}) };
  const persist = () => sessionStorage.setItem('__prefs', JSON.stringify(window.__prefs));
  persist();
  window.__log = [];
  window.Capacitor = {
    PluginHeaders: [
      { name: 'Preferences', methods: methods(['get', 'set', 'remove', 'keys']) },
      { name: 'Filesystem', methods: methods(['readFile', 'writeFile', 'mkdir', 'stat']) },
      { name: 'Share', methods: methods(['share']) },
      { name: 'CapacitorUpdater', methods: methods(['notifyAppReady', 'download', 'set', 'addListener']) },
      { name: 'LocalNotifications', methods: methods(['schedule', 'getPending', 'cancel', 'checkPermissions', 'requestPermissions']) },
      { name: 'Haptics', methods: methods(['impact', 'notification']) },
      { name: 'App', methods: methods(['exitApp', 'addListener']) },
      { name: 'HitoikiWidget', methods: methods(['refresh']) },
    ],
    nativePromise(plugin, method, opts) {
      window.__log.push([plugin, method, opts?.key ?? opts?.directory ?? '']);
      if (plugin === 'Preferences') {
        if (method === 'get') return Promise.resolve({ value: window.__prefs[opts.key] ?? null });
        if (method === 'set') return ((window.__prefs[opts.key] = opts.value), persist(), Promise.resolve({}));
        if (method === 'remove') return (delete window.__prefs[opts.key], persist(), Promise.resolve({}));
      }
      if (plugin === 'Filesystem' && method === 'writeFile') return Promise.resolve({ uri: `file:///cache/${opts.path}` });
      if (plugin === 'Share' && method === 'share') return arg.shareCancels ? Promise.reject(new Error('Share canceled')) : Promise.resolve({});
      if (method === 'getPending') return Promise.resolve({ notifications: [] });
      if (method === 'checkPermissions' || method === 'requestPermissions') return Promise.resolve({ display: 'denied' });
      return Promise.resolve({});
    },
    nativeCallback() {
      return 'cb';
    },
  };
};

const r = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`inf|standard|zip|${i + 1}`, { time: 40 + i, hints: 0, mistakes: 0, solvedAt: Date.now() - i * 1000, solvedDay: '2026-10-20' }]));
const state = (results, extra = {}) => JSON.stringify({ schema: 2, settings: { sound: false, notify: false, ...(extra.settings ?? {}) }, results, saves: {}, tutorialsSeen: extra.tutorialsSeen ?? { zip: true } });
const prefsOf = (p) => p.evaluate(() => window.__prefs);
const keysIn = async (p) => Object.keys(JSON.parse((await prefsOf(p))['pausa-store']).results);

async function open(opts, prefs, shareCancels = false) {
  const p = await page(b, { state: opts, init: [bridge, { prefs, shareCancels }] });
  p.on('dialog', (d) => d.accept());
  await p.goto(srv.url);
  await p.waitForSelector('.hero', { timeout: 8000 });
  await p.waitForTimeout(900);
  return p;
}

test('a new phone: Android returns the mirror, and the progress and settings come back with a notice', async () => {
  const p = await open({ tutorialsSeen: {} }, { 'pausa-store': state(r(6), { settings: { theme: 'dark' } }) });
  assert.equal(await p.locator('.toast').textContent(), 'Recuperamos tu progreso: 6 puzzles.');
  const local = await p.evaluate(() => JSON.parse(localStorage.getItem('logica-diaria:v1')));
  assert.equal(Object.keys(local.results).length, 6);
  assert.equal(local.settings.theme, 'dark', 'settings of the old phone come with it');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('progress is only ever added: a device with its own progress gets the mirror merged in', async () => {
  const own = Object.fromEntries(Object.entries(r(3)).map(([k, v]) => [k.replace('zip', 'tango'), v]));
  const p = await open({ results: own, tutorialsSeen: { tango: true } }, { 'pausa-store': state(r(4)) });
  const local = await p.evaluate(() => JSON.parse(localStorage.getItem('logica-diaria:v1')));
  assert.equal(Object.keys(local.results).length, 7, 'own 3 + mirror 4');
  assert.equal(local.settings.theme ?? 'system', 'system', 'own settings are kept');
  assert.match(await p.locator('.toast').textContent(), /4 puzzles/);
  await p.context().close();
});

test('a damaged mirror does not matter: the day-before slot recovers the progress', async () => {
  const p = await open({ tutorialsSeen: {} }, { 'pausa-store': '{"schema":2,"results":{"x":', 'pausa-store:prev': state(r(5)) });
  const local = await p.evaluate(() => JSON.parse(localStorage.getItem('logica-diaria:v1')));
  assert.equal(Object.keys(local.results).length, 5);
  await p.context().close();
});

test('playing a board does not rewrite the mirror move by move; solving it does, once', async () => {
  const p = await open({}, { 'pausa-store': state(r(2)) });
  await p.evaluate(() => (window.__log.length = 0));
  await p.goto(`${srv.url}#/inf/standard/queens/1`);
  await p.waitForSelector('.board-wrap');
  for (let i = 0; i < 6; i++) {
    await p.locator('.qcell').nth(i).click();
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(1500);
  const sets = () => p.evaluate(() => window.__log.filter(([pl, m, k]) => pl === 'Preferences' && m === 'set' && k === 'pausa-store').length);
  assert.equal(await sets(), 0, 'no mirror writes while only the in-progress board changes');
  assert.ok(await solveWithHints(p));
  await p.waitForTimeout(1500);
  assert.ok((await sets()) >= 1 && (await sets()) <= 2, `solving writes the mirror (${await sets()} writes)`);
  assert.ok((await keysIn(p)).includes('inf|standard|queens|1'));
  await p.context().close();
});

test('the day-before slot is refreshed once a day, never per write', async () => {
  const p = await open({}, { 'pausa-store': state(r(3)) });
  const prefs = await prefsOf(p);
  assert.equal(JSON.parse(prefs['pausa-store:prev']).results['inf|standard|zip|1'].time, 40, 'yesterday slot holds the earlier mirror');
  assert.match(prefs['pausa-store:prevday'], /^\d{4}-\d{2}-\d{2}$/);
  await p.context().close();
});

test('export goes through the cache folder and the share sheet (never a public folder)', async () => {
  const p = await open({ results: r(3), tutorialsSeen: { zip: true } }, {});
  await p.goto(`${srv.url}#/settings`);
  await p.click('text=Exportar');
  await p.waitForSelector('.footnote:has-text("Copia lista")');
  const log = await p.evaluate(() => window.__log);
  const write = log.find(([pl, m]) => pl === 'Filesystem' && m === 'writeFile');
  assert.equal(write[2], 'CACHE');
  assert.ok(log.some(([pl, m]) => pl === 'Share' && m === 'share'));
  assert.match(await p.textContent('.row:has-text("Copia de seguridad") small'), /Última copia/);
  await p.context().close();
});

test('closing the share sheet without saving does not count as a backup', async () => {
  const p = await open({ results: r(3), tutorialsSeen: { zip: true } }, {}, true);
  await p.goto(`${srv.url}#/settings`);
  await p.click('text=Exportar');
  await p.waitForTimeout(600);
  assert.equal(await p.locator('.row:has-text("Copia de seguridad") small:has-text("Última copia")').count(), 0);
  await p.context().close();
});

test('erasing progress also erases the mirror, so it does not come back', async () => {
  const p = await open({ results: r(3), tutorialsSeen: { zip: true } }, { 'pausa-store': state(r(3)), 'pausa-store:prev': state(r(3)) });
  await p.goto(`${srv.url}#/settings`);
  await p.click('.row:has-text("Borrar progreso") .btn');
  await p.waitForTimeout(800);
  const prefs = await prefsOf(p);
  assert.equal(Object.keys(JSON.parse(prefs['pausa-store']).results).length, 0);
  assert.equal(prefs['pausa-store:prev'], undefined);
  await p.goto(`${srv.url}#/`);
  await p.reload();
  await p.waitForSelector('.hero');
  await p.waitForTimeout(700);
  assert.equal(await p.locator('.toast').count(), 0, 'nothing is restored after an explicit reset');
  await p.context().close();
});
