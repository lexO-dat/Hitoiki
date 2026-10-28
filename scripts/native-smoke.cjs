// Smoke test for the Android build without a device: fakes Capacitor's injected native bridge in Chromium
// and checks the app renders whether plugins answer normally or never answer at all.
// Usage: npm run build && npx vite preview --port 4175  (in another terminal), then npm run smoke:native
const { chromium } = require('playwright');
const URL = process.env.SMOKE_URL ?? 'http://localhost:4175/';
// Simulates Capacitor's injected Android bridge. mode=hang: plugin calls never answer; mode=ok: they answer.
const inject = (mode) => `
  window.androidBridge = { postMessage() {} };
  const methods = (names) => names.map((name) => ({ name, rtype: 'promise' }));
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
      window.__calls = (window.__calls || []).concat(plugin + '.' + method);
      if (${JSON.stringify(mode)} === 'hang') return new Promise(() => {});
      if (method === 'get') return Promise.resolve({ value: null });
      if (method === 'readFile') return Promise.reject(new Error('File does not exist'));
      if (method === 'getPending') return Promise.resolve({ notifications: [] });
      if (method === 'checkPermissions') return Promise.resolve({ display: 'prompt' });
      return Promise.resolve({});
    },
    nativeCallback() { return 'cb'; },
  };`;
(async () => {
  const b = await chromium.launch(); const res = {};
  for (const mode of ['hang', 'ok']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(inject(mode));
    const p = await ctx.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await p.goto(URL); await p.waitForTimeout(3000);
    res[mode] = { rendered: await p.locator('.logo-word').isVisible().catch(() => false), bodyText: (await p.evaluate(() => document.body.innerText)).slice(0, 60), calls: await p.evaluate(() => window.__calls || []), errors };
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1)); await b.close();
  const failed = Object.entries(res).filter(([, r]) => !r.rendered || r.errors.length);
  if (failed.length) { console.error('FAILED:', failed.map(([m]) => m).join(', ')); process.exit(1); }
})();
