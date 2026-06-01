# Parlour

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
npm test      # run the pure-logic tests
npm run build # regenerate index.html from the template + game modules
```

After `npm run build`, open `index.html` in a browser (or serve the folder).

## The shelf

Launch drawer: **Tic-Tac-Toe** and friends, growing toward Connect Four,
Reversi, Dots & Boxes, 2048, Memory, and a daily *“-le”* drawer. Each game is a
self-contained logic module, so the cupboard fills up one tile at a time.

## Privacy

Everything stays on your device. See [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE).
