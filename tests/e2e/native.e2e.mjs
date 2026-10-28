// The Android build without a device: fakes Capacitor's injected native bridge in Chromium.
// The app must render whether plugins answer or hang, and schedule the reminders once allowed.
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

// mode: 'hang' (plugin calls never answer) | 'granted' (they answer; notifications allowed after asking)
const bridge = (mode) => {
  window.androidBridge = { postMessage() {} };
  const methods = (names) => names.map((name) => ({ name, rtype: 'promise' }));
  window.__calls = [];
  window.Capacitor = {
    PluginHeaders: [
      { name: 'Preferences', methods: methods(['get', 'set', 'remove', 'keys']) },
      { name: 'Filesystem', methods: methods(['readFile', 'writeFile', 'mkdir', 'stat']) },
      { name: 'CapacitorUpdater', methods: methods(['notifyAppReady', 'download', 'set', 'addListener']) },
      { name: 'LocalNotifications', methods: methods(['schedule', 'getPending', 'cancel', 'checkPermissions', 'requestPermissions']) },
      { name: 'Haptics', methods: methods(['impact', 'notification']) },
      { name: 'App', methods: methods(['exitApp', 'addListener']) },
    ],
    nativePromise(plugin, method, opts) {
      window.__calls.push(`${plugin}.${method}`);
      if (mode === 'hang') return new Promise(() => {});
      if (method === 'get') return Promise.resolve({ value: null });
      if (method === 'readFile') return Promise.reject(new Error('File does not exist'));
      if (method === 'getPending') return Promise.resolve({ notifications: [] });
      if (method === 'requestPermissions') window.__granted = true;
      if (method === 'checkPermissions' || method === 'requestPermissions') return Promise.resolve({ display: window.__granted ? 'granted' : 'prompt' });
      if (method === 'schedule') window.__scheduled = opts.notifications.map((n) => ({ id: n.id, at: new Date(n.schedule.at).getTime() }));
      return Promise.resolve({});
    },
    nativeCallback() {
      return 'cb';
    },
  };
};

for (const mode of ['hang', 'granted']) {
  test(`renders with native plugins that ${mode === 'hang' ? 'never answer' : 'answer'}`, async () => {
    const p = await page(b, { state: { settings: { notify: true } }, init: [bridge, mode] });
    await p.goto(srv.url);
    await p.waitForSelector('.logo-word', { timeout: 5000 });
    await p.waitForTimeout(1500);
    assert.deepEqual(p.errors, []);
    if (mode === 'granted') {
      const { calls, scheduled, now } = await p.evaluate(() => ({ calls: window.__calls, scheduled: window.__scheduled, now: Date.now() }));
      assert.ok(calls.includes('LocalNotifications.requestPermissions'), 'asks for permission on first start');
      const daily = scheduled.filter((n) => n.id >= 100 && n.id < 107).map((n) => new Date(n.at));
      assert.equal(daily.length, 7);
      assert.ok(daily.every((d) => d.getHours() === 0 && d.getMinutes() === 1), 'new puzzles at 00:01');
      const away = scheduled.find((n) => n.id === 300);
      if (away) assert.ok(Math.abs(away.at - now - 8 * 3600e3) < 60e3, 'away reminder 8 hours later');
    }
    await p.context().close();
  });
}
