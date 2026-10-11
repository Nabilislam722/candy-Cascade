// Plays every level many times with a simple greedy bot and prints win rates and scores.
// Usage: `npm run simulate [games] [fromLevel] [toLevel]`. Level data comes from `npm run levels`.
import { LEVELS } from '../src/core/levels.js';
import { play } from './bot.mjs';

const games = Number(process.argv[2] ?? 200);
const from = Number(process.argv[3] ?? 1);
const to = Number(process.argv[4] ?? process.argv[3] ?? LEVELS.length);

const pct = (n, d) => `${((100 * n) / d).toFixed(0)}%`.padStart(4);

console.log(`games per level: ${games}`);
console.log('lvl  name                win  1★   2★   3★   avg score   p50 win   left  shuffles  cascade   suggested stars (p40 / p85 of wins)');
for (const level of LEVELS) {
  if (level.id < from || level.id > to) continue;
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
