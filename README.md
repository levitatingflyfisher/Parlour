# Parlour

> **A cupboard of calm family games that respect you.** Offline, no accounts, no
> ads, no engagement traps — and every game is a tiny, unit-tested module you can
> read end to end.

A calm cupboard of **pass-and-play classic games** for the family table —
play the computer or hand the device around. Local-first, offline, no accounts,
no ads, no tracking. Part of the [OpenHearth](https://levitatingflyfisher.github.io)
family of home tools.

**Play it:** https://levitatingflyfisher.github.io/Parlour/ · **Android:**
[download the APK](https://github.com/levitatingflyfisher/Parlour/releases/latest/download/Parlour.apk)

## How it works

Parlour is a **single-file PWA** (`index.html`) — open it once and every game
works offline forever. Each game's rules live in a small pure-logic module under
`games/` (no DOM, fully unit-tested); `build.mjs` bundles those modules into the
page, and the UI glue lives in `index.template.html`.

```
games/<id>.mjs        pure rules + AI (tested in test/<id>.test.mjs)
index.template.html   the cupboard shell + per-game UI
build.mjs             bundles games/*.mjs → index.html
```

### Develop

```sh
npm test      # run the pure-logic tests (node:test — no dependencies)
npm run build # regenerate index.html from the template + game modules
```

After `npm run build`, open `index.html` in a browser (or serve the folder).

## The shelf

Twenty-three games so far, each a self-contained logic module — the cupboard
fills up one tile at a time:

- **Play the computer or pass-and-play** — Tic-Tac-Toe, Connect Four, Reversi,
  Gomoku, Dots & Boxes, Blokus, Checkers, Quoridor, Hex, Chess, and Stratego
  (two-player).
- **Solo puzzles** — 2048, Memory, Minesweeper, Mastermind, Sudoku, Solitaire,
  Hangman, Nim, and Crazy Eights.
- **Daily "-le"** — Wordle, Hexcodle, and Globle. One puzzle a day, the same for
  everyone, computed on-device from the date — no server, no stored state.

## Privacy

Everything stays on your device. Parlour makes no network calls after the page
loads and stores nothing — not even scores. See [PRIVACY.md](PRIVACY.md) and the
checkable [privacy model](docs/privacy-model.md).

## See the docs

- **[Vision](VISION.md)** — the one idea, the commitments, an honest scorecard.
- **[Documentation hub](docs/README.md)** — tutorials, how-to guides, reference,
  and explanation (organized [Diátaxis](https://diataxis.fr/)-style).
- **[AGENTS.md](AGENTS.md)** — the map for anyone (human or agent) changing the code.

## License

[MIT](LICENSE).
