# ADR-0005 — No accounts, no persistence, no telemetry (calm by architecture)

**Status:** Accepted (amended 2026-09-27: one theme key)

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
- If persistence of play is ever added it MUST be **opt-in, on-device only,
  erasable, and never guilt-inducing**; a streak must never become a dark pattern.
  See the near-term [horizon](../../VISION.md#horizons-problems-not-a-feature-list).

## Amendment (2026-09-27): the theme choice is stored

The fleet ruling on theme (light, dark or follow the device, one tap away,
default follow the device) needs the choice to survive a reload, or the switch
would have to be made again on every visit. So Parlour stores exactly one key,
`localStorage['parlour.theme']`, and only when the player picks Light or Dark;
picking Auto deletes it. It is a display preference, not play: games are still
never saved, and leaving a game still loses it. `PRIVACY.md` says this in plain
words, and `test/theme.test.mjs` fails if any other storage use appears.
