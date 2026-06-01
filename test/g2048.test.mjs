import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slideLine, move, canMove, won, spawn } from '../games/g2048.mjs';

test('slideLine packs and merges one equal pair', () => {
  assert.deepEqual(slideLine([2, 2, 4, null]), { line: [4, 4, null, null], gained: 4 });
});

test('slideLine merges two pairs but never twice in one slide', () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), { line: [4, 4, null, null], gained: 8 });
  assert.deepEqual(slideLine([4, null, 4, 8]), { line: [8, 8, null, null], gained: 8 });
});

test('slideLine packs toward the front', () => {
  assert.deepEqual(slideLine([null, null, 2, 2]), { line: [4, null, null, null], gained: 4 });
});

test('slideLine leaves an unmergeable line unchanged with no gain', () => {
  assert.deepEqual(slideLine([2, 4, 8, 16]), { line: [2, 4, 8, 16], gained: 0 });
});

test('move(left) slides every row toward the left', () => {
  const grid = [
    2, 2, null, null,
    4, null, 4, null,
    null, null, null, 2,
    8, 8, 8, 8,
  ];
  const r = move(grid, 'left');
  assert.deepEqual(r.grid.slice(0, 4), [4, null, null, null]);
  assert.deepEqual(r.grid.slice(4, 8), [8, null, null, null]);
  assert.deepEqual(r.grid.slice(8, 12), [2, null, null, null]);
  assert.deepEqual(r.grid.slice(12, 16), [16, 16, null, null]);
  assert.equal(r.moved, true);
  assert.equal(r.gained, 4 + 8 + 16 + 16);
});

test('move reports moved:false when the slide changes nothing', () => {
  const grid = [
    2, 4, 8, 16,
    null, null, null, null,
    null, null, null, null,
    null, null, null, null,
  ];
  assert.equal(move(grid, 'left').moved, false);
});

test('canMove is false on a full board with no merges, true otherwise', () => {
  const locked = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2,
  ];
  assert.equal(canMove(locked), false);
  const mergeable = locked.slice(); mergeable[15] = 4; // bottom-right now equals its left neighbour
  assert.equal(canMove(mergeable), true);
});

test('won detects a 2048 tile', () => {
  const grid = Array(16).fill(null); grid[5] = 2048;
  assert.equal(won(grid), true);
});

test('spawn places a tile in the only empty cell', () => {
  const grid = Array(16).fill(2); grid[7] = null;
  const out = spawn(grid, () => 0); // rng->0 picks first empty + value 2
  assert.equal(out[7], 2);
  assert.equal(out.filter((x) => x == null).length, 0);
});
