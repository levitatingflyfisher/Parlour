# Vision

> The north star for Parlour. If you (person or agent) are about to change
> something load-bearing, read this first — it says what must stay true and why.
> For *how it's built*, see [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md);
> for *why each decision was made*, [docs/adr/](docs/adr/).

## The one idea

**A cupboard of family games that respect the people playing them.** Every
mainstream games app is engineered to keep you: ads between rounds, streaks that
punish a missed day, "energy" timers, an account before you can play, telemetry
on every tap. Parlour is the opposite by construction. Open it once and it works
forever, offline, on a device the family already owns. No account, no ads, no
tracking, nothing stored, nothing sold. Just the games — pass the phone around
the table, or play the computer.

The second half of the idea is *how* that promise stays honest: **each game is a
tiny, auditable module.** Its rules are pure logic — no DOM, no network, no
globals — sitting in one small file with its own unit tests. You can read a whole
game in a sitting and know exactly what it does. There is no room for a dark
pattern to hide, because there is no code that isn't the game.

## What this is

A **single-file Progressive Web App**: a cupboard of classic games you launch
from one screen. Twenty-three games today — board and strategy games you can play
the computer or pass-and-play, solo puzzles, and a daily *"-le"* drawer — and the
shelf fills one tile at a time.

```
   the cupboard (one screen)        a game (the stage)           your device
  ──────────────────────────     ────────────────────────     ───────────────
   tap a tile  ───────────────▶   pure rules + local AI   ───▶  it all runs
   23 games, offline forever      no DOM in the logic           here, only here
   no ads, no login               fully unit-tested             nothing leaves
```

It is delivered two ways from the *same* page: the PWA (install it from the
browser, it runs offline) and a thin Android WebView shell wrapped around that
same PWA and shipped as an APK. The PWA is the source of truth; the APK is a
window onto it.

## Design commitments (do not break these)

These are the load-bearing beliefs. Breaking one isn't a feature — it's a
regression against the whole reason Parlour exists. Each is recorded as an ADR.

1. **No account, ever.** There is no server to sign in to and never will be for
   core play. Identity is not the price of a game.
   ([ADR-0005](docs/adr/0005-no-accounts-no-persistence-no-telemetry.md))
2. **No ads, no tracking, no data business** — enforced by architecture, not by a
   promise. After the page loads, Parlour makes no network calls, so there is
   nowhere for a tracker to send anything. ([ADR-0001](docs/adr/0001-single-file-pwa.md))
3. **No dark patterns.** No streaks that punish, no "energy," no nagging, no
   engagement-maximizing loops. A game you can put down and pick up with nothing
   lost is the point, not a bug.
   ([ADR-0005](docs/adr/0005-no-accounts-no-persistence-no-telemetry.md))
4. **Offline-first, and offline-*forever*.** The first visit caches the whole
   app; every subsequent launch works with the network off — including the daily
   puzzles, which are computed on-device from the date.
   ([ADR-0006](docs/adr/0006-daily-puzzles-are-deterministic-offline.md))
5. **Local opponents, no netcode.** The computer players are minimax, alpha-beta,
   and honest heuristics that run on-device. Pass-and-play covers two humans.
   There is no multiplayer server and no matchmaking.
   ([ADR-0003](docs/adr/0003-local-ai-and-pass-and-play.md))
6. **Every game is a small, auditable, tested module.** Rules are pure logic with
   no DOM, importable by the test runner and inlined into the page by the build.
   A game without tests doesn't ship.
   ([ADR-0002](docs/adr/0002-pure-logic-game-modules.md))
7. **FLOSS and warm.** MIT-licensed, readable, home-cooked. The code is a recipe
   worth sharing.

## Honest scorecard — built vs. aspirational

A guiding light has to tell the truth about where the light reaches. This code
and its comments were written by an AI assistant; treat them as *an accurate
record of what currently exists, offered with gratitude and a grain of salt* —
not a specification, not guaranteed-correct. If a comment and the tests disagree,
the tests win; if the tests and reality disagree, reality wins. Verify a claim
before you rely on it. As of v0.1:

**Real, tested, load-bearing:**
- **23 games**, each a pure-logic module under `games/`, covered by **276 tests**
  in `test/` (`node --test`, zero dependencies). This is the whole thesis — small
  auditable modules — and it holds.
- The **single-file PWA**: `build.mjs` bundles the modules into `index.html`; the
  service worker (`sw.js`) caches the shell so it plays fully offline.
- **Local AI opponents** — perfect minimax (Tic-Tac-Toe), depth-limited
  alpha-beta (Connect Four, Chess, and friends), and tuned heuristics (Stratego
  ships Easy/Medium/Hard). Plus **pass-and-play** for two humans on one device.
- **Daily "-le" puzzles** (Wordle, Hexcodle, Globle) derived deterministically
  from a `YYYYMMDD` seed — the same puzzle for everyone, every day, with no server
  and no stored state.
- **Zero egress, zero storage** — no `fetch`, no analytics, no `localStorage`.
  You can grep the source and confirm it (see [privacy model](docs/privacy-model.md)).

**Aspirational — documented, not shipped:**
- **The APK build is out-of-band.** There is no Android/shell source in this repo;
  the APK is a thin WebView wrapper produced separately and attached as a release.
  This repo builds the PWA; it does not build the APK.
- **Persistence.** Nothing is saved today — not scores, not streaks, not a
  half-finished game. PRIVACY.md's "any scores or preferences are stored in your
  browser" describes an *option that is open*, not a feature that exists. A
  refresh loses the current game. See [limitations](docs/limitations.md).
- **Tier grouping.** Each registry entry carries a `tier` (a rough
  simplest→hardest ladder), but the cupboard renders one flat, ordered grid —
  tiers are latent authoring metadata, not a UI filter yet.
- **A wider shelf, difficulty pickers everywhere, richer boards.** Roadmap, not
  reality. Only Stratego surfaces a difficulty choice today.

Keep that line bright: the games and their tests are real; anything about saving,
grouping, or the APK toolchain is a hope with a placeholder.

## Horizons (problems, not a feature list)

Framed as *problems* on purpose — a dated feature list self-destructs, but an open
question endures.

- **Near** — Should Parlour remember anything? The privacy-clean answer today is
  "nothing," and that's a feature. The open problem is offering *opt-in, on-device
  only* memory (resume a game, keep a daily streak) **without** letting a streak
  become a dark pattern. Any persistence must be local, erasable, and never
  guilt-inducing.
- **Mid** — Surface the `tier` ladder as gentle drawers (a "first games" shelf for
  the youngest, a "long think" shelf for the oldest) so a full table finds the
  right game fast — without turning the calm cupboard into a busy storefront.
- **Far** — Two devices, one game, *without* a server: can pass-and-play grow into
  same-room play over a local channel (a QR handshake, WebRTC on the LAN) while
  keeping the "no account, nothing leaves the house" promise intact? The hard part
  isn't the netcode; it's staying honest about privacy while adding a second seat.

## Name

**Parlour** — the front room a household kept for receiving guests and, in the
era before screens, for *parlour games*: the whole family gathered around a table,
taking turns, playing by hand. That's the room this app is trying to be. Not an
arcade, not a casino — a parlour. Pull up a chair.
