# How to add a game

Adding a game is Parlour's signature workflow. A game is **four small things that
share an `id`** plus a rebuild. Copy the shape of an existing game — Tic-Tac-Toe is
the deliberate scaffold; the other grid games follow it.

We'll use a fictional `id` of `mygame` throughout.

## 1. Write the pure-logic module — `games/mygame.mjs`

Rules and AI only. **No DOM, no `window`, no `fetch`, no timers, no
`localStorage`** — just functions over data. Export each part as a named
`function`/`const`/`class` (the build's export scanner needs named declarations).

```js
// games/mygame.mjs — pure rules + AI (no DOM).
export function emptyBoard() { /* … */ }
export function move(board, m, player) { /* return the next board */ }
export function winner(board) { /* 'X' | 'O' | 'draw' | null */ }

/// Best move for `player`. Keep it deterministic (inject rng if you need
/// randomness) so tests are reproducible.
export function bestMove(board, player) { /* … */ }
```

Take an injectable `rng = Math.random` if the game shuffles, and take a `seed`
argument (not the clock) if it's a daily puzzle — see
[ADR-0006](../adr/0006-daily-puzzles-are-deterministic-offline.md).

## 2. Write the tests — `test/mygame.test.mjs`

Test-first is the norm: write these, watch them fail, then make them pass. Import
the module directly and assert the rules and the AI.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBoard, move, winner, bestMove } from '../games/mygame.mjs';

test('a completed line wins', () => {
  /* … set up a board … */
  assert.equal(winner(board), 'X');
});

test('a long vs-AI game terminates without crashing', () => {
  let board = emptyBoard(), turn = 'X';
  for (let i = 0; i < 200 && !winner(board); i++) {
    board = move(board, bestMove(board, turn), turn);
    turn = turn === 'X' ? 'O' : 'X';
  }
  assert.ok(winner(board)); // it ended
});
```

Run `npm test` and get it green before touching the UI.

## 3. Write the on-screen UI — `mountMygame` in `index.template.html`

The UI is where the DOM lives. Add a `mount<Name>(host, h)` function. `h` gives you
the tools the shell passes in:

- `h.board` — the element to render into (same as `host`),
- `h.controls` — an element for buttons (mode toggle, new game),
- `h.status(text)` — set the status line.

```js
function mountMygame(host, h) {
  let board = MYGAME.emptyBoard(), turn = 'X', mode = 'ai';
  function render() { /* paint `board` into host; wire taps to play a move */ }
  // vs-computer: when it's the AI's turn, call MYGAME.bestMove(board, turn)
  render();
}
```

Call your logic through the **namespaced bundle** — `games/mygame.mjs` becomes
`MYGAME.*` in the page (the namespace is the id upper-cased, non-alphanumerics
stripped). Mirror an existing game's mount for the mode toggle and status wiring.

## 4. Register the tile — the `GAMES` array in `index.template.html`

Add one entry so it appears in the cupboard:

```js
{
  id: 'mygame',
  name: 'My Game',
  glyph: '🎲',
  blurb: 'One calm sentence describing how it plays.',
  badges: ['1 player', '2 players'], // or ['solo'] or ['daily-le']
  tier: 1,                           // rough simplest→hardest ladder (0–4)
  mount: mountMygame,
}
```

`badges` show on the tile; `tier` is authoring metadata (not yet surfaced in the
UI — see [limitations](../limitations.md)).

## 5. Rebuild and play

```sh
npm test          # all green, including your new tests
npm run build     # regenerates index.html; prints your module in the list
```

Open `index.html`, find your tile in the cupboard, and play it. Commit the source
files **and** the regenerated `index.html` together — the page is a build artifact
of the modules and the template.

## Checklist

- [ ] `games/mygame.mjs` — pure logic, no DOM, named exports
- [ ] `test/mygame.test.mjs` — rules + AI covered, `npm test` green
- [ ] `mountMygame` in `index.template.html`
- [ ] `GAMES` registry entry (`id, name, glyph, blurb, badges, tier, mount`)
- [ ] `npm run build`, then play it
- [ ] one atomic commit (source + rebuilt `index.html`), no AI-attribution lines
