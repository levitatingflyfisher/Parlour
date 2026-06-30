import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE, START, PIECES, ALL_PIECE_IDS, orientations, emptyBoard,
  canPlace, place, hasAnyMove, legalPlacementsExist, score, aiMove,
} from '../games/blokus.mjs';

const at = (r, c) => r * SIZE + c;
const byName = (n) => PIECES.find((p) => p.name === n);

test('there are 21 pieces totalling 89 cells (the full Blokus set)', () => {
  assert.equal(PIECES.length, 21);
  assert.equal(ALL_PIECE_IDS.length, 21);
  const cells = PIECES.reduce((s, p) => s + p.cells.length, 0);
  assert.equal(cells, 89);
  // sizes: one 1, one 2, two 3s, five 4s, twelve 5s.
  const sizes = PIECES.map((p) => p.cells.length).sort((a, b) => a - b);
  assert.deepEqual(sizes, [1, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
});

test('emptyBoard is 196 null cells', () => {
  const b = emptyBoard();
  assert.equal(b.length, 196);
  assert.ok(b.every((v) => v === null));
});

// ---- orientations(): exact unique-orientation counts ----
test('orientations of the monomino is exactly 1', () => {
  assert.equal(orientations(byName('I1').cells).length, 1);
});

test('orientations of an asymmetric pentomino (F) is exactly 8', () => {
  assert.equal(orientations(byName('F').cells).length, 8);
});

test('orientations of the X pentomino collapse to 1 (full symmetry)', () => {
  assert.equal(orientations(byName('X').cells).length, 1);
});

test('orientations of the I pentomino is 2 and Z is 4 (partial dedup works)', () => {
  assert.equal(orientations(byName('I5').cells).length, 2);
  assert.equal(orientations(byName('Z').cells).length, 4);
});

test('each orientation is a normalized set anchored at (0,0)', () => {
  for (const o of orientations(byName('L5').cells)) {
    assert.equal(Math.min(...o.map((c) => c[0])), 0);
    assert.equal(Math.min(...o.map((c) => c[1])), 0);
    assert.equal(o.length, 5); // congruent — same cell count as the base piece
  }
});

// ---- first piece must cover the start cell ----
test('player 0 first piece is legal only if it covers the start cell (4,4)', () => {
  const mono = [[0, 0]];
  assert.equal(canPlace(emptyBoard(), 0, mono, 4, 4, true), true);   // covers (4,4)
  assert.equal(canPlace(emptyBoard(), 0, mono, 0, 0, true), false);  // misses it
  assert.equal(canPlace(emptyBoard(), 0, mono, 5, 5, true), false);  // misses it
});

test('first piece covering the start cell with a non-anchor cell still counts', () => {
  const domino = [[0, 0], [0, 1]];
  // anchored at (4,3): covers (4,3) and (4,4) — start is the second cell.
  assert.equal(canPlace(emptyBoard(), 0, domino, 4, 3, true), true);
  // anchored at (4,5): covers (4,5),(4,6) — never touches (4,4).
  assert.equal(canPlace(emptyBoard(), 0, domino, 4, 5, true), false);
});

test('player 1 first piece must cover (9,9)', () => {
  assert.deepEqual(START[1], [9, 9]);
  const mono = [[0, 0]];
  assert.equal(canPlace(emptyBoard(), 1, mono, 9, 9, true), true);
  assert.equal(canPlace(emptyBoard(), 1, mono, 4, 4, true), false);
});

// ---- later pieces: corner-to-corner required, edge with own forbidden ----
test('a later piece touching own colour only at a CORNER is legal', () => {
  const b = emptyBoard();
  b[at(4, 4)] = 0; // lone own cell
  // candidate own monomino at (5,5): diagonal to (4,4), shares no edge with own.
  assert.equal(canPlace(b, 0, [[0, 0]], 5, 5, false), true);
});

test('a later piece sharing an EDGE with own colour is ILLEGAL even when it also corner-touches', () => {
  const b = emptyBoard();
  b[at(4, 4)] = 0;
  b[at(4, 5)] = 0; // own domino
  // candidate own monomino at (5,5): corner-touches (4,4) BUT edge-touches (4,5).
  // The valid corner must not rescue the illegal edge.
  assert.equal(canPlace(b, 0, [[0, 0]], 5, 5, false), false);
});

test('a later piece that only edge-touches own colour (no corner) is ILLEGAL', () => {
  const b = emptyBoard();
  b[at(4, 4)] = 0;
  assert.equal(canPlace(b, 0, [[0, 0]], 4, 5, false), false); // edge neighbour, no corner
});

test('a later piece with no contact at all to own colour is ILLEGAL', () => {
  const b = emptyBoard();
  b[at(4, 4)] = 0;
  assert.equal(canPlace(b, 0, [[0, 0]], 8, 8, false), false); // floating, no corner touch
});

// ---- overlap is illegal ----
test('overlapping any occupied cell is illegal', () => {
  const b = emptyBoard();
  b[at(4, 4)] = 0;
  assert.equal(canPlace(b, 0, [[0, 0]], 4, 4, false), false); // own cell occupied
  b[at(7, 7)] = 1;
  assert.equal(canPlace(b, 0, [[0, 0]], 7, 7, false), false); // opponent cell occupied
});

// ---- touching the OPPONENT edge-to-edge is allowed ----
test('sharing an edge with the OPPONENT is allowed', () => {
  const b = emptyBoard();
  b[at(6, 6)] = 0; // own cell to provide the required corner
  b[at(5, 4)] = 1; // opponent cell directly beside the candidate
  // candidate own monomino at (5,5): corner-touches own (6,6); edge-touches
  // opponent (5,4) — which is fine — and never edge-touches own colour.
  assert.equal(canPlace(b, 0, [[0, 0]], 5, 5, false), true);
});

// ---- placement boundaries ----
test('a piece running off the board is illegal', () => {
  const b = emptyBoard();
  assert.equal(canPlace(b, 0, [[0, 0], [0, 1]], 0, SIZE - 1, true), false); // col overflows
  assert.equal(canPlace(b, 0, [[0, 0], [1, 0]], SIZE - 1, 4, true), false); // row overflows
});

// ---- place() and score() ----
test('place returns a new board and does not mutate the input', () => {
  const b = emptyBoard();
  const n = place(b, 0, [[0, 0], [0, 1]], 4, 4);
  assert.equal(b[at(4, 4)], null);        // original untouched
  assert.equal(n[at(4, 4)], 0);
  assert.equal(n[at(4, 5)], 0);
});

test('score counts the cells a player has placed', () => {
  let b = emptyBoard();
  b = place(b, 0, byName('I5').cells, 0, 0);   // 5 cells for P0
  b = place(b, 1, byName('V3').cells, 9, 9);   // 3 cells for P1
  assert.equal(score(b, 0), 5);
  assert.equal(score(b, 1), 3);
});

// ---- move availability ----
test('hasAnyMove / legalPlacementsExist agree and find the opening move', () => {
  const b = emptyBoard();
  assert.equal(hasAnyMove(b, 0, ALL_PIECE_IDS), true);
  assert.equal(legalPlacementsExist(b, 0, ALL_PIECE_IDS), true);
});

test('a player with no pieces left has no move', () => {
  assert.equal(hasAnyMove(emptyBoard(), 0, []), false);
});

test('a fully walled-in player has no move', () => {
  // Surround player 0 so no empty cell can corner-touch its colour without
  // also edge-touching it: a solid 3x3 block of own cells leaves only edge
  // neighbours (illegal) and diagonal neighbours that are themselves walled.
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    // fill the whole board with opponent except a single own cell at a corner
    b[at(r, c)] = 1;
  }
  b[at(0, 0)] = 0; // lone own cell, every neighbour is opponent/occupied
  assert.equal(hasAnyMove(b, 0, ALL_PIECE_IDS), false); // board is full → nowhere to go
});

// ---- AI ----
test('aiMove returns a legal placement and prefers a larger piece', () => {
  const b = emptyBoard();
  const mv = aiMove(b, 0, ALL_PIECE_IDS);
  assert.ok(mv);
  // first move must cover the start cell and be legal
  assert.equal(canPlace(b, 0, mv.cells, mv.row, mv.col, true), true);
  // prefers a 5-cell pentomino on the opening (largest available)
  assert.equal(PIECES[mv.pieceId].cells.length, 5);
});

test('aiMove returns null when the player cannot move', () => {
  assert.equal(aiMove(emptyBoard(), 0, []), null);
});

test('a full two-ply opening produces a legal, non-overlapping position', () => {
  let b = emptyBoard();
  const m0 = aiMove(b, 0, ALL_PIECE_IDS);
  b = place(b, 0, m0.cells, m0.row, m0.col);
  const m1 = aiMove(b, 1, ALL_PIECE_IDS);
  assert.ok(m1);
  assert.equal(canPlace(b, 1, m1.cells, m1.row, m1.col, true), true);
  b = place(b, 1, m1.cells, m1.row, m1.col);
  // no cell belongs to both players
  assert.ok(b.every((v) => v === null || v === 0 || v === 1));
  assert.equal(score(b, 0) + score(b, 1), m0.cells.length + m1.cells.length);
});
