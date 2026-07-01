# ADR-0005 — No accounts, no persistence, no telemetry (calm by architecture)

**Status:** Accepted

## Context

The mainstream games market monetizes attention: accounts to build a profile, ads
between rounds, streaks and "energy" that punish absence, and telemetry on every
tap. Parlour's entire pitch is the refusal of that model. But a refusal in a README
is cheap; the question is whether the *architecture* makes the promise true and
checkable.

## Decision

Enforce the promise by building nothing that could break it:

- **No accounts.** There is no server and no sign-in for core play.
- **No telemetry.** No analytics, no beacons, no `fetch` after load — the app makes
  no network requests at all once cached ([ADR-0001](0001-single-file-pwa.md)).
- **No persistence, today.** Parlour currently uses **no `localStorage`,
  `sessionStorage`, or IndexedDB** — game state lives in memory for the session and
  is gone on refresh. Nothing about the player is written anywhere.
- **No dark patterns.** No streak-shaming, no daily-login pressure, no "energy"
  gates, no nag prompts.

## Consequences

- **Maximal privacy, verifiable.** With nothing stored and nothing sent, there is
  no profile to leak and no data to sell. A reviewer confirms it by grepping the
  source for `fetch`, `localStorage`, and analytics and finding none (see
  [privacy-model.md](../privacy-model.md)).
- **No saved games or history** (the honest cost). A refresh or a closed tab loses
  the current game; there are no streaks, high scores, or resume. This is a
  deliberate trade recorded in [limitations.md](../limitations.md).
- **`PRIVACY.md` slightly over-promises.** It says "any scores or preferences are
  stored in your browser on this device"; today *nothing* is stored, so that line
  describes an option left open, not a current feature. If persistence is ever
  added it MUST be **opt-in, on-device only, erasable, and never guilt-inducing** —
  a streak must never become a dark pattern. See the near-term
  [horizon](../../VISION.md#horizons-problems-not-a-feature-list).
