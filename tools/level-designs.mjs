// Level designs and the generator for levels 13-300. `npm run levels` turns these into
// calibrated levels (move counts and star scores from simulated play) in src/core/level-data.js.
import { Board } from '../src/core/board.js';
import { createRng } from '../src/core/rng.js';

const RING = 0;
const STAR = 1;
const GUMDROP = 2;
const TOFFEE = 3;
const DONUT = 4;
const CAKE = 5;

// The hand-made opening levels. Each one introduces a mechanic; moves and stars are recalibrated.
export const HANDMADE = [
  {
    id: 1,
    name: 'First Bite',
    theme: 'berry',
    moves: 15,
    colors: 5,
    layout: ['ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo'],
    goals: [{ type: 'score', target: 3000 }],
    stars: [3000, 8000, 10000],
    tip: 'Swap two neighbouring candies to line up three or more of the same kind.',
  },
  {
    id: 2,
    name: 'Starry Night',
    theme: 'cherry',
    moves: 15,
    colors: 5,
    layout: ['oooooooo', 'oooooooo', 'oooooooo', 'ooo-oooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'],
    goals: [
      { type: 'collect', color: STAR, count: 26 },
      { type: 'collect', color: RING, count: 26 },
    ],
    stars: [4500, 11000, 14500],
    tip: 'Line up four to make a striped candy. Match it and it clears a whole line.',
  },
  {
    id: 3,
    name: 'Crossroads',
    theme: 'berry',
    moves: 20,
    colors: 5,
    layout: [
      '.o.....o.',
      'ooo...ooo',
      '.ooooooo.',
      '..ooooo..',
      '..ooBoo..',
      '..ooooo..',
      '.ooooooo.',
      'ooo...ooo',
      '.o.....o.',
    ],
    goals: [{ type: 'score', target: 4500 }],
    stars: [4500, 8000, 10500],
    tip: 'Match in an L or T shape to build a bomb. Swap a bomb with any neighbour, or double-tap it, to set it off.',
  },
  {
    id: 4,
    name: 'Thin Ice',
    theme: 'cocoa',
    moves: 22,
    colors: 5,
    layout: [
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'IoIoIoIo',
      'oIoIoIoI',
    ],
    goals: [{ type: 'ice' }],
    stars: [7000, 17000, 23000],
    tip: 'Ice blocks shatter when you make a match right next to them.',
  },
  {
    id: 5,
    name: 'Gumdrop Garden',
    theme: 'cherry',
    moves: 16,
    colors: 5,
    layout: [
      '..ooooo..',
      '.ooooooo.',
      'ooooooooo',
      'ooooooooo',
      'ooooRoooo',
      'ooooooooo',
      'ooooooooo',
      '.ooooooo.',
      '..ooooo..',
    ],
    goals: [{ type: 'collect', color: GUMDROP, count: 42 }],
    stars: [5500, 14000, 18500],
    tip: 'Line up five for a rainbow bomb. Swap it with a candy to clear every candy of that kind.',
  },
  {
    id: 6,
    name: 'Locked Up',
    theme: 'berry',
    moves: 18,
    colors: 5,
    layout: [
      'oooooooo',
      'oooooooo',
      'oLooooLo',
      'ooLooLoo',
      'oooLLooo',
      'ooLooLoo',
      'oLooooLo',
      'oooooooo',
    ],
    goals: [{ type: 'cage' }],
    stars: [5000, 12500, 17500],
    tip: 'Caged candies cannot move. Match them, or blast them, to snap the candy canes.',
  },
  {
    id: 7,
    name: 'Caramel Keep',
    theme: 'cocoa',
    moves: 20,
    colors: 5,
    layout: [
      'ooooooooo',
      'ooooooooo',
      'ooooooooo',
      'oCCoooCCo',
      'oCCoooCCo',
      'ooooooooo',
      'ooCCoCCoo',
      'ooooooooo',
      'ooooooooo',
    ],
    goals: [{ type: 'caramel' }],
    stars: [7000, 17500, 24500],
    tip: 'Caramel blocks take two hits. The first one cracks them open.',
  },
  {
    id: 8,
    name: 'Sweetheart',
    theme: 'cherry',
    moves: 18,
    colors: 5,
    layout: [
      '.ooo.ooo.',
      'ooooooooo',
      'ooooooooo',
      'ooooIoooo',
      'ooIIoIIoo',
      '.ooIoIoo.',
      '..ooIoo..',
      '...ooo...',
      '....o....',
    ],
    goals: [{ type: 'ice' }, { type: 'collect', color: DONUT, count: 26 }],
    stars: [4500, 11000, 14500],
  },
  {
    id: 9,
    name: 'Chocolate Factory',
    theme: 'cocoa',
    moves: 27,
    colors: 5,
    layout: [
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oooooooo',
      'oHHooHHo',
    ],
    goals: [{ type: 'chocolate' }],
    stars: [8000, 20500, 27000],
    tip: 'Chocolate spreads if you go two moves without breaking a piece of it. Clear it all!',
  },
  {
    id: 10,
    name: 'Against the Clock',
    theme: 'berry',
    moves: 12,
    colors: 6,
    bonusChance: 0.08,
    maxBonus: 2,
    layout: ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'],
    goals: [
      { type: 'collect', color: TOFFEE, count: 22 },
      { type: 'collect', color: CAKE, count: 22 },
    ],
    stars: [4500, 11000, 16000],
    tip: 'Candies carrying a stopwatch give you three extra moves when you clear them.',
  },
  {
    id: 11,
    name: 'Hourglass',
    theme: 'cherry',
    moves: 18,
    colors: 5,
    layout: [
      'ooooooooo',
      'ooooooooo',
      '.ooLoLoo.',
      '..ooooo..',
      '...oLo...',
      '..ooooo..',
      '.oIoooIo.',
      'oIIoooIIo',
      'ooooooooo',
    ],
    goals: [{ type: 'cage' }, { type: 'ice' }],
    stars: [4500, 11500, 15500],
  },
  {
    id: 12,
    name: 'Grand Finale',
    theme: 'cocoa',
    moves: 26,
    colors: 5,
    layout: [
      'ooooooooo',
      'oLoooooLo',
      'ooooooooo',
      'ooCoooCoo',
      'oooHoHooo',
      'ooCoooCoo',
      'ooooooooo',
      'IoooooooI',
      'IIoooooII',
    ],
    goals: [{ type: 'ice' }, { type: 'caramel' }, { type: 'chocolate' }],
    stars: [9500, 23500, 31000],
  },
];

