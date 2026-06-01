import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, CODE_LEN, MAX_GUESSES, secret, score, isWin } from '../games/mastermind.mjs';

// A deterministic rng that yields a fixed sequence of values in [0,1), looping.
function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('constants: 6 colours, 4 pegs, 10 guesses', () => {
  assert.equal(CODE_LEN, 4);
  assert.equal(MAX_GUESSES, 10);
  assert.equal(COLORS.length, 6);
  assert.deepEqual(COLORS, ['r', 'o', 'y', 'g', 'b', 'p']);
  assert.equal(new Set(COLORS).size, 6, 'colour keys are distinct');
});

test('identical guess scores {black:4, white:0}', () => {
  const code = ['r', 'o', 'y', 'g'];
  assert.deepEqual(score(['r', 'o', 'y', 'g'], code), { black: 4, white: 0 });
});

test('all-wrong guess scores {black:0, white:0}', () => {
  // No colour shared at all.
  assert.deepEqual(score(['g', 'g', 'g', 'g'], ['r', 'r', 'r', 'r']), { black: 0, white: 0 });
  assert.deepEqual(score(['b', 'b', 'p', 'p'], ['r', 'r', 'o', 'o']), { black: 0, white: 0 });
});

test('classic duplicate case: code [r,r,g,b] vs guess [r,g,g,r] → {black:2, white:1}', () => {
  // By hand: exact matches at index 0 (r) and index 2 (g) → black 2.
  // Remaining code pegs {r (idx1), b (idx3)}; remaining guess pegs {g (idx1), r (idx3)}.
  // Only colour r overlaps among the leftovers → white 1. (g and b do not match.)
  assert.deepEqual(score(['r', 'g', 'g', 'r'], ['r', 'r', 'g', 'b']), { black: 2, white: 1 });
});

test('white never double-counts a peg (more of a colour in the guess than the code)', () => {
  // code has a single r; guess floods r's. Index 0 is exact, so the other three
  // r's in the guess have no remaining r in the code to match → white 0.
  assert.deepEqual(score(['r', 'r', 'r', 'r'], ['r', 'g', 'b', 'y']), { black: 1, white: 0 });
  // code has a single r; guess has two r's, neither in the r position → exactly
  // one white, not two.
  assert.deepEqual(score(['r', 'r', 'o', 'o'], ['g', 'r', 'b', 'b']), { black: 1, white: 0 });
});

test('another duplicate case worked by hand: code [r,r,b,y] vs guess [g,r,r,r] → {black:1, white:1}', () => {
  // Exact at index 1 (r) → black 1. Leftover code {r (idx0), b (idx2), y (idx3)},
  // leftover guess {g (idx0), r (idx2), r (idx3)}. Colour r: min(2 in guess, 1 in
  // code) = 1 white. No others overlap → white 1.
  assert.deepEqual(score(['g', 'r', 'r', 'r'], ['r', 'r', 'b', 'y']), { black: 1, white: 1 });
});

test('all-white: same multiset, every peg displaced → {black:0, white:4}', () => {
  assert.deepEqual(score(['o', 'r', 'g', 'b'], ['r', 'o', 'b', 'g']), { black: 0, white: 4 });
});

test('black + white never exceeds CODE_LEN across many pairings', () => {
  const cases = [
    [['r', 'r', 'r', 'o'], ['r', 'o', 'r', 'r']],
    [['p', 'b', 'g', 'y'], ['y', 'g', 'b', 'p']],
    [['r', 'o', 'r', 'o'], ['o', 'r', 'o', 'r']],
    [['r', 'r', 'r', 'r'], ['r', 'r', 'o', 'o']],
    [['g', 'b', 'p', 'y'], ['g', 'b', 'p', 'y']],
  ];
  for (const [guess, code] of cases) {
    const { black, white } = score(guess, code);
    assert.ok(black >= 0 && white >= 0, 'pegs are non-negative');
    assert.ok(black + white <= CODE_LEN, `${black}+${white} <= ${CODE_LEN}`);
  }
});

test('score is symmetric: swapping guess and code yields the same result', () => {
  const a = ['r', 'g', 'g', 'r'];
  const b = ['r', 'r', 'g', 'b'];
  assert.deepEqual(score(a, b), score(b, a));
});

test('isWin only when black === CODE_LEN', () => {
  assert.equal(isWin({ black: 4, white: 0 }), true);
  assert.equal(isWin({ black: 3, white: 1 }), false);
  assert.equal(isWin({ black: 0, white: 4 }), false);
  assert.equal(isWin(score(['r', 'o', 'y', 'g'], ['r', 'o', 'y', 'g'])), true);
});

test('secret: length CODE_LEN, every peg a valid colour, repeats allowed', () => {
  const code = secret();
  assert.equal(code.length, CODE_LEN);
  for (const c of code) assert.ok(COLORS.includes(c), `${c} is a valid colour`);
});

test('secret with a fixed rng is deterministic', () => {
  // rng -> 0 always picks the first colour.
  assert.deepEqual(secret(() => 0), ['r', 'r', 'r', 'r']);
  // rng -> 0.999999 always picks the last colour.
  assert.deepEqual(secret(() => 0.999999), ['p', 'p', 'p', 'p']);
  // A fixed sequence maps through floor(v * 6): 0→0(r), 0.2→1(o), 0.5→3(g), 0.99→5(p).
  assert.deepEqual(secret(seqRng([0, 0.2, 0.5, 0.99])), ['r', 'o', 'g', 'p']);
  // Same rng sequence -> same code, every time.
  assert.deepEqual(secret(seqRng([0.4, 0.4, 0.4, 0.4])), secret(seqRng([0.4, 0.4, 0.4, 0.4])));
});
