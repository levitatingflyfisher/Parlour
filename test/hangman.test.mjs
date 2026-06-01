import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, pickWord, revealed, isWon, wrongGuesses, MAX_WRONG } from '../games/hangman.mjs';

test('WORDS is a bundle of family-friendly lowercase words, 4–8 letters', () => {
  assert.ok(WORDS.length >= 60);
  for (const w of WORDS) {
    assert.match(w, /^[a-z]{4,8}$/, `"${w}" should be 4–8 lowercase letters`);
  }
  assert.equal(new Set(WORDS).size, WORDS.length, 'no duplicate words');
});

test('revealed masks unguessed letters and shows guessed ones', () => {
  assert.equal(revealed('apple', new Set(['a', 'p'])), 'a p p _ _');
  assert.equal(revealed('apple', new Set()), '_ _ _ _ _');
  assert.equal(revealed('apple', new Set(['a', 'p', 'l', 'e'])), 'a p p l e');
});

test('isWon is true only when every letter is guessed', () => {
  // "apple" has distinct letters a, p, l, e.
  assert.equal(isWon('apple', new Set(['a', 'p', 'l', 'e'])), true);
  assert.equal(isWon('apple', new Set(['a', 'p', 'l'])), false);
  assert.equal(isWon('apple', new Set()), false);
  // Extra guessed letters don't break a win.
  assert.equal(isWon('apple', new Set(['a', 'p', 'l', 'e', 'z'])), true);
});

test('wrongGuesses lists only letters not in the word, in guess order', () => {
  assert.deepEqual(wrongGuesses('apple', new Set(['a', 'x', 'p', 'z'])), ['x', 'z']);
  assert.deepEqual(wrongGuesses('apple', new Set(['a', 'p', 'l', 'e'])), []);
  assert.deepEqual(wrongGuesses('apple', new Set()), []);
});

test('MAX_WRONG is 6', () => {
  assert.equal(MAX_WRONG, 6);
});

test('pickWord with a fixed rng returns a deterministic word from WORDS', () => {
  assert.equal(pickWord(() => 0), WORDS[0]);
  assert.equal(pickWord(() => 0.999999), WORDS[WORDS.length - 1]);
  assert.equal(pickWord(() => 0.5), WORDS[Math.floor(0.5 * WORDS.length)]);
  // Same rng sequence -> same word, every time.
  const rng = () => 0.42;
  assert.equal(pickWord(rng), pickWord(rng));
  assert.ok(WORDS.includes(pickWord(() => 0.73)));
});
