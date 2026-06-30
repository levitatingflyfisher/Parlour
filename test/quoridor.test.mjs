import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame, pawnMoves, canPlaceWall, placeWall, movePawn, winner, aiMove, wallKey,
} from '../games/quoridor.mjs';

const has = (moves, r, c) => moves.some((m) => m.r === r && m.c === c);

test('newGame places the pawns, gives 10 walls each, pawn 0 to move', () => {
  const s = newGame();
  assert.deepEqual(s.pawns, [{ r: 8, c: 4 }, { r: 0, c: 4 }]);
  assert.deepEqual(s.wallsLeft, [10, 10]);
  assert.equal(s.turn, 0);
  assert.equal(s.walls.h.size, 0);
  assert.equal(s.walls.v.size, 0);
  assert.equal(winner(s), null);
});

test('a pawn steps orthogonally', () => {
  const s = newGame(); // pawn 0 at (8,4), bottom edge
  const moves = pawnMoves(s);
  // up, left, right — never off the bottom edge to row 9.
  assert.ok(has(moves, 7, 4));
  assert.ok(has(moves, 8, 3));
  assert.ok(has(moves, 8, 5));
  assert.equal(moves.length, 3);

  const s2 = movePawn(s, 7, 4);
  assert.deepEqual(s2.pawns[0], { r: 7, c: 4 });
  assert.equal(s2.turn, 1, 'turn passes after a move');
  // original state is untouched
  assert.deepEqual(s.pawns[0], { r: 8, c: 4 });
});

test('a wall between two cells blocks the step across it', () => {
  const s = newGame();
  assert.ok(has(pawnMoves(s), 7, 4), 'pawn 0 can step up before the wall');
  // Horizontal wall on the boundary between rows 7 and 8 at column 4.
  s.walls.h.add(wallKey(7, 4));
  const moves = pawnMoves(s);
  assert.ok(!has(moves, 7, 4), 'the up-step is now blocked');
  assert.ok(has(moves, 8, 3), 'sideways steps are still legal');
  assert.ok(has(moves, 8, 5));
});

test('canPlaceWall rejects a wall that would entomb a pawn (no path to goal)', () => {
  // Pawn 1 (goal row 8) sits in the top-left corner. A vertical wall at v(0,1)
  // seals its rightward escape; a horizontal wall at h(0,0) then seals BOTH
  // downward escapes, trapping it in the 2-cell pocket {(0,0),(0,1)}.
  const s = newGame();
  s.pawns[1] = { r: 0, c: 0 };

  // Same geometry, both times: only the path-BFS differs.
  assert.equal(canPlaceWall(s, 'h', 0, 0), true,
    'h(0,0) is fine while the rightward escape is open');

  s.walls.v.add(wallKey(0, 1)); // close the rightward escape
  assert.equal(canPlaceWall(s, 'h', 0, 0), false,
    'now h(0,0) would entomb pawn 1 — the path check must reject it');

  // A harmless wall elsewhere is still allowed.
  assert.equal(canPlaceWall(s, 'v', 4, 4), true);
});

test('canPlaceWall rejects overlapping and crossing walls', () => {
  const s = newGame();
  s.walls.h.add(wallKey(3, 3)); // occupies columns 3,4 on the row 3/4 boundary
  assert.equal(canPlaceWall(s, 'h', 3, 3), false, 'exact overlap');
  assert.equal(canPlaceWall(s, 'h', 3, 4), false, 'adjacent overlap (shares col 4)');
  assert.equal(canPlaceWall(s, 'h', 3, 2), false, 'adjacent overlap (shares col 3)');
  assert.equal(canPlaceWall(s, 'v', 3, 3), false, 'crossing the horizontal wall');
  assert.equal(canPlaceWall(s, 'h', 3, 5), true, 'two columns clear is fine');
});

test('a pawn may jump straight over an adjacent opponent', () => {
  const s = newGame();
  s.pawns[0] = { r: 4, c: 4 };
  s.pawns[1] = { r: 3, c: 4 }; // directly ahead of pawn 0 (toward row 0)
  s.turn = 0;
  const moves = pawnMoves(s);
  assert.ok(has(moves, 2, 4), 'jumps straight to the cell beyond the opponent');
  assert.ok(!has(moves, 3, 4), 'cannot land on the opponent itself');
});

test('a pawn jumps diagonally when a wall sits behind the opponent', () => {
  const s = newGame();
  s.pawns[0] = { r: 4, c: 4 };
  s.pawns[1] = { r: 3, c: 4 };
  s.turn = 0;
  // Wall on the boundary behind the opponent blocks the straight jump.
  s.walls.h.add(wallKey(2, 4));
  const moves = pawnMoves(s);
  assert.ok(!has(moves, 2, 4), 'straight jump is blocked');
  assert.ok(has(moves, 3, 3), 'diagonal jump to the left');
  assert.ok(has(moves, 3, 5), 'diagonal jump to the right');
});

test('winner triggers when a pawn reaches its goal row', () => {
  let s = newGame();
  s.pawns[0] = { r: 1, c: 4 };
  s.turn = 0;
  assert.equal(winner(s), null);
  const s0 = movePawn(s, 0, 4);
  assert.equal(winner(s0), 0, 'pawn 0 reaching row 0 wins');

  s = newGame();
  s.pawns[1] = { r: 7, c: 4 };
  s.turn = 1;
  const s1 = movePawn(s, 8, 4);
  assert.equal(winner(s1), 1, 'pawn 1 reaching row 8 wins');
});

test('placeWall passes the turn and spends a wall', () => {
  const s = newGame();
  assert.ok(canPlaceWall(s, 'h', 4, 4));
  const s2 = placeWall(s, 'h', 4, 4);
  assert.ok(s2.walls.h.has(wallKey(4, 4)));
  assert.deepEqual(s2.wallsLeft, [9, 10]);
  assert.equal(s2.turn, 1);
  assert.equal(s.walls.h.size, 0, 'original state untouched');
});

test('aiMove always returns a legal action', () => {
  const legal = (st, act) => {
    if (!act) return false;
    if (act.kind === 'move') return pawnMoves(st).some((m) => m.r === act.r && m.c === act.c);
    if (act.kind === 'wall') return canPlaceWall(st, act.type, act.r, act.c);
    return false;
  };
  // aiMove uses Math.random, so exercise it repeatedly.
  for (let i = 0; i < 100; i++) {
    const s = newGame();
    assert.ok(legal(s, aiMove(s)), 'fresh-game AI action is legal');
  }
  // And from a mid-game position with walls down.
  let g = newGame();
  g = placeWall(g, 'h', 5, 3);
  g = placeWall(g, 'v', 2, 2);
  for (let i = 0; i < 50; i++) assert.ok(legal(g, aiMove(g)));
});
