import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORD_LEN,
  MAX_GUESSES,
  ANSWERS,
  ALLOWED,
  dailyAnswer,
  isAllowed,
  score,
} from '../games/wordle.mjs';

test('constants are the standard Wordle shape', () => {
  assert.equal(WORD_LEN, 5);
  assert.equal(MAX_GUESSES, 6);
});

test('a fully correct guess scores five correct', () => {
  assert.deepEqual(score('crane', 'crane'), ['correct', 'correct', 'correct', 'correct', 'correct']);
});

test('all-absent when no letters overlap', () => {
  // guess shares no letter with the answer.
  assert.deepEqual(score('fghij', 'crane'), ['absent', 'absent', 'absent', 'absent', 'absent']);
});

test('duplicate-letter rule: answer "abbey" guess "kebab"', () => {
  // answer a-b-b-e-y has exactly two b's, one a, one e, one y.
  // guess  k-e-b-a-b
  //   k (idx0): not in answer            -> absent
  //   e (idx1): answer has an e          -> present
  //   b (idx2): exact match              -> correct (claims one of the two b's)
  //   a (idx3): answer has an a          -> present
  //   b (idx4): one b still unclaimed    -> present (claims the second b)
  // Both guessed b's are accounted for (one correct, one present); none spill to absent.
  assert.deepEqual(score('kebab', 'abbey'), ['absent', 'present', 'correct', 'present', 'present']);
});

test('duplicate-letter exhaustion: extra copies fall to absent', () => {
  // answer "abbey" has two b's. guess "bobby" has THREE b's (idx 0,2,3).
  //   b (idx0): a b is available         -> present
  //   o (idx1): not in answer            -> absent
  //   b (idx2): exact match              -> correct (claims one b)
  //   b (idx3): both b's now claimed     -> absent  <-- exhausted
  //   y (idx4): exact match              -> correct
  assert.deepEqual(score('bobby', 'abbey'), ['present', 'absent', 'correct', 'absent', 'correct']);
});

test('present is awarded left-to-right while copies last', () => {
  // answer "allow" a-l-l-o-w has two l's. guess "lilly" l-i-l-l-y has three l's (idx 0,2,3).
  //   l (idx0): not an exact match, but a copy is free -> present (claims one l)
  //   i (idx1): not in answer                          -> absent
  //   l (idx2): exact match                            -> correct (claims the other l)
  //   l (idx3): both l's now claimed                   -> absent
  //   y (idx4): not in answer                          -> absent
  assert.deepEqual(score('lilly', 'allow'), ['present', 'absent', 'correct', 'absent', 'absent']);
});

test('score is case-insensitive', () => {
  assert.deepEqual(score('CRANE', 'crane'), ['correct', 'correct', 'correct', 'correct', 'correct']);
});

test('isAllowed accepts any 5-letter word, rejects wrong shapes', () => {
  for (const w of ANSWERS) assert.equal(isAllowed(w), true, `${w} should be allowed`);
  assert.equal(isAllowed('hello'), true); // common word that isn't in the curated list
  assert.equal(isAllowed('GREAT'), true); // case-insensitive
  assert.equal(isAllowed('zzzzz'), true); // lenient on purpose — never reject a real word
  assert.equal(isAllowed('cat'), false); // too short
  assert.equal(isAllowed('lovely'), false); // too long
  assert.equal(isAllowed('hell!'), false); // non-letters
});

test('the allowed set is a superset of the answers and larger', () => {
  for (const w of ANSWERS) assert.equal(ALLOWED.has(w), true);
  assert.ok(ALLOWED.size > ANSWERS.length, 'ALLOWED must add words beyond the answers');
});

test('every bundled word is exactly five lowercase letters', () => {
  for (const w of ALLOWED) assert.match(w, /^[a-z]{5}$/, `${w} is not five lowercase letters`);
});

test('dailyAnswer is deterministic per seed and always a valid answer', () => {
  assert.equal(dailyAnswer(20260629), dailyAnswer(20260629));
  for (const seed of [1, 2, 20260101, 20260629, 19991231, 20301225]) {
    const w = dailyAnswer(seed);
    assert.equal(w.length, 5);
    assert.ok(ANSWERS.includes(w), `${w} should be drawn from ANSWERS`);
  }
});
