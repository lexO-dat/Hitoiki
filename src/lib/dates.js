const DAY_MS = 86400000;

export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => toKey(new Date());

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(a, b) {
  return Math.round((fromKey(a) - fromKey(b)) / DAY_MS);
}

export function weekDays(key) {
  // Monday-based week containing `key`
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(key, i - offset));
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const weekdayShort = (key) => WEEKDAYS[fromKey(key).getDay()];
export const weekdayLong = (key) => WEEKDAYS_LONG[fromKey(key).getDay()];
export const dayNum = (key) => fromKey(key).getDate();
export const monthName = (key) => MONTHS[fromKey(key).getMonth()];
export const longDate = (key) => `${dayNum(key)} de ${monthName(key)}`;

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${String(m).padStart(2, '0')}:${r}`;
}
