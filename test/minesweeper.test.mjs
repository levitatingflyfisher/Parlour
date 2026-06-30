import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROWS, COLS, MINES, neighbours, newGame, reveal, toggleFlag, isWon,
} from '../games/minesweeper.mjs';

// rng()=>0 makes the partial Fisher-Yates a no-op (j === i, no swaps), so mines
// are exactly the first MINES candidate cells — a fully deterministic board.
const zero = () => 0;

test('newGame places exactly MINES mines', () => {
  const m = newGame(zero);
  assert.equal(m.mines.size, MINES);
});

test('newGame never places a mine on firstSafeIndex', () => {
  // With firstSafe=0 the candidates are 1..80, so mines would be {1..10}.
  const m = newGame(zero, 0);
  assert.equal(m.mines.size, MINES);
  assert.ok(!m.mines.has(0), 'firstSafeIndex must be excluded');
  assert.deepEqual([...m.mines].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('neighbours respects grid edges and corners', () => {
  assert.deepEqual(neighbours(0).sort((a, b) => a - b), [1, COLS, COLS + 1]);
  assert.equal(neighbours(10).length, 8); // an interior cell
  assert.equal(neighbours(ROWS * COLS - 1).length, 3); // bottom-right corner
});

test('counts equal the number of adjacent mines for every cell', () => {
  const m = newGame(zero);
  for (let i = 0; i < ROWS * COLS; i++) {
    const expected = neighbours(i).filter((n) => m.mines.has(n)).length;
    assert.equal(m.counts[i], expected, `count mismatch at ${i}`);
  }
});

test('revealing a zero-cell flood-fills its entire zero region + border', () => {
  // mines = {0..9} (top row + start of second). The bottom rows are far from
  // any mine, so a deep cell is a guaranteed zero with a connected region.
  const m = newGame(zero);
  const start = ROWS * COLS - 1; // bottom-right, count 0
  assert.equal(m.counts[start], 0);
  const out = reveal(m, start);
  // Every cell in the flood is either a zero or a numbered border cell, and
  // each revealed cell connects back to a zero. Verify the closure property:
  // any unrevealed cell adjacent to a revealed zero would be a contradiction.
  for (const i of out.revealed) {
    if (out.counts[i] === 0) {
      for (const n of neighbours(i)) {
        assert.ok(out.revealed.has(n), `zero region not closed at ${i}->${n}`);
      }
    }
  }
  // The flood from the corner must reach a sizeable region, not just one cell.
  assert.ok(out.revealed.size > 1, 'flood should reveal more than one cell');
  assert.ok(out.revealed.has(start));
  assert.equal(out.dead, false);
});

test('revealing a mine sets dead and reveals that mine', () => {
  const m = newGame(zero); // mines include 0
  const out = reveal(m, 0);
  assert.equal(out.dead, true);
  assert.ok(out.revealed.has(0));
  assert.equal(isWon(out), false);
});

test('reveal returns a new model and does not mutate the input', () => {
  const m = newGame(zero);
  const safe = ROWS * COLS - 1;
  const before = m.revealed.size;
  const out = reveal(m, safe);
  assert.notEqual(out, m);
  assert.equal(m.revealed.size, before, 'input model must be untouched');
});

test('toggleFlag flags and unflags, never on a revealed cell', () => {
  const m = newGame(zero);
  const f = toggleFlag(m, 40);
  assert.ok(f.flagged.has(40));
  const f2 = toggleFlag(f, 40);
  assert.ok(!f2.flagged.has(40));
  // cannot flag a revealed cell
  const safe = ROWS * COLS - 1;
  const opened = reveal(m, safe);
  assert.equal(toggleFlag(opened, safe), opened);
});

test('isWon only when all safe cells are revealed', () => {
  const m = newGame(zero); // mines = {0..9}
  assert.equal(isWon(m), false);
  // Reveal every non-mine cell.
  let g = m;
  for (let i = 0; i < ROWS * COLS; i++) {
    if (!g.mines.has(i)) g = reveal(g, i);
  }
  assert.equal(g.dead, false);
  assert.equal(isWon(g), true);
  // Revealing a mine after winning would not count (dead board never wins).
  const dead = reveal(newGame(zero), 0);
  assert.equal(isWon(dead), false);
});
