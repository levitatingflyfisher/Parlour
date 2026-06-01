// Minesweeper — pure logic. The board is a ROWS*COLS flat grid; a "model" is an
// immutable snapshot {mines, revealed, flagged, counts, dead}. Every operation
// returns a NEW model (the shared `counts` array is never mutated). Mine
// placement takes an injectable rng so games are reproducible and testable.

// NOTE: each constant is its own `export` so the single-file build bundler
// (build.mjs) — which captures one identifier per `export` — keeps all three.
export const ROWS = 9;
export const COLS = 9;
export const MINES = 10;

/// Indices of the (up to 8) cells orthogonally/diagonally adjacent to `idx`.
export function neighbours(idx) {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      out.push(nr * COLS + nc);
    }
  }
  return out;
}

/// counts[i] = number of mines adjacent to cell i (computed for every cell).
function buildCounts(mines) {
  const counts = new Array(ROWS * COLS).fill(0);
  for (let i = 0; i < counts.length; i++) {
    let n = 0;
    for (const j of neighbours(i)) if (mines.has(j)) n++;
    counts[i] = n;
  }
  return counts;
}

/// Start a fresh board with exactly MINES mines placed via `rng` (a () => [0,1)
/// function). When `firstSafeIndex` is given that cell is excluded from the
/// candidate pool, so the first reveal can never be a mine. A partial
/// Fisher-Yates shuffle guarantees MINES *distinct* mines.
export function newGame(rng, firstSafeIndex = null) {
  const total = ROWS * COLS;
  const cells = [];
  for (let i = 0; i < total; i++) if (i !== firstSafeIndex) cells.push(i);
  for (let i = 0; i < MINES && i < cells.length; i++) {
    const j = i + Math.floor(rng() * (cells.length - i));
    const tmp = cells[i];
    cells[i] = cells[j];
    cells[j] = tmp;
  }
  const mines = new Set(cells.slice(0, MINES));
  return {
    mines,
    revealed: new Set(),
    flagged: new Set(),
    counts: buildCounts(mines),
    dead: false,
  };
}

/// Reveal `idx`, returning a NEW model. Revealing a mine sets `dead`. Revealing
/// a zero-count cell flood-fills its connected zero region plus the numbered
/// border around it. Revealing an already-open, flagged, or dead-board cell is
/// a no-op (returns an equivalent fresh model).
export function reveal(model, idx) {
  if (model.dead || model.revealed.has(idx) || model.flagged.has(idx)) {
    return model;
  }
  if (model.mines.has(idx)) {
    const revealed = new Set(model.revealed);
    revealed.add(idx);
    return { ...model, revealed, dead: true };
  }
  const revealed = new Set(model.revealed);
  const stack = [idx];
  while (stack.length) {
    const c = stack.pop();
    if (revealed.has(c) || model.mines.has(c)) continue;
    revealed.add(c);
    if (model.counts[c] === 0) {
      for (const n of neighbours(c)) if (!revealed.has(n)) stack.push(n);
    }
  }
  // A revealed cell can't stay flagged.
  const flagged = new Set([...model.flagged].filter((f) => !revealed.has(f)));
  return { ...model, revealed, flagged };
}

/// Toggle a flag on `idx`, returning a NEW model. Flagging an already-revealed
/// cell (or acting on a dead board) is a no-op.
export function toggleFlag(model, idx) {
  if (model.dead || model.revealed.has(idx)) return model;
  const flagged = new Set(model.flagged);
  if (flagged.has(idx)) flagged.delete(idx);
  else flagged.add(idx);
  return { ...model, flagged };
}

/// Won when the board is alive and every non-mine cell has been revealed.
export function isWon(model) {
  if (model.dead) return false;
  for (let i = 0; i < ROWS * COLS; i++) {
    if (!model.mines.has(i) && !model.revealed.has(i)) return false;
  }
  return true;
}
