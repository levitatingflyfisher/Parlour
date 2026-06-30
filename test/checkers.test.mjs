import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBoard, legalMoves, applyMove, winner, bestMove } from '../games/checkers.mjs';

const idx = (r, c) => r * 8 + c;
const blank = () => Array(64).fill(null);

test('emptyBoard is the standard 12-v-12 opening on dark squares', () => {
  const b = emptyBoard();
  assert.equal(b.length, 64);
  const red = b.filter((v) => v === 'r').length;
  const black = b.filter((v) => v === 'b').length;
  assert.equal(red, 12);
  assert.equal(black, 12);
  // Black on rows 0–2, red on rows 5–7, all on dark squares ((r+c) odd).
  assert.equal(b[idx(0, 1)], 'b');
  assert.equal(b[idx(2, 7)], 'b');
  assert.equal(b[idx(5, 0)], 'r');
  assert.equal(b[idx(7, 6)], 'r');
  for (let i = 0; i < 64; i++) {
    if (b[i]) assert.equal((Math.floor(i / 8) + (i % 8)) % 2, 1);
  }
});

test('the opening has the standard 7 moves for Red', () => {
  const moves = legalMoves(emptyBoard(), 'r');
  assert.equal(moves.length, 7);
  assert.ok(moves.every((m) => m.captures.length === 0));
});

test('Black also has 7 opening moves', () => {
  assert.equal(legalMoves(emptyBoard(), 'b').length, 7);
});

test('a forced single capture is the ONLY legal move when one is available', () => {
  const b = blank();
  b[idx(5, 2)] = 'r'; // can jump the black man at (4,3)
  b[idx(4, 3)] = 'b';
  b[idx(7, 0)] = 'r'; // has a simple step, but captures are forced
  const moves = legalMoves(b, 'r');
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0], { from: idx(5, 2), to: idx(3, 4), captures: [idx(4, 3)] });
});

test('a multi-jump chain captures all pieces and is a single move', () => {
  const b = blank();
  b[idx(5, 4)] = 'r';
  b[idx(4, 3)] = 'b';
  b[idx(2, 3)] = 'b';
  const moves = legalMoves(b, 'r');
  assert.equal(moves.length, 1);
  const m = moves[0];
  assert.equal(m.from, idx(5, 4));
  assert.equal(m.to, idx(1, 4));
  assert.deepEqual(m.captures.slice().sort((a, x) => a - x), [idx(2, 3), idx(4, 3)]);

  const after = applyMove(b, m);
  assert.equal(after[idx(5, 4)], null);
  assert.equal(after[idx(4, 3)], null);
  assert.equal(after[idx(2, 3)], null);
  assert.equal(after[idx(1, 4)], 'r'); // landed, not yet a king (row 1)
});

test('a man reaching the far row is crowned (simple move)', () => {
  const b = blank();
  b[idx(1, 1)] = 'r';
  const move = { from: idx(1, 1), to: idx(0, 0), captures: [] };
  assert.ok(legalMoves(b, 'r').some((m) => m.to === idx(0, 0)));
  const after = applyMove(b, move);
  assert.equal(after[idx(0, 0)], 'R');
  assert.equal(after[idx(1, 1)], null);
  // Input board untouched.
  assert.equal(b[idx(1, 1)], 'r');
});

test('promotion on a capture ends the move (no further king jump)', () => {
  const b = blank();
  b[idx(2, 1)] = 'r';
  b[idx(1, 2)] = 'b'; // jump this, land on row 0 → crown
  b[idx(1, 4)] = 'b'; // a king at (0,3) could jump this, but a freshly crowned man stops
  const moves = legalMoves(b, 'r');
  assert.equal(moves.length, 1);
  const m = moves[0];
  assert.equal(m.to, idx(0, 3));
  assert.deepEqual(m.captures, [idx(1, 2)]); // only one capture — chain stopped at promotion
  const after = applyMove(b, m);
  assert.equal(after[idx(0, 3)], 'R');
  assert.equal(after[idx(1, 4)], 'b'); // the second black survives
});

test('a king captures backward (any diagonal)', () => {
  const b = blank();
  b[idx(2, 2)] = 'R'; // red king
  b[idx(3, 3)] = 'b'; // backward-and-down for red, legal for a king
  const moves = legalMoves(b, 'r');
  assert.ok(moves.some((m) => m.captures.includes(idx(3, 3)) && m.to === idx(4, 4)));
});

test('winner is null while both sides can still move', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('winner detects a side with no legal moves', () => {
  const b = blank();
  b[idx(0, 1)] = 'b'; // boxed in: both forward squares blocked, no jump landing
  b[idx(1, 0)] = 'r';
  b[idx(1, 2)] = 'r';
  b[idx(2, 3)] = 'r'; // blocks the jump landing beyond (1,2)
  assert.equal(legalMoves(b, 'b').length, 0); // Black is stuck
  assert.ok(legalMoves(b, 'r').length > 0); // Red can still move
  assert.equal(winner(b), 'r');
});

test('winner detects no pieces', () => {
  const b = blank();
  b[idx(5, 0)] = 'r';
  assert.equal(winner(b), 'r'); // Black has no pieces
});

test('bestMove returns the forced capture', () => {
  const b = blank();
  b[idx(5, 2)] = 'r';
  b[idx(4, 3)] = 'b';
  b[idx(7, 0)] = 'r';
  const m = bestMove(b, 'r');
  assert.deepEqual(m, { from: idx(5, 2), to: idx(3, 4), captures: [idx(4, 3)] });
});

test('bestMove returns a legal opening move and null with no moves', () => {
  const b = emptyBoard();
  const m = bestMove(b, 'r', 4);
  assert.ok(legalMoves(b, 'r').some((x) => x.from === m.from && x.to === m.to));
  assert.equal(bestMove(blank(), 'r'), null);
});
