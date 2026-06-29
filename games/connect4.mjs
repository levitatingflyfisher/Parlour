// Connect Four — pure logic + a depth-limited alpha-beta computer opponent.
// Board is a flat ROWS*COLS grid, row 0 at the top, index = row*COLS + col.

export const ROWS = 6;
export const COLS = 7;
const at = (r, c) => r * COLS + c;
const other = (p) => (p === 'R' ? 'Y' : 'R');
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

export function emptyBoard() {
  return Array(ROWS * COLS).fill(null);
}

export function available(board) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (board[at(0, c)] == null) out.push(c);
  return out;
}

/// Drops `player` into `col`; returns { board, row } or null if the column is full.
export function drop(board, col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[at(r, col)] == null) {
      const next = board.slice();
      next[at(r, col)] = player;
      return { board: next, row: r };
    }
  }
  return null;
}

export function winner(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[at(r, c)];
      if (!p) continue;
      for (const [dr, dc] of DIRS) {
        let k = 1;
        while (k < 4) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[at(rr, cc)] !== p) break;
          k++;
        }
        if (k === 4) return p;
      }
    }
  }
  return available(board).length === 0 ? 'draw' : null;
}

// All length-4 windows on the board, precomputed once.
const WINDOWS = (() => {
  const ws = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const cells = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { cells.length = 0; break; }
          cells.push(at(rr, cc));
        }
        if (cells.length === 4) ws.push(cells);
      }
    }
  }
  return ws;
})();

function evaluate(board, me) {
  const opp = other(me);
  let s = 0;
  for (const w of WINDOWS) {
    let mine = 0; let theirs = 0;
    for (const i of w) { if (board[i] === me) mine++; else if (board[i] === opp) theirs++; }
    if (mine && theirs) continue;
    if (mine === 3) s += 50; else if (mine === 2) s += 10;
    if (theirs === 3) s -= 80; else if (theirs === 2) s -= 10;
  }
  for (let r = 0; r < ROWS; r++) {
    if (board[at(r, 3)] === me) s += 6; else if (board[at(r, 3)] === opp) s -= 6;
  }
  return s;
}

function alphabeta(board, depth, alpha, beta, toMove, me) {
  const w = winner(board);
  if (w === me) return { score: 100000, move: -1 };
  if (w === other(me)) return { score: -100000, move: -1 };
  if (w === 'draw') return { score: 0, move: -1 };
  if (depth === 0) return { score: evaluate(board, me), move: -1 };

  const moves = available(board).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  let best = { score: toMove === me ? -Infinity : Infinity, move: moves[0] ?? -1 };
  for (const c of moves) {
    const sc = alphabeta(drop(board, c, toMove).board, depth - 1, alpha, beta, other(toMove), me).score;
    if (toMove === me) {
      if (sc > best.score) best = { score: sc, move: c };
      alpha = Math.max(alpha, sc);
    } else {
      if (sc < best.score) best = { score: sc, move: c };
      beta = Math.min(beta, sc);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/// Best column for `player`. Takes an immediate win and blocks an immediate
/// loss outright (fast + deterministic); otherwise searches `depth` ply.
export function bestMove(board, player, depth = 5) {
  for (const c of available(board)) {
    if (winner(drop(board, c, player).board) === player) return c;
  }
  const opp = other(player);
  for (const c of available(board)) {
    if (winner(drop(board, c, opp).board) === opp) return c;
  }
  return alphabeta(board, depth, -Infinity, Infinity, player, player).move;
}
