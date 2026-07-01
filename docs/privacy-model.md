# Privacy model

Parlour's privacy story is short because Parlour does very little: **after the page
loads, nothing leaves your device, and nothing about you is stored.** This page
says exactly what that means and — the important part — how you can check it
yourself rather than trust us.

## What leaves the device

**Nothing, after the initial load.** The only network activity is fetching the app
itself (the HTML page and its shell assets) the first time you visit, and the
service worker (`sw.js`) re-checking those same first-party assets to keep its
offline cache warm. There are:

- **no accounts** — there is no server to sign in to;
- **no analytics, telemetry, or beacons** — no tracking of taps, games, or scores;
- **no ads** and no ad networks;
- **no third-party requests** — nothing is loaded from a CDN or any other host;
- **no `fetch`/XHR in the game code** — the app doesn't call out at all once cached.

## What is stored

**Nothing.** Today Parlour writes no `localStorage`, no `sessionStorage`, and no
IndexedDB. Game state lives in memory for the current session and is gone when you
refresh or close the tab. There is no profile, no history, no saved game.

> Note: `PRIVACY.md` says "any scores or preferences are stored in your browser on
> this device." That describes an option we've left open, not a current feature —
> at present *nothing* is stored. If persistence is ever added it will be opt-in,
> on-device only, and erasable (see [ADR-0005](adr/0005-no-accounts-no-persistence-no-telemetry.md)).

## Threat model (what this does and doesn't protect)

Parlour is a local, single-player / same-device app, so its threat surface is
small:

- **Network eavesdroppers / trackers:** nothing to see — no traffic is generated
  during play.
- **Us (the developers):** we receive nothing, because nothing is sent. There is no
  backend that could log or leak.
- **Someone with physical access to your device:** they can see the current game on
  screen, but there's no stored history to recover. Clearing site data / uninstall
  removes the cached app.
- **The static host** (e.g. GitHub Pages) can see that a browser requested the page,
  like any website — standard web-server request logs, outside Parlour's control.
  This is only the download, never gameplay.

## Verify it yourself

You don't have to trust this document. The claims are checkable in the source:

```sh
# No network calls in the game/UI code (matches only same-origin URLs, if any):
grep -rniE "fetch\(|XMLHttpRequest|sendBeacon" index.template.html games/

# No analytics / third-party hosts:
grep -rniE "analytics|gtag|googletagmanager|http://|https://" index.template.html games/ \
  | grep -viE "levitatingflyfisher|w3.org|schema"

# No storage:
grep -rniE "localStorage|sessionStorage|indexedDB" index.template.html games/
```

Each of these should come back empty (aside from same-origin/OpenHearth links).
The only file that performs any `fetch` is the service worker `sw.js`, and only for
the first-party app-shell assets it caches for offline use — read it; it's ~30
lines.

See also the plain-language [PRIVACY.md](../PRIVACY.md) and
[ADR-0005](adr/0005-no-accounts-no-persistence-no-telemetry.md).
