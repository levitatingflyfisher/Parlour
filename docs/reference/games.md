# Game catalogue

Every game in the cupboard, with its registry `id`, player modes, computer
opponent (if any), and the module that holds its rules. All logic lives in
`games/<id>.mjs`; all UI in the matching `mount<Name>` function in
`index.template.html`; all tests in `test/<id>.test.mjs`.

Player modes come from the tile `badges`: **1 player** = play the computer,
**2 players** = pass-and-play, **solo** = single-player puzzle, **daily-le** = one
puzzle a day derived from the date.

## Board & strategy — play the computer or pass-and-play

| Game | `id` | Modes | Computer opponent |
|---|---|---|---|
| Tic-Tac-Toe | `tictactoe` | 1p / 2p | **Perfect** — full minimax (never loses). The scaffold other grid games copy. |
| Connect Four | `connect4` | 1p / 2p | Depth-limited **alpha-beta** with a position evaluation. |
| Reversi (Othello) | `reversi` | 1p / 2p | Heuristic move choice. |
| Gomoku (Five in a Row) | `gomoku` | 1p / 2p | Heuristic (threat/line scoring) on a 15×15 board. |
| Dots & Boxes | `dotsboxes` | 1p / 2p | Heuristic on a 4×4 grid of boxes. |
| Blokus (Duo) | `blokus` | 1p / 2p | Heuristic piece placement on a 14×14 board. |
| Checkers (draughts) | `checkers` | 1p / 2p | Search over forced jumps, multi-captures, kings. |
| Quoridor | `quoridor` | 1p / 2p | Heuristic pawn race + fence placement (shortest-path aware). |
| Hex | `hex` | 1p / 2p | Connection play on an 11×11 rhombus. |
| Chess | `chess` | 1p / 2p | **Alpha-beta** search with a material/position evaluation; full legal moves incl. castling, en passant, promotion. |
| Stratego | `stratego` | 1p / 2p | Heuristic with limited lookahead at **Easy / Medium / Hard** skill levels. |

> Stratego is the **only** vs-computer game that exposes a difficulty picker
> (see `aiMove` in `games/stratego.mjs`).

## Solo puzzles

| Game | `id` | Mode | Notes |
|---|---|---|---|
| 2048 | `2048` | solo | Slide-and-merge on a 4×4 grid; spawns via an injectable rng. |
| Memory (concentration) | `memory` | 1p / 2p | Match pairs; pass-and-play or solo. Shuffle takes an injectable rng. |
| Minesweeper | `minesweeper` | solo | Clear the 9×9 grid without tripping a mine. |
| Mastermind | `mastermind` | solo | Crack a hidden 4-peg colour code in ten guesses. |
| Sudoku | `sudoku` | solo | Fill the 9×9 grid; puzzles have a unique solution. |
| Solitaire (Klondike) | `klondike` | solo | Patience — build the tableau down, send all 52 home A→K. |
| Hangman | `hangman` | 1p | Guess the hidden word letter by letter. |
| Nim | `nim` | 1p / 2p | Take the last object to win; the computer plays the **optimal** nim strategy. |
| Crazy Eights | `crazyeights` | 1p | Shed your hand matching rank or suit; eights are wild. Vs the computer. |

## Daily "-le" — one puzzle a day, same for everyone, computed on-device

Each derives its answer deterministically from a `YYYYMMDD` seed — no server, no
stored state. See [ADR-0006](../adr/0006-daily-puzzles-are-deterministic-offline.md).

| Game | `id` | Notes |
|---|---|---|
| Wordle | `wordle` | Six tries to crack today's five-letter word (real-word guesses accepted). |
| Hexcodle | `hexcodle` | Guess today's colour from its hex code; each digit says higher or lower. |
| Globle | `globle` | Guess today's country; each guess shows great-circle closeness and direction. |

## Cross-cutting fields

Every registry entry is `{ id, name, glyph, blurb, badges, tier, mount }`:

- **`glyph`** — the emoji/character shown on the tile.
- **`badges`** — the player-mode chips (above).
- **`tier`** — an integer 0–4, a rough simplest→hardest authoring ladder. It is
  **not** surfaced in the UI today (the cupboard is one flat, ordered grid); see
  [limitations](../limitations.md).
- **`mount`** — the UI function that renders and drives the game.

**23 games.** `test/counts.test.mjs` fails if this number, or any other stated
game count in the docs, drifts from the registry.
