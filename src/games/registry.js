// The rules of every game, without its board (no React): what the generator worker and the tests use.
import * as shikaku from './shikaku/logic.js';
import * as zip from './zip/logic.js';
import * as queens from './queens/logic.js';
import * as pipes from './pipes/logic.js';
import * as bridges from './bridges/logic.js';
import * as tango from './tango/logic.js';
import * as kami from './kami/logic.js';
import * as mind from './mind/logic.js';
import * as lits from './lits/logic.js';
import * as sets from './sets/logic.js';
import * as sudoku from './sudoku/logic.js';

export const LOGIC = { shikaku, zip, queens, pipes, bridges, tango, kami, mind, lits, sets, sudoku };
