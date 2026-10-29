import { store, useStore } from '../lib/storage.js';
import { Back } from './Icons.jsx';
import { sfx } from '../lib/sound.js';
import { useState } from 'react';
import { AWAY_HOURS, ensurePermission, testNotification } from '../lib/notify.js';
import { APP_VERSION, applyUpdate, checkForUpdate } from '../lib/updates.js';
import { exportBackup, importBackup, wipeBackups } from '../lib/backup.js';
import { Capacitor } from '@capacitor/core';
import { back } from '../lib/nav.js';
import { achievements, activePalette, unlockedPalettes } from '../lib/achievements.js';

const setSetting = (k, v) => store.patch((s) => ({ settings: { ...s.settings, [k]: v } }));

// Defined at module level: a component declared inside another one is a new type on every render,
// so React would rebuild the button each time (losing focus and the sliding animation).
function Switch({ k, label, checked, onChange }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={onChange ?? (() => setSetting(k, !checked))} />;
}

export default function Settings({ navigate }) {
  const settings = useStore((s) => s.settings);
  const palettes = useStore((s) => unlockedPalettes(s));
  const active = useStore((s) => activePalette(s));
  const [lockedHint, setLockedHint] = useState(null);
  const sealOf = (id) => achievements().find((a) => a.id === id);
  const sealName = (id) => sealOf(id)?.name ?? '';
  const sealDesc = (id) => sealOf(id)?.desc ?? '';
  const [notice, setNotice] = useState('');
  const toggleReminders = async () => {
    if (settings.notify !== false) return setSetting('notify', false);
    if (await ensurePermission()) {
      setSetting('notify', true);
      setNotice('');
    } else setNotice('Activa las notificaciones de Hitoiki en los ajustes del teléfono.');
  };
  const reset = () => {
    if (confirm('¿Borrar todo el progreso, rachas y resultados?')) {
      store.patch(() => ({ results: {}, saves: {}, tutorialsSeen: {} }));
      wipeBackups().catch(() => {});
    }
  };
  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('/')} aria-label="Volver">
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
        <div className="row palette-row">
          <span>
            Paleta
            <small>Se desbloquean con sellos.</small>
          </span>
          <div className="palettes" role="group" aria-label="Paleta de color">
            {palettes.map((p) => (
              <button
                key={p.id}
                className={`swatch${p.unlocked ? '' : ' locked'}`}
                data-palette={p.id}
                aria-pressed={active === p.id}
                aria-label={p.unlocked ? p.name : `${p.name}, bloqueada: sello ${sealName(p.seal)}`}
                title={p.unlocked ? p.name : `Bloqueada: sello «${sealName(p.seal)}»`}
                onClick={() => (p.unlocked ? setSetting('palette', p.id) : setLockedHint(p))}
              >
                <i aria-hidden="true">{p.unlocked ? p.kanji : '鎖'}</i>
              </button>
            ))}
          </div>
        </div>
        {lockedHint && <p className="palette-hint" role="status">{lockedHint.name}: consigue el sello «{sealName(lockedHint.seal)}» — {sealDesc(lockedHint.seal)}</p>}
      </div>
      <h3 className="section">Juego</h3>
      <div className="list">
        <div className="row">
          Mostrar cronómetro <Switch k="showTimer" label="Mostrar cronómetro" checked={!!settings.showTimer} />
        </div>
        <div className="row">
          Vibración <Switch k="haptics" label="Vibración" checked={!!settings.haptics} />
        </div>
        <div className="row">
          Sonidos <Switch k="sound" label="Sonidos" checked={!!settings.sound} />
        </div>
        {settings.sound && (
          <div className="row">
            Música ambiente <Switch k="music" label="Música ambiente" checked={!!settings.music} />
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
          <button className="btn" onClick={() => store.patch(() => ({ tutorialsSeen: {} }))}>
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
          <Switch label="Recordatorios" checked={settings.notify !== false} onChange={toggleReminders} />
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
              {Capacitor.isNativePlatform()
                ? 'Android guarda tu progreso en tu cuenta de Google (si tienes las copias activadas). También puedes guardar un archivo.'
                : 'Descarga un archivo con todo tu progreso: este navegador puede borrar sus datos.'}
              {settings.lastExport ? ` Última copia: ${new Date(settings.lastExport).toLocaleDateString('es')}.` : ''}
            </small>
          </span>
          <button className="btn" onClick={() => exportBackup().then((f) => f && setNotice(Capacitor.isNativePlatform() ? 'Copia lista: elige dónde guardarla.' : `Copia descargada: ${f}`), (e) => setNotice(`No se pudo exportar: ${e.message}`))}>
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
                const report = {};
                if (f) importBackup(f, report).then((n) => setNotice(`Copia restaurada: ${n} puzzles resueltos.${report.dropped ? ` Se omitieron ${report.dropped} entradas dañadas.` : ''}`), (err) => setNotice(err.message));
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
