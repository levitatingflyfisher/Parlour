// 2048 — pure logic. Grid is a flat 16-array (4x4), null for empty. Slides and
// merges are computed here; spawning takes an injectable rng so it's testable.
const G = 4;

/// Slide one length-4 line toward the front, merging each pair at most once.
export function slideLine(line) {
  const vals = line.filter((x) => x != null);
  const out = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const merged = vals[i] * 2;
      out.push(merged);
      gained += merged;
      i++; // consume the partner so it can't merge again
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < G) out.push(null);
  return { line: out, gained };
}

function lineIndices(dir) {
  const lines = [];
  for (let i = 0; i < G; i++) {
    const row = [];
    for (let j = 0; j < G; j++) {
      if (dir === 'left') row.push(i * G + j);
      else if (dir === 'right') row.push(i * G + (G - 1 - j));
      else if (dir === 'up') row.push(j * G + i);
      else row.push((G - 1 - j) * G + i); // down
    }
    lines.push(row);
  }
  return lines;
}

/// Apply a move in `dir` ('left'|'right'|'up'|'down'). Returns the new grid,
/// the points gained, and whether anything actually shifted.
export function move(grid, dir) {
  const next = grid.slice();
  let gained = 0;
  let moved = false;
  for (const idxs of lineIndices(dir)) {
    const before = idxs.map((i) => next[i]);
    const { line, gained: g } = slideLine(before);
    gained += g;
    idxs.forEach((i, k) => { next[i] = line[k]; });
    if (before.some((v, k) => v !== line[k])) moved = true;
  }
  return { grid: next, gained, moved };
}

export function canMove(grid) {
  if (grid.some((x) => x == null)) return true;
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const v = grid[r * G + c];
      if (c + 1 < G && grid[r * G + c + 1] === v) return true;
      if (r + 1 < G && grid[(r + 1) * G + c] === v) return true;
    }
  }
  return false;
}

export function won(grid) {
  return grid.some((v) => v != null && v >= 2048);
}

/// Drop a new 2 (90%) or 4 (10%) into a random empty cell.
export function spawn(grid, rng = Math.random) {
  const empties = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] == null) empties.push(i);
  if (!empties.length) return grid.slice();
  const next = grid.slice();
  next[empties[Math.floor(rng() * empties.length)]] = rng() < 0.9 ? 2 : 4;
  return next;
}
