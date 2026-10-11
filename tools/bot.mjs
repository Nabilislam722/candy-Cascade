// A greedy bot used to balance levels: prefers specials, goal candies and moves next to blockers.
import { Engine } from '../src/core/engine.js';
import { createRng } from '../src/core/rng.js';

export function chooseMove(engine, rng) {
  const wanted = new Set(engine.goals.filter((g) => g.type === 'collect' && g.left > 0).map((g) => g.color));
  const blockersLeft = engine.goals.some((g) => g.type !== 'collect' && g.type !== 'score' && g.left > 0);
  let best = null;
  let bestScore = -Infinity;
  for (const move of engine.board.validMoves()) {
    let score = move.weight + rng.next() * 4;
    if (wanted.has(move.a.piece.color) || wanted.has(move.b.piece.color)) score += 4;
    if (blockersLeft) {
      for (const cell of [move.a, move.b]) {
        for (const n of engine.board.neighbors(cell)) if (n.blocker || n.lock) score += 2.5;
      }
    }
    score += (move.a.r + move.b.r) * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

// Plays a level with its own move count. Resolves to { win, score, stars, movesLeftAtWin, stats }.
export async function play(level, seed) {
  const engine = new Engine(level, { rng: createRng(seed) });
  const bot = createRng(seed ^ 0x9e3779b9);
  let movesLeftAtWin = 0;
  engine.hooks.complete = () => (movesLeftAtWin = engine.moves);
  while (!engine.over) {
    const move = chooseMove(engine, bot);
    if (!move) break;
    await engine.trySwap(move.a, move.b);
  }
  return { win: !!engine.result?.win, score: engine.score, stars: engine.result?.stars ?? 0, movesLeftAtWin, stats: engine.stats };
}

// Plays without a real move limit and returns the fewest starting moves that would have won
// this exact game (stopwatch bonuses included), or Infinity if the goals were not met by `cap`.
export async function movesNeeded(level, seed, cap = 90) {
  const engine = new Engine({ stars: [1, 2, 3], ...level, moves: cap }, { rng: createRng(seed) });
  const bot = createRng(seed ^ 0x9e3779b9);
  let swaps = 0;
  let bonus = 0;
  let need = 0;
  let done = false;
  engine.hooks.moves = (moves, delta) => {
    if (delta === -1 && !done) {
      swaps++;
      need = Math.max(need, swaps - bonus);
    } else if (delta > 0) bonus += delta;
  };
  engine.hooks.complete = () => {
    done = true;
    engine.moves = 0; // skip the finale; only the moves matter here
  };
  while (!engine.over) {
    const move = chooseMove(engine, bot);
    if (!move) break;
    await engine.trySwap(move.a, move.b);
  }
  return done ? need : Infinity;
}
