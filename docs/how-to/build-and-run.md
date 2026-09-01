# How to build and run Parlour

Parlour has no dependencies and a two-command toolchain. You need **Node 18+** and
a browser.

## Get the code

```sh
git clone https://github.com/levitatingflyfisher/Parlour.git
cd Parlour
```

There is nothing to `npm install` — the build and tests use only Node's standard
library.

## Run the tests

```sh
npm test        # runs `node --test` over test/*.mjs
```

This exercises every game's pure-logic module (rules and AI). It should report all
tests passing and finish in a few seconds. Run it
before and after any change to game logic.

## Build the page

```sh
npm run build   # runs build.mjs: games/*.mjs + index.template.html -> index.html
```

This regenerates `index.html` from the template and the game modules. It prints the
list of bundled game modules. **`index.html` is a generated artifact** — always
build it from source rather than editing it by hand, and commit the regenerated
file alongside your source changes.

## Play it locally

Because it's a single self-contained page, you can just open the file:

```sh
xdg-open index.html      # Linux
open index.html          # macOS
```

For full PWA behavior (service worker / offline install), serve the folder over
HTTP instead of `file://` — any static server works, e.g.:

```sh
python3 -m http.server 8000    # then visit http://localhost:8000/
```

Tap a tile to open a game; the "← Cupboard" button (or the browser back button)
returns to the shelf.

## The loop

1. Edit a game's rules in `games/<id>.mjs` and/or its UI in `index.template.html`.
2. `npm test` — keep it green.
3. `npm run build` — regenerate `index.html`.
4. Reload the page and play the change.

To add a *new* game rather than change an existing one, follow
[add-a-game.md](add-a-game.md).
