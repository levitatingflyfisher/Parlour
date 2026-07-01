# Concepts

The handful of ideas that, once you have them, make the whole codebase obvious.

## The cupboard and the stage

Parlour has exactly two screens, and the UI is a router between them:

- **The cupboard** — one screen of tiles, one per game, built from the `GAMES`
  registry by `renderCupboard()`. This is the launcher.
- **The stage** — a single game, running full-screen. `openGame(g)` hides the
  cupboard, shows the stage, and calls the game's `mount` function. `closeGame()`
  reverses it. The URL hash (`#chess`) makes a game deep-linkable and wires the
  back button.

That's the entire navigation model. There are no menus, no settings screens, no
profile — a tile takes you to a game and back.

## A game = a registry entry + a module + a mount + tests

Every game is four small things that share an `id`:

| Piece | Lives in | Job |
|---|---|---|
| **Registry entry** | `GAMES` in `index.template.html` | `{ id, name, glyph, blurb, badges, tier, mount }` — the tile |
| **Logic module** | `games/<id>.mjs` | pure rules + AI, no DOM |
| **Mount function** | `mount<Name>` in `index.template.html` | the on-screen UI, calls the logic |
| **Tests** | `test/<id>.test.mjs` | `node:test` over the rules and AI |

The `badges` (e.g. `1 player`, `2 players`, `solo`, `daily-le`) are shown on the
tile. The `tier` (a rough simplest→hardest ladder) is authoring metadata only —
the cupboard renders one flat, ordered grid and does not yet group or filter by
tier.

## Pure-logic modules (the auditability boundary)

A game module is **pure**: given inputs, it returns outputs, and it never touches
the DOM, `window`, the network, timers, or storage. `winner(board)` just inspects
an array; `bestMove(board, player)` just returns an index. This is the boundary
that makes Parlour both **testable** (you can call the rules from a test with no
browser) and **auditable** (a module *cannot* hide a tracker or a dark pattern —
it has no way to reach the network or persist anything). Anything with a side
effect — reading the clock, painting the board, handling a tap — lives in the
mount UI, not the module. See [ADR-0002](adr/0002-pure-logic-game-modules.md).

## The build bundle (one source, two consumers)

The same `games/<id>.mjs` needs to run in two places: Node's test runner (as a real
ES module) and the browser (inlined in one HTML file). `build.mjs` reconciles this
by wrapping each module's body in a **namespaced IIFE** and injecting it at the
`/*__GAMES__*/` marker:

```js
const HEXCODLE = (function () {
  /* the module body, with `export` stripped */
  return { dailyTarget, /* …other exports… */ };
})();
```

So tests do `import { dailyTarget } from '../games/hexcodle.mjs'` and the browser
calls `HEXCODLE.dailyTarget(seed)` — no duplicated logic, no bundler dependency.
Because `index.html` is generated this way, you **never hand-edit it**: edit the
source, run `npm run build`, commit the regenerated file. Full walkthrough in
[architecture/OVERVIEW.md](architecture/OVERVIEW.md#the-build-contract-module--bundle).

## Local opponents

The "computer" is a pure function in the game's module, sized to the game:
**minimax** where the tree is small (Tic-Tac-Toe plays perfectly), **alpha-beta**
with a position evaluation for bigger games (Connect Four, Chess), and **tuned
heuristics** where search is impractical (Stratego, with Easy/Medium/Hard). Two
humans play via **pass-and-play** on one device. Nothing about a second player
touches a network. See [ADR-0003](adr/0003-local-ai-and-pass-and-play.md).

## Determinism: injected RNG and injected "today"

Modules never read the clock or call `Math.random` implicitly for
test-significant behavior. Shuffles take an injectable `rng` (so tests are
reproducible), and daily puzzles take a **date-derived seed** the UI passes in —
`YYYYMMDD` → `dailyAnswer(seed)` — so "today's puzzle" is the same for everyone,
computed on-device, with no server. See
[ADR-0006](adr/0006-daily-puzzles-are-deterministic-offline.md).

## Offline as the default state

The service worker caches the app shell on first visit, and since the app makes no
other network requests, online and offline are indistinguishable after that. There
is no loading spinner waiting on a server, because there is no server. See
[ADR-0001](adr/0001-single-file-pwa.md).