// ---------------------------------------------------------------------------- generated levels

const SHAPES = {
  square7: ['ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo'],
  square8: ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'],
  tall8: ['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'oooooooo'],
  wide9: ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  square9: ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  tall7: ['ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo'],
  cross: ['.o.....o.', 'ooo...ooo', '.ooooooo.', '..ooooo..', '..ooooo..', '..ooooo..', '.ooooooo.', 'ooo...ooo', '.o.....o.'],
  octagon: ['..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'],
  diamond: ['...ooo...', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '...ooo...'],
  heart: ['.ooo.ooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.', '..ooooo..', '...ooo...', '....o....'],
  hourglass: ['ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..', '...ooo...', '..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo'],
  ring: ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  plus: ['..ooooo..', '..ooooo..', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '..ooooo..', '..ooooo..'],
  towers: ['oooo.oooo', 'oooo.oooo', 'oooo.oooo', 'oooo.oooo', 'oooo.oooo', 'oooo.oooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  pyramid: ['...ooo...', '..ooooo..', '..ooooo..', '.ooooooo.', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  cup: ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '.ooooooo.', '..ooooo..', '..ooooo..', '...ooo...'],
  bowtie: ['oo.....oo', 'ooo...ooo', 'oooo.oooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'oooo.oooo', 'ooo...ooo', 'oo.....oo'],
  arch: ['ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo', 'ooo...ooo'],
  stairs: ['oooo.....', 'ooooo....', 'oooooo...', 'ooooooo..', 'oooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo'],
  windows: ['ooooooooo', 'o.ooooo.o', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'ooo.o.ooo', 'ooooooooo', 'o.ooooo.o', 'ooooooooo'],
};
const EARLY_SHAPES = ['square7', 'square8', 'tall8', 'wide9', 'square9', 'tall7', 'cross', 'octagon', 'ring'];
// Narrow legs and scattered holes make blockers slow to reach; these shapes only host score and collect goals.
const OPEN_ONLY_SHAPES = ['arch', 'windows'];

const ADJECTIVES = [
  'Sugar', 'Minty', 'Fizzy', 'Gooey', 'Crunchy', 'Velvet', 'Caramel', 'Frosted', 'Honey', 'Toffee', 'Sprinkle', 'Jelly',
  'Cocoa', 'Lemon', 'Cherry', 'Berry', 'Vanilla', 'Bubble', 'Maple', 'Peppermint', 'Butterscotch', 'Marshmallow',
  'Licorice', 'Cinnamon', 'Sherbet',
];
const NOUNS = [
  'Meadow', 'Swirl', 'Falls', 'Hollow', 'Bridge', 'Garden', 'Grove', 'Lane', 'Peak', 'Lagoon', 'Plaza', 'Tower', 'Valley',
  'Canyon', 'Bay', 'Market', 'Workshop', 'Fountain', 'Harbor', 'Orchard', 'Parade', 'Carousel', 'Terrace', 'Glade',
];
const CHALLENGE_NOUNS = ['Showdown', 'Gauntlet', 'Summit', 'Trial', 'Fortress', 'Maze', 'Storm', 'Rumble', 'Labyrinth', 'Quest'];

// Normal levels pair (7n mod 25, 11n mod 24) and challenges (3k mod 25, k mod 10): no repeats below 600.
function levelName(id) {
  if (id % 10 === 0) {
    const k = id / 10;
    return `${ADJECTIVES[(k * 3) % ADJECTIVES.length]} ${CHALLENGE_NOUNS[k % CHALLENGE_NOUNS.length]}`;
  }
  return `${ADJECTIVES[(id * 7) % ADJECTIVES.length]} ${NOUNS[(id * 11) % NOUNS.length]}`;
}

const KINDS = {
  early: ['score', 'collect1', 'collect2', 'ice', 'cage', 'collect1', 'ice'],
  mid: ['score', 'collect1', 'collect2', 'ice', 'cage', 'caramel', 'ice+collect', 'cage+collect'],
  late: ['score', 'collect1', 'collect2', 'ice', 'cage', 'caramel', 'chocolate', 'ice+collect', 'cage+collect', 'caramel+collect', 'ice+cage'],
  challengeEarly: ['ice+cage', 'ice+collect', 'cage+collect2', 'collect3'],
  challengeLate: ['ice+cage', 'ice+collect', 'cage+collect2', 'collect3', 'caramel+ice', 'chocolate+collect', 'caramel+cage', 'chocolate+ice'],
};

const BLOCKER_CHAR = { ice: 'I', caramel: 'C', chocolate: 'H', cage: 'L' };
const BASE_COUNT = { ice: 10, caramel: 6, cage: 6, chocolate: 5 };
const PATTERNS = {
  ice: ['bottomChecker', 'clusters', 'scatter', 'band', 'diagonal', 'corners', 'center'],
  caramel: ['clusters', 'band', 'scatter', 'center', 'corners'],
  chocolate: ['corners', 'bottomClusters'],
  cage: ['scatter', 'diagonal', 'band', 'center'],
};

function hashId(id, salt = 0) {
  let h = (id * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}

// Ordered candidate cells for a blocker pattern, mirrored left/right so layouts look designed.
function patternCells(pattern, eligible, cols, rng) {
  const key = (r, c) => r * 16 + c;
  const ok = new Set(eligible.map(([r, c]) => key(r, c)));
  const has = (r, c) => ok.has(key(r, c));
  const maxR = Math.max(...eligible.map(([r]) => r));
  const minR = Math.min(...eligible.map(([r]) => r));
  const midR = (minR + maxR) / 2;
  const midC = (cols - 1) / 2;
  let order = [];
  if (pattern === 'bottomChecker') {
    const parity = rng.int(2);
    order = eligible.filter(([r, c]) => r >= maxR - 2 && (r + c) % 2 === parity).sort((a, b) => b[0] - a[0]);
  } else if (pattern === 'bottomRows') {
    order = eligible.filter(([r]) => r >= maxR - 1).sort((a, b) => b[0] - a[0]);
  } else if (pattern === 'clusters' || pattern === 'bottomClusters') {
    const anchors = rng.shuffle(
      eligible.filter(([r, c]) => has(r, c + 1) && has(r + 1, c) && has(r + 1, c + 1) && (pattern === 'clusters' || r >= maxR - 2)),
    );
    for (const [r, c] of anchors) order.push([r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]);
  } else if (pattern === 'scatter') {
    order = rng.shuffle(eligible.filter(([r]) => r > minR));
  } else if (pattern === 'band') {
    const parity = rng.int(2);
    order = eligible
      .filter(([r, c]) => (c + parity) % 2 === 0)
      .sort((a, b) => Math.abs(a[0] - midR) - Math.abs(b[0] - midR) || a[1] - b[1]);
  } else if (pattern === 'diagonal') {
    order = eligible
      .filter(([r, c]) => Math.abs(r - minR - Math.min(c, cols - 1 - c) * 1.0) < 0.5)
      .sort((a, b) => a[0] - b[0]);
  } else if (pattern === 'center') {
    order = [...eligible].sort((a, b) => Math.hypot(a[0] - midR, a[1] - midC) - Math.hypot(b[0] - midR, b[1] - midC));
  } else if (pattern === 'corners') {
    const d = ([r, c]) => (maxR - r) + Math.min(c, cols - 1 - c);
    order = [...eligible].sort((a, b) => d(a) - d(b));
  }
  // Add each cell's mirror right after it, without duplicates.
  const seen = new Set();
  const out = [];
  for (const [r, c] of order) {
    for (const [rr, cc] of [
      [r, c],
      [r, cols - 1 - c],
    ]) {
      if (!has(rr, cc) || seen.has(key(rr, cc))) continue;
      seen.add(key(rr, cc));
      out.push([rr, cc]);
    }
  }
  return out;
}

// True when every blocker borders a candy that can be part of a match (two for tough blockers),
// and every caged candy can itself be matched, so no goal depends on luck alone.
export function hittable(layout) {
  const at = (r, c) => layout[r]?.[c] ?? '.';
  const candy = (r, c) => 'oL-|'.includes(at(r, c));
  const inRun = (r, c) => {
    for (let s = c - 2; s <= c; s++) if (candy(r, s) && candy(r, s + 1) && candy(r, s + 2)) return true;
    for (let s = r - 2; s <= r; s++) if (candy(s, c) && candy(s + 1, c) && candy(s + 2, c)) return true;
    return false;
  };
  for (let r = 0; r < layout.length; r++) {
    for (let c = 0; c < layout[r].length; c++) {
      const ch = at(r, c);
      if (ch === 'L' && !inRun(r, c)) return false;
      if (!'ICcH'.includes(ch)) continue;
      const near = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].filter(([rr, cc]) => candy(rr, cc) && inRun(rr, cc)).length;
      if (near < (ch === 'I' ? 1 : 2)) return false;
    }
  }
  return true;
}

// True when every open cell can be refilled from the spawners, given the starting blockers.
export function refillable(level) {
  const board = Board.fromLevel(level, createRng(7));
  for (const cell of board.list) if (!cell.lock) cell.piece = null;
  for (let guard = 0; guard < 200; guard++) {
    const fall = board.gravity();
    const slides = board.diagonal();
    if (!fall.moves.length && !fall.spawns.length && !slides.length) break;
  }
  return board.list.every((cell) => !board.isOpen(cell) || cell.piece);
}

/*
 * Designs level `id` (13 and up). `amount` scales goal sizes and blocker counts; the
 * calibrator lowers or raises it until the move count lands in a comfortable range.
 */
export function designLevel(id, amount = 1, variant = 0) {
  if (id <= HANDMADE.length) return { ...HANDMADE[id - 1] };
  const challenge = id % 10 === 0;
  const rng = createRng(hashId(id, variant * 7777));
  const kindPool = challenge ? (id < 60 ? KINDS.challengeEarly : KINDS.challengeLate) : id <= 25 ? KINDS.early : id <= 60 ? KINDS.mid : KINDS.late;
  const kind = rng.pick(kindPool);
  const hasBlockers = kind.split('+').some((p) => p in BLOCKER_CHAR);
  const shapes = (id <= 40 ? EARLY_SHAPES : Object.keys(SHAPES)).filter((name) => !hasBlockers || !OPEN_ONLY_SHAPES.includes(name));
  const shapeName = rng.pick(shapes);
  const shape = SHAPES[shapeName];
  const cells = shape.flatMap((row, r) => [...row].map((ch, c) => (ch === 'o' ? [r, c] : null)).filter(Boolean));
  const colors = challenge && id > 60 && cells.length >= 70 && rng.chance(0.5) ? 6 : 5;
  const level = {
    id,
    name: levelName(id),
    theme: ['berry', 'cherry', 'cocoa'][id % 3],
    colors,
    layout: shape,
    goals: [],
  };
  if (!challenge && id > 12 && rng.chance(0.07)) {
    level.bonusChance = 0.07;
    level.maxBonus = 2;
  }

  const parts = kind.split('+');
  const blockerTypes = parts.filter((p) => p in BLOCKER_CHAR);
  const scale = amount * (challenge ? 1.3 : 1) * (blockerTypes.length > 1 ? 0.7 : 1);
  const pickColors = (n) => rng.shuffle([...Array(colors).keys()]).slice(0, n);

  // Blockers: try patterns until the board still refills everywhere.
  const salt = rng.int(1e9);
  let placedAll = !blockerTypes.length;
  for (let attempt = 0; attempt < 40 && !placedAll; attempt++) {
    const prng = createRng(hashId(id, salt + attempt));
    const grid = shape.map((row) => [...row]);
    // Keep the top two cells of every column free so the spawners stay open.
    const tops = new Map();
    for (const [r, c] of cells) {
      if (!tops.has(c)) tops.set(c, []);
      if (tops.get(c).length < 2) tops.get(c).push(r);
    }
    const active = new Set(cells.map(([r, c]) => r * 16 + c));
    const neighbours = (r, c) => [active.has((r - 1) * 16 + c), active.has((r + 1) * 16 + c), c > 0 && active.has(r * 16 + c - 1), active.has(r * 16 + c + 1)].filter(Boolean).length;
    let eligible = cells.filter(([r, c]) => !tops.get(c).includes(r) && neighbours(r, c) >= 3);
    let short = false;
    for (const type of blockerTypes) {
      const want = Math.max(2, Math.round(BASE_COUNT[type] * scale * (attempt > 20 ? 0.7 : 1)));
      const pattern = prng.pick(PATTERNS[type]);
      const chosen = patternCells(pattern, eligible, shape[0].length, prng).slice(0, want);
      for (const [r, c] of chosen) grid[r][c] = BLOCKER_CHAR[type];
      const used = new Set(chosen.map(([r, c]) => r * 16 + c));
      eligible = eligible.filter(([r, c]) => !used.has(r * 16 + c));
      if (chosen.length < 2) short = true;
    }
    const layout = grid.map((row) => row.join(''));
    const candidate = { ...level, layout };
    if (short) continue;
    if (blockerTypes.length && (!hittable(layout) || !refillable(candidate))) continue;
    level.layout = layout;
    placedAll = true;
  }
  // This shape cannot hold these blockers fairly: design the level again from a new roll.
  if (!placedAll) return designLevel(id, amount, variant + 101);

  for (const type of blockerTypes) level.goals.push({ type });
  const collect = parts.find((p) => p.startsWith('collect'));
  if (collect) {
    const n = collect === 'collect' ? 1 : Number(collect.slice(7));
    const per = { 1: blockerTypes.length ? 20 : 30, 2: 22, 3: 16 }[n];
    for (const color of pickColors(n)) level.goals.push({ type: 'collect', color, count: Math.max(6, Math.round(per * amount * (challenge ? 1.2 : 1))) });
  }
  if (kind === 'score') {
    level.goals.push({ type: 'score', target: Math.max(1500, Math.round((cells.length * 60 * amount) / 500) * 500) });
  }
  return level;
}
