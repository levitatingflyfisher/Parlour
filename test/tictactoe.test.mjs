import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBoard, available, winner, bestMove } from '../games/tictactoe.mjs';

test('emptyBoard is nine empty cells', () => {
  assert.deepEqual(emptyBoard(), Array(9).fill(null));
});

test('available lists only empty cells', () => {
  const b = ['X', null, 'O', null, null, null, null, null, null];
  assert.deepEqual(available(b), [1, 3, 4, 5, 6, 7, 8]);
});

test('winner detects a completed row', () => {
  const b = ['X', 'X', 'X', null, 'O', 'O', null, null, null];
  assert.equal(winner(b), 'X');
});

test('winner detects a completed column', () => {
  const b = ['O', 'X', null, 'O', 'X', null, 'O', null, null];
  assert.equal(winner(b), 'O');
});

test('winner detects a diagonal', () => {
  const b = ['X', 'O', 'O', null, 'X', null, null, null, 'X'];
  assert.equal(winner(b), 'X');
});

test('winner returns draw on a full board with no line', () => {
  const b = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(winner(b), 'draw');
});

test('winner returns null while the game is ongoing', () => {
  assert.equal(winner(emptyBoard()), null);
});

test('bestMove takes the immediate winning move', () => {
  // X to move: X at 0,1 — completing the top row at 2 wins now.
  const b = ['X', 'X', null, null, 'O', null, null, 'O', null];
  assert.equal(bestMove(b, 'X'), 2);
});

test('bestMove blocks the opponent\'s immediate win', () => {
  // X to move: O threatens 3,4,5 (O at 3,4). X must block at 5.
  const b = [null, null, 'X', 'O', 'O', null, null, null, null];
  assert.equal(bestMove(b, 'X'), 5);
});

test('bestMove never loses — perfect play yields at worst a draw', () => {
  // Play X (bestMove) vs an exhaustive O that tries every reply: X must
  // never lose from the empty board (tic-tac-toe is a draw under perfect play).
  function playsOutSafely(board, toMove) {
    const w = winner(board);
    if (w) return w !== 'O'; // X (our engine) must never let O win
    if (toMove === 'X') {
      const next = board.slice();
      next[bestMove(board, 'X')] = 'X';
      return playsOutSafely(next, 'O');
    }
    // O tries every legal reply; all must stay safe for X.
    return available(board).every((i) => {
      const next = board.slice();
      next[i] = 'O';
      return playsOutSafely(next, 'X');
    });
  }
  assert.equal(playsOutSafely(emptyBoard(), 'X'), true);
});
