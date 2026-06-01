// Reversi / Othello — pure game logic (no DOM). Board is a flat 8x8 grid,
// index = row*8 + col, each cell null | 'B' | 'W'. A move is legal when it
// brackets one or more opponent discs between the placed disc and another of
// your own; all bracketed discs flip. A side with no move passes; the game
// ends only when neither side can move.

export const SIZE = 8;
const at = (r, c) => r * SIZE + c;
const other = (p) => (p === 'B' ? 'W' : 'B');
const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

// Positional weights: corners are prized, the squares next to them are traps.
const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

/// Standard 4-disc opening: white on the main diagonal, black on the anti.
export function emptyBoard() {
  const b = Array(SIZE * SIZE).fill(null);
  b[at(3, 3)] = 'W';
  b[at(3, 4)] = 'B';
  b[at(4, 3)] = 'B';
  b[at(4, 4)] = 'W';
  return b;
}

// Indices that flip if `player` plays at empty cell `move`, across all rays.
function flips(board, move, player) {
  if (board[move] != null) return [];
  const opp = other(player);
  const r0 = Math.floor(move / SIZE);
  const c0 = move % SIZE;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const run = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[at(r, c)] === opp) {
      run.push(at(r, c));
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[at(r, c)] === player) {
      for (const i of run) out.push(i);
    }
  }
  return out;
}

/// Indices of every legal move for `player` (those that flip at least one disc).
export function legalMoves(board, player) {
  const out = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] == null && flips(board, i, player).length) out.push(i);
  }
  return out;
}

/// Returns a new board with `move` placed and all bracketed discs flipped.
/// Assumes `move` is legal for `player`.
export function applyMove(board, move, player) {
  const next = board.slice();
  next[move] = player;
  for (const i of flips(board, move, player)) next[i] = player;
  return next;
}

/// Disc counts as { B, W }.
export function score(board) {
  let B = 0;
  let W = 0;
  for (const v of board) {
    if (v === 'B') B++;
    else if (v === 'W') W++;
  }
  return { B, W };
}

/// 'B' | 'W' | 'draw' once neither side can move, else null. A side with no
/// move passes, so the game is live while either side has a legal move.
export function winner(board) {
  if (legalMoves(board, 'B').length || legalMoves(board, 'W').length) return null;
  const { B, W } = score(board);
  if (B > W) return 'B';
  if (W > B) return 'W';
  return 'draw';
}

/// Greedy + corner-weighted pick: maximise (discs flipped + square weight).
/// Returns a legal move index, or -1 if `player` has no move (a pass).
export function bestMove(board, player) {
  const moves = legalMoves(board, player);
  if (!moves.length) return -1;
  let best = -1;
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = flips(board, m, player).length + WEIGHTS[m];
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}
