// Keeps player data safe across every kind of update:
//  1. Native mirror (Android SharedPreferences): restored if the WebView storage ever comes back empty.
//  2. Automatic backup file in Documents/Hitoiki/: survives uninstalling the app.
//  3. Manual export / import of a .json file (web and Android).
// All plugins are loaded lazily and every failure is swallowed: backups must never break the game.
import { Capacitor } from '@capacitor/core';
import { countsForDay, isEmpty, migrate, migrateReport, SCHEMA, store } from './storage.js';
import { LIMITS } from './sanitize.js';

const isNative = () => Capacitor.isNativePlatform();
const PREF_KEY = 'pausa-store'; // internal key from the first release: keep it so old data is found
const BACKUP_DIR = 'Hitoiki';
const BACKUP_FILE = `${BACKUP_DIR}/hitoiki-progreso.json`;
const OLD_BACKUP_FILES = ['Pausa/pausa-progreso.json']; // written by versions named "Pausa"

// Helpers return the plugin MODULES, never the plugin objects: Capacitor plugins are proxies that treat
// any property (including `then`) as a native method, so returning one from an async function or awaiting
// it leaves the promise pending forever.
const prefsModule = () => import('@capacitor/preferences').catch(() => null);
const fs = () => import('@capacitor/filesystem').catch(() => null);

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

// Union of both progress sets: nothing solved on either side is lost.
export function merge(current, incoming) {
  const out = migrate(current);
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
  return out;
}

let mirrorTimer = null;
let fileTimer = null;

// Resolves to `fallback` if a native call takes too long, so nothing can ever hang the app.
const withTimeout = (promise, ms, fallback = null) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

async function writeMirror(state) {
  const P = (await prefsModule())?.Preferences;
  if (P) await P.set({ key: PREF_KEY, value: JSON.stringify(state) });
}

async function writeBackupFile(state) {
  const m = await fs();
  if (!m) return;
  const { Filesystem, Directory, Encoding } = m;
  await Filesystem.writeFile({ path: BACKUP_FILE, data: serialize(state), directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
}

// Never let an empty state overwrite a durable copy (e.g. a restore that has not finished yet);
// only an explicit reset may do that, through wipeBackups().
function scheduleBackups(state) {
  if (isEmpty(state)) return;
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => writeMirror(state).catch(() => {}), 800);
  clearTimeout(fileTimer);
  fileTimer = setTimeout(() => writeBackupFile(state).catch(() => {}), 4000);
}

async function readDurableCopy() {
  const P = (await prefsModule())?.Preferences;
  const saved = P ? (await withTimeout(P.get({ key: PREF_KEY }), 4000))?.value : null;
  if (saved) return migrate(JSON.parse(saved));
  // Fresh install after an uninstall: the backup file may still be in Documents.
  const m = await fs();
  for (const path of [BACKUP_FILE, ...OLD_BACKUP_FILES]) {
    const res = m && (await withTimeout(m.Filesystem.readFile({ path, directory: m.Directory.Documents, encoding: m.Encoding.UTF8 }).catch(() => null), 4000));
    if (res?.data) return parseBackup(res.data);
  }
  return null;
}

// Runs in the background after the first render (never blocks startup). If local storage was wiped,
// the durable copy is merged back in, so anything played meanwhile is kept too.
export async function initBackups() {
  if (!isNative()) return;
  store.onWrite(scheduleBackups);
  try {
    if (isEmpty(store.get())) {
      const restored = await readDurableCopy();
      if (restored && !isEmpty(restored)) store.replace({ ...merge(store.get(), restored), updatedAt: Date.now() });
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
  clearTimeout(fileTimer);
  const empty = store.get();
  await Promise.allSettled([writeMirror(empty), writeBackupFile(empty)]);
}

// Manual export. Android: saves into Documents/Hitoiki and opens the share sheet. Web: downloads the file.
export async function exportBackup() {
  const name = `hitoiki-progreso-${new Date().toISOString().slice(0, 10)}.json`;
  const text = serialize();
  if (isNative()) {
    const m = await fs();
    const { uri } = await m.Filesystem.writeFile({
      path: `${BACKUP_DIR}/${name}`,
      data: text,
      directory: m.Directory.Documents,
      encoding: m.Encoding.UTF8,
      recursive: true,
    });
    const share = (await import('@capacitor/share').catch(() => null))?.Share;
    await share?.share({ title: 'Copia de Hitoiki', files: [uri] }).catch(() => {});
    return `Documentos/${BACKUP_DIR}/${name}`;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return name;
}

// Manual import from a picked file; merges with the current progress.
export async function importBackup(file, report = {}) {
  if (file.size > LIMITS.importBytes) throw new Error('El archivo es demasiado grande para ser una copia de Hitoiki.');
  const incoming = parseBackup(await file.text(), report);
  const merged = merge(store.get(), incoming);
  store.replace({ ...merged, updatedAt: Date.now() });
  return Object.keys(incoming.results).length;
}

