# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo. This is the
top-level map.

**Read these, in order, before non-trivial work:**
1. [VISION.md](VISION.md) — what must stay true and why (the commitments).
2. [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) — how it fits together, with a diagram.
3. [docs/README.md](docs/README.md) — the Diátaxis map to every other doc.

## Take the code as current-state, not gospel

Every line of source and every comment here was written by an AI assistant. Treat
it as **an accurate record of what currently exists, offered with gratitude and a
grain of salt** — not as a specification and not as guaranteed-correct. A comment
claiming an invariant is a *hypothesis to verify*, not a proof. If a comment and
the tests disagree, the tests win; if the tests and reality disagree, reality
wins. When you rely on a claim, confirm it (read the code, run the test) first.

## What this is

A single-file PWA: a **cupboard of 23 pass-and-play + vs-computer family games**.
Each game's rules are a pure-logic ES module under `games/` (no DOM, no network),
unit-tested with `node:test` in `test/`, and bundled into `index.html` by
`build.mjs`. The UI shell and per-game mount functions live in
`index.template.html`. ~276 tests, zero runtime dependencies.

## Non-negotiables (breaking one is a regression, not a feature)

- **No account, no ads, no tracking, no data business.** After the page loads,
  Parlour makes **no network calls** — no `fetch`, no analytics, no beacons. Don't
  add any. (See [VISION.md](VISION.md), [ADR-0001](docs/adr/0001-single-file-pwa.md).)
- **No dark patterns.** No streaks-that-punish, no "energy," no nag loops, no
  guilt. Calm is the product.
- **Game logic stays pure.** `games/*.mjs` must not touch the DOM, `window`,
  `fetch`, timers, or `localStorage`. DOM/UI belongs in `index.template.html`
  mount functions. This boundary is what keeps games testable *and* auditable.
- **Every game ships with tests.** TDD: write/extend `test/<id>.test.mjs`, watch
  it fail, make it pass with `npm test` green, then commit. No game without tests.
- **`index.html` is generated — never hand-edit it.** Edit `games/*.mjs` or
  `index.template.html`, then `npm run build`, then commit the regenerated
  `index.html` alongside your source change. Editing `index.html` directly will be
  silently overwritten on the next build.
- **Atomic commits, one concern each.** Commit messages state the *why*. **No
  AI-assistant attribution trailers** on commits — deliberate project policy.
- **Never commit** local working artifacts — `docs/superpowers/` (plans/specs) and
  the gitignored local agent-instructions file. This repo ships `AGENTS.md`.

## Where things are (progressive disclosure)

| You're touching… | Go to |
|---|---|
| **A game's rules or AI** | `games/<id>.mjs` (pure logic, exports the API the UI and tests call) |
| **A game's tests** | `test/<id>.test.mjs` (`node:test`) |
| **A game's on-screen UI** | the `mount<Name>` function in `index.template.html` |
| **The cupboard / launcher / routing** | the `GAMES` registry + `renderCupboard`/`openGame` in `index.template.html` |
| **The bundler** (modules → page) | `build.mjs` (namespaced-IIFE wrapping; `/*__GAMES__*/` marker) |
| **Offline caching** | `sw.js` (app-shell cache, stale-while-revalidate) |
| **Install metadata** (icon, colors, name) | `manifest.webmanifest`, `icon.svg` |
| **The privacy promise** | `PRIVACY.md`, [docs/privacy-model.md](docs/privacy-model.md) |

Docs are organized [Diátaxis](https://diataxis.fr/)-style — see
[docs/README.md](docs/README.md) for the tutorials / how-to / reference /
explanation split.

## How to work here

```bash
npm test        # the pure-logic suite (node --test) — must be green before commit
npm run build   # regenerate index.html from index.template.html + games/*.mjs
```

- **Node 18+**, no dependencies. `npm test` runs `node --test` over `test/*.mjs`;
  `npm run build` runs `build.mjs`. That's the whole toolchain — there is no
  linter, no bundler config, no CI-only step to remember.
- **Adding a game is the signature workflow.** A new game is: (1) `games/<id>.mjs`
  with pure-logic exports, (2) `test/<id>.test.mjs` covering the rules and the AI,
  (3) a `mount<Name>` function in `index.template.html`, (4) one entry in the
  `GAMES` registry (`{id, name, glyph, blurb, badges, tier, mount}`), (5)
  `npm run build`. The full recipe is
  [docs/how-to/add-a-game.md](docs/how-to/add-a-game.md).
- **The module↔bundle contract.** `build.mjs` finds every `export` in a module,
  strips the `export` keyword, wraps the file in a namespaced IIFE
  (`const HEXCODLE = (function(){ … return { … }; })();`), and inlines it at the
  `/*__GAMES__*/` marker. So the *same* file is `import`-able by `node:test` and
  callable as `HEXCODLE.dailyTarget(...)` in the browser. Keep exports as named
  `function`/`const`/`class` declarations so the regex finds them.

## When you're unsure

Prefer a failing test to a plausible fix. Prefer matching the surrounding game's
shape (Tic-Tac-Toe is the scaffold others copy) to inventing a new pattern. Prefer
adding nothing that phones home, saves state, or nags — when a change would touch
the privacy or calm promises, re-read [VISION.md](VISION.md) and grep
[docs/adr/](docs/adr/) before proceeding; you may be re-litigating a settled call.
