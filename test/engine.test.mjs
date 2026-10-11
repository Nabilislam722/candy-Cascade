import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Engine } from '../src/core/engine.js';
import { LEVELS } from '../src/core/levels.js';
import { Special } from '../src/core/pieces.js';
import { createRng } from '../src/core/rng.js';
import { Board } from '../src/core/board.js';
import { boardFrom, checkSettled, unreachableCells } from './helpers.mjs';

function engineWith(rows, { moves = 10, goals = [{ type: 'score', target: 1e9 }], colors = 5, seed = 7 } = {}) {
  const level = { id: 0, moves, colors, layout: rows.map((r) => r.replace(/[^.]/g, 'o')), goals, stars: [1, 2, 3] };
  const engine = new Engine(level, { rng: createRng(seed) });
  engine.board = boardFrom(rows, { colors, seed });
  engine.goals = goals.map((g) => ({ ...g, target: g.target ?? g.count ?? 0, left: g.target ?? g.count ?? 0 }));
  return engine;
}

test('a swap without a match is refused and undone', async () => {
  const engine = engineWith(['0123', '1230', '2301', '3012']);
  const a = engine.board.cell(0, 0);
  const b = engine.board.cell(0, 1);
  const before = [a.piece, b.piece];
  assert.equal(await engine.trySwap(a, b), false);
  assert.deepEqual([a.piece, b.piece], before);
  assert.equal(engine.moves, 10);
});

test('a matching swap clears, refills and spends a move', async () => {
  const engine = engineWith(['0010', '3434', '4343', '2121']);
  const ok = await engine.trySwap(engine.board.cell(0, 2), engine.board.cell(0, 3));
  assert.equal(ok, true);
  assert.equal(engine.moves, 9);
  assert.ok(engine.score >= 60);
  assert.deepEqual(checkSettled(engine.board), []);
});

test('a horizontal striped candy clears its row', async () => {
  const engine = engineWith(['h00', '123', '231'], { colors: 4 });
  let cleared = 0;
  engine.anim = new Proxy(engine.anim, { get: (t, k) => (k === 'pop' ? () => cleared++ : t[k]) });
  await engine.activate(engine.board.cell(0, 0).piece, engine.board.cell(0, 0), engine.context());
  assert.equal(cleared, 2);
  assert.equal(engine.board.cell(0, 1).piece, null);
  assert.ok(engine.board.cell(1, 1).piece);
});

test('a bomb swapped with a candy clears the area around it', async () => {
  const engine = engineWith(['01234', '12340', '23B01', '34012', '40123']);
  await engine.trySwap(engine.board.cell(2, 2), engine.board.cell(2, 3));
  assert.equal(engine.moves, 9);
  assert.deepEqual(checkSettled(engine.board), []);
});

test('a rainbow bomb swapped with a candy clears every candy of that color', async () => {
  const engine = engineWith(['0123', '1R30', '2301', '3012'], { colors: 4 });
  const collected = [];
  engine.hooks.goal = () => {};
  engine.goals = [{ type: 'collect', color: 3, target: 99, left: 99 }];
  engine.hooks.goal = (i, goal) => collected.push(goal.left);
  await engine.trySwap(engine.board.cell(1, 1), engine.board.cell(1, 2));
  assert.ok(collected.length >= 4, `cleared ${collected.length} candies of color 3`);
  assert.deepEqual(checkSettled(engine.board), []);
});

test('two striped candies swapped together fire a cross', async () => {
  const engine = engineWith(['01234', '12340', '23hv1', '34012', '40123']);
  await engine.trySwap(engine.board.cell(2, 2), engine.board.cell(2, 3));
  assert.equal(engine.moves, 9);
  assert.deepEqual(checkSettled(engine.board), []);
});

test('matches next to ice break it and count toward the goal', async () => {
  const near = engineWith(['4343', '0010', 'IIII', '2121'], { goals: [{ type: 'ice', target: 4 }] });
  await near.trySwap(near.board.cell(1, 2), near.board.cell(1, 3));
  assert.ok(near.goals[0].left <= 1, `ice left: ${near.goals[0].left}`);
});

test('caramel needs two hits', async () => {
  const engine = engineWith(['0010', 'C434', '4343'], { goals: [{ type: 'caramel', target: 1 }] });
  await engine.trySwap(engine.board.cell(0, 2), engine.board.cell(0, 3));
  const cell = engine.board.cell(1, 0);
  assert.equal(cell.blocker?.hp, 1);
  assert.equal(engine.goals[0].left, 1);
});

test('winning converts leftover moves into a finale and reports stars', async () => {
  const engine = engineWith(['0010', '3434', '4343', '2121'], { goals: [{ type: 'score', target: 10 }], moves: 5 });
  let result = null;
  engine.hooks.win = (r) => (result = r);
  await engine.trySwap(engine.board.cell(0, 2), engine.board.cell(0, 3));
  assert.ok(result?.win);
  assert.equal(engine.moves, 0);
  assert.ok(result.stars >= 1);
});

// Plays every level with random valid moves and checks the board invariants after each move.
test('every level stays consistent under random play', async () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 2; seed++) {
      const rng = createRng(seed * 7919 + level.id);
      const engine = new Engine(level, { rng });
      assert.deepEqual(checkSettled(engine.board), [], `level ${level.id} initial board`);
      for (let turn = 0; turn < 40 && !engine.over; turn++) {
        const moves = engine.board.validMoves();
        assert.ok(moves.length > 0, `level ${level.id} has a move`);
        const move = moves[Math.floor(rng.next() * moves.length)];
        const ok = await engine.trySwap(move.a, move.b);
        assert.ok(ok, `level ${level.id}: valid move was refused`);
        if (!engine.over) {
          assert.deepEqual(checkSettled(engine.board), [], `level ${level.id} seed ${seed} turn ${turn}`);
        }
      }
    }
  }
});

test('every open cell of every level can be refilled', () => {
  for (const level of LEVELS) {
    const board = Board.fromLevel(level, createRng(level.id));
    assert.deepEqual(unreachableCells(board), [], `level ${level.id}`);
  }
});

test('tapping a bomb sets it off', async () => {
  const engine = engineWith(['01234', '12340', '23B01', '34012', '40123']);
  const ok = await engine.tapActivate(engine.board.cell(2, 2));
  assert.equal(ok, true);
  assert.equal(engine.moves, 9);
  assert.equal(engine.board.list.filter((c) => c.piece?.special === Special.BOMB).length, 0);
});

test('there are 300 levels with a challenge every 10th level', () => {
  assert.equal(LEVELS.length, 300);
  LEVELS.forEach((level, i) => {
    assert.equal(level.id, i + 1);
    assert.equal(level.challenge, level.id % 10 === 0, `level ${level.id} challenge flag`);
    assert.ok(level.moves >= 12 && level.moves <= 45, `level ${level.id} moves ${level.moves}`);
    assert.ok(level.goals.length > 0, `level ${level.id} has goals`);
    const [one, two, three] = level.stars;
    assert.ok(one < two && two < three, `level ${level.id} star thresholds rise`);
    for (const goal of level.goals) {
      if (goal.type === 'collect') assert.ok(goal.color < level.colors, `level ${level.id} collects a candy it uses`);
    }
  });
  assert.equal(new Set(LEVELS.map((l) => l.name)).size, 300, 'level names are unique');
});

test('blocker goals always have blockers to clear', () => {
  for (const level of LEVELS) {
    const engine = new Engine(level, { rng: createRng(level.id) });
    for (const goal of engine.goals) assert.ok(goal.target > 0, `level ${level.id} ${goal.type} goal is not empty`);
  }
});
