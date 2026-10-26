import { useEffect } from 'react';

export function useApplyTheme(mode) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#151b22' : '#f6f2ef');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
}

export function vibrate(enabled, ms = 10) {
  if (enabled && navigator.vibrate) navigator.vibrate(ms);
}
