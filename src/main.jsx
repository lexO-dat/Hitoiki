import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts are bundled with the app so it looks the same offline (latin subset covers Spanish).
// Shippori Mincho for titles, Zen Maru Gothic for text; the few kanji come from a tiny subset (fonts.css).
import '@fontsource/shippori-mincho/latin-600.css';
import '@fontsource/shippori-mincho/latin-700.css';
import '@fontsource/zen-maru-gothic/latin-400.css';
import '@fontsource/zen-maru-gothic/latin-500.css';
import '@fontsource/zen-maru-gothic/latin-700.css';
import './fonts/fonts.css';
import './styles.css';
import './games/games.css';

import { initBackups } from './lib/backup.js';
import { showFatalError } from './lib/fatal.js';

window.addEventListener('error', (e) => showFatalError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason, { soft: true }));

// Render immediately; durable copies are restored in the background (Android) and merged in.
createRoot(document.getElementById('root')).render(<App />);
initBackups().catch(() => {});
