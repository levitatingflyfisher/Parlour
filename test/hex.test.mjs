import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, emptyBoard, available, place, winner, bestMove } from '../games/hex.mjs';

const idx = (r, c) => r * SIZE + c;

test('emptyBoard is 121 empty cells', () => {
  assert.equal(SIZE, 11);
  assert.deepEqual(emptyBoard(), Array(121).fill(null));
});

test('place fills a cell and returns a new board (immutability)', () => {
  const b0 = emptyBoard();
  const b1 = place(b0, idx(5, 5), 'R');
  assert.equal(b0[idx(5, 5)], null);
  assert.equal(b1[idx(5, 5)], 'R');
});

test('place rejects an occupied cell', () => {
  const b = place(emptyBoard(), idx(2, 3), 'R');
  assert.equal(place(b, idx(2, 3), 'B'), null);
  assert.equal(place(b, idx(2, 3), 'R'), null);
});

test('winner is null on an empty board', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('winner is null on a partial (unconnected) board', () => {
  let b = emptyBoard();
  b = place(b, idx(0, 5), 'R');
  b = place(b, idx(1, 5), 'R'); // a stub that does not reach the bottom edge
  b = place(b, idx(5, 0), 'B'); // and a lone Blue stone at the left edge
  assert.equal(winner(b), null);
});

test('winner detects a Red top-to-bottom column', () => {
  let b = emptyBoard();
  for (let r = 0; r < SIZE; r++) b = place(b, idx(r, 5), 'R');
  assert.equal(winner(b), 'R');
});

test('winner detects a Blue left-to-right row', () => {
  let b = emptyBoard();
  for (let c = 0; c < SIZE; c++) b = place(b, idx(5, c), 'B');
  assert.equal(winner(b), 'B');
});

test('winner follows the hex diagonal adjacency', () => {
  // (-1,+1)/(+1,-1) are neighbours: a Red staircase still connects top→bottom.
  let b = emptyBoard();
  for (let r = 0; r < SIZE; r++) b = place(b, idx(r, SIZE - 1 - r), 'R');
  assert.equal(winner(b), 'R');
});

test('bestMove returns a legal empty cell on an empty board', () => {
  const b = emptyBoard();
  const m = bestMove(b, 'R');
  assert.ok(Number.isInteger(m) && m >= 0 && m < 121);
  assert.equal(b[m], null);
});

test('bestMove takes an immediate winning move', () => {
  // Column 0, rows 0..9 are Red; the bottom-left corner is the ONLY cell that
  // completes the top→bottom link (the (+1,-1) hex neighbour falls off-board),
  // so the immediate-win branch is forced to it.
  let b = emptyBoard();
  for (let r = 0; r < SIZE - 1; r++) b = place(b, idx(r, 0), 'R');
  const m = bestMove(b, 'R');
  assert.equal(m, idx(SIZE - 1, 0));
  assert.equal(winner(place(b, m, 'R')), 'R');
});

test('bestMove on a near-full board returns the last empty cell', () => {
  const b = emptyBoard();
  for (let i = 0; i < 121; i++) if (i !== 60) b[i] = i % 2 === 0 ? 'R' : 'B';
  assert.deepEqual(available(b), [60]);
  assert.equal(bestMove(b, 'R'), 60);
});
