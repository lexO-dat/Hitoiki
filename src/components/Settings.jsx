import { store, useStore } from '../lib/storage.js';
import { Back } from './Icons.jsx';
import { sfx } from '../lib/sound.js';
import { useState } from 'react';
import { AWAY_HOURS, ensurePermission, testNotification } from '../lib/notify.js';
import { APP_VERSION, applyUpdate, checkForUpdate } from '../lib/updates.js';
import { exportBackup, importBackup, wipeBackups } from '../lib/backup.js';
import { Capacitor } from '@capacitor/core';

const setSetting = (k, v) => store.update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));

export default function Settings({ navigate }) {
  const settings = useStore((s) => s.settings);
  const [notice, setNotice] = useState('');
  const toggleReminders = async () => {
    if (settings.notify !== false) return setSetting('notify', false);
    if (await ensurePermission()) {
      setSetting('notify', true);
      setNotice('');
    } else setNotice('Activa las notificaciones de Hitoiki en los ajustes del teléfono.');
  };
  const Switch = ({ k }) => (
    <button className="switch" role="switch" aria-checked={!!settings[k]} onClick={() => setSetting(k, !settings[k])} />
  );
  const reset = () => {
    if (confirm('¿Borrar todo el progreso, rachas y resultados?')) {
      store.update((s) => ({ ...s, results: {}, saves: {}, tutorialsSeen: {} }));
      wipeBackups().catch(() => {});
    }
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
            Música ambiente <Switch k="music" />
          </div>
        )}
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
              onPointerUp={() => sfx.preview()}
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
          <span>
            Recordatorios
            <br />
            <small className="muted">A las 00:01 cuando hay puzzles nuevos, y si llevas {AWAY_HOURS} horas sin entrar.</small>
          </span>
          <button className="switch" role="switch" aria-checked={settings.notify !== false} onClick={toggleReminders} />
        </div>
        {settings.notify !== false && (
          <div className="row">
            Probar notificación
            <button className="btn" onClick={() => testNotification().then((ok) => !ok && setNotice('Activa las notificaciones de Hitoiki en los ajustes del teléfono.'))}>
              Probar
            </button>
          </div>
        )}
      </div>
      <Updates />
      <h3 className="section">Tus datos</h3>
      <div className="list">
        <div className="row">
          <span>
            Copia de seguridad
            <br />
            <small className="muted">
              {Capacitor.isNativePlatform() ? 'Automática en Documentos/Hitoiki. También puedes exportarla.' : 'Descarga un archivo con todo tu progreso.'}
            </small>
          </span>
          <button className="btn" onClick={() => exportBackup().then((f) => setNotice(`Copia guardada: ${f}`), (e) => setNotice(`No se pudo exportar: ${e.message}`))}>
            Exportar
          </button>
        </div>
        <div className="row">
          <span>
            Restaurar copia
            <br />
            <small className="muted">Se combina con tu progreso actual; no se pierde nada.</small>
          </span>
          <label className="btn">
            Importar
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) importBackup(f).then((n) => setNotice(`Copia restaurada: ${n} puzzles resueltos.`), (err) => setNotice(err.message));
              }}
            />
          </label>
        </div>
        <div className="row">
          Borrar progreso
          <button className="btn" onClick={reset}>
            Borrar
          </button>
        </div>
      </div>
      {notice && <p className="footnote">{notice}</p>}
      <p className="footnote">Hitoiki 一息 · v{APP_VERSION} · Todo se guarda en este dispositivo.</p>
    </div>
  );
}

function Updates() {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const check = async () => {
    setBusy(true);
    setInfo(await checkForUpdate());
    setBusy(false);
  };
  const update = async () => {
    setBusy(true);
    setProgress(0);
    try {
      await applyUpdate(info, setProgress);
    } catch (e) {
      const message = e.message || 'No se pudo descargar la actualización.';
      // If the in-app update fails, the full APK still installs over the app without losing data.
      setInfo(info.apkUrl ? { ...info, status: 'native', failed: message } : { status: 'error', message });
    }
    setBusy(false);
    setProgress(null);
  };
  return (
    <>
      <h3 className="section">Actualizaciones</h3>
      <div className="list">
        <div className="row">
          <span>
            Versión instalada
            <br />
            <small className="muted">{APP_VERSION}</small>
          </span>
          <button className="btn" onClick={check} disabled={busy}>
            {busy && progress === null ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {info && (
          <div className="row update-row">
            {info.status === 'latest' && <span>Tienes la última versión ✓</span>}
            {info.status === 'error' && <span className="muted">No se pudo comprobar: {info.message}</span>}
            {(info.status === 'web' || info.status === 'native') && (
              <div className="update">
                <b>Versión {info.version} disponible</b>
                {info.status === 'native' && (
                  <small className="muted">
                    {info.failed ? `No se pudo instalar dentro de la app (${info.failed}). Descarga el APK: se instala encima y conserva tu progreso.` : 'Esta versión necesita instalar el APK nuevo.'}
                  </small>
                )}
                {progress !== null && (
                  <div className="bar">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                )}
                <button className="btn primary" onClick={update} disabled={busy}>
                  {progress !== null ? `Descargando… ${progress}%` : info.status === 'native' ? 'Descargar APK' : 'Actualizar ahora'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
