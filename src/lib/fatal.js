// Last-resort error display: if the app fails to start, show what happened instead of a blank screen,
// so a screenshot is enough to diagnose it. Errors after the app has rendered are only logged.
const VERSION = __APP_VERSION__; // eslint-disable-line no-undef

export function showFatalError(err, { soft = false } = {}) {
  const message = err instanceof Error ? `${err.name}: ${err.message}\n${(err.stack || '').split('\n').slice(1, 6).join('\n')}` : String(err);
  console.error(err);
  // Give React a moment: if something rendered, the app is alive and this error is not fatal.
  setTimeout(() => {
    const root = document.getElementById('root');
    if (root && root.childElementCount > 0) return;
    if (soft && !document.getElementById('fatal-error') && !/is not implemented|Capacitor/i.test(message)) return;
    let box = document.getElementById('fatal-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'fatal-error';
      box.style.cssText =
        'position:fixed;inset:0;padding:24px;background:#f3eee4;color:#2a2622;font:14px/1.5 monospace;overflow:auto;z-index:9999';
      box.innerHTML = '<h2 style="font-family:Georgia,serif;margin:0 0 8px">Hitoiki no pudo iniciar</h2><p>Envía una captura de esta pantalla.</p><pre id="fatal-error-text" style="white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px;border:1px solid #e0dcd9"></pre>';
      document.body.appendChild(box);
    }
    document.getElementById('fatal-error-text').textContent += `v${VERSION}\n${message}\n\n`;
  }, 1500);
}
