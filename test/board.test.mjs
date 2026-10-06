import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Special } from '../src/core/pieces.js';
import { boardFrom, colorsOf } from './helpers.mjs';

test('finds horizontal and vertical runs as separate groups', () => {
  const board = boardFrom(['00012', '12341', '13342', '32141']);
  const groups = board.findMatchGroups();
  assert.equal(groups.length, 2);
  const sizes = groups.map((g) => g.cells.length).sort();
  assert.deepEqual(sizes, [3, 3]);
});

test('merges an L shape into one group that makes a bomb', () => {
  const board = boardFrom(['01234', '01342', '00041', '23412']);
  const groups = board.findMatchGroups();
  assert.equal(groups.length, 1);
  assert.equal(groups[0].cells.length, 5);
  const plan = board.planGroup(groups[0]);
  assert.equal(plan.special, Special.BOMB);
  assert.deepEqual([plan.at.r, plan.at.c], [2, 0]);
});

test('four in a row makes a striped candy at the swapped cell', () => {
  const board = boardFrom(['11112', '23423', '34234']);
  const [group] = board.findMatchGroups();
  const swapped = board.cell(0, 2);
  const plan = board.planGroup(group, [swapped, board.cell(1, 2)], 'v');
  assert.equal(plan.special, Special.STRIPE_V);
  assert.equal(plan.at, swapped);
});

test('five in a row makes a rainbow bomb', () => {
  const board = boardFrom(['22222', '31413', '14341']);
  const [group] = board.findMatchGroups();
  assert.equal(board.planGroup(group).special, Special.RAINBOW);
});

test('holes and blockers break runs', () => {
  assert.equal(boardFrom(['00.0', '1234']).findMatchGroups().length, 0);
  assert.equal(boardFrom(['00I0', '1234']).findMatchGroups().length, 0);
});

test('gravity compacts a column and stacks spawns above it', () => {
  const board = boardFrom(['1', '_', '2', '_', '3']);
  const { moves, spawns } = board.gravity();
  assert.equal(moves.length, 2);
  assert.equal(spawns.length, 2);
  assert.deepEqual(colorsOf(board).slice(2), ['1', '2', '3']);
  // The lowest new candy starts one row above the column, the next one two rows above.
  const fromRows = spawns.map((s) => s.fromRow).sort((a, b) => b - a);
  assert.deepEqual(fromRows, [-1, -2]);
  for (const spawn of spawns) assert.equal(spawn.to.r - spawn.fromRow, 2);
});

test('candies fall through holes in a column', () => {
  const board = boardFrom(['1', '.', '.', '_']);
  board.gravity();
  assert.equal(board.cell(3, 0).piece.color, 1);
  assert.ok(board.cell(0, 0).piece, 'top refilled');
});

test('blockers stop falling candies and gaps below them fill diagonally', () => {
  const board = boardFrom(['123', '2I1', '3_2']);
  const { spawns } = board.gravity();
  assert.equal(spawns.length, 0, 'nothing reaches below the ice from above');
  assert.equal(board.cell(2, 1).piece, null);
  const slides = board.diagonal();
  assert.equal(slides.length, 1);
  assert.equal(slides[0].to, board.cell(2, 1));
  assert.ok(board.cell(2, 1).piece);
  // The column the candy came from refills on the next gravity pass.
  const again = board.gravity();
  assert.equal(again.spawns.length + again.moves.length > 0, true);
  assert.ok(board.list.every((cell) => cell.blocker || cell.piece));
});

test('valid moves include matches and special swaps', () => {
  const board = boardFrom(['0010', '3434', '4343']);
  const moves = board.validMoves();
  assert.ok(moves.some((m) => m.a === board.cell(0, 2) && m.b === board.cell(0, 3)));
  const bombs = boardFrom(['B1', '23']);
  assert.ok(bombs.hasValidMove());
});

test('shuffle leaves no matches and at least one move', () => {
  const board = boardFrom(['0123', '1230', '2301', '3012'], { colors: 4 });
  board.shuffle();
  assert.equal(board.findMatchGroups().length, 0);
  assert.ok(board.hasValidMove());
});

test('chocolate spreads into a neighbouring candy', () => {
  const board = boardFrom(['H1', '23']);
  const spread = board.spreadChocolate();
  assert.ok(spread);
  assert.equal(spread.to.blocker.type, 'chocolate');
  assert.equal(board.countBlockers('chocolate'), 2);
});
