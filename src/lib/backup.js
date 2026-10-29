// Keeps the player's progress safe. Layers, from closest to the app to farthest:
//  1. localStorage (the working copy).
//  2. Native mirror (Android SharedPreferences "CapacitorStorage"): `pausa-store` is the latest copy and
//     `pausa-store:prev` the one from the previous day. It is restored if the WebView storage comes
//     back empty, and Android Auto Backup uploads that file to the player's Google account (see
//     res/xml/backup_rules.xml), so it also survives uninstalling and moving to a new phone.
//  3. Manual export / import of a .json file, through the share sheet (Drive, Files, mail) or a download.
// Restoring always MERGES with what is already on the device: progress is only ever added, never replaced.
// All plugins are loaded lazily and every failure is swallowed: backups must never break the game.
import { Capacitor } from '@capacitor/core';
import { countsForDay, isEmpty, migrateReport, SCHEMA, store } from './storage.js';
import { indexOf } from './indexes.js';
import { LIMITS } from './sanitize.js';
import { todayKey } from './dates.js';

const isNative = () => Capacitor.isNativePlatform();
const PREF_KEY = 'pausa-store'; // internal key from the first release: keep it so old data is found
const PREV_KEY = `${PREF_KEY}:prev`;
const PREV_DAY_KEY = `${PREF_KEY}:prevday`;

// Helpers return the plugin MODULES, never the plugin objects: Capacitor plugins are proxies that treat
// any property (including `then`) as a native method, so returning one from an async function or awaiting
// it leaves the promise pending forever.
const prefsModule = () => import('@capacitor/preferences').catch(() => null);

export function serialize(state = store.get()) {
  return JSON.stringify({ app: 'hitoiki', schema: SCHEMA, exportedAt: new Date().toISOString(), data: state });
}

// Parses and validates a backup. `report.dropped` counts damaged entries that were left out.
export function parseBackup(text, report = {}) {
  if (typeof text !== 'string' || text.length > LIMITS.importBytes) throw new Error('El archivo es demasiado grande para ser una copia de Hitoiki.');
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo está dañado o no es una copia de Hitoiki.');
  }
  // 'pausa' backups come from versions released before the rename; a raw store object is accepted too.
  const data = json?.app === 'hitoiki' || json?.app === 'pausa' ? json.data : json;
  if (!data || typeof data !== 'object' || Array.isArray(data) || (!data.results && !data.settings)) throw new Error('El archivo no es una copia de Hitoiki.');
  const { state, dropped } = migrateReport(data);
  report.dropped = dropped;
  return state;
}

// Union of both progress sets: nothing solved on either side is lost. `settings: 'incoming'` takes the
// other copy's settings (used when this device has never been played, e.g. a fresh install).
export function merge(current, incoming, { settings = 'current' } = {}) {
  const out = migrateReport(current).state;
  if (settings === 'incoming') out.settings = { ...out.settings, ...incoming.settings };
  for (const [k, v] of Object.entries(incoming.results)) {
    const cur = out.results[k];
    if (!cur) {
      out.results[k] = v;
      continue;
    }
    const best = (v.time ?? Infinity) < (cur.time ?? Infinity) ? v : cur;
    const other = best === v ? cur : v;
    // A daily puzzle solved on its own day keeps that credit even when the faster time came from a late solve.
    out.results[k] = countsForDay(k, other) && !countsForDay(k, best) ? { ...best, solvedDay: other.solvedDay } : best;
  }
  for (const [k, v] of Object.entries(incoming.saves)) if (!out.results[k] && !out.saves[k]) out.saves[k] = v;
  out.tutorialsSeen = { ...incoming.tutorialsSeen, ...out.tutorialsSeen };
  out.achievementsSeen = [...new Set([...(incoming.achievementsSeen ?? []), ...(out.achievementsSeen ?? [])])];
  if (!out.achievementsSeen.length) delete out.achievementsSeen;
  return out;
}

const count = (s) => indexOf(s.results).total;
const neverPlayed = (s) => count(s) === 0 && Object.keys(s.tutorialsSeen).length === 0;

// What the player is told when progress comes back on its own (new phone, reinstall, wiped storage).
const restoreListeners = new Set();
export const onRestore = (fn) => (restoreListeners.add(fn), () => restoreListeners.delete(fn));

let mirrorTimer = null;
let mirroredCount = 0; // results in the latest mirror: a state far smaller than this is not trusted
let lastFingerprint = '';

// Resolves to `fallback` if a native call takes too long, so nothing can ever hang the app.
const withTimeout = (promise, ms, fallback = null) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

// Only what is worth keeping changes this: solving, settings, tutorials, seals. A board saved move by
// move doesn't, so a long game doesn't rewrite megabytes of preferences every second.
const fingerprint = (s) => `${count(s)}|${Object.keys(s.tutorialsSeen).length}|${(s.achievementsSeen ?? []).length}|${JSON.stringify(s.settings)}|${indexOf(s.results).timeSum}`;

