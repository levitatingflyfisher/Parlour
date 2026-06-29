// Tic-Tac-Toe — pure game logic (no DOM). The Parlour "scaffold" game: its
// board/win/AI shape is reused by the other grid games. Perfect minimax AI.

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6], // diagonals
];

export function emptyBoard() {
  return Array(9).fill(null);
}

export function available(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (board[i] == null) out.push(i);
  return out;
}

/// 'X' | 'O' if a line is complete, 'draw' if the board is full, else null.
export function winner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return available(board).length === 0 ? 'draw' : null;
}

const other = (p) => (p === 'X' ? 'O' : 'X');

// Minimax scored from `me`'s perspective so values stay consistent down the
// tree: +1 we win, -1 we lose, 0 draw. Returns the best {score, move}.
function minimax(board, toMove, me) {
  const w = winner(board);
  if (w === me) return { score: 1, move: -1 };
  if (w === other(me)) return { score: -1, move: -1 };
  if (w === 'draw') return { score: 0, move: -1 };

  let best = null;
  for (const i of available(board)) {
    const next = board.slice();
    next[i] = toMove;
    const { score } = minimax(next, other(toMove), me);
    const better = best == null ||
      (toMove === me ? score > best.score : score < best.score);
    if (better) best = { score, move: i };
  }
  return best;
}

/// The optimal move index for `player` under perfect play.
export function bestMove(board, player) {
  return minimax(board, player, player).move;
}
