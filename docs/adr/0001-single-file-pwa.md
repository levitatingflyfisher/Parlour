# ADR-0001 — Ship as a single-file, offline PWA

**Status:** Accepted

## Context

Parlour is a family games cupboard whose whole reason to exist is *respect*: no
ads, no tracking, no accounts, no data business, and it should keep working on a
device the family already owns even with no signal. It also needs to be trivially
auditable — a parent should be able to see that it isn't phoning home.

The obvious alternatives were a native app (Flutter/React Native) or a
server-backed web app. A native app means store friction, a build toolchain per
platform, and a heavier thing to audit. A server-backed app fundamentally
contradicts the "nothing leaves the device" promise and requires infrastructure
Parlour has no reason to run.

## Decision

Ship Parlour as a **single self-contained page**, `index.html`, with **no runtime
framework and no backend**. A tiny service worker (`sw.js`) caches the app shell
so that after the first visit every game plays fully offline. Installability comes
from `manifest.webmanifest`. The build (`build.mjs`) and tests (`node:test`) use
only Node's standard library — zero dependencies.

## Consequences

- **Offline-forever and trivially auditable.** One HTML file, no bundle of opaque
  third-party JS, no network calls after load. The privacy promise is checkable by
  reading the source (see [privacy-model.md](../privacy-model.md)).
- **No framework tax.** No React/Vue/build-graph to maintain or patch; the UI is
  plain DOM in `index.template.html`. The cost is that we hand-write UI glue.
- **`index.html` is a generated artifact**, not hand-edited source — see
  [ADR-0002](0002-pure-logic-game-modules.md). Editing it directly is overwritten
  on the next build.
- **Distribution is a static file.** The repo root *is* the site; the PWA can be
  served from any static host and wrapped for Android
  ([ADR-0004](0004-webview-shell-apk.md)).
- **Scaling limits are accepted.** A single page grows as games are added
  (`index.html` is already large). If it ever becomes unwieldy, lazy-loading game
  bundles is the escape hatch — but it would trade away single-file simplicity, so
  we don't do it pre-emptively.
