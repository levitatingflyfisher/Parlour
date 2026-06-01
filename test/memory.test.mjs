import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDeck } from '../games/memory.mjs';

const mkRng = (seq) => { let i = 0; return () => seq[i++ % seq.length]; };

test('newDeck has exactly two of every symbol', () => {
  const deck = newDeck(['🍎', '🍌', '🍇'], mkRng([0]));
  assert.equal(deck.length, 6);
  const counts = {};
  for (const c of deck) counts[c.sym] = (counts[c.sym] || 0) + 1;
  assert.deepEqual(counts, { '🍎': 2, '🍌': 2, '🍇': 2 });
});

test('every card has a unique id', () => {
  const deck = newDeck(['a', 'b'], mkRng([0]));
  assert.equal(new Set(deck.map((c) => c.id)).size, deck.length);
});

test('newDeck is deterministic for the same rng sequence', () => {
  const seq = [0.1, 0.4, 0.7, 0.2, 0.9, 0.3];
  const a = newDeck(['a', 'b', 'c'], mkRng(seq.slice()));
  const b = newDeck(['a', 'b', 'c'], mkRng(seq.slice()));
  assert.deepEqual(a.map((c) => c.sym), b.map((c) => c.sym));
});
