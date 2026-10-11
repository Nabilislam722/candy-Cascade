// Levels come from level-data.js, which `npm run levels` generates and calibrates from
// tools/level-designs.mjs. The layout legend is in board.js; candy colors index into CANDIES.
import { LEVEL_DATA } from './level-data.js';

export const THEMES = {
  berry: { light: 'tile-berry-light', dark: 'tile-berry-dark', outline: '#5d80ff', base: '#3b1d4a' },
  cherry: { light: 'tile-cherry-light', dark: 'tile-cherry-dark', outline: '#ff8900', base: '#3f1a2c' },
  cocoa: { light: 'tile-cocoa-light', dark: 'tile-cocoa-dark', outline: '#ff5c9e', base: '#33191a' },
};

// Every 10th level is a challenge: tuned so most players clear it in one or two tries.
export const CHALLENGE_EVERY = 10;
export const EPISODE_SIZE = 20;
export const EPISODES = [
  'Sugar Meadow',
  'Caramel Canyon',
  'Gumdrop Grove',
  'Toffee Trail',
  'Frosting Falls',
  'Cocoa Cove',
  'Jelly Junction',
  'Lollipop Lagoon',
  'Marshmallow Mountains',
  'Sprinkle Springs',
  'Licorice Lane',
  'Peppermint Peaks',
  'Honey Hollow',
  'Bonbon Bay',
  'Candy Castle',
];

export const LEVELS = LEVEL_DATA.map((level) => ({
  ...level,
  layout: level.layout.split('/'),
  challenge: level.id % CHALLENGE_EVERY === 0,
}));

export const episodeOf = (levelId) => Math.floor((levelId - 1) / EPISODE_SIZE);
