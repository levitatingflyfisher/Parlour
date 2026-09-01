# Parlour — a white paper

*The case for calm, auditable, local-first family games.*

## The problem: the games your family plays are designed against your family

Open the app store's "family games" shelf and count the mechanisms working on the
person holding the phone. An account before the first move. An ad after it. A
streak that turns a skipped Tuesday into guilt. "Energy" that runs out so a timer
can sell you more. Telemetry on every tap, feeding a model whose job is to keep a
child playing past the point they wanted to stop. None of this makes the *game*
better. All of it makes the *business* better, and the two have quietly come
apart.

For a household, that's a bad trade dressed as free. The price isn't money; it's
attention, privacy, and a small daily erosion of the idea that a game is something
you play and then put down.

## The thesis: respect can be an architecture, not a promise

Parlour is a cupboard of classic games — the ones families already know how to
play around a table — built on a single refusal: **nothing about the app should
work against the people using it.** No accounts. No ads. No tracking. No dark
patterns. Works offline, forever, on a device you already own.

The interesting part isn't the promise; anyone can write that in a README. The
interesting part is making the promise *structural* and *checkable*:

1. **A single-file, offline PWA with no backend.** After the page loads, Parlour
   makes no network calls. There is no server to hold an account, no analytics
   endpoint to phone, nowhere for data to go. Privacy isn't a policy here; it's the
   absence of a mechanism.
2. **Every game is a tiny, pure-logic module with its own tests.** Rules and AI
   live in a small file that cannot touch the DOM, the network, or storage — so it
   *cannot* hide a tracker or a nag. A parent (or an auditor, or an AI reviewer)
   can read a whole game in a sitting and know exactly what it does. Twenty-three
   games, two hundred and seventy-six tests, zero runtime dependencies.
3. **Nothing is stored.** No profile, no history, not even a score. There's no data
   at rest to leak, and no streak to weaponize.

Put together, these mean Parlour's respect for the player is something you can
*verify by reading the source*, not something you have to take on faith. That is
the whole argument.

## Why local-first matters *here*

Games are the easy case for local-first, and that's exactly why they're a good
place to prove it. A game of Connect Four needs no cloud: the rules are small, the
opponent can be a function on the device, and two humans can share one screen. The
only reasons mainstream games reach for a server — accounts, ads, matchmaking,
analytics — are the reasons Parlour rejects. Strip them away and what's left runs
happily on a phone in airplane mode.

Even the daily "-le" puzzles, which *seem* to need a server to guarantee everyone
gets the same word today, don't: Parlour derives the day's answer from the calendar
date with a fixed function, on-device. Same puzzle for everyone, no server, no
request to log. The one feature that looks like it needs the cloud turns out not
to — which is the local-first thesis in miniature.

## Who it's for

- **Families with kids**, who want games without an ad reading their child's
  attention or an account harvesting their name.
- **Privacy-minded households**, who'd rather run something they (or a friend who
  codes) can audit than trust a privacy policy.
- **Anyone offline** — a car, a plane, a cabin, a spotty connection — who wants the
  games to just work.
- **Tinkerers**, because adding a game is a small, well-worn path (a pure module, a
  test file, a tile) and the whole thing is MIT-licensed.

## How it differs from the cloud incumbent

| | Typical "free" games app | Parlour |
|---|---|---|
| Account | Often required | Never |
| Ads | Yes | None |
| Tracking / telemetry | Pervasive | None (no network after load) |
| Works offline | Rarely / partially | Always |
| Dark patterns (streaks, energy, nags) | Core to the model | Refused by design |
| Data stored about you | A profile | Nothing |
| Auditable | Opaque bundle | Read the module + its tests |
| Cost to you | Attention, privacy | Free (MIT), and it stays free |

## Honest limits — built vs. aspirational

A white paper that only lists strengths is marketing. The line, drawn straight:

**Built and load-bearing.** The 23 games and their tests; the single-file
offline PWA; on-device AI (minimax / alpha-beta / heuristics) and pass-and-play;
deterministic daily puzzles; genuinely zero egress, and no storage beyond the
one Light/Dark choice. These are
real and checkable today.

**Aspirational or absent.**
- **The Android APK is built out-of-band** — there's no shell source in the
  repository; the PWA is the source of truth and the APK is a thin WebView wrapper
  attached to a release.
- **No game persists.** No saved games, no resume, no scores or streaks; a refresh
  loses the current game. Only the theme choice is remembered.
- **The `tier` ladder isn't surfaced** as age/difficulty drawers, and only Stratego
  exposes a difficulty picker.

If Parlour ever adds memory, it has to add it the hard way: opt-in, on-device only,
erasable, and never turned into a pressure mechanic. The moment a streak makes a
child feel bad for missing a day, Parlour has become the thing it was built to
refuse. Keeping that line bright is the point. For the full accounting see
[VISION.md § scorecard](../VISION.md#honest-scorecard--built-vs-aspirational)
and [limitations](limitations.md).

## In one sentence

**Parlour is a cupboard of family games whose respect for the player you can
verify by reading the code: offline, no accounts, no ads, no tracking, no dark
patterns — each game a tiny, tested, auditable module.**
