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

// Each game: a traditional Japanese color (main / soft bg) and a kanji for its seal.
export const GAMES = [
  {
    id: 'shikaku', name: 'Shikaku', kanji: '角', tagline: 'Divide el tablero en rectángulos', main: '#e48a78', bg: '#f8ddd5',
    rules: ['Arrastra para dibujar rectángulos.', 'Cada rectángulo contiene exactamente un número.', 'El número indica cuántas casillas ocupa.', 'Todo el tablero queda cubierto.'],
    logic: shikaku, Board: ShikakuBoard,
  },
  {
    id: 'zip', name: 'Ruta', kanji: '道', tagline: 'Une los números en orden', main: '#9486d1', bg: '#e3ddf4',
    rules: ['Empieza en el 1 y arrastra una línea continua.', 'Pasa por los números en orden: 1, 2, 3…', 'Recorre todas las casillas exactamente una vez.'],
    logic: zip, Board: ZipBoard,
  },
  {
    id: 'queens', name: 'Coronas', kanji: '冠', tagline: 'Una corona en cada región', main: '#d895ac', bg: '#f7e0e7',
    rules: ['Coloca una corona en cada fila, columna y región de color.', 'Dos coronas nunca se tocan, ni en diagonal.', 'Toca una vez para marcar ×, dos veces para la corona. Arrastra para marcar varias.'],
    logic: queens, Board: QueensBoard,
  },
  {
    id: 'pipes', name: 'Tuberías', kanji: '管', tagline: 'Gira las piezas para cerrar el circuito', main: '#5fb0a0', bg: '#d5ede7',
    rules: ['Toca una pieza para girarla.', 'Conecta todas las tuberías con la fuente central.', 'No puede quedar ningún extremo abierto.'],
    logic: pipes, Board: PipesBoard,
  },
  {
    id: 'bridges', name: 'Puentes', kanji: '橋', tagline: 'Teje una red de conexiones', main: '#6ea7cf', bg: '#d8e8f3',
    rules: ['Une puntos con conexiones simples o dobles, en línea recta.', 'Cada punto tiene tantas conexiones como su número.', 'Las conexiones no se cruzan.', 'Todos los puntos forman una sola red.'],
    logic: bridges, Board: BridgesBoard,
  },
  {
    id: 'tango', name: 'Sol y Luna', kanji: '陽', tagline: 'Equilibra la cuadrícula', main: '#94b46f', bg: '#e4edd6',
    rules: ['Cada fila y columna tiene tantos soles como lunas.', 'Nunca hay más de dos iguales seguidos.', '= une casillas iguales; × une casillas opuestas.', 'Toca para alternar sol → luna → vacío.'],
    logic: tango, Board: TangoBoard,
  },
  {
    id: 'kami', name: 'Pintura', kanji: '彩', tagline: 'Pinta todo de un solo color', main: '#e8975f', bg: '#fae2d0',
    rules: ['Elige un color abajo y toca una zona para pintarla.', 'Las zonas del mismo color se unen.', 'Deja todo el tablero de un color sin pasarte de movimientos.'],
    logic: kami, Board: KamiBoard,
  },
  {
    id: 'mind', name: 'Código', kanji: '謎', tagline: 'Descifra la combinación secreta', main: '#ab917b', bg: '#ece2d7',
    rules: ['Adivina la secuencia de colores oculta.', 'Punto oscuro: color y posición correctos.', 'Punto claro: color correcto en otra posición.', 'Tienes intentos limitados.'],
    logic: mind, Board: MindBoard,
  },
  {
    id: 'lits', name: 'LITS', kanji: '形', tagline: 'Encaja una pieza en cada región', main: '#e2b844', bg: '#f8edc8',
    rules: ['Sombrea una pieza de 4 casillas (L, I, T o S) en cada región.', 'Todas las piezas forman un solo grupo conectado.', 'No puede haber un bloque 2×2 sombreado.', 'Dos piezas iguales no pueden tocarse por un lado.'],
    logic: lits, Board: LitsBoard,
  },
  {
    id: 'sets', name: 'Tríos', kanji: '組', tagline: 'Encuentra todos los tríos', main: '#6382bb', bg: '#dbe3f1',
    rules: ['Cada carta tiene forma, color, relleno y cantidad.', 'Un trío son 3 cartas donde cada rasgo es igual en todas o distinto en todas.', 'Encuentra todos los tríos de la mesa.'],
    logic: sets, Board: SetsBoard,
  },
  {
    id: 'sudoku', name: 'Sudoku', kanji: '数', tagline: 'El clásico del día', main: '#c99e68', bg: '#f2e6d2', todayOnly: true,
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
