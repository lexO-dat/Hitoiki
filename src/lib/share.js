// Share a result as plain text: native share sheet on Android, Web Share when available,
// otherwise copy to the clipboard. Returns 'shared' | 'copied' | 'failed'.
import { Capacitor } from '@capacitor/core';
import { formatTime } from './dates.js';

export function resultText({ game, modeLabel, subtitle, result, streak }) {
  const perfect = !result.hints && !result.mistakes;
  return [
    `一息 Hitoiki · ${subtitle}`,
    `${game.kanji} ${game.name} (${modeLabel}) en ${formatTime(result.time)}${perfect ? ' · perfecto ✦' : ''}`,
    streak > 0 ? `Racha: ${streak} ${streak === 1 ? 'día' : 'días'} 🔥` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareText(text) {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use the module, never return the plugin proxy from an async function.
      const mod = await import('@capacitor/share');
      await mod.Share.share({ text, dialogTitle: 'Compartir resultado' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    if (e?.name === 'AbortError' || /cancel/i.test(e?.message ?? '')) return 'shared';
    return 'failed';
  }
}
