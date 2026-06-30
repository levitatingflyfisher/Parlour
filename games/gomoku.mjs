// Gomoku (Five in a Row) — pure game logic (no DOM). Board is a flat 15x15
// grid, index = row*SIZE + col, each cell null | 'B' | 'W'. Black moves first.
// A side wins with five (or more — overlines count) of its stones in an
// unbroken line horizontally, vertically, or on either diagonal.

export const SIZE = 15;
const N = SIZE * SIZE;
const other = (p) => (p === 'B' ? 'W' : 'B');
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const at = (r, c) => r * SIZE + c;
const rc = (i) => [Math.floor(i / SIZE), i % SIZE];
const inb = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export function emptyBoard() {
  return Array(N).fill(null);
}

/// Indices of every empty cell.
export function available(board) {
  const out = [];
  for (let i = 0; i < N; i++) if (board[i] == null) out.push(i);
  return out;
}

/// Returns a new board with `player` placed at `idx`, or null if the cell is
/// out of range or already taken. Never mutates the input.
export function place(board, idx, player) {
  if (idx < 0 || idx >= N || board[idx] != null) return null;
  const next = board.slice();
  next[idx] = player;
  return next;
}

/// 'B' | 'W' for five-or-more in a row in any direction, 'draw' when the board
/// is full with no such line, else null. Detecting a run of >=5 from any cell
/// that starts one naturally catches overlines too.
export function winner(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[at(r, c)];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        let k = 1;
        while (k < 5 && inb(r + dr * k, c + dc * k) && board[at(r + dr * k, c + dc * k)] === p) k++;
        if (k === 5) return p;
      }
    }
  }
  return available(board).length === 0 ? 'draw' : null;
}

// Value of a length-5 window holding `count` of one colour and no opponent.
// Overlapping windows make open threes/fours score higher than closed ones.
const WIN = 1e7;
const WINDOW = [0, 1, 10, 120, 1200, WIN];

// Marginal worth of placing `owner` on empty cell `cell`: the gain across every
// length-5 window the cell joins, in all four directions. Windows polluted by
// the opponent are dead (score 0). Used for both attack and denial.
function cellValue(board, cell, owner) {
  const opp = other(owner);
  const [r0, c0] = rc(cell);
  let total = 0;
  for (const [dr, dc] of DIRS) {
    for (let s = -4; s <= 0; s++) {
      let ok = true;
      let mine = 0;
      let theirs = 0;
      for (let j = 0; j < 5; j++) {
        const r = r0 + (s + j) * dr;
        const c = c0 + (s + j) * dc;
        if (!inb(r, c)) { ok = false; break; }
        const v = board[at(r, c)];
        if (v === owner) mine++;
        else if (v === opp) theirs++;
      }
      if (!ok || theirs > 0) continue;
      total += WINDOW[mine + 1] - WINDOW[mine];
    }
  }
  return total;
}

// Empty cells within Chebyshev distance `radius` of any stone (where play is
// meaningful), keeping the search small. The opening board returns the centre.
function candidates(board, radius = 2) {
  const out = [];
  const seen = new Set();
  let occupied = false;
  for (let i = 0; i < N; i++) {
    if (board[i] == null) continue;
    occupied = true;
    const [r, c] = rc(i);
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (!inb(rr, cc)) continue;
        const j = at(rr, cc);
        if (board[j] == null && !seen.has(j)) { seen.add(j); out.push(j); }
      }
    }
  }
  if (!occupied) return [at((SIZE - 1) / 2, (SIZE - 1) / 2)];
  return out;
}

/// A strong heuristic move for `player`, always a legal empty index (or -1 on a
/// full board). Completes five if possible, else blocks the opponent's
/// immediate five, else maximises its own line patterns plus the value it
/// denies the opponent, with a slight pull toward the centre to break ties.
export function bestMove(board, player) {
  const empties = available(board);
  if (empties.length === 0) return -1;
  const opp = other(player);
  let cands = candidates(board);
  if (cands.length === 0) cands = empties;

  // 1. Take an immediate win.
  for (const c of cands) {
    const b = place(board, c, player);
    if (b && winner(b) === player) return c;
  }
  // 2. Block the opponent's immediate win.
  for (const c of cands) {
    const b = place(board, c, opp);
    if (b && winner(b) === opp) return c;
  }
  // 3. Score by own pattern gain + opponent denial, centre-biased on ties.
  const mid = (SIZE - 1) / 2;
  let best = cands[0];
  let bestScore = -Infinity;
  for (const c of cands) {
    const [r, col] = rc(c);
    const centre = -(Math.abs(r - mid) + Math.abs(col - mid)) * 0.01;
    const s = cellValue(board, c, player) + 0.95 * cellValue(board, c, opp) + centre;
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}
