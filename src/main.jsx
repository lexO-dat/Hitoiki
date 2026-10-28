import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts are bundled with the app so it looks the same offline (latin subset covers Spanish).
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/eb-garamond/latin-600-italic.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles.css';
import './games/games.css';

createRoot(document.getElementById('root')).render(<App />);
