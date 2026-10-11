# Candy Cascade

A match-3 candy game for the web, built with the CraftPix *Free Candy Match 3 Game Items* art pack. Everything moves: candies fall under gravity and squash when they land, matches shatter into fragments, specials fire beams, explosions and rainbow lightning, and goal candies fly up into the HUD.

![Title screen, a bomb and striped candy combo, and a rainbow bomb striking every donut](docs/screenshots.png)

## Play it

No install is needed to play:

```sh
npm start            # serves the game at http://localhost:8080
```

Any static file server works too (`npx serve`, GitHub Pages, and so on). The development version uses ES modules, so open it through a server rather than from disk.

For a single file you can open by double-clicking, or host anywhere:

```sh
npm install
npm run build        # writes dist/index.html plus dist/assets/
```

`dist/index.html` has the script, styles and fonts inlined. Keep the `dist/assets` folder next to it.

## How to play

Swipe a candy toward a neighbour, or tap one candy and then a neighbour, to swap them. A swap only counts when it lines up three or more of the same candy. Keyboard play works too: arrow keys move the cursor, Enter picks a candy, and an arrow swaps it. Escape pauses.

| Match | Creates | Effect |
| --- | --- | --- |
| 4 in a row | Striped candy | Clears its whole row or column when matched or hit |
| L or T shape | Bomb | Blows up a round area. Swap it with any neighbour, or double-tap it |
| 5 in a row | Rainbow bomb | Swap it with a candy to clear every candy of that kind |

Swapping two specials together combines them: two striped candies fire a cross, a bomb and a striped candy fire three rows and three columns, two bombs make a huge blast, a rainbow bomb turns every candy of a kind into striped candies or small bombs, and two rainbow bombs clear the board.

There are 300 levels in 15 episodes of 20. Most levels are relaxed; every 10th level is a **challenge** (purple node with a bomb badge) that is a little tougher, so it may take a second try. Levels ask you to reach a score, collect candies, or clear blockers:

- **Ice blocks** shatter when you match next to them.
- **Caramel blocks** take two hits; the first one cracks them.
- **Candy-cane cages** lock a candy in place until you match it or blast it.
- **Chocolate** spreads if you go two moves without breaking a piece of it.
- **Stopwatch candies** (level 10) give three extra moves when cleared.

Moves left over when you win turn into striped candies that all go off at once for bonus points. Stars and best scores are saved in the browser.

## Animation

All motion runs on one clock, so pausing freezes everything, including the game rules that wait on animations.

- **Falling** is simulated with gravity, so stacks fall together, stretch while falling, then squash and hop on landing through damped springs.
- **Swaps** arc past each other, with the moved candy lifting above the other. Refused swaps bounce back with a wobble.
- **Matches** swell and flash, then burst into wedge-shaped fragments of the actual sprite, with sparkles and shockwave rings. Candies that form a special rush into one cell, and the new special pops out with an elastic overshoot.
- **Specials**: beams race along the line at the same speed the cells are cleared. Bombs swell before they blow, with fire, smoke and screen shake. Rainbow bombs charge up spinning, then strike each target with flickering lightning.
- **HUD**: goal items fly up to their icons along curved paths, the score counts up, the star meter lights up, and moves pulse red when they run low.
- **Screens**: the board tiles pop in on a diagonal wave and the candies pour in column by column, the title letters drop and bob, and menus spring in.
- Sound effects and a soft music-box loop are synthesized with WebAudio, so there are no audio files. Reduced-motion settings turn off screen shake and thin out particles.

## Project layout

```
index.html, styles.css    page shell and styles
src/core/                 game rules with no rendering: board, engine, levels, seeded RNG
src/core/level-data.js    the 300 calibrated levels (generated; see below)
src/view/                 canvas renderer, animations, particles, sprite baking, audio
src/ui/                   HUD, level map, saved progress
src/app.js                screens, level sessions and modals
tools/                    dev server, build, level generator, balance bot and simulator
test/                     rule tests (node:test)
assets/                   art, renamed from the CraftPix pack, plus fonts
```

The engine runs each move as a sequence of awaited steps and calls an animator for every visual beat. The canvas scene implements that animator; tests and the simulator pass one that skips animation.

## Tests and balancing

```sh
npm test             # rules, special combos, blockers, and random play on every level
npm run levels       # regenerate and recalibrate all 300 levels (about 30 seconds)
npm run simulate -- 200 1 20   # a bot plays levels 1-20 200 times each and reports win rates
```

Levels 1-12 are hand-made, and each one introduces a mechanic. Levels 13-300 come from `tools/level-designs.mjs`, which mixes 20 board shapes, mirrored blocker patterns and goal types. Every design is checked so all cells can refill and every blocker can be reached by a match.

`npm run levels` then calibrates each level with simulated play. A bot plays it many times without a move limit and records how many moves each game needed. The move count is set where the bot wins about 95% of normal levels and about 70% of challenge levels. A second batch of games at that move count confirms the win rate and sets the star scores. The current data: normal levels win 92-100% for the bot (median 21 moves), and challenges win 66-81%.

## Credits

- Candy, board and UI art: *Free Candy Match 3 Game Items* by [CraftPix](https://craftpix.net/), under the [CraftPix file license](https://craftpix.net/file-licenses/).
- Fonts: [Lilita One](https://fonts.google.com/specimen/Lilita+One) and [Fredoka](https://fonts.google.com/specimen/Fredoka), SIL Open Font License (license files in `assets/fonts`).
