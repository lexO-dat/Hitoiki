// Manual update check. On Android the web bundle (code, styles, levels) is updated in place from
// GitHub Releases without reinstalling; only native changes need a new APK. On the web it reloads.
import { Capacitor } from '@capacitor/core';

const REPO = 'lexO-dat/Hitoiki';
export const APP_VERSION = __APP_VERSION__; // eslint-disable-line no-undef
// Bump when the Android shell changes (new Capacitor plugin, permissions…): the app then asks for a new APK.
export const NATIVE_VERSION = 4; // 2: Preferences, Filesystem and Share plugins; 3: exact alarms for reminders; 4: home screen widget

const isNative = () => Capacitor.isNativePlatform();

const parts = (v) => String(v).replace(/^v/, '').split(/[.-]/).map((x) => Number(x) || 0);
export function isNewer(a, b) {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

// Returns the module, not the plugin object: awaiting a Capacitor plugin proxy never resolves.
const updaterModule = () => import('@capgo/capacitor-updater');

// Must run on every start: confirms the current bundle works, otherwise the plugin rolls back.
export async function markAppReady() {
  if (isNative()) await (await updaterModule()).CapacitorUpdater.notifyAppReady();
}

// Returns { status: 'latest' | 'web' | 'native' | 'error', version?, notes?, bundleUrl?, apkUrl?, message? }
export async function checkForUpdate() {
  try {
    if (!isNative()) {
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { version } = await res.json();
      return version !== APP_VERSION ? { status: 'web', version } : { status: 'latest', version };
    }
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(res.status === 403 ? 'Demasiadas consultas, inténtalo en un rato.' : `HTTP ${res.status}`);
    const rel = await res.json();
    const version = rel.tag_name.replace(/^v/, '');
    if (!isNewer(version, APP_VERSION)) return { status: 'latest', version };
    // The marker keeps its original name so APKs released before the rename still understand it.
    const native = Number(/pausa-native:\s*(\d+)/.exec(rel.body ?? '')?.[1] ?? NATIVE_VERSION);
    const asset = (re) => rel.assets.find((a) => re.test(a.name))?.browser_download_url;
    const notes = (rel.body ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
    if (native > NATIVE_VERSION) return { status: 'native', version, notes, apkUrl: asset(/\.apk$/) };
    const zip = rel.assets.find((a) => /^web-.*\.zip$/.test(a.name));
    // The updater refuses bundles without their SHA-256: GitHub reports it as the asset digest,
    // and the release notes carry it too as a fallback.
    const checksum = /^sha256:([0-9a-f]{64})$/.exec(zip?.digest ?? '')?.[1] ?? /web-sha256:\s*([0-9a-f]{64})/.exec(rel.body ?? '')?.[1];
    if (!zip || !checksum) return { status: 'native', version, notes, apkUrl: asset(/\.apk$/) };
    return { status: 'web', version, notes, bundleUrl: zip.browser_download_url, checksum, apkUrl: asset(/\.apk$/) };
  } catch (e) {
    return { status: 'error', message: e.message || 'Sin conexión' };
  }
}

// Downloads and applies an update. The app restarts on the new version when it finishes.
export async function applyUpdate(info, onProgress) {
  if (info.status === 'native') {
    // Opens the APK download in the system browser; Android installs it over the current app.
    window.location.href = info.apkUrl ?? `https://github.com/${REPO}/releases/latest`;
    return;
  }
  if (!isNative()) {
    window.location.reload();
    return;
  }
  const up = (await updaterModule()).CapacitorUpdater;
  const sub = await up.addListener('download', (e) => onProgress?.(e.percent));
  try {
    const bundle = await up.download({ url: info.bundleUrl, version: info.version, checksum: info.checksum });
    await up.set({ id: bundle.id });
  } finally {
    sub.remove();
  }
}
