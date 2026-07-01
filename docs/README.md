# Documentation

Organized on the [Diátaxis](https://diataxis.fr/) model — four kinds of docs for
four different needs. Find what you need by *what you're trying to do*, not by
guessing a filename.

| I want to… | I need | Go to |
|---|---|---|
| **learn by doing** | a Tutorial | [Tutorials](#tutorials) |
| **accomplish a specific task** | a How-to guide | [How-to guides](#how-to-guides) |
| **look up exact details** | Reference | [Reference](#reference) |
| **understand why** | Explanation | [Explanation](#explanation) |

New here? Start with the [README quickstart](../README.md), then
[build & run](how-to/build-and-run.md), then [Explanation § concepts](concepts.md).

---

## Tutorials
*Learning-oriented — take me by the hand through my first success.*

- The **[README quickstart](../README.md#develop)** — `npm test`, `npm run build`,
  open `index.html`, and you're playing.

*Gap (contributions welcome):* a hand-held "write your first game in 20 minutes"
walkthrough. The task-shaped version already exists as a how-to (below); a gentler
narrated tutorial would live in `docs/tutorials/`.

## How-to guides
*Task-oriented — how do I accomplish X (assumes you know the basics)?*

- **[Build & run](how-to/build-and-run.md)** — get the app running and the tests green.
- **[Add a game](how-to/add-a-game.md)** — the signature workflow: a new module,
  its tests, its UI, and the registry entry.
- **[Ship the PWA (and the APK)](how-to/ship-pwa-and-apk.md)** — how the two
  delivery targets relate, honestly.
- Agent-guidance for working *in* this repo: **[AGENTS.md](../AGENTS.md)**.

## Reference
*Information-oriented — tell me exactly, precisely, completely.*

- **[Game catalogue](reference/games.md)** — every game, its id, its player modes,
  its AI, and its module.
- The build contract (module → bundle) is documented in
  [AGENTS.md § How to work here](../AGENTS.md#how-to-work-here) and
  [ADR-0002](adr/0002-pure-logic-game-modules.md).

## Explanation
*Understanding-oriented — help me understand the ideas and the why.*

- **[Vision](../VISION.md)** — the one idea, the commitments, the honest scorecard.
- **[Architecture overview](architecture/OVERVIEW.md)** — the spine + a diagram.
- **[Architecture Decision Records](adr/)** — why each load-bearing choice was made.
- **[Concepts](concepts.md)** — the cupboard/stage model, pure-logic modules, the
  build bundle, local AI, daily puzzles.
- **[Privacy model](privacy-model.md)** — what leaves the device (nothing) and how
  you can check it.
- **[Limitations](limitations.md)** — read before adopting. What Parlour does *not* do.

---

### The white paper

- **[White paper](whitepaper.md)** — the case for calm, auditable, local-first
  family games, and how Parlour differs from the cloud incumbents.

*(There is no "yellow paper" / formal spec: Parlour is a suite of independent
small games with no single algorithmic core, wire format, or integrity invariant
to formalize. Each game's rules are specified by its module and its tests.)*
