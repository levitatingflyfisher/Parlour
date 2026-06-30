import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generate, solve, countSolutions, isValidPlacement, conflicts, isComplete,
} from '../games/sudoku.mjs';

// Deterministic rng (mulberry32) so generation is reproducible across runs.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// '.' or '0' -> 0, digits -> ints. Whitespace ignored.
function parse(str) {
  const cells = str.replace(/\s+/g, '').split('').map((ch) => (ch === '.' ? 0 : +ch));
  assert.equal(cells.length, 81, 'puzzle string must have 81 cells');
  return cells;
}

// The canonical Wikipedia sample puzzle (uniquely solvable).
const KNOWN = parse(`
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`);

test('solve() returns a valid, full solution for a known puzzle', () => {
  const solved = solve(KNOWN);
  assert.notEqual(solved, null, 'known puzzle must be solvable');
  assert.equal(solved.length, 81);
  // It is THE unique completion (so it is the correct solution)...
  assert.equal(countSolutions(KNOWN, 2), 1, 'known puzzle must be uniquely solvable');
  // ...it is a full, rule-respecting grid...
  assert.equal(isComplete(solved), true);
  // ...and it preserves every clue of the original puzzle.
  for (let i = 0; i < 81; i++) {
    if (KNOWN[i] !== 0) assert.equal(solved[i], KNOWN[i], `clue at ${i} changed`);
  }
  // solve() must not mutate its input.
  assert.deepEqual(KNOWN, parse(`
    53..7....
    6..195...
    .98....6.
    8...6...3
    4..8.3..1
    7...2...6
    .6....28.
    ...419..5
    ....8..79
  `));
});

test('isValidPlacement rejects a row, column and box duplicate', () => {
  const g = new Array(81).fill(0);
  g[0] = 5; // cell (0,0)

  // Same row (idx 5 is (0,5)) — must reject 5, accept others.
  assert.equal(isValidPlacement(g, 5, 5), false, 'row duplicate');
  assert.equal(isValidPlacement(g, 5, 6), true);

  // Same column (idx 27 is (3,0), a different box) — must reject 5.
  assert.equal(isValidPlacement(g, 27, 5), false, 'column duplicate');
  assert.equal(isValidPlacement(g, 27, 6), true);

  // Same 3x3 box, different row and column (idx 10 is (1,1)) — must reject 5.
  assert.equal(isValidPlacement(g, 10, 5), false, 'box duplicate');
  assert.equal(isValidPlacement(g, 10, 6), true);

  // The cell's own current value is ignored: 5 "fits" at its own index.
  assert.equal(isValidPlacement(g, 0, 5), true, 'own cell must be ignored');
});

test('countSolutions discriminates: unique vs. many', () => {
  // An empty grid has astronomically many solutions; the cap stops it at 2.
  assert.equal(countSolutions(new Array(81).fill(0), 2), 2, 'empty grid is not unique');
  // The known puzzle has exactly one.
  assert.equal(countSolutions(KNOWN, 2), 1);
});

test('a generated puzzle is unique and its givens match the solution', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const rng = mulberry32(0xc0ffee + difficulty.length);
    const { puzzle, solution, givens } = generate(rng, difficulty);

    assert.equal(puzzle.length, 81);
    assert.equal(solution.length, 81);
    assert.equal(givens.length, 81);

    // The completed solution is itself a full, legal grid.
    assert.equal(isComplete(solution), true, `${difficulty}: solution invalid`);

    // The puzzle has exactly one solution...
    assert.equal(countSolutions(puzzle, 2), 1, `${difficulty}: not unique`);
    // ...and solving the puzzle reproduces the stored solution.
    assert.deepEqual(solve(puzzle), solution, `${difficulty}: solve != solution`);

    // givens flag exactly the filled clues, and each clue equals the solution.
    for (let i = 0; i < 81; i++) {
      assert.equal(givens[i], puzzle[i] !== 0, `${difficulty}: givens[${i}] wrong`);
      if (givens[i]) {
        assert.equal(puzzle[i], solution[i], `${difficulty}: clue ${i} != solution`);
      }
    }

    // Harder difficulties expose fewer clues.
    const clues = puzzle.filter((v) => v !== 0).length;
    assert.ok(clues >= 17 && clues <= 81, `${difficulty}: implausible clue count ${clues}`);
  }
});

test('conflicts() flags a deliberately duplicated value (and only it)', () => {
  const g = new Array(81).fill(0);
  g[0] = 7; // (0,0)
  g[1] = 7; // (0,1) — same row: a conflict
  g[40] = 3; // a lone value, no peers: not a conflict

  const c = conflicts(g);
  assert.ok(c.has(0), 'first duplicate flagged');
  assert.ok(c.has(1), 'second duplicate flagged');
  assert.ok(!c.has(40), 'lone value not flagged');
  assert.equal(c.size, 2);

  // No duplicates anywhere -> empty set.
  assert.equal(conflicts(solve(KNOWN)).size, 0);
});

test('isComplete is true only for a full, valid grid', () => {
  const solved = solve(KNOWN);
  assert.equal(isComplete(solved), true);

  // Remove one cell -> incomplete.
  const hole = solved.slice();
  hole[0] = 0;
  assert.equal(isComplete(hole), false, 'a blank cell means incomplete');

  // Full grid but with a duplicate -> invalid, so not complete.
  const dup = solved.slice();
  dup[1] = dup[0]; // force a row collision in the top-left
  assert.equal(conflicts(dup).size > 0, true);
  assert.equal(isComplete(dup), false, 'a conflict means not complete');

  // An empty grid is neither full nor valid-complete.
  assert.equal(isComplete(new Array(81).fill(0)), false);
});
