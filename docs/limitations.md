# Limitations

Read this before adopting or building on Parlour. It's an honest list of what
Parlour does *not* do — some of it deliberate (a trade we'd make again), some of it
just not built yet.

## By design (trade-offs we'd make again)

- **No saved games, scores, or streaks.** Nothing is persisted — a refresh or a
  closed tab loses the current game. This is the direct cost of storing nothing
  ([ADR-0005](adr/0005-no-accounts-no-persistence-no-telemetry.md)); it's why the
  privacy story is airtight, and it's also the most-noticed missing feature.
- **No online multiplayer.** Two humans play by passing one device
  (pass-and-play); the only other opponent is the on-device computer. There is no
  matchmaking, no play-a-friend-across-town, no netcode
  ([ADR-0003](adr/0003-local-ai-and-pass-and-play.md)).
- **No accounts and no cloud.** Nothing syncs between your devices, because there
  is no server and no identity.
- **Bounded AI.** Computer opponents are minimax / alpha-beta / heuristics sized
  for a friendly game on a phone, not tournament engines. Only **Stratego** offers
  a difficulty picker (Easy/Medium/Hard) today; the other games run a single fixed
  strength.

## Not built yet (roadmap, not reality)

- **Tiers aren't surfaced.** Every game carries a `tier` (a simplest→hardest
  ladder) in the registry, but `renderCupboard` ignores it — the cupboard is one
  flat, ordered grid. There's no age/difficulty filter or grouping yet.
- **`PRIVACY.md` over-promises storage.** It mentions "scores or preferences …
  stored in your browser"; today nothing is stored at all. The doc describes an
  option, not a shipped feature.
- **Difficulty selection is mostly absent.** See above — most games have one AI
  strength.
- **No in-app help / rules.** Each game's tile blurb is the only explanation;
  there are no how-to-play overlays inside a game.
- **Single-page scaling.** All games bundle into one `index.html`, which grows with
  the shelf. It's fine today; a very large cupboard might eventually want
  lazy-loaded game bundles, at the cost of the single-file simplicity
  ([ADR-0001](adr/0001-single-file-pwa.md)).

## Repository / build caveats

- **The Android APK is not built here.** There is no Android/WebView source in this
  repo; the APK is a thin shell produced out-of-band and attached to a GitHub
  Release ([ADR-0004](adr/0004-webview-shell-apk.md)). Contributors build and test
  the **PWA**, not the APK.
- **`index.html` is generated.** Don't hand-edit it; edit `games/*.mjs` /
  `index.template.html` and run `npm run build`. An un-rebuilt page is a stale
  page.
- **No CI documented in-repo.** The toolchain is exactly `npm test` and
  `npm run build` (Node standard library, zero dependencies). Any deploy/release
  automation is outside this repository and not described here to avoid guessing.
