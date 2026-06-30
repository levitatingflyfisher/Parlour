import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialBoard, newGame, legalMoves, allMoves, applyMove, inCheck, status, bestMove,
} from '../games/chess.mjs';

const empty = () => Array(64).fill(null);
const free = (board, turn = 'w') => ({ board, turn, castling: { K: false, Q: false, k: false, q: false }, ep: null });

test('initialBoard places the standard armies (index 0 = a8, white at the bottom)', () => {
  const b = initialBoard();
  assert.equal(b.length, 64);
  assert.deepEqual(b.slice(0, 8), ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']); // black back rank
  for (let c = 0; c < 8; c++) { assert.equal(b[8 + c], 'p'); assert.equal(b[48 + c], 'P'); }
  assert.deepEqual(b.slice(56, 64), ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']); // white back rank
  assert.equal(b[60], 'K'); // white king on e1
  assert.equal(b[4], 'k'); // black king on e8
});

test('the opening has exactly 20 legal moves for White (16 pawn + 4 knight)', () => {
  const s = newGame();
  assert.equal(allMoves(s).length, 20);
  assert.equal(status(s), 'ongoing');
  // 16 of them are pawn moves, 4 are knight moves.
  const pawn = allMoves(s).filter((m) => s.board[m.from] === 'P').length;
  const knight = allMoves(s).filter((m) => s.board[m.from] === 'N').length;
  assert.equal(pawn, 16);
  assert.equal(knight, 4);
});

test('the b1 knight reaches exactly a3 and c3 in the opening', () => {
  const s = newGame();
  const dests = legalMoves(s, 57).map((m) => m.to).sort((a, b) => a - b);
  assert.deepEqual(dests, [40, 42]); // a3 = (5,0), c3 = (5,2)
});

test('kingside castling is legal from a cleared back rank and moves king AND rook', () => {
  const s = newGame();
  const b = s.board.slice();
  b[61] = null; b[62] = null; // clear f1 and g1
  const state = { board: b, turn: 'w', castling: { K: true, Q: true, k: true, q: true }, ep: null };
  assert.ok(legalMoves(state, 60).some((m) => m.to === 62)); // O-O offered
  const after = applyMove(state, 60, 62);
  assert.equal(after.board[62], 'K'); // king to g1
  assert.equal(after.board[61], 'R'); // rook hops to f1
  assert.equal(after.board[60], null); // e1 vacated
  assert.equal(after.board[63], null); // h1 vacated
  assert.equal(after.castling.K, false); // right spent
  assert.equal(after.castling.Q, false);
});

test('castling is illegal when the king would pass through check', () => {
  const b = empty();
  b[60] = 'K'; b[63] = 'R'; b[4] = 'k'; // white king e1, rook h1, black king e8
  b[45] = 'r'; // black rook on f3 rakes the f-file, attacking f1 (the king's transit square)
  const state = { board: b, turn: 'w', castling: { K: true, Q: true, k: true, q: true }, ep: null };
  assert.equal(inCheck(state, 'w'), false); // king itself is not in check…
  assert.ok(!legalMoves(state, 60).some((m) => m.to === 62)); // …but O-O is forbidden
});

test('en passant captures the pawn that just double-pushed', () => {
  const b = empty();
  b[60] = 'K'; b[4] = 'k';
  b[28] = 'P'; // white pawn on e5 (row 3)
  b[11] = 'p'; // black pawn on d7 (row 1)
  let state = free(b, 'b');
  state = applyMove(state, 11, 27); // …d7-d5, a double push
  assert.equal(state.ep, 19); // ep target appears on d6
  assert.equal(state.turn, 'w');
  const epMove = legalMoves(state, 28).find((m) => m.to === 19);
  assert.ok(epMove, 'exd6 e.p. is available');
  const after = applyMove(state, 28, 19, epMove.promo);
  assert.equal(after.board[19], 'P'); // capturing pawn lands on d6
  assert.equal(after.board[27], null); // the d5 pawn is removed
  assert.equal(after.board[28], null);
});

test('promotion replaces the pawn (auto-queen, with underpromotion honoured)', () => {
  const b = empty();
  b[60] = 'K'; b[4] = 'k';
  b[9] = 'P'; // white pawn on b7, one square from promotion
  const state = free(b, 'w');
  const move = legalMoves(state, 9).find((m) => m.to === 1); // push to b8
  assert.ok(move);
  assert.equal(move.promo, 'q'); // generated as auto-queen
  const queened = applyMove(state, 9, 1, 'q');
  assert.equal(queened.board[1], 'Q');
  assert.equal(queened.board[9], null);
  assert.equal(applyMove(state, 9, 1, 'n').board[1], 'N'); // underpromotion to knight
});

test('a back-rank mate is detected as checkmate', () => {
  const b = empty();
  b[6] = 'k'; // black king trapped on g8…
  b[13] = 'p'; b[14] = 'p'; b[15] = 'p'; // …behind its own f7/g7/h7 pawns
  b[4] = 'R'; // white rook delivers mate along the 8th rank from e8
  b[60] = 'K';
  const state = free(b, 'b');
  assert.equal(inCheck(state, 'b'), true);
  assert.equal(status(state), 'checkmate');
});

test('a stalemate is detected (king not in check, no legal move)', () => {
  const b = empty();
  b[0] = 'k'; // black king cornered on a8
  b[10] = 'Q'; // white queen on c7 covers a7, b7 and b8
  b[18] = 'K'; // white king on c6
  const state = free(b, 'b');
  assert.equal(inCheck(state, 'b'), false);
  assert.equal(allMoves(state).length, 0);
  assert.equal(status(state), 'stalemate');
});

test('a move that leaves your own king in check is rejected (absolute pin)', () => {
  const b = empty();
  b[60] = 'K'; // white king e1
  b[52] = 'B'; // white bishop e2 — pinned to the king
  b[4] = 'r'; // black rook e8 pins it down the e-file
  b[0] = 'k'; // black king a8
  const state = free(b, 'w');
  assert.equal(inCheck(state, 'w'), false); // the bishop blocks the check…
  assert.equal(legalMoves(state, 52).length, 0); // …so the pinned bishop cannot move at all
  assert.ok(legalMoves(state, 60).length > 0); // the king itself still has escape squares
});

test('bestMove returns a legal move, and null when there is none', () => {
  const s = newGame();
  const m = bestMove(s, 3);
  assert.ok(Number.isInteger(m.from) && Number.isInteger(m.to));
  assert.ok(legalMoves(s, m.from).some((x) => x.to === m.to));
  // A stalemated side has no move.
  const b = empty();
  b[0] = 'k'; b[10] = 'Q'; b[18] = 'K';
  assert.equal(bestMove(free(b, 'b'), 3), null);
});

test('bestMove grabs a hanging queen', () => {
  const b = empty();
  b[60] = 'K'; b[7] = 'k'; // kings on e1 and h8
  b[59] = 'R'; // white rook on d1
  b[27] = 'q'; // undefended black queen on d5
  const m = bestMove(free(b, 'w'), 3);
  assert.deepEqual({ from: m.from, to: m.to }, { from: 59, to: 27 });
});
