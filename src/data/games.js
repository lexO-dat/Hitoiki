// Game catalogue: names, colours (main / card background), rules and implementation per puzzle.
import * as queens from '../games/queens/logic.js';
import * as tango from '../games/tango/logic.js';
import * as zip from '../games/zip/logic.js';
import * as sudoku from '../games/sudoku/logic.js';
import * as shikaku from '../games/shikaku/logic.js';
import * as mind from '../games/mind/logic.js';
import * as sets from '../games/sets/logic.js';
import * as kami from '../games/kami/logic.js';
import * as pipes from '../games/pipes/logic.js';
import * as bridges from '../games/bridges/logic.js';
import * as lits from '../games/lits/logic.js';
import QueensBoard from '../games/queens/Board.jsx';
import TangoBoard from '../games/tango/Board.jsx';
import ZipBoard from '../games/zip/Board.jsx';
import SudokuBoard from '../games/sudoku/Board.jsx';
import ShikakuBoard from '../games/shikaku/Board.jsx';
import MindBoard from '../games/mind/Board.jsx';
import SetsBoard from '../games/sets/Board.jsx';
import KamiBoard from '../games/kami/Board.jsx';
import PipesBoard from '../games/pipes/Board.jsx';
import BridgesBoard from '../games/bridges/Board.jsx';
import LitsBoard from '../games/lits/Board.jsx';

export const GAMES = [
  {
    id: 'shikaku', name: 'Shikaku', tagline: 'Divide el tablero en rectángulos', main: '#e56c72', bg: '#f5c8cb',
    rules: ['Arrastra para dibujar rectángulos.', 'Cada rectángulo contiene exactamente un número.', 'El número indica cuántas casillas ocupa.', 'Todo el tablero queda cubierto.'],
    logic: shikaku, Board: ShikakuBoard,
  },
  {
    id: 'zip', name: 'Ruta', tagline: 'Une los números en orden', main: '#a695f2', bg: '#cec5f6',
    rules: ['Empieza en el 1 y arrastra una línea continua.', 'Pasa por los números en orden: 1, 2, 3…', 'Recorre todas las casillas exactamente una vez.'],
    logic: zip, Board: ZipBoard,
  },
  {
    id: 'queens', name: 'Coronas', tagline: 'Una corona en cada región', main: '#d8b6e0', bg: '#fae7fe',
    rules: ['Coloca una corona en cada fila, columna y región de color.', 'Dos coronas nunca se tocan, ni en diagonal.', 'Toca una vez para marcar ×, dos veces para la corona. Arrastra para marcar varias.'],
    logic: queens, Board: QueensBoard,
  },
  {
    id: 'pipes', name: 'Tuberías', tagline: 'Gira las piezas para cerrar el circuito', main: '#22d1b3', bg: '#c4f9f0',
    rules: ['Toca una pieza para girarla.', 'Conecta todas las tuberías con la fuente central.', 'No puede quedar ningún extremo abierto.'],
    logic: pipes, Board: PipesBoard,
  },
  {
    id: 'bridges', name: 'Puentes', tagline: 'Teje una red de conexiones', main: '#6cc5e5', bg: '#bde9f9',
    rules: ['Une puntos con conexiones simples o dobles, en línea recta.', 'Cada punto tiene tantas conexiones como su número.', 'Las conexiones no se cruzan.', 'Todos los puntos forman una sola red.'],
    logic: bridges, Board: BridgesBoard,
  },
  {
    id: 'tango', name: 'Sol y Luna', tagline: 'Equilibra la cuadrícula', main: '#9fcc9b', bg: '#e0efdf',
    rules: ['Cada fila y columna tiene tantos soles como lunas.', 'Nunca hay más de dos iguales seguidos.', '= une casillas iguales; × une casillas opuestas.', 'Toca para alternar sol → luna → vacío.'],
    logic: tango, Board: TangoBoard,
  },
  {
    id: 'kami', name: 'Pintura', tagline: 'Pinta todo de un solo color', main: '#d784a8', bg: '#fbd3e4',
    rules: ['Elige un color abajo y toca una zona para pintarla.', 'Las zonas del mismo color se unen.', 'Deja todo el tablero de un color sin pasarte de movimientos.'],
    logic: kami, Board: KamiBoard,
  },
  {
    id: 'mind', name: 'Código', tagline: 'Descifra la combinación secreta', main: '#b4a69c', bg: '#e3d4c9',
    rules: ['Adivina la secuencia de colores oculta.', 'Punto oscuro: color y posición correctos.', 'Punto claro: color correcto en otra posición.', 'Tienes intentos limitados.'],
    logic: mind, Board: MindBoard,
  },
  {
    id: 'lits', name: 'LITS', tagline: 'Encaja una pieza en cada región', main: '#f1d21a', bg: '#fef7d3',
    rules: ['Sombrea una pieza de 4 casillas (L, I, T o S) en cada región.', 'Todas las piezas forman un solo grupo conectado.', 'No puede haber un bloque 2×2 sombreado.', 'Dos piezas iguales no pueden tocarse por un lado.'],
    logic: lits, Board: LitsBoard,
  },
  {
    id: 'sets', name: 'Tríos', tagline: 'Encuentra todos los tríos', main: '#81a2d4', bg: '#bccde7',
    rules: ['Cada carta tiene forma, color, relleno y cantidad.', 'Un trío son 3 cartas donde cada rasgo es igual en todas o distinto en todas.', 'Encuentra todos los tríos de la mesa.'],
    logic: sets, Board: SetsBoard,
  },
  {
    id: 'sudoku', name: 'Sudoku', tagline: 'El clásico del día', main: '#f4b67b', bg: '#fff2e6', todayOnly: true,
    rules: ['Rellena con números del 1 al 9.', 'Cada fila, columna y caja de 3×3 contiene cada número una sola vez.', 'Usa Notas para apuntar candidatos.'],
    logic: sudoku, Board: SudokuBoard,
  },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export const MODES = [
  { id: 'standard', label: 'Estándar' },
  { id: 'hard', label: 'Difícil', color: 'var(--hard)' },
  { id: 'expert', label: 'Experto', color: 'var(--expert)' },
];
