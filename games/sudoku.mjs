// Sudoku — pure logic, no DOM. A grid is a flat Int[81] (row-major), 0 = blank,
// 1..9 = filled. All functions are side-effect free: solvers/generators work on
// copies and never mutate their input. `generate` takes an injectable rng
// (a () => [0,1) function) so puzzles are reproducible and testable.
//
// NOTE: every public name is its own top-level `export function` so the
// single-file build bundler (build.mjs) — which captures one identifier per
// `export` — keeps them all under the SUDOKU namespace.

/// Index of the first empty (0) cell, or -1 if the grid is full.
function firstEmpty(g) {
  for (let i = 0; i < 81; i++) if (g[i] === 0) return i;
  return -1;
}

/// Minimum-remaining-values heuristic: among empty cells, return the one with
/// the fewest legal candidates as { idx, cands }, or null when the grid is
/// full. Returning a cell with 0 candidates lets the solver prune dead ends
/// immediately; a single-candidate cell is a forced move. This keeps even
/// 17-clue / hard-difficulty solving in milliseconds rather than seconds.
function pickCell(g) {
  let best = -1;
  let bestCands = null;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const cands = [];
    for (let v = 1; v <= 9; v++) if (isValidPlacement(g, i, v)) cands.push(v);
    if (best === -1 || cands.length < bestCands.length) {
      best = i;
      bestCands = cands;
      if (cands.length <= 1) break; // can't do better than 0 or 1 candidate
    }
  }
  return best === -1 ? null : { idx: best, cands: bestCands };
}

/// Fisher-Yates copy, shuffled with the injected rng.
function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/// True if placing `value` (1..9) at `idx` breaks no row/column/box rule. The
/// cell at `idx` is ignored, so this answers "may `value` go here?" regardless
/// of what currently occupies the cell.
export function isValidPlacement(grid, idx, value) {
  const r = Math.floor(idx / 9);
  const c = idx % 9;
  for (let k = 0; k < 9; k++) {
    const ri = r * 9 + k;
    if (ri !== idx && grid[ri] === value) return false; // row
    const ci = k * 9 + c;
    if (ci !== idx && grid[ci] === value) return false; // column
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const bi = (br + dr) * 9 + (bc + dc);
      if (bi !== idx && grid[bi] === value) return false; // 3x3 box
    }
  }
  return true;
}

function solveInPlace(g) {
  const pick = pickCell(g);
  if (pick === null) return true; // full grid
  for (const v of pick.cands) {
    g[pick.idx] = v;
    if (solveInPlace(g)) return true;
    g[pick.idx] = 0;
  }
  return false;
}

/// Solve `grid`, returning a NEW solved Int[81] or null if unsolvable. The
/// input is never mutated.
export function solve(grid) {
  const g = grid.slice();
  return solveInPlace(g) ? g : null;
}

/// Count solutions of `grid`, stopping once `cap` is reached (default 2 — just
/// enough to test uniqueness). Returns 0 (unsolvable), 1 (unique), or `cap`.
export function countSolutions(grid, cap = 2) {
  const g = grid.slice();
  let count = 0;
  (function rec() {
    if (count >= cap) return;
    const pick = pickCell(g);
    if (pick === null) {
      count++;
      return;
    }
    for (const v of pick.cands) {
      g[pick.idx] = v;
      rec();
      g[pick.idx] = 0;
      if (count >= cap) return;
    }
  })();
  return count;
}

/// Set of indices currently violating a row/column/box constraint. Both members
/// of any duplicate pair are flagged. Empty (0) cells are never flagged.
export function conflicts(grid) {
  const out = new Set();
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (!v) continue;
    const r = Math.floor(i / 9);
    const c = i % 9;
    let bad = false;
    for (let k = 0; k < 9 && !bad; k++) {
      const ri = r * 9 + k;
      if (ri !== i && grid[ri] === v) bad = true;
      const ci = k * 9 + c;
      if (ci !== i && grid[ci] === v) bad = true;
    }
    if (!bad) {
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3 && !bad; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const bi = (br + dr) * 9 + (bc + dc);
          if (bi !== i && grid[bi] === v) {
            bad = true;
            break;
          }
        }
      }
    }
    if (bad) out.add(i);
  }
  return out;
}

/// True only when every cell is filled (1..9) and no constraint is violated.
export function isComplete(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] < 1 || grid[i] > 9) return false;
  }
  return conflicts(grid).size === 0;
}

function fillGrid(g, rng) {
  const idx = firstEmpty(g);
  if (idx === -1) return true;
  for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
    if (isValidPlacement(g, idx, v)) {
      g[idx] = v;
      if (fillGrid(g, rng)) return true;
      g[idx] = 0;
    }
  }
  return false;
}

// Target clue counts. Fewer clues == harder. These are floors we try to reach
// by greedy removal; the result may end slightly above the target when no more
// cells can be removed while keeping the solution unique.
const CLUE_TARGETS = { easy: 40, medium: 32, hard: 28 };

/// Build a puzzle: a randomly-completed solution, then cells removed (set to 0)
/// in random order — keeping each removal only while the puzzle still has a
/// UNIQUE solution — down to the difficulty's clue target. Returns
/// { puzzle, solution, givens } where givens[i] is true for every clue and,
/// by construction, puzzle[i] === solution[i] wherever givens[i].
export function generate(rng, difficulty) {
  const solution = new Array(81).fill(0);
  fillGrid(solution, rng);

  const puzzle = solution.slice();
  const target = CLUE_TARGETS[difficulty] ?? CLUE_TARGETS.medium;
  let clues = 81;
  for (const i of shuffled([...Array(81).keys()], rng)) {
    if (clues <= target) break;
    if (puzzle[i] === 0) continue;
    const saved = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = saved; // removal would create ambiguity — put it back
  }

  const givens = puzzle.map((v) => v !== 0);
  return { puzzle, solution, givens };
}
