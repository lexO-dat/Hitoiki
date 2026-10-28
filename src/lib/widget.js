// Feeds the Android home screen widget (HitoikiWidget.java): today's progress and the streak,
// saved in Preferences key "widget". `validThrough` is the last day the streak can still be saved
// (counting rest days), so the widget can show it correctly even days later without the app.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { addDays, todayKey } from './dates.js';
import { completedOn, computeStreak, STREAK_REQUIRED, store } from './storage.js';

const NativeWidget = registerPlugin('HitoikiWidget');

export function widgetData(s, today = todayKey()) {
  const done = Math.min(completedOn(s, today), STREAK_REQUIRED);
  const { streak, rests } = computeStreak(s, today);
  const last = done >= STREAK_REQUIRED ? today : addDays(today, -1);
  return { date: today, done, streak, validThrough: streak > 0 ? addDays(last, 1 + rests) : '' };
}

export async function syncWidget() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const prefs = (await import('@capacitor/preferences')).Preferences;
    await prefs.set({ key: 'widget', value: JSON.stringify(widgetData(store.get())) });
    await NativeWidget.refresh(); // not implemented in APKs older than the widget: ignored
  } catch {
    // the widget is a nice-to-have; never break the app for it
  }
}
