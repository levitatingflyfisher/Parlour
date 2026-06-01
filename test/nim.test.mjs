import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialHeaps, isOver, take, legalTakes, bestMove } from '../games/nim.mjs';

const xor = (heaps) => heaps.reduce((a, n) => a ^ n, 0);

test('initialHeaps is [3, 5, 7]', () => {
  assert.deepEqual(initialHeaps(), [3, 5, 7]);
});

test('take removes the given count from the chosen heap', () => {
  assert.deepEqual(take([3, 5, 7], 1, 2), [3, 3, 7]);
  assert.deepEqual(take([3, 5, 7], 0, 3), [0, 5, 7]);
  assert.deepEqual(take([3, 5, 7], 2, 7), [3, 5, 0]);
});

test('take returns a new array, leaving the original untouched', () => {
  const heaps = [3, 5, 7];
  const next = take(heaps, 2, 1);
  assert.deepEqual(heaps, [3, 5, 7]);
  assert.deepEqual(next, [3, 5, 6]);
});

test('take rejects illegal counts and indices', () => {
  assert.equal(take([3, 5, 7], 1, 6), null);   // more than the heap holds
  assert.equal(take([3, 5, 7], 1, 0), null);   // must take at least one
  assert.equal(take([3, 5, 7], 1, -1), null);  // negative
  assert.equal(take([3, 5, 7], 1, 1.5), null); // non-integer
  assert.equal(take([3, 5, 7], 5, 1), null);   // index out of range
  assert.equal(take([3, 5, 7], -1, 1), null);  // negative index
  assert.equal(take([0, 5, 7], 0, 1), null);   // empty heap
});

test('isOver is true only when every heap is empty', () => {
  assert.equal(isOver([0, 0, 0]), true);
  assert.equal(isOver([]), true);
  assert.equal(isOver([0, 0, 1]), false);
  assert.equal(isOver([3, 5, 7]), false);
});

test('legalTakes lists every non-empty heap with its max', () => {
  assert.deepEqual(legalTakes([3, 0, 7]), [{ heap: 0, max: 3 }, { heap: 2, max: 7 }]);
  assert.deepEqual(legalTakes([0, 0, 0]), []);
});

test('bestMove from a non-zero nim-sum makes the XOR zero (the winning move)', () => {
  for (const heaps of [[3, 5, 7], [1, 2, 3, 4], [5, 0, 0], [1, 4, 5, 6], [9, 5, 2]]) {
    assert.notEqual(xor(heaps), 0, `precondition: ${heaps} has a non-zero nim-sum`);
    const { heap, count } = bestMove(heaps);
    const next = take(heaps, heap, count);
    assert.ok(next !== null, `best move on ${heaps} must be legal`);
    assert.equal(xor(next), 0, `XOR should be zero after the best move from ${heaps}`);
  }
});

test('bestMove from a zero nim-sum still returns a legal move', () => {
  const heaps = [1, 1];
  assert.equal(xor(heaps), 0);
  const { heap, count } = bestMove(heaps);
  const next = take(heaps, heap, count);
  assert.ok(next !== null, 'a legal move must exist while heaps remain');
});
