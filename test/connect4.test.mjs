import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROWS, COLS, emptyBoard, available, drop, winner, bestMove } from '../games/connect4.mjs';

const idx = (r, c) => r * COLS + c;

test('emptyBoard is ROWS*COLS empty cells', () => {
  assert.equal(ROWS, 6);
  assert.equal(COLS, 7);
  assert.deepEqual(emptyBoard(), Array(42).fill(null));
});

test('a dropped piece falls to the bottom row of its column', () => {
  const { board, row } = drop(emptyBoard(), 3, 'R');
  assert.equal(row, ROWS - 1);
  assert.equal(board[idx(ROWS - 1, 3)], 'R');
});

test('pieces stack on top of each other', () => {
  let b = emptyBoard();
  b = drop(b, 3, 'R').board;
  const { row } = drop(b, 3, 'Y');
  assert.equal(row, ROWS - 2);
});

test('drop returns null for a full column', () => {
  let b = emptyBoard();
  for (let i = 0; i < ROWS; i++) b = drop(b, 0, 'R').board;
  assert.equal(drop(b, 0, 'Y'), null);
  assert.deepEqual(available(b).includes(0), false);
});

test('winner detects four in a row horizontally', () => {
  let b = emptyBoard();
  for (const c of [0, 1, 2, 3]) b = drop(b, c, 'R').board;
  assert.equal(winner(b), 'R');
});

test('winner detects four vertically', () => {
  let b = emptyBoard();
  for (let i = 0; i < 4; i++) b = drop(b, 2, 'Y').board;
  assert.equal(winner(b), 'Y');
});

test('winner detects a diagonal four', () => {
  // Build an ascending diagonal R at (5,0),(4,1),(3,2),(2,3).
  let b = emptyBoard();
  b = drop(b, 0, 'R').board; // (5,0) R
  b = drop(b, 1, 'Y').board; b = drop(b, 1, 'R').board; // (5,1)Y (4,1)R
  b = drop(b, 2, 'Y').board; b = drop(b, 2, 'Y').board; b = drop(b, 2, 'R').board; // (3,2)R
  b = drop(b, 3, 'Y').board; b = drop(b, 3, 'Y').board; b = drop(b, 3, 'Y').board; b = drop(b, 3, 'R').board; // (2,3)R
  assert.equal(winner(b), 'R');
});

test('winner is null on an empty board', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('bestMove takes an immediate winning drop', () => {
  // R has three across the bottom (cols 0,1,2); col 3 completes the four.
  let b = emptyBoard();
  for (const c of [0, 1, 2]) b = drop(b, c, 'R').board;
  assert.equal(bestMove(b, 'R'), 3);
});

test('bestMove blocks the opponent\'s immediate win', () => {
  // Y threatens four across the bottom (cols 1,2,3); R must block at 0 or 4.
  let b = emptyBoard();
  for (const c of [1, 2, 3]) b = drop(b, c, 'Y').board;
  assert.ok([0, 4].includes(bestMove(b, 'R')));
});
