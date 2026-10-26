import { store, useStore } from '../lib/storage.js';
import { Back } from './Icons.jsx';

const setSetting = (k, v) => store.update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));

export default function Settings({ navigate }) {
  const settings = useStore((s) => s.settings);
  const Switch = ({ k }) => (
    <button className="switch" role="switch" aria-checked={!!settings[k]} onClick={() => setSetting(k, !settings[k])} />
  );
  const reset = () => {
    if (confirm('¿Borrar todo el progreso, rachas y resultados?')) store.update((s) => ({ ...s, results: {}, saves: {}, tutorialsSeen: {} }));
  };
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="Volver">
          <Back />
        </button>
        <h1>Ajustes</h1>
        <span />
      </header>
      <h3 className="section">Apariencia</h3>
      <div className="list">
        <div className="row">
          Tema
          <div className="seg" role="group" aria-label="Tema">
            {[
              ['system', 'Auto'],
              ['light', 'Claro'],
              ['dark', 'Oscuro'],
            ].map(([v, l]) => (
              <button key={v} aria-pressed={settings.theme === v} onClick={() => setSetting('theme', v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <h3 className="section">Juego</h3>
      <div className="list">
        <div className="row">
          Mostrar cronómetro <Switch k="showTimer" />
        </div>
        <div className="row">
          Vibración <Switch k="haptics" />
        </div>
        <div className="row">
          Volver a ver las reglas
          <button className="btn" onClick={() => store.update((s) => ({ ...s, tutorialsSeen: {} }))}>
            Restablecer
          </button>
        </div>
      </div>
      <h3 className="section">Datos</h3>
      <div className="list">
        <div className="row">
          Borrar progreso
          <button className="btn" onClick={reset}>
            Borrar
          </button>
        </div>
      </div>
      <p className="footnote">Lógica Diaria · v0.1.0 · Todo se guarda en este dispositivo.</p>
    </div>
  );
}
