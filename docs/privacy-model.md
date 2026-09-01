# Privacy model

Parlour's privacy story is short because Parlour does very little: **after the page
loads, nothing leaves your device, and nothing about you is stored.** The one thing
written to the browser is your theme choice. This page
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

**One key: your theme choice.** If you pick Light or Dark, Parlour writes
`localStorage['parlour.theme']` = `light` or `dark`. Picking Auto (follow the
device, the default) removes the key, so a player who never touches the switch
has nothing stored at all. Every access is wrapped so a browser that blocks
storage still works; the choice then lasts for that visit only.

Nothing else. No `sessionStorage`, no IndexedDB, no cookies. Game state lives in
memory and is gone when you leave the game, refresh or close the tab. There is no
profile, no history, no saved game ([ADR-0005](adr/0005-no-accounts-no-persistence-no-telemetry.md)).

The service worker's offline cache (`sw.js`) holds a copy of the app's own files
(the page, manifest and icon), nothing about the player.

`test/theme.test.mjs` pins this: the page uses one storage accessor, every
storage call names `THEME_KEY`, and `PRIVACY.md` names the key.

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

# Storage: only the theme helpers in <head> (themeStore/readThemePref/writeThemePref):
grep -rniE "localStorage|sessionStorage|indexedDB|document.cookie|setItem|getItem" index.template.html games/
```

The first two should come back empty (aside from same-origin/OpenHearth links);
the third should show only the theme helpers.
The only file that performs any `fetch` is the service worker `sw.js`, and only for
the first-party app-shell assets it caches for offline use — read it; it's ~30
lines.

See also the plain-language [PRIVACY.md](../PRIVACY.md) and
[ADR-0005](adr/0005-no-accounts-no-persistence-no-telemetry.md).
