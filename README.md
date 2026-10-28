# Pausa · puzzles diarios

<img src="public/icons/icon-512.png" width="96" alt="Pausa" />

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

Cada push a `main` compila un APK en GitHub Actions y lo publica en **Releases** del repositorio
(archivo `Pausa-1.0.N.apk`). Para instalarlo, ábrelo en el teléfono y permite "instalar apps de
fuentes desconocidas".

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

- **Sonidos cozy**: sintetizados en el momento con Web Audio (notas suaves en escala pentatónica con
  un poco de reverberación); sin archivos de audio. Se pueden apagar o ajustar el volumen en Ajustes.
- **Recordatorios**: un aviso diario a la hora que elijas, con mensajes que rotan, y un aviso de racha
  a las 21:30 si aún no completaste el día. En Android son notificaciones programadas que llegan con la
  app cerrada; en el navegador sólo funcionan con la página abierta.

## Modos

- **Diario**: cuatro puzzles destacados cada día y el resto en "Otros puzzles", en dificultad Estándar,
  Difícil o Experto. El calendario semanal permite jugar días anteriores. Resolver cuatro puzzles en
  un día mantiene la racha. El Sudoku sólo está disponible el día actual.
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
