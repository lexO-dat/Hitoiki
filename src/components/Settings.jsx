import { store, useStore } from '../lib/storage.js';
import { Back } from './Icons.jsx';
import { sfx } from '../lib/sound.js';
import { useState } from 'react';
import { ensurePermission, testNotification } from '../lib/notify.js';

const setSetting = (k, v) => store.update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));

export default function Settings({ navigate }) {
  const settings = useStore((s) => s.settings);
  const [notice, setNotice] = useState('');
  const toggleReminders = async () => {
    if (settings.reminders) return setSetting('reminders', false);
    if (await ensurePermission()) {
      setSetting('reminders', true);
      setNotice('');
    } else setNotice('Activa las notificaciones de Pausa en los ajustes del teléfono.');
  };
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
          Sonidos <Switch k="sound" />
        </div>
        {settings.sound && (
          <div className="row">
            Volumen
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume ?? 0.7}
              onChange={(e) => setSetting('volume', Number(e.target.value))}
              onPointerUp={() => sfx.solve()}
              aria-label="Volumen"
              className="slider"
            />
          </div>
        )}
        <div className="row">
          Volver a ver las reglas
          <button className="btn" onClick={() => store.update((s) => ({ ...s, tutorialsSeen: {} }))}>
            Restablecer
          </button>
        </div>
      </div>
      <h3 className="section">Recordatorios</h3>
      <div className="list">
        <div className="row">
          Recordatorio diario
          <button className="switch" role="switch" aria-checked={!!settings.reminders} onClick={toggleReminders} />
        </div>
        {settings.reminders && (
          <>
            <div className="row">
              Hora
              <select className="select" value={settings.reminderHour ?? 19} onChange={(e) => setSetting('reminderHour', Number(e.target.value))}>
                {Array.from({ length: 17 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <span>
                Aviso de racha
                <br />
                <small className="muted">A las 21:30 si aún no completas el día.</small>
              </span>
              <button className="btn" onClick={() => testNotification().then((ok) => !ok && setNotice('Permiso de notificaciones denegado.'))}>
                Probar
              </button>
            </div>
          </>
        )}
      </div>
      {notice && <p className="footnote">{notice}</p>}
      <h3 className="section">Datos</h3>
      <div className="list">
        <div className="row">
          Borrar progreso
          <button className="btn" onClick={reset}>
            Borrar
          </button>
        </div>
      </div>
      <p className="footnote">Pausa · v1.0.0 · Todo se guarda en este dispositivo.</p>
    </div>
  );
}
