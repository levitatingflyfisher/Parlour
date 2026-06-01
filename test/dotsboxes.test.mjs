import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOTS, BOXES, newGame, legalEdges, claimEdge, isOver, winner, bestMove,
} from '../games/dotsboxes.mjs';

const N = DOTS - 1; // boxes per side; h-edge index = r*N+c, v-edge index = r*DOTS+c

// Box 0 (top-left) sides: top h[0], bottom h[N], left v[0], right v[1].

test('newGame is an empty 4×4 board, player 0 to move', () => {
  const m = newGame();
  assert.equal(m.h.length, DOTS * N);
  assert.equal(m.v.length, N * DOTS);
  assert.equal(m.owner.length, N * N);
  assert.equal(m.owner.every((o) => o === null), true);
  assert.equal(m.turn, 0);
  assert.deepEqual(m.scores, [0, 0]);
  assert.equal(legalEdges(m).length, m.h.length + m.v.length);
});

test('completing the 4th side of a box claims it and keeps the same turn', () => {
  const m = newGame();
  m.h[0] = true;   // box 0 top
  m.h[N] = true;   // box 0 bottom
  m.v[0] = true;   // box 0 left  → box 0 now has 3 sides, only right (v[1]) open
  m.turn = 0;
  const r = claimEdge(m, 'v', 1);
  assert.equal(r.owner[0], 0);   // box claimed by player 0
  assert.equal(r.turn, 0);       // same player moves again
  assert.deepEqual(r.scores, [1, 0]);
  // input not mutated
  assert.equal(m.v[1], false);
});

test('one edge can close two boxes at once (and still keep the turn)', () => {
  const m = newGame();
  // box 0 = three sides drawn except the shared edge v[1]
  m.h[0] = true; m.h[N] = true; m.v[0] = true;
  // box 1 (top, second column) = three sides except the shared edge v[1]
  m.h[1] = true; m.h[N + 1] = true; m.v[2] = true;
  m.turn = 1;
  const r = claimEdge(m, 'v', 1); // shared between box 0 and box 1
  assert.equal(r.owner[0], 1);
  assert.equal(r.owner[1], 1);
  assert.deepEqual(r.scores, [0, 2]);
  assert.equal(r.turn, 1);
});

test('drawing a neutral edge completes nothing and passes the turn', () => {
  const m = newGame(); // player 0 to move
  const r = claimEdge(m, 'h', 0);
  assert.equal(r.turn, 1);
  assert.equal(r.owner.every((o) => o === null), true);
  assert.deepEqual(r.scores, [0, 0]);
});

test('isOver / winner on a finished board: majority, draw, and not-yet-over', () => {
  assert.equal(isOver(newGame()), false);
  assert.equal(winner(newGame()), null);

  const win = newGame();
  win.h.fill(true); win.v.fill(true);
  for (let i = 0; i < BOXES; i++) win.owner[i] = i < 9 ? 0 : 1; // 9 vs 7
  assert.equal(isOver(win), true);
  assert.equal(winner(win), 0);

  const tie = newGame();
  tie.h.fill(true); tie.v.fill(true);
  for (let i = 0; i < BOXES; i++) tie.owner[i] = i < BOXES / 2 ? 0 : 1; // 8 vs 8
  assert.equal(winner(tie), 'draw');
});

test('bestMove takes a free box when one is available', () => {
  const m = newGame();
  m.h[0] = true; m.h[N] = true; m.v[0] = true; // box 0 at 3 sides, missing v[1]
  const mv = bestMove(m);
  assert.deepEqual(mv, { type: 'v', index: 1 });
  assert.equal(claimEdge(m, mv.type, mv.index).owner[0], m.turn);
});

test('bestMove avoids handing a box its 3rd side when it can', () => {
  const m = newGame();
  m.h[0] = true; m.v[0] = true; // box 0 at 2 sides; v[1] or h[N] would make it 3
  const mv = bestMove(m);
  const givesThird = (mv.type === 'v' && mv.index === 1) || (mv.type === 'h' && mv.index === N);
  assert.equal(givesThird, false);
});
