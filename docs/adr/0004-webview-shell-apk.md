# ADR-0004 — Android ships as a thin WebView shell over the same PWA

**Status:** Accepted

## Context

Parlour is a PWA and installs from a browser, but many families reach for an app
store or a downloadable APK, and some Android launchers make PWA install
discoverable poorly. We want an Android artifact **without** maintaining a second
codebase or reimplementing 23 games natively.

The realistic options were: a full native/Flutter port (a whole second app to keep
in sync — rejected), a hybrid framework like Capacitor/Cordova (a dependency and
build graph to carry), or a minimal WebView activity that simply loads the PWA.

## Decision

Ship Android as a **thin WebView shell**: a minimal Android app whose one job is to
load the *same* single-file PWA. The **PWA (`index.html`) is the source of truth**;
the APK is a window onto it, distributed via GitHub Releases
(`.../releases/latest/download/Parlour.apk`).

## Consequences

- **One codebase.** Every game, fix, and new tile lands in the PWA and both targets
  get it. No native game logic, no sync drift.
- **The shell build is out-of-band.** *There is no Android/WebView/Capacitor source
  in this repository.* This repo builds and tests the PWA; the APK is produced
  separately and attached as a release artifact. A contributor working here does
  **not** build the APK — they build and test `index.html`.
- **The APK inherits the PWA's guarantees** — offline, no accounts, no egress —
  because it *is* the PWA in a frame.
- **Honesty note.** Because the shell isn't in-repo, its exact build steps are not
  documented here and should not be guessed. If/when the shell is brought
  in-repo, this ADR and a how-to should be updated with the real recipe. See
  [how-to/ship-pwa-and-apk.md](../how-to/ship-pwa-and-apk.md).
