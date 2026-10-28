// Reminder notifications. On Android (Capacitor) they are real scheduled local notifications that
// fire with the app closed; in a browser we can only remind while the page is open.
import { Capacitor } from '@capacitor/core';
import { completedOn, computeStreak, STREAK_REQUIRED, store } from './storage.js';
import { addDays, todayKey } from './dates.js';

const isNative = () => Capacitor.isNativePlatform();
const DAYS_AHEAD = 7;
const DAILY_BASE = 100; // ids 100..106: daily reminders for the next week
const STREAK_ID = 200; // evening "keep your streak" reminder for today

const DAILY = [
  ['Tu pausa de hoy está lista', 'Cuatro puzzles nuevos te esperan. Prepara un té ☕'],
  ['Un ratito para ti', 'Los puzzles de hoy ya están servidos.'],
  ['¿Una pausa?', 'Cinco minutos, un puzzle y la mente despejada.'],
  ['Nuevos puzzles', 'Coronas, Ruta, Puentes… elige tu favorito de hoy.'],
  ['Hora de pensar tranquilo', 'Tu dosis diaria de lógica te está esperando.'],
  ['Pausa activa', 'Respira hondo y resuelve el primero del día.'],
  ['Hoy toca puzzle', 'Pequeños retos, gran satisfacción.'],
];

let LN = null;
async function plugin() {
  if (!LN) LN = (await import('@capacitor/local-notifications')).LocalNotifications;
  return LN;
}

export async function ensurePermission() {
  if (isNative()) {
    const ln = await plugin();
    const cur = await ln.checkPermissions();
    if (cur.display === 'granted') return true;
    return (await ln.requestPermissions()).display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

const at = (dateKey, hour, minute = 0) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute);
};

let webTimers = [];

// Rebuild the whole schedule from current settings and progress. Safe to call often.
export async function syncReminders() {
  const s = store.get();
  const { reminders, reminderHour = 19 } = s.settings;
  const today = todayKey();
  const doneToday = completedOn(s, today) >= STREAK_REQUIRED;
  const { streak } = computeStreak(s, today);
  const now = new Date();

  const plan = [];
  if (reminders) {
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(today, i);
      const when = at(day, reminderHour);
      if (when <= now || (i === 0 && doneToday)) continue;
      const [title, body] = DAILY[(new Date(when).getDate() + i) % DAILY.length];
      plan.push({ id: DAILY_BASE + i, title, body, when });
    }
    // Evening nudge only when a streak is at stake and today's puzzles aren't done yet.
    const evening = at(today, 21, 30);
    if (streak > 0 && !doneToday && evening > now) {
      plan.push({
        id: STREAK_ID,
        title: `Tu racha de ${streak} ${streak === 1 ? 'día' : 'días'} 🔥`,
        body: `Te faltan ${STREAK_REQUIRED - completedOn(s, today)} puzzles para mantenerla hoy.`,
        when: evening,
      });
    }
  }

  if (isNative()) {
    const ln = await plugin();
    const pending = await ln.getPending();
    if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!plan.length) return;
    if ((await ln.checkPermissions()).display !== 'granted') return;
    await ln.schedule({
      notifications: plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: n.when, allowWhileIdle: true },
        smallIcon: 'ic_stat_pausa',
        iconColor: '#303030',
      })),
    });
    return;
  }

  // Browser fallback: only while the page stays open.
  webTimers.forEach(clearTimeout);
  webTimers = [];
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  for (const n of plan) {
    const ms = n.when - now;
    if (ms > 0 && ms < 2 ** 31 - 1) webTimers.push(setTimeout(() => new Notification(n.title, { body: n.body, icon: './icons/icon-192.png' }), ms));
  }
}

export async function testNotification() {
  if (!(await ensurePermission())) return false;
  const [title, body] = DAILY[0];
  if (isNative()) {
    const ln = await plugin();
    await ln.schedule({ notifications: [{ id: 999, title, body, schedule: { at: new Date(Date.now() + 3000) }, smallIcon: 'ic_stat_pausa' }] });
  } else {
    new Notification(title, { body, icon: './icons/icon-192.png' });
  }
  return true;
}
