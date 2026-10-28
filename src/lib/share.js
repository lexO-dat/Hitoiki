// Share a result: an image card plus text. Android: native share sheet with the image file.
// Browser: Web Share with files when available, otherwise the image is downloaded and the text copied.
// Returns 'shared' | 'copied' | 'downloaded' | 'failed'.
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

const cancelled = (e) => e?.name === 'AbortError' || /cancel/i.test(e?.message ?? '');

const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

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
    return cancelled(e) ? 'shared' : 'failed';
  }
}

export async function shareImage(blob, text) {
  try {
    if (Capacitor.isNativePlatform()) {
      const fs = await import('@capacitor/filesystem');
      const { uri } = await fs.Filesystem.writeFile({ path: 'hitoiki-resultado.png', data: await toBase64(blob), directory: fs.Directory.Cache });
      const mod = await import('@capacitor/share');
      await mod.Share.share({ text, files: [uri], dialogTitle: 'Compartir resultado' });
      return 'shared';
    }
    const file = new File([blob], 'hitoiki-resultado.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    await navigator.clipboard?.writeText(text).catch(() => {});
    return 'downloaded';
  } catch (e) {
    if (cancelled(e)) return 'shared';
    return shareText(text); // the image failed: at least share the text
  }
}
