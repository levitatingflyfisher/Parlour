# Architecture Decision Records

Lightweight [Nygard-format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
records of the load-bearing choices — the ones a future maintainer would otherwise
re-litigate. Each is **Status · Context · Decision · Consequences**.

| # | Decision | Status |
|---|---|---|
| [0001](0001-single-file-pwa.md) | Ship as a single-file, offline PWA (no framework, no backend) | Accepted |
| [0002](0002-pure-logic-game-modules.md) | Each game is a pure-logic ES module, bundled by a namespaced IIFE | Accepted |
| [0003](0003-local-ai-and-pass-and-play.md) | Local AI opponents + pass-and-play; no multiplayer server | Accepted |
| [0004](0004-webview-shell-apk.md) | Android ships as a thin WebView shell over the same PWA | Accepted |
| [0005](0005-no-accounts-no-persistence-no-telemetry.md) | No accounts, no persistence, no telemetry (calm by architecture) | Accepted |
| [0006](0006-daily-puzzles-are-deterministic-offline.md) | Daily "-le" puzzles are deterministic from the date, computed on-device | Accepted |
