import { Board } from '../src/core/board.js';
import { Special, createPiece } from '../src/core/pieces.js';
import { createRng } from '../src/core/rng.js';

/*
 * Builds a board from rows of characters:
 *   0-5 candy color   .  hole   I ice   C caramel   H chocolate   _ empty open cell
 *   B bomb   R rainbow   h/v striped (color 0)   L0-L5 is not supported; use lock() instead.
 */
export function boardFrom(rows, { colors = 5, seed = 1 } = {}) {
  const board = new Board(rows.length, rows[0].length, createRng(seed), colors);
  for (const cell of board.list) {
    const ch = rows[cell.r][cell.c];
    if (ch === '.') continue;
    cell.active = true;
    if (ch === 'I') cell.blocker = { type: 'ice', hp: 1 };
    else if (ch === 'C') cell.blocker = { type: 'caramel', hp: 2 };
    else if (ch === 'H') cell.blocker = { type: 'chocolate', hp: 1 };
    else if (ch === 'B') cell.piece = createPiece(-1, Special.BOMB);
    else if (ch === 'R') cell.piece = createPiece(-1, Special.RAINBOW);
    else if (ch === 'h') cell.piece = createPiece(0, Special.STRIPE_H);
    else if (ch === 'v') cell.piece = createPiece(0, Special.STRIPE_V);
    else if (ch !== '_') cell.piece = createPiece(Number(ch));
  }
  for (let c = 0; c < board.cols; c++) {
    for (let r = 0; r < board.rows; r++) {
      if (board.cells[r][c].active) {
        board.cells[r][c].spawner = true;
        break;
      }
    }
  }
  return board;
}

export function colorsOf(board) {
  return board.cells.map((row) =>
    row
      .map((cell) => {
        if (!cell.active) return '.';
        if (cell.blocker) return cell.blocker.type[0].toUpperCase();
        if (!cell.piece) return '_';
        return cell.piece.color < 0 ? '*' : String(cell.piece.color);
      })
      .join(''),
  );
}

// Checks the invariants that must hold whenever the engine is idle between moves.
export function checkSettled(board) {
  const seen = new Set();
  const problems = [];
  for (const cell of board.list) {
    if (!cell.active) {
      if (cell.piece || cell.blocker) problems.push(`hole ${cell.r},${cell.c} has content`);
      continue;
    }
    if (cell.blocker && cell.piece) problems.push(`blocker and piece at ${cell.r},${cell.c}`);
    if (cell.lock && !cell.piece) problems.push(`empty cage at ${cell.r},${cell.c}`);
    if (cell.piece) {
      if (seen.has(cell.piece)) problems.push(`piece ${cell.piece.id} in two cells`);
      seen.add(cell.piece);
      if (cell.piece.dying) problems.push(`dying piece left at ${cell.r},${cell.c}`);
      if (cell.piece.fresh) problems.push(`fresh flag left at ${cell.r},${cell.c}`);
    }
  }
  if (board.findMatchGroups().length) problems.push('unresolved match on board');
  if (!isSettled(board)) problems.push('board is not settled (something could still fall)');
  return problems;
}

// True when neither gravity nor a diagonal slide could move anything. Empty cells are allowed
// only where blockers seal them off from every source of candies.
export function isSettled(board) {
  const copy = new Board(board.rows, board.cols, createRng(1), board.colors);
  for (const cell of board.list) {
    Object.assign(copy.cells[cell.r][cell.c], {
      active: cell.active,
      blocker: cell.blocker,
      lock: cell.lock,
      piece: cell.piece,
      spawner: cell.spawner,
    });
  }
  const fall = copy.gravity();
  if (fall.moves.length || fall.spawns.length) return false;
  return copy.diagonal().length === 0;
}

// Empties every free cell of a fresh level board and lets it refill. Returns cells that stay empty.
export function unreachableCells(board) {
  for (const cell of board.list) if (!cell.lock) cell.piece = null;
  for (let guard = 0; guard < 200; guard++) {
    const fall = board.gravity();
    const slides = board.diagonal();
    if (!fall.moves.length && !fall.spawns.length && !slides.length) break;
  }
  return board.list.filter((cell) => board.isOpen(cell) && !cell.piece).map((cell) => `${cell.r},${cell.c}`);
}
