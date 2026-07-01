# How to ship the PWA (and the APK)

Parlour reaches players two ways from **one** codebase: the web PWA and an Android
APK. This guide is deliberately honest about what lives in this repository and what
doesn't.

## The PWA is the product

The published site *is* the repository's static files — chiefly the generated
`index.html`, plus `manifest.webmanifest`, `icon.svg`, `sw.js`, and `404.html`.
Anyone can:

- **Play in a browser:** https://levitatingflyfisher.github.io/Parlour/
- **Install it** from the browser's "Add to Home Screen" / "Install app" — the
  manifest makes it a standalone, offline app.

To publish an update you build the page and serve the static files:

```sh
npm test          # green
npm run build     # regenerate index.html from source
# then publish the repo's static files to the static host
```

> This repo's static files *are* the site. The exact hosting/branch/automation used
> to publish (e.g. a static host's deploy settings) lives outside the source and is
> intentionally **not** documented here — don't infer branch names or CI steps that
> aren't in the repo. If deploy automation is added to the repo, document it here
> with the real steps.

## The APK is a thin WebView shell — built out-of-band

The Android build is a **thin WebView shell** that loads the same PWA; the PWA is
the source of truth ([ADR-0004](../adr/0004-webview-shell-apk.md)). Two things to
know:

1. **It's distributed as a GitHub Release asset:**
   `https://github.com/levitatingflyfisher/Parlour/releases/latest/download/Parlour.apk`
2. **Its source is not in this repository.** There is no `android/`, Capacitor, or
   Cordova project here. This repo builds and tests the PWA only. A contributor
   working in this repo does **not** build the APK.

Because the shell simply frames the PWA, the APK automatically inherits every PWA
property — offline play, no accounts, no network egress. Shipping a game means
shipping it in the PWA; the shell needs no per-game work.

## What a contributor actually does

For essentially every change — a new game, a rules fix, a UI tweak — the workflow
is entirely PWA-side:

```sh
npm test && npm run build      # verify + regenerate index.html
```

…then commit the source and the rebuilt `index.html` together. The PWA update
propagates to both the web and (via a fresh shell load) the Android app.
