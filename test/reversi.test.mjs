import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBoard, legalMoves, applyMove, winner, score, bestMove } from '../games/reversi.mjs';

const idx = (r, c) => r * 8 + c;

test('emptyBoard is the standard 4-disc opening', () => {
  const b = emptyBoard();
  assert.equal(b.length, 64);
  assert.equal(b[idx(3, 3)], 'W');
  assert.equal(b[idx(4, 4)], 'W');
  assert.equal(b[idx(3, 4)], 'B');
  assert.equal(b[idx(4, 3)], 'B');
  assert.deepEqual(score(b), { B: 2, W: 2 });
});

test('the opening has exactly 4 legal moves for Black', () => {
  const moves = legalMoves(emptyBoard(), 'B').slice().sort((a, b) => a - b);
  assert.equal(moves.length, 4);
  // d3, c4, f5, e6 in row-major indices.
  assert.deepEqual(moves, [idx(2, 3), idx(3, 2), idx(4, 5), idx(5, 4)]);
});

test('White also has 4 legal moves at the opening', () => {
  assert.equal(legalMoves(emptyBoard(), 'W').length, 4);
});

test('applyMove flips the bracketed discs', () => {
  // Black plays d3 (2,3): the white disc at (3,3) is bracketed by B(4,3) below
  // and the new B(2,3) above, so it flips to Black.
  const b = applyMove(emptyBoard(), idx(2, 3), 'B');
  assert.equal(b[idx(2, 3)], 'B'); // placed
  assert.equal(b[idx(3, 3)], 'B'); // flipped from W
  assert.equal(b[idx(4, 4)], 'W'); // untouched
  assert.deepEqual(score(b), { B: 4, W: 1 });
  // The input board is not mutated.
  assert.equal(emptyBoard()[idx(3, 3)], 'W');
});

test('winner is null while either side can still move', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('winner detects a full-board majority and a draw', () => {
  const black = Array(64).fill('B');
  black[0] = 'W';
  assert.equal(winner(black), 'B');

  const white = Array(64).fill('W');
  white[0] = 'B';
  assert.equal(winner(white), 'W');

  const tied = Array(64).fill('B');
  for (let i = 0; i < 32; i++) tied[i] = 'W';
  assert.equal(winner(tied), 'draw');
});

test('winner ends the game when neither side can move (no empties needed)', () => {
  // A board with discs but no bracketing move for anyone: a lone Black disc.
  const b = Array(64).fill(null);
  b[idx(0, 0)] = 'B';
  assert.equal(legalMoves(b, 'B').length, 0);
  assert.equal(legalMoves(b, 'W').length, 0);
  assert.equal(winner(b), 'B');
});

test('bestMove returns a legal move', () => {
  const b = emptyBoard();
  const m = bestMove(b, 'B');
  assert.ok(legalMoves(b, 'B').includes(m));
});

test('bestMove returns -1 when the player has no move (a pass)', () => {
  const b = Array(64).fill(null);
  b[idx(0, 0)] = 'B';
  assert.equal(bestMove(b, 'W'), -1);
});

test('bestMove prefers a corner when one is available', () => {
  // Corner (0,0) is legal for Black: W at (0,1) bracketed by B at (0,2).
  // A rival non-corner move at (3,3) is also legal but should not be chosen.
  const b = Array(64).fill(null);
  b[idx(0, 1)] = 'W';
  b[idx(0, 2)] = 'B';
  b[idx(3, 4)] = 'W';
  b[idx(3, 5)] = 'B';
  const legal = legalMoves(b, 'B');
  assert.ok(legal.includes(idx(0, 0)));
  assert.ok(legal.includes(idx(3, 3)));
  assert.equal(bestMove(b, 'B'), idx(0, 0));
});
