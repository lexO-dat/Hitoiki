# Lógica Diaria

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

Todos tienen deshacer, limpiar, pistas, conteo de errores, cronómetro y pantalla de resultado.

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
scripts/               validación de los packs de niveles
tests/                 tests de los generadores
```
