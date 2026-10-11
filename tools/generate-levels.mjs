// Builds all 300 levels and calibrates them with simulated play, then writes src/core/level-data.js.
//   npm run levels            all levels
//   npm run levels -- 40 60   only levels 40-60 (merged into the existing data file)
//
// Normal levels get enough moves for the bot to win about 95% of games; every 10th level is a
// challenge tuned to about 70%, so most players clear it in one or two tries.
import { readFile, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { movesNeeded, play } from './bot.mjs';
import { HANDMADE, designLevel } from './level-designs.mjs';

export const TOTAL_LEVELS = 300;
const PROBE_GAMES = 160;
const CHECK_GAMES = 100;
const MOVE_CAP = 90;

const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
const round500 = (n) => Math.max(500, Math.round(n / 500) * 500);
const seedFor = (id, round, i) => (id * 1000003 + round * 7919 + i * 104729) >>> 0;

async function calibrate(id) {
  const challenge = id % 10 === 0;
  const handmade = id <= HANDMADE.length;
  const target = challenge ? 0.7 : 0.95;
  const [minMoves, maxMoves] = challenge ? [16, 36] : [14, 32];
  let amount = 1;
  let variant = 0;
  let best = null;
  for (let round = 0; round < 14; round++) {
    const design = designLevel(id, amount, variant);
    const needs = [];
    for (let i = 0; i < PROBE_GAMES; i++) needs.push(await movesNeeded(design, seedFor(id, round, i), MOVE_CAP));
    needs.sort((a, b) => a - b);
    const p = percentile(needs, target);
    if (!handmade && (!Number.isFinite(p) || p > maxMoves)) {
      // Too long: shrink the goals, and after a few tries start over with a different design.
      if (amount > 0.45) amount *= 0.8;
      else if (variant < 4) [variant, amount] = [variant + 1, 1];
      else break;
      continue;
    }
    if (!handmade && p < minMoves - 2 && amount < 2.4) {
      amount *= 1.25;
      continue;
    }
    const moves = Math.min(Math.max(Number.isFinite(p) ? p : maxMoves, minMoves), maxMoves + 6);
    const checked = await check(id, design, moves, challenge, handmade ? 12 : minMoves);
    best = { design, ...checked, amount };
    // A challenge that stays easy even at its fewest moves gets more to do.
    if (challenge && !handmade && checked.winRate > 0.82 && amount < 2.4) {
      amount *= 1.25;
      continue;
    }
    break;
  }
  if (!best) {
    const design = designLevel(id, amount, variant);
    best = { design, ...(await check(id, design, maxMoves + 6, challenge, minMoves)), amount };
  }
  const { design, moves, results, winRate } = best;
  const wins = results.filter((r) => r.win).map((r) => r.score).sort((a, b) => a - b);
  const scoreGoal = design.goals.find((g) => g.type === 'score');
  const two = round500(Math.max(percentile(wins, 0.4) ?? 1000, scoreGoal ? scoreGoal.target + 500 : 0));
  const three = round500(Math.max(percentile(wins, 0.85) ?? 2000, two + 1000));
  const one = scoreGoal ? scoreGoal.target : round500(two * 0.45);
  return { level: { ...design, moves, stars: [Math.min(one, two - 500), two, three] }, winRate, amount };
}

// Plays the chosen move count with fresh games and nudges it toward the target win rate.
async function check(id, design, moves, challenge, floor) {
  let results;
  let winRate = 0;
  for (let round = 0; round < 6; round++) {
    const level = { ...design, moves, stars: [1, 2, 3] };
    results = [];
    for (let i = 0; i < CHECK_GAMES; i++) results.push(await play(level, seedFor(id, 50 + round, i)));
    winRate = results.filter((r) => r.win).length / CHECK_GAMES;
    if (!challenge && winRate < 0.92) moves += winRate < 0.85 ? 2 : 1;
    else if (challenge && winRate < 0.6) moves += 1;
    else if (challenge && winRate > 0.8 && moves > floor) moves -= 1;
    else break;
  }
  return { moves, results, winRate };
}

// ---------------------------------------------------------------------------- output

function serialize(level) {
  const fields = [
    `id: ${level.id}`,
    `name: ${JSON.stringify(level.name)}`,
    `theme: ${JSON.stringify(level.theme)}`,
    `moves: ${level.moves}`,
    `colors: ${level.colors}`,
  ];
  if (level.bonusChance) fields.push(`bonusChance: ${level.bonusChance}`, `maxBonus: ${level.maxBonus}`);
  fields.push(`layout: ${JSON.stringify(level.layout.join('/'))}`);
  const goals = level.goals.map((g) => `{ ${Object.entries(g).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }`);
  fields.push(`goals: [${goals.join(', ')}]`, `stars: [${level.stars.join(', ')}]`);
  if (level.tip) fields.push(`tip: ${JSON.stringify(level.tip)}`);
  return `  { ${fields.join(', ')} },`;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out = join(root, 'src/core/level-data.js');
  const from = Number(process.argv[2] ?? 1);
  const to = Number(process.argv[3] ?? process.argv[2] ?? TOTAL_LEVELS);
  const ids = [];
  for (let id = from; id <= to; id++) ids.push(id);

  let existing = new Map();
  if (from !== 1 || to !== TOTAL_LEVELS) {
    try {
      const mod = await import(`${out}?t=${Date.now()}`);
      existing = new Map(mod.LEVEL_DATA.map((l) => [l.id, { ...l, layout: l.layout.split('/') }]));
    } catch {
      // No data file yet: start from the levels generated in this run.
    }
  }

  const started = Date.now();
  const results = new Map();
  const queue = [...ids];
  const workers = Math.min(availableParallelism(), ids.length);
  await Promise.all(
    Array.from({ length: workers }, () => {
      const worker = new Worker(fileURLToPath(import.meta.url));
      return new Promise((resolve, reject) => {
        const next = () => {
          const id = queue.shift();
          if (id === undefined) {
            worker.terminate().then(resolve);
            return;
          }
          worker.postMessage(id);
        };
        worker.on('message', (result) => {
          results.set(result.level.id, result);
          const { level, winRate, amount } = result;
          const tag = level.id % 10 === 0 ? 'challenge' : '';
          console.log(
            `${String(level.id).padStart(3)} ${level.name.padEnd(24)} moves ${String(level.moves).padStart(2)}  bot wins ${Math.round(winRate * 100)}%  amount ${amount.toFixed(2)} ${tag}`,
          );
          next();
        });
        worker.on('error', reject);
        next();
      });
    }),
  );

  for (const [id, r] of results) existing.set(id, r.level);
  const levels = [...existing.values()].sort((a, b) => a.id - b.id);
  const text = `// Generated by \`npm run levels\` (tools/generate-levels.mjs) from tools/level-designs.mjs.
// Moves and star scores come from simulated play; edit the designs and regenerate rather than editing here.
export const LEVEL_DATA = [
${levels.map(serialize).join('\n')}
];
`;
  await writeFile(out, text);
  const rates = [...results.values()];
  const avg = (list) => (list.length ? Math.round((100 * list.reduce((s, r) => s + r.winRate, 0)) / list.length) : 0);
  console.log(
    `\n${rates.length} levels in ${((Date.now() - started) / 1000).toFixed(0)}s. Average bot win rate: normal ${avg(rates.filter((r) => r.level.id % 10))}%, challenge ${avg(rates.filter((r) => r.level.id % 10 === 0))}%`,
  );
  if (!(await readFile(out, 'utf8')).includes('LEVEL_DATA')) throw new Error('write failed');
}

if (isMainThread) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  parentPort.on('message', async (id) => parentPort.postMessage(await calibrate(id)));
}