async function writeMirror(state) {
  const P = (await prefsModule())?.Preferences;
  if (!P) return;
  await P.set({ key: PREF_KEY, value: JSON.stringify(state) });
  mirroredCount = count(state);
}

// Never let an empty state, or a suspiciously smaller one, overwrite the mirror (for example while a
// restore hasn't finished). Only an explicit reset may do that, through wipeBackups().
function scheduleBackups(state, { now = false } = {}) {
  if (isEmpty(state)) return;
  if (mirroredCount > 20 && count(state) < mirroredCount / 2) return;
  const fp = fingerprint(state);
  if (fp === lastFingerprint) return;
  clearTimeout(mirrorTimer);
  const run = () => {
    lastFingerprint = fp;
    writeMirror(state).catch(() => {});
  };
  if (now) run();
  else mirrorTimer = setTimeout(run, 800);
}

const readSlot = async (P, key) => {
  try {
    const raw = (await withTimeout(P.get({ key }), 4000))?.value;
    return raw ? { raw, ...migrateReport(JSON.parse(raw)) } : null;
  } catch {
    return null; // unreadable slot: the other one may still be fine
  }
};

// Runs in the background after the first render (never blocks startup). Both mirror slots are merged
// into what is on the device, so anything played meanwhile is kept too.
export async function initBackups() {
  if (!isNative()) {
    // Ask the browser not to evict our storage when the device runs low on space.
    navigator.storage?.persist?.().catch(() => {});
    return;
  }
  store.onWrite((s) => scheduleBackups(s));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && scheduleBackups(store.get(), { now: true }));
  try {
    const P = (await prefsModule())?.Preferences;
    if (P) {
      const [cur, prev] = await Promise.all([readSlot(P, PREF_KEY), readSlot(P, PREV_KEY)]);
      // Once a day the previous mirror becomes the "yesterday" slot, so one bad write can't destroy both.
      const stamp = (await withTimeout(P.get({ key: PREV_DAY_KEY }), 4000))?.value;
      if (cur && stamp !== todayKey() && count(cur.state) > 0) {
        await P.set({ key: PREV_KEY, value: cur.raw });
        await P.set({ key: PREV_DAY_KEY, value: todayKey() });
      }
      mirroredCount = Math.max(cur ? count(cur.state) : 0, 0);

      const local = store.get();
      let merged = local;
      for (const slot of [cur, prev]) if (slot && !isEmpty(slot.state)) merged = merge(merged, slot.state, { settings: neverPlayed(local) ? 'incoming' : 'current' });
      const gained = count(merged) - count(local);
      if (gained > 0 || (neverPlayed(local) && !neverPlayed(merged))) {
        store.replace({ ...merged, updatedAt: Date.now() });
        restoreListeners.forEach((fn) => fn({ results: gained }));
      }
    }
  } catch {
    // a failed restore must never break the game
  }
  scheduleBackups(store.get());
}

// Explicit "erase progress": also clear the durable copies so they are not restored on next start.
export async function wipeBackups() {
  if (!isNative()) return;
  clearTimeout(mirrorTimer);
  mirroredCount = 0;
  lastFingerprint = '';
  const P = (await prefsModule())?.Preferences;
  if (!P) return;
  await Promise.allSettled([P.set({ key: PREF_KEY, value: JSON.stringify(store.get()) }), P.remove({ key: PREV_KEY }), P.remove({ key: PREV_DAY_KEY })]);
}

const stamp = () => new Date().toISOString().slice(0, 10);

// Manual export. Android: the system share sheet (Drive, Files, mail…), through the cache folder, which
// always works (public folders need permissions Android no longer gives). Web: downloads the file.
export async function exportBackup() {
  const name = `hitoiki-progreso-${stamp()}.json`;
  const text = serialize();
  if (isNative()) {
    const fs = await import('@capacitor/filesystem');
    const { uri } = await fs.Filesystem.writeFile({ path: name, data: text, directory: fs.Directory.Cache, encoding: fs.Encoding.UTF8 });
    const share = await import('@capacitor/share');
    try {
      await share.Share.share({ title: 'Copia de Hitoiki', files: [uri], dialogTitle: 'Guardar copia de Hitoiki' });
    } catch (e) {
      if (/cancel/i.test(e?.message ?? '')) return null; // closed the menu: nothing was saved
      throw e;
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  store.patch((s) => ({ settings: { ...s.settings, lastExport: Date.now() } }));
  return name;
}

// Manual import from a picked file; merges with the current progress.
export async function importBackup(file, report = {}) {
  if (file.size > LIMITS.importBytes) throw new Error('El archivo es demasiado grande para ser una copia de Hitoiki.');
  const incoming = parseBackup(await file.text(), report);
  const merged = merge(store.get(), incoming, { settings: neverPlayed(store.get()) ? 'incoming' : 'current' });
  store.replace({ ...merged, updatedAt: Date.now() });
  return Object.keys(incoming.results).length;
}
