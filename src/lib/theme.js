import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function useApplyTheme(mode) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#1b1916' : '#f3eee4');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
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
