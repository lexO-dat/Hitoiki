import { useEffect, useState } from 'react';
import { todayKey } from './dates.js';

// Current date key that changes at midnight (checked every minute and whenever the app comes back).
export function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const check = () => setToday(todayKey());
    const t = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return today;
}
