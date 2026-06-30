import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, emptyBoard, available, place, winner, bestMove } from '../games/gomoku.mjs';

const at = (r, c) => r * SIZE + c;

// Builds a board with `player` on each [r,c] in `cells`.
const withStones = (cells, player) => {
  const b = emptyBoard();
  for (const [r, c] of cells) b[at(r, c)] = player;
  return b;
};

test('SIZE is 15 and emptyBoard is 225 empty cells', () => {
  assert.equal(SIZE, 15);
  assert.deepEqual(emptyBoard(), Array(225).fill(null));
  assert.equal(available(emptyBoard()).length, 225);
});

test('winner detects five in a row horizontally', () => {
  const b = withStones([[7, 3], [7, 4], [7, 5], [7, 6], [7, 7]], 'B');
  assert.equal(winner(b), 'B');
});

test('winner detects five in a row vertically', () => {
  const b = withStones([[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]], 'W');
  assert.equal(winner(b), 'W');
});

test('winner detects five on the down-right diagonal', () => {
  const b = withStones([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], 'B');
  assert.equal(winner(b), 'B');
});

test('winner detects five on the down-left (anti) diagonal', () => {
  const b = withStones([[1, 9], [2, 8], [3, 7], [4, 6], [5, 5]], 'W');
  assert.equal(winner(b), 'W');
});

test('winner does NOT fire on only four in a row', () => {
  assert.equal(winner(withStones([[7, 3], [7, 4], [7, 5], [7, 6]], 'B')), null);
  assert.equal(winner(withStones([[2, 8], [3, 8], [4, 8], [5, 8]], 'W')), null);
  assert.equal(winner(withStones([[1, 1], [2, 2], [3, 3], [4, 4]], 'B')), null);
});

test('winner is null on an empty board', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('winner reports a draw on a full board with no line', () => {
  // Tile a colour pattern with period 3 along rows so no run ever reaches 5.
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      b[at(r, c)] = ((r + Math.floor(c / 3)) % 2 === 0) ? 'B' : 'W';
    }
  }
  assert.equal(available(b).length, 0);
  assert.equal(winner(b), 'draw');
});

test('place puts a stone on an empty cell without mutating the source', () => {
  const b = emptyBoard();
  const next = place(b, at(7, 7), 'B');
  assert.equal(next[at(7, 7)], 'B');
  assert.equal(b[at(7, 7)], null, 'original board is untouched');
});

test('place rejects an occupied cell (returns null)', () => {
  const b = place(emptyBoard(), at(7, 7), 'B');
  assert.equal(place(b, at(7, 7), 'W'), null);
  assert.equal(place(b, at(7, 7), 'B'), null);
});

test('place rejects out-of-range indices', () => {
  const b = emptyBoard();
  assert.equal(place(b, -1, 'B'), null);
  assert.equal(place(b, 225, 'B'), null);
});

test('bestMove completes an open four into five when it can', () => {
  // Black has four across row 7 (cols 3-6); cols 2 and 7 both complete five.
  const b = withStones([[7, 3], [7, 4], [7, 5], [7, 6]], 'B');
  const m = bestMove(b, 'B');
  assert.ok([at(7, 2), at(7, 7)].includes(m), `expected a completing end, got ${m}`);
  assert.equal(winner(place(b, m, 'B')), 'B');
});

test('bestMove completes a four with a single gap', () => {
  // Black at cols 3,4,6,7 of row 7 — the only winning cell is the gap at col 5.
  const b = withStones([[7, 3], [7, 4], [7, 6], [7, 7]], 'B');
  const m = bestMove(b, 'B');
  assert.equal(m, at(7, 5));
  assert.equal(winner(place(b, m, 'B')), 'B');
});

test('bestMove blocks the opponent\'s immediate five-threat', () => {
  // White has four (cols 4-7 of row 7); col 3 is walled by Black, so the only
  // square that makes five for White is col 8 — Black must take it.
  const b = withStones([[7, 4], [7, 5], [7, 6], [7, 7]], 'W');
  b[at(7, 3)] = 'B';
  const m = bestMove(b, 'B');
  assert.equal(m, at(7, 8));
});

test('bestMove blocks an open four at one of its ends', () => {
  // White open four (cols 4-7 of row 7); blocking either end is acceptable.
  const b = withStones([[7, 4], [7, 5], [7, 6], [7, 7]], 'W');
  const m = bestMove(b, 'B');
  assert.ok([at(7, 3), at(7, 8)].includes(m), `expected an end block, got ${m}`);
});

test('bestMove returns the centre on an opening board', () => {
  const m = bestMove(emptyBoard(), 'B');
  assert.equal(m, at(7, 7));
  assert.equal(emptyBoard()[m], null);
});

test('bestMove returns a legal empty cell near existing stones', () => {
  const b = place(emptyBoard(), at(7, 7), 'B');
  const m = bestMove(b, 'W');
  assert.equal(b[m], null, 'move must be an empty cell');
  const [r, c] = [Math.floor(m / SIZE), m % SIZE];
  assert.ok(Math.max(Math.abs(r - 7), Math.abs(c - 7)) <= 2, `expected a move near (7,7), got (${r},${c})`);
});
