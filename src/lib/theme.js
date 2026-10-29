import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const COLORS = {
  light: { washi: '#f3eee4', sakura: '#f6ebe8', matcha: '#eef0e2', ai: '#e9eef1', momiji: '#f3e8dd', yozakura: '#efe9f0', kin: '#f4edd8' },
  dark: { washi: '#1b1916', sakura: '#1d1719', matcha: '#171a14', ai: '#14181c', momiji: '#1c1713', yozakura: '#18151c', kin: '#1a1812' },
};

export function useApplyTheme(mode, palette = 'washi') {
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', COLORS[dark ? 'dark' : 'light'][palette] ?? COLORS.light.washi);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode, palette]);
}

let haptics = null;

// Short taps use native haptics on Android; patterns and browsers fall back to navigator.vibrate.
export function vibrate(enabled, ms = 10) {
  if (!enabled) return;
  if (Capacitor.isNativePlatform()) {
    const run = (h) => (Array.isArray(ms) ? h.Haptics.notification({ type: 'SUCCESS' }) : h.Haptics.impact({ style: ms > 20 ? 'MEDIUM' : 'LIGHT' }));
    if (haptics) run(haptics);
    else import('@capacitor/haptics').then((h) => run((haptics = h))).catch(() => {});
    return;
  }
  navigator.vibrate?.(ms);
}
