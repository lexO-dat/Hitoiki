// Keeps player data safe across every kind of update:
//  1. Native mirror (Android SharedPreferences): restored if the WebView storage ever comes back empty.
//  2. Automatic backup file in Documents/Pausa/: survives uninstalling the app.
//  3. Manual export / import of a .json file (web and Android).
// All plugins are loaded lazily and every failure is swallowed: backups must never break the game.
import { Capacitor } from '@capacitor/core';
import { isEmpty, migrate, SCHEMA, store } from './storage.js';

const isNative = () => Capacitor.isNativePlatform();
const PREF_KEY = 'pausa-store';
const BACKUP_DIR = 'Pausa';
const BACKUP_FILE = `${BACKUP_DIR}/pausa-progreso.json`;

const prefs = async () => (await import('@capacitor/preferences').catch(() => null))?.Preferences;
const fs = async () => await import('@capacitor/filesystem').catch(() => null);

export function serialize(state = store.get()) {
  return JSON.stringify({ app: 'pausa', schema: SCHEMA, exportedAt: new Date().toISOString(), data: state });
}

export function parseBackup(text) {
  const json = JSON.parse(text);
  const data = json?.app === 'pausa' ? json.data : json; // also accept a raw store object
  if (!data || typeof data !== 'object' || (!data.results && !data.settings)) throw new Error('El archivo no es una copia de Pausa.');
  return migrate(data);
}

// Union of both progress sets: nothing solved on either side is lost.
export function merge(current, incoming) {
  const out = migrate(current);
  for (const [k, v] of Object.entries(incoming.results)) {
    const cur = out.results[k];
    if (!cur || (v.time ?? Infinity) < (cur.time ?? Infinity)) out.results[k] = v;
  }
  for (const [k, v] of Object.entries(incoming.saves)) if (!out.results[k] && !out.saves[k]) out.saves[k] = v;
  out.tutorialsSeen = { ...incoming.tutorialsSeen, ...out.tutorialsSeen };
  return out;
}

let mirrorTimer = null;
let fileTimer = null;

async function writeMirror(state) {
  const P = await prefs();
  if (P) await P.set({ key: PREF_KEY, value: JSON.stringify(state) });
}

async function writeBackupFile(state) {
  const m = await fs();
  if (!m) return;
  const { Filesystem, Directory, Encoding } = m;
  await Filesystem.writeFile({ path: BACKUP_FILE, data: serialize(state), directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
}

// Call once at startup (before rendering): restores data if local storage was wiped, then keeps the
// durable copies up to date on every change.
export async function initBackups() {
  if (!isNative()) return;
  try {
    if (isEmpty(store.get())) {
      const P = await prefs();
      const saved = P && (await P.get({ key: PREF_KEY })).value;
      if (saved) store.replace(JSON.parse(saved));
      else {
        // Fresh install after an uninstall: the backup file may still be in Documents.
        const m = await fs();
        const res = await m?.Filesystem.readFile({ path: BACKUP_FILE, directory: m.Directory.Documents, encoding: m.Encoding.UTF8 }).catch(() => null);
        if (res?.data) store.replace(parseBackup(res.data));
      }
    }
  } catch {
    // never block startup on a restore problem
  }
  store.onWrite((state) => {
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(() => writeMirror(state).catch(() => {}), 800);
    clearTimeout(fileTimer);
    fileTimer = setTimeout(() => writeBackupFile(state).catch(() => {}), 4000);
  });
  // Make sure both copies exist even before the first change.
  writeMirror(store.get()).catch(() => {});
  writeBackupFile(store.get()).catch(() => {});
}

// Manual export. Android: saves into Documents/Pausa and opens the share sheet. Web: downloads the file.
export async function exportBackup() {
  const name = `pausa-progreso-${new Date().toISOString().slice(0, 10)}.json`;
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
    await share?.share({ title: 'Copia de Pausa', files: [uri] }).catch(() => {});
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
export async function importBackup(file) {
  const incoming = parseBackup(await file.text());
  const merged = merge(store.get(), incoming);
  store.replace({ ...merged, updatedAt: Date.now() });
  return Object.keys(incoming.results).length;
}

