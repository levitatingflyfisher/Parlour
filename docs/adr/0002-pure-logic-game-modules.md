# ADR-0002 — Each game is a pure-logic ES module, bundled by a namespaced IIFE

**Status:** Accepted

## Context

A single-file PWA ([ADR-0001](0001-single-file-pwa.md)) could easily become a
2,000-line tangle of DOM code where game rules and rendering are interleaved and
nothing is testable. That would defeat the "each game is a *tiny, auditable*
module" thesis — the thing that makes the no-dark-patterns promise credible.

We need game rules to be (a) unit-testable in isolation, and (b) readable end to
end, while still shipping inside one HTML page with no bundler dependency.

## Decision

Split every game into two halves at a hard boundary:

- **Rules + AI** live in `games/<id>.mjs` as **pure ES-module functions** — no DOM,
  no `window`, no `fetch`, no timers, no `localStorage`. They export a small API
  (e.g. `emptyBoard`, `winner`, `bestMove`).
- **UI** lives in a `mount<Name>` function in `index.template.html` that imports
  nothing — it calls the bundled logic and paints the DOM.

`build.mjs` bridges the two worlds. For each module it finds the `export`ed names,
strips the `export` keyword, wraps the body in a **namespaced IIFE**
(`const TICTACTOE = (function(){ …; return { bestMove, winner, … }; })();`), and
injects the concatenation at the `/*__GAMES__*/` marker in the template, producing
`index.html`.

Every game ships with `test/<id>.test.mjs` run by `node --test`. A game without
tests does not ship.

## Consequences

- **One source, two consumers.** The exact same `games/<id>.mjs` is `import`-able
  by `node:test` *and* inlined as a browser namespace — no duplicated logic, no
  transpiler, no bundler dependency. 276 tests cover the rules and the AIs.
- **Auditable by construction.** Because logic can't touch the DOM or the network,
  a reviewer knows a game module can't hide a tracker or a dark pattern — there's
  nowhere to put one.
- **Tic-Tac-Toe is the scaffold.** Its board/winner/minimax shape is copied by the
  other grid games; new games match an existing one rather than inventing a
  pattern.
- **Authoring constraints (the price).** Exports must be named
  `function`/`const`/`let`/`var`/`class` declarations so the build's regex finds
  them; a module with no exports fails the build loudly. Determinism-sensitive
  logic (shuffles, AI tie-breaks) takes an injectable `rng` so tests are
  reproducible.
- **RNG and "today" are injected, not read.** A module never reads the clock; the
  UI passes a date-derived seed in (see
  [ADR-0006](0006-daily-puzzles-are-deterministic-offline.md)).
