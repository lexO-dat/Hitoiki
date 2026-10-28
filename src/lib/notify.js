// Reminder notifications, on by default:
//  - 00:01 every day: today's new puzzles are ready (scheduled a week ahead, so they keep coming
//    even if the app is not opened).
//  - 8 hours after the last time the app was used: a gentle "come back" nudge. It is pushed back
//    every time the app is opened or left, so it only fires after 8 hours away.
// On Android (Capacitor) they are real scheduled local notifications that fire with the app closed;
// in a browser we can only remind while the page is open.
import { Capacitor } from '@capacitor/core';
import { completedOn, computeStreak, STREAK_REQUIRED, store } from './storage.js';
import { addDays, toKey } from './dates.js';
import { weekSummary } from './weekly.js';

const isNative = () => Capacitor.isNativePlatform();
const DAYS_AHEAD = 7;
const DAILY_BASE = 100; // ids 100..106: new puzzles at 00:01 for the next week
const AWAY_ID = 300; // "8 hours away"
const WEEKLY_ID = 400; // Sunday 20:00 weekly summary
export const AWAY_HOURS = 8;
const OLD_IDS = [200]; // evening streak reminder of earlier versions

const NEW_DAY = [
  ['Nuevos puzzles 🌙', 'Los puzzles de hoy ya están listos. Respira hondo y empieza cuando quieras.'],
  ['Un día nuevo, un respiro nuevo', 'Cuatro puzzles frescos te esperan. 一息'],
  ['Ya llegaron los de hoy', 'Coronas, Ruta, Puentes… elige tu favorito.'],
  ['Puzzles recién hechos', 'Tu dosis diaria de lógica ya está servida.'],
  ['Hitoiki 一息', 'Hay puzzles nuevos. ¿Cuál será el primero?'],
  ['Nuevo día en Hitoiki', 'Los sellos de hoy están por estrenarse.'],
  ['Hoy toca puzzle', 'Pequeños retos, gran satisfacción. Ya están disponibles.'],
];

// Text for the "away" nudge, from where the player stands when they leave.
function awayMessage(s, today) {
  const { streak } = computeStreak(s, today);
  const left = STREAK_REQUIRED - completedOn(s, today);
  if (streak > 0 && left > 0) return [`Tu racha de ${streak} ${streak === 1 ? 'día' : 'días'} te espera 🔥`, `Te faltan ${left} ${left === 1 ? 'puzzle' : 'puzzles'} para mantenerla hoy.`];
  if (left > 0) return ['¿Un respiro? 一息', 'Hace rato que no pasas por aquí. Un puzzle y la mente despejada.'];
  return ['Un ratito para ti', 'Hay más puzzles en Infinito y Niveles cuando quieras.'];
}

// Returns the module, not the plugin object: awaiting a Capacitor plugin proxy never resolves.
const notificationsModule = () => import('@capacitor/local-notifications');

export async function ensurePermission() {
  if (isNative()) {
    const ln = (await notificationsModule()).LocalNotifications;
    const cur = await ln.checkPermissions();
    if (cur.display === 'granted') return true;
    return (await ln.requestPermissions()).display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

// Ask once, on the first start of a version with reminders on by default.
export async function askPermissionOnce() {
  const s = store.get();
  if (s.settings.notify === false || s.settings.notifyAsked) return;
  store.update((x) => ({ ...x, settings: { ...x.settings, notifyAsked: true } }));
  if (isNative() || ('Notification' in window && Notification.permission === 'default')) await ensurePermission();
  await syncReminders();
}

const at = (dateKey, hour, minute = 0) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute);
};

export function plan(s = store.get(), now = new Date()) {
  if (s.settings.notify === false) return [];
  const today = toKey(now);
  const out = [];
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const [title, body] = NEW_DAY[(Number(day.slice(8)) + i) % NEW_DAY.length];
    out.push({ id: DAILY_BASE + i - 1, title, body, when: at(day, 0, 1) });
  }
  // Weekly summary: the coming Sunday at 20:00 (today if it is Sunday before 20:00).
  const sunday = addDays(today, (7 - now.getDay()) % 7);
  const weekly = at(sunday, 20) > now ? at(sunday, 20) : at(addDays(sunday, 7), 20);
  const w = weekSummary(s, toKey(weekly));
  out.push({
    id: WEEKLY_ID,
    title: 'Tu semana en Hitoiki 週',
    body: w.solved ? `Sellaste ${w.sealed} de 7 días y resolviste ${w.solved} puzzles. Mira tu resumen.` : 'Mira tu resumen de la semana en el Cuaderno.',
    when: weekly,
  });
  const away = new Date(now.getTime() + AWAY_HOURS * 3600 * 1000);
  // No need for both within the same hour: the new-puzzles one already brings you back.
  if (!out.some((n) => Math.abs(n.when - away) < 3600 * 1000)) {
    const [title, body] = awayMessage(s, today);
    out.push({ id: AWAY_ID, title, body, when: away });
  }
  return out;
}

let webTimers = [];

// Rebuild the whole schedule. Called on start, whenever the app is shown or hidden, and after solving.
export async function syncReminders() {
  const list = plan();
  if (isNative()) {
    const ln = (await notificationsModule()).LocalNotifications;
    const pending = await ln.getPending();
    const ids = [...new Set([...pending.notifications.map((n) => n.id), AWAY_ID, WEEKLY_ID, ...OLD_IDS])];
    await ln.cancel({ notifications: ids.map((id) => ({ id })) });
    if (!list.length) return;
    if ((await ln.checkPermissions()).display !== 'granted') return;
    await ln.schedule({
      notifications: list.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: n.when, allowWhileIdle: true },
        smallIcon: 'ic_stat_pausa',
        iconColor: '#cf4b2f',
      })),
    });
    return;
  }

  // Browser fallback: only while the page stays open.
  webTimers.forEach(clearTimeout);
  webTimers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const n of list) {
    const ms = n.when - now;
    if (ms > 0 && ms < 2 ** 31 - 1) webTimers.push(setTimeout(() => new Notification(n.title, { body: n.body, icon: './icons/icon-192.png' }), ms));
  }
}

export async function testNotification() {
  if (!(await ensurePermission())) return false;
  const [title, body] = NEW_DAY[0];
  if (isNative()) {
    const ln = (await notificationsModule()).LocalNotifications;
    await ln.schedule({ notifications: [{ id: 999, title, body, schedule: { at: new Date(Date.now() + 3000) }, smallIcon: 'ic_stat_pausa', iconColor: '#cf4b2f' }] });
  } else {
    new Notification(title, { body, icon: './icons/icon-192.png' });
  }
  return true;
}
