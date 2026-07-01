# ADR-0003 — Local AI opponents + pass-and-play; no multiplayer server

**Status:** Accepted

## Context

Family games need a second player. There are three ways to provide one: an online
opponent (matchmaking + a server), an on-device computer opponent, or another
human on the same device. Only the first requires infrastructure, an account, and
network egress — all of which contradict Parlour's core commitments (no accounts,
nothing leaves the device, works offline).

## Decision

Provide the second player two ways, both entirely local:

1. **Computer opponents that run on-device**, implemented in each game's pure-logic
   module and sized to the game:
   - *Perfect play* where the game is small enough — Tic-Tac-Toe uses full
     **minimax**.
   - *Depth-limited **alpha-beta*** with a position evaluation for larger games
     (Connect Four, Chess, and others).
   - *Tuned **heuristics*** where full search is impractical — Stratego ships
     **Easy/Medium/Hard** skill levels over a heuristic with limited lookahead.
2. **Pass-and-play** — two humans take turns on one device. Games that support a
   human opponent expose a "vs Computer" / two-player toggle in their mount UI.

There is **no multiplayer server, no matchmaking, and no netcode.**

## Consequences

- **Zero infrastructure, offline, private.** No account, no latency, no server
  bill, nothing to breach. A game works on a plane.
- **AI strength is bounded by the device and the search budget**, on purpose. This
  is a calm family cupboard, not an engine benchmark — "gives a good game" beats
  "unbeatable." Only Stratego surfaces a difficulty picker today; broader
  difficulty selection is roadmap, not shipped.
- **The AI is testable.** Because opponents are pure functions in the game module,
  they're covered by `test/<id>.test.mjs` (e.g. "a long vs-AI game runs without
  crashing or deadlocking").
- **Same-device only, for now.** Two people in different rooms can't play together;
  same-room-over-a-local-channel play is a named
  [horizon](../../VISION.md#horizons-problems-not-a-feature-list),
  gated on keeping the privacy promise intact.
