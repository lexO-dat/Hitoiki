# Hitoiki 一 puzzles diarios

<img src="public/icons/icon-512.png" width="96" alt="Hitoiki" />

*Hitoiki* (一息) significa "un respiro" en japonés: un ratito tranquilo de lógica cada día.

Colección de puzzles lógicos diarios hecha en React. Once juegos, tres modos de juego, tema claro y
oscuro, y todo el progreso guardado en el dispositivo.

## Uso

```bash
npm install
npm run dev              # desarrollo en http://localhost:5173
npm test                 # tests de los generadores
npm run validate-levels  # comprueba que cada nivel de public/levels tiene una solución válida
npm run build            # build estático en dist/
```

## App Android

Cada cambio en el código de la app que llega a `main` compila un APK en GitHub Actions y lo publica
en **Releases** del repositorio (archivo `Hitoiki-X.Y.Z.apk`, ver [Versiones](#versiones)). Para instalarlo, ábrelo en el teléfono y permite "instalar apps de
fuentes desconocidas". Si ya la tienes instalada, actualiza desde **Ajustes → Actualizaciones**.

Para compilarlo en tu equipo necesitas Android Studio (o el Android SDK) y Java 21:

```bash
npm run android:apk      # build web + sync + ./gradlew assembleDebug
# APK en android/app/build/outputs/apk/debug/app-debug.apk
npx cap open android     # abrir el proyecto en Android Studio
```

La app Android usa [Capacitor](https://capacitorjs.com): el mismo código React dentro de una app
nativa, con notificaciones locales y vibración nativa.

## Puzzles

| Juego | Reglas |
|---|---|
| **Coronas** | Una corona por fila, columna y región de color; dos coronas nunca se tocan, ni en diagonal. |
| **Sol y Luna** | Igual número de soles y lunas por línea, nunca tres iguales seguidos; `=` une iguales y `×` opuestos. |
| **Ruta** | Una sola línea que pasa por todas las casillas y visita los números en orden. |
| **Shikaku** | Divide el tablero en rectángulos; cada uno contiene un número igual a su área. |
| **Tuberías** | Gira las piezas para que toda la red quede conectada a la fuente sin extremos abiertos. Algunos tableros conectan bordes opuestos. |
| **Puentes** | Une puntos con conexiones simples o dobles en línea recta, sin cruces, formando una sola red. |
| **Pintura** | Pinta zonas para dejar todo el tablero de un color dentro del límite de movimientos. |
| **Código** | Descifra la secuencia de colores oculta con pistas de aciertos exactos y desplazados. |
| **LITS** | Una pieza L, I, T o S por región, todas conectadas, sin bloques 2×2 y sin piezas iguales tocándose. |
| **Tríos** | Encuentra los tríos de cartas donde cada rasgo es todo igual o todo distinto. |
| **Sudoku** | El clásico 9×9. |

Todos tienen deshacer, limpiar, pistas, conteo de errores, cronómetro, animación de tablero
completado y pantalla de resultado. Los tableros de arrastre (Ruta, Coronas, Shikaku, LITS, Puentes)
están pensados para dedos: siguen la trayectoria completa del trazo y cada trazo es un solo paso de
deshacer.

## Sonido y recordatorios

- **Sonido musical**: todo se sintetiza en el momento con Web Audio, sin archivos de audio. Cada jugada
  es una nota de una progresión de acordes suave (I – vi – IV – V), así que una partida suena como una
  melodía y no como el mismo clic repetido.
  - **Racha de jugadas**: jugadas seguidas y rápidas suben nota a nota por el acorde; al llegar arriba
    vuelve a empezar una octava más abajo con una campanita. Una pausa la calma, un error la corta y
    borrar baja.
  - **Progreso**: en Ruta el tono sube a medida que llenas el tablero, en pequeños arpegios, y la
    progresión vuelve al acorde de inicio justo al terminar.
  - **Variedad**: cada juego tiene su instrumento (marimba, kalimba, campanas, arpa, madera, gota),
    cada día suena en otra tonalidad y cada nota lleva pequeñas variaciones de afinación, intensidad,
    tiempo y posición estéreo.
  - **Recompensas**: destellos ocasionales, varios cierres distintos al resolver, uno más largo si lo
    resolviste sin pistas ni errores, y un motivo fijo cuando completas los puzzles del día para la racha.
  - **Música ambiente** opcional: un colchón suave que sigue los acordes mientras juegas.
  - En Ajustes se puede apagar el sonido o la música ambiente, y ajustar el volumen.
- **Recordatorios** (activados por defecto; se pueden apagar en Ajustes):
  - a las **00:01** de cada día, aviso de que hay puzzles nuevos (programado con una semana de
    anticipación, así llega aunque no abras la app);
  - si llevas **8 horas sin entrar**, un aviso suave (menciona tu racha si está en juego). Se reprograma
    cada vez que abres o sales de la app.
  En Android son notificaciones programadas con alarmas exactas que llegan con la app cerrada; en el
  navegador sólo funcionan con la página abierta.

## Actualizaciones y datos

- **Pruebas**: `npm test` (unitarias) y `npm run test:e2e` (Playwright: los 11 juegos se resuelven,
  ciclo diario completo, cierre a medianoche, puente nativo de Android con recordatorios y que todo
  quepa en pantallas pequeñas).
- **Actualizar desde la app**: Ajustes → Actualizaciones → Buscar. En Android descarga el paquete
  web nuevo desde GitHub Releases y lo aplica sin reinstalar; si la versión trae cambios nativos,
  ofrece descargar el APK. En la web detecta un despliegue nuevo y recarga.
- **Tu progreso nunca se pierde al actualizar**:
  - el formato de guardado está versionado y cada versión migra los datos antiguos;
  - en Android se guarda además una copia nativa y un respaldo automático en `Documentos/Hitoiki/`
    que sobrevive a desinstalar la app;
  - Ajustes → Tus datos permite exportar e importar el progreso (al importar se combina, no se borra).

## Versiones

Formato `MAJOR.MINOR.PATCH` (versionado semántico adaptado a una app):

| Sube | Cuándo | Ejemplos |
| --- | --- | --- |
| **PATCH** `1.0.x` | Lo normal. Arreglos y ajustes que no cambian cómo se usa la app. | Corregir un error, ajustar estilos, textos, sonidos, rendimiento, niveles. |
| **MINOR** `1.x.0` | Algo nuevo que el jugador nota, o un cambio nativo que obliga a instalar un APK nuevo. | Un juego o modo nuevo, una pantalla nueva, widget, logros, nuevas notificaciones, permisos o plugins de Android. |
| **MAJOR** `x.0.0` | Cambios grandes de concepto o que rompen la compatibilidad. | Rediseño completo, cambio de cómo funcionan las rachas o el modo diario, datos guardados que necesitan una migración sin vuelta atrás, cuentas o sincronización en la nube. |

Cómo se aplica:

- `package.json` guarda `MAJOR.MINOR`; el **PATCH lo pone el CI** (el siguiente número libre entre
  las etiquetas `vMAJOR.MINOR.*`). Para subir MINOR o MAJOR se cambia la versión en `package.json`
  (por ejemplo a `1.1.0` o `2.0.0`) en el mismo commit del cambio, y el PATCH vuelve a 0.
- Al subir MAJOR, MINOR vuelve a 0.
- El `versionCode` de Android se calcula como `MAJOR·1 000 000 + MINOR·1 000 + PATCH`, así siempre crece.
- Un cambio nativo (permisos, plugins) además sube `NATIVE_VERSION` en `src/lib/updates.js`, para
  que la app ofrezca el APK en vez de la actualización web.

Cuándo se publica (GitHub Actions):

- **Release** (`.github/workflows/release.yml`): sólo cuando cambia algo que va dentro de la app
  (`src/`, `public/`, `android/`, `assets/`, `index.html`, configuración o dependencias). Corre las
  pruebas, compila el APK firmado y publica la versión con el paquete web y la lista de cambios.
  También se puede lanzar a mano.
- **Tests** (`.github/workflows/ci.yml`): cambios sólo en pruebas, scripts o workflows corren las
  pruebas sin publicar nada. Cambios sólo en documentación no corren nada.

## Diseño

Identidad propia inspirada en el papel y la tinta japoneses:

- **Ensō (円相)**: el círculo de pincel muestra el progreso del día, un trazo por cada puzzle.
- **Hanko (判子)**: un sello bermellón se estampa sobre cada puzzle resuelto, con el kanji del juego
  (冠 Coronas, 道 Ruta, 橋 Puentes…). El día completo lleva el sello 済.
- **Papel washi y tinta sumi**: fondos cálidos con textura de fibra, tinta casi negra y un único color
  de acento para las recompensas; tema oscuro "de noche" con la misma paleta.
- **Colores tradicionales** por juego: sakura, fuji, matcha, ai, yamabuki, kaki, seiji…
- Tipografías incluidas en la app: Shippori Mincho para títulos y Zen Maru Gothic para el texto. Los
  pocos kanji de la interfaz salen de un recorte de 6 KB de la fuente (`scripts/subset-kanji.py`).

Experiencia de uso:

- Un solo toque para jugar: el inicio muestra el siguiente puzzle (primero los que dejaste a medias).
- Al resolver: sello animado, comparación con tu mejor tiempo (récords sólo sin pistas), el ensō del
  día avanza y el botón principal lleva directo al siguiente puzzle del día. El resultado se puede
  compartir como texto.
- Hitos de racha (3, 7, 14, 30… días) con mensajes propios.
- Animaciones cortas y suaves que respetan la opción del sistema "reducir movimiento".

## Modos

- **Diario**: cuatro puzzles destacados cada día y el resto en "Más puzzles", en dificultad Estándar,
  Difícil o Experto. Los puzzles de cada día sólo se pueden jugar ese mismo día: el calendario semanal
  muestra los días anteriores como historial (lo que resolviste y lo que quedó sin jugar), y a
  medianoche la app pasa sola al día nuevo. Resolver cuatro puzzles en su mismo día mantiene la
  racha; lo resuelto fuera de su día no cuenta.
- **Descansos**: cada 7 días de racha ganas un día de descanso (máximo 2). Si un día no juegas, se
  usa uno automáticamente y la racha sigue; se marca con una hoja en el calendario.
- **Cuaderno**: racha, mejor racha, puzzles perfectos, un libro de sellos mensual con cada día
  completado y los mejores tiempos por juego.
- **Infinito**: niveles numerados sin fin para cada juego y dificultad; al resolver uno se pasa al siguiente.
- **Niveles**: 44.834 niveles diseñados, organizados por juego, dificultad y colección, con progreso
  por nivel.

## Cómo funciona

- Los puzzles de los modos Diario e Infinito se generan al momento con un generador pseudoaleatorio
  determinista: la semilla es `fecha | modo | juego` (o `inf | modo | juego | nivel`), así que todos los
  jugadores reciben el mismo puzzle.
- Cada juego tiene en `src/games/<juego>/logic.js` su generador, su validador de reglas y, cuando hace
  falta, un solver (por ejemplo para las pistas de Pintura o para reconstruir tableros de Tuberías).
  Coronas, Sol y Luna y Sudoku garantizan solución única.
- Los niveles del modo Niveles están en `public/levels/<juego>.json` y se cargan bajo demanda.
- El estado (resultados, partidas a medias, ajustes) se guarda en `localStorage`.

## Estructura

```
src/
  data/games.js        catálogo: nombres, colores y reglas de cada puzzle
  games/<juego>/       logic.js (generador, validador, solver) y Board.jsx (interfaz)
  components/          Diario, Infinito, Niveles, pantalla de juego, estadísticas, ajustes
  lib/                 RNG determinista, fechas, almacenamiento, carga de niveles, tema
public/levels/         packs de niveles en JSON
public/icons/          logotipo e íconos
android/               proyecto Android (Capacitor)
assets/                fuentes del ícono y la pantalla de inicio de Android
scripts/               validación de los packs de niveles
tests/                 tests de los generadores
```
