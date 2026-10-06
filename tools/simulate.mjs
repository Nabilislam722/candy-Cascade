// Plays every level many times with a simple greedy bot and prints win rates and scores.
// Used to balance move counts and star thresholds: `npm run simulate [games] [levelId]`.
import { Engine } from '../src/core/engine.js';
import { LEVELS } from '../src/core/levels.js';
import { createRng } from '../src/core/rng.js';

const games = Number(process.argv[2] ?? 200);
const only = process.argv[3] ? Number(process.argv[3]) : null;

function chooseMove(engine, rng) {
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

async function play(level, seed) {
  const rng = createRng(seed);
  const bot = createRng(seed ^ 0x9e3779b9);
  const engine = new Engine(level, { rng });
  let movesLeftAtWin = 0;
  engine.hooks.complete = () => (movesLeftAtWin = engine.moves);
  while (!engine.over) {
    const move = chooseMove(engine, bot);
    if (!move) break;
    await engine.trySwap(move.a, move.b);
  }
  return { win: !!engine.result?.win, score: engine.score, stars: engine.result?.stars ?? 0, movesLeftAtWin, stats: engine.stats };
}

const pct = (n, d) => `${((100 * n) / d).toFixed(0)}%`.padStart(4);

console.log(`games per level: ${games}`);
console.log('lvl  name                win  1★   2★   3★   avg score   p50 win   left  shuffles  cascade   suggested stars (p40 / p85 of wins)');
for (const level of LEVELS) {
  if (only && level.id !== only) continue;
  const results = [];
  for (let i = 0; i < games; i++) results.push(await play(level, 1000 + i * 7 + level.id * 104729));
  const wins = results.filter((r) => r.win);
  const starCount = (n) => wins.filter((r) => r.stars >= n).length;
  const avg = (list, f) => (list.length ? list.reduce((s, r) => s + f(r), 0) / list.length : 0);
  const winScores = wins.map((r) => r.score).sort((a, b) => a - b);
  const median = winScores.length ? winScores[Math.floor(winScores.length / 2)] : 0;
  console.log(
    [
      String(level.id).padStart(3),
      level.name.padEnd(18),
      pct(wins.length, games),
      pct(starCount(1), games),
      pct(starCount(2), games),
      pct(starCount(3), games),
      String(Math.round(avg(results, (r) => r.score))).padStart(10),
      String(median).padStart(9),
      avg(wins, (r) => r.movesLeftAtWin).toFixed(1).padStart(6),
      avg(results, (r) => r.stats.shuffles).toFixed(2).padStart(9),
      avg(results, (r) => r.stats.bestCascade).toFixed(1).padStart(8),
      `   ${[0.4, 0.85].map((q) => Math.round((winScores[Math.floor(q * (winScores.length - 1))] ?? 0) / 500) * 500).join(' / ')}`,
    ].join('  '),
  );
}
