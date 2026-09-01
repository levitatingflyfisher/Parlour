# Personas

Agents drive the real Parlour build (the PWA in a browser, and the WebView
APK) as these people, per the fleet testing rule. Each scenario gives a start
state, plain steps, what success looks like, and what to check. "Standard
checks" means: a 360 px wide viewport with browser text at 130 percent, the
system dark preference, offline after first load, and every message in plain
words shown where the player is looking. Scenarios aim at the weak spots
found by the September 2026 lens audit.

## Primary: Nana Adjoa and Kwame, pass-and-play at the kitchen table

Adjoa is 71 and looks after their grandson Kwame, 9, after school. They play
on one old phone propped on the table, taking turns. Adjoa reads with text at
130 percent; Kwame taps fast and changes settings on a whim. The agent plays
both.

- **Goal:** play a full game together without losing it halfway.
- **Context:** shared phone, two players of very different ages, interrupted
  by homework and dinner.
- **Would quit if:** a stray tap wipes a game they were winning.

**A1. The mode pill mid-game.** Start: Chess, vs Computer, six moves in.
Steps: tap the already-lit "vs Computer" pill; then tap "2 Players". Success:
re-tapping the live mode does nothing; switching keeps the position (or asks
first). Check: the same in Tic-Tac-Toe and with Sudoku difficulty.

**A2. Take back a move.** Start: Connect Four, 2 Players, four moves in.
Steps: Kwame drops a counter in the wrong column; look for Undo. Success: an
Undo in the game bar takes back one move, as Klondike already does. Check:
leaving a game loses it by design (ADR-0005), so the Cupboard pill and
browser Back should not be one stray tap away from the board.

**A3. Solitaire at phone width.** Start: fresh Klondike. Steps: view the
tableau at 360 px. Success: all seven piles are fully visible; undo takes back
the last move. Check: standard checks.

**A4. Stratego setup.** Start: Stratego secret setup at 130 percent text.
Steps: read the You / The computer key; find Ready. Success: the key is
readable (not cream on cream); Ready is visible without scrolling. Check:
the Cupboard badge says Stratego can be played against the computer.

## Secondary: Rafael, colour-blind and a daily Wordle player

Rafael is 40, a parent of two, has deuteranopia, and plays Wordle and Globle
on the bus each morning.

- **Goal:** read each guess's result and finish the daily puzzle.
- **Context:** one-handed, bright light, eyes on the keyboard.
- **Would quit if:** results rely on colour alone.

**R1. Wordle without colour.** Start: today's Wordle. Steps: make three
guesses; view with a grayscale or deuteranopia filter. Success: each tile's
state is readable by a second cue or a screen reader label; a legend exists.
Check: dark preference.

**R2. Wordle refusal.** Start: Wordle. Steps: submit a non-word. Success: the
message appears near the keyboard or marks the row, and stays until the next
keystroke. Check: 130 percent text.

**R3. Globle input.** Start: Globle. Steps: type "Atlantis" and submit; then
start typing a real country. Success: choices come from the bundled list; the
screen says the puzzle covers 93 countries. Check: the field has a visible
label.

**R4. Minesweeper modes.** Start: Minesweeper. Steps: switch to Flag mode;
flag a cell; reveal a cell; repeat with TalkBack on in the APK. Success: the
live mode shows on the grid and in the status; with TalkBack each move speaks
a short status, not all 81 cells. Check: 130 percent text.
