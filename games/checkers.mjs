// Checkers — American/English draughts, pure game logic (no DOM). Board is a
// flat 8x8 grid, index = row*8 + col, each cell null | 'r' | 'b' | 'R' | 'B'.
// Men are lower-case, kings upper-case. Red ('r') sits on rows 5–7 and moves UP
// (decreasing row); Black ('b') sits on rows 0–2 and moves DOWN. Men step/jump
// forward only; kings on any diagonal. Captures are forced and chain into a
// single multi-jump move. Reaching the far row crowns a man and ends the move.

export const SIZE = 8;
const at = (r, c) => r * SIZE + c;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

const owner = (v) => (v == null ? null : v.toLowerCase()); // 'r' | 'b' | null
const isKing = (v) => v === 'R' || v === 'B';
const other = (p) => (p === 'r' ? 'b' : 'r');

// Forward (men) directions per colour; kings get all four diagonals.
const RED_DIRS = [[-1, -1], [-1, 1]];
const BLACK_DIRS = [[1, -1], [1, 1]];
const KING_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
function dirsFor(v) {
  if (isKing(v)) return KING_DIRS;
  return owner(v) === 'r' ? RED_DIRS : BLACK_DIRS;
}
// A man of `v` crowns when it lands on the opponent's home row.
function crowns(v, landR) {
  if (isKing(v)) return false;
  return owner(v) === 'r' ? landR === 0 : landR === SIZE - 1;
}

/// Standard 12-v-12 opening: black on the dark squares of rows 0–2, red on the
/// dark squares of rows 5–7. Dark squares are those where (row + col) is odd.
export function emptyBoard() {
  const b = Array(SIZE * SIZE).fill(null);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r <= 2) b[at(r, c)] = 'b';
      else if (r >= 5) b[at(r, c)] = 'r';
    }
  }
  return b;
}

// All maximal jump sequences for the piece `v` currently at `pos`, on a working
// board where the piece has been lifted from its origin. Captured pieces stay on
// `work` (so they block landings) and are tracked in `captured` to forbid
// re-jumping them. A man that crowns mid-chain stops there (promotion ends the
// move). Returns a list of { to, captures }.
function jumpsFrom(work, pos, v, captured) {
  const out = [];
  const r = Math.floor(pos / SIZE);
  const c = pos % SIZE;
  for (const [dr, dc] of dirsFor(v)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inBounds(lr, lc)) continue;
    const mid = at(mr, mc);
    const land = at(lr, lc);
    if (captured.includes(mid)) continue;
    const midV = work[mid];
    if (midV == null || owner(midV) === owner(v)) continue;
    if (work[land] != null) continue; // landing square must be empty
    const nextCaptured = captured.concat([mid]);
    if (crowns(v, lr)) {
      out.push({ to: land, captures: nextCaptured });
      continue;
    }
    const cont = jumpsFrom(work, land, v, nextCaptured);
    if (cont.length === 0) out.push({ to: land, captures: nextCaptured });
    else for (const seq of cont) out.push(seq);
  }
  return out;
}

/// Every legal move for `player` ('r' | 'b') as { from, to, captures:[indices] }.
/// Captures are forced: if any jump exists for the player, only jump moves (the
/// full multi-jump chains) are returned and simple steps are excluded.
export function legalMoves(board, player) {
  const captures = [];
  const steps = [];
  for (let from = 0; from < board.length; from++) {
    const v = board[from];
    if (owner(v) !== player) continue;
    const work = board.slice();
    work[from] = null;
    for (const seq of jumpsFrom(work, from, v, [])) {
      captures.push({ from, to: seq.to, captures: seq.captures });
    }
    const r = Math.floor(from / SIZE);
    const c = from % SIZE;
    for (const [dr, dc] of dirsFor(v)) {
      const tr = r + dr;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const to = at(tr, tc);
      if (board[to] == null) steps.push({ from, to, captures: [] });
    }
  }
  return captures.length ? captures : steps;
}

/// Returns a NEW board with `move` applied: the piece leaves `from`, every
/// captured index is cleared, the piece lands on `to`, and a man that reaches
/// the far row is crowned. The input board is not mutated.
export function applyMove(board, move) {
  const next = board.slice();
  let v = next[move.from];
  next[move.from] = null;
  for (const cap of move.captures) next[cap] = null;
  const landR = Math.floor(move.to / SIZE);
  if (crowns(v, landR)) v = v === 'r' ? 'R' : 'B';
  next[move.to] = v;
  return next;
}

function count(board, player) {
  let n = 0;
  for (const v of board) if (owner(v) === player) n++;
  return n;
}

/// 'r' | 'b' | null. A player with no pieces or no legal moves has lost, so the
/// other player is the winner. null while both still have a move.
export function winner(board) {
  const rDead = count(board, 'r') === 0 || legalMoves(board, 'r').length === 0;
  const bDead = count(board, 'b') === 0 || legalMoves(board, 'b').length === 0;
  if (rDead) return 'b';
  if (bDead) return 'r';
  return null;
}

// Static evaluation from `me`'s perspective: material with a small advancement
// bonus for men nearing promotion and a centrality bonus for kings.
function pieceValue(v, idx) {
  const r = Math.floor(idx / SIZE);
  const c = idx % SIZE;
  if (v === 'r') return 100 + (SIZE - 1 - r) * 4; // red advances toward row 0
  if (v === 'b') return 100 + r * 4; // black advances toward row 7
  // king: prized, with a mild pull toward the centre.
  const central = 8 - (Math.abs(r - 3.5) + Math.abs(c - 3.5));
  return 185 + central;
}
function evaluate(board, me) {
  let s = 0;
  for (let i = 0; i < board.length; i++) {
    const v = board[i];
    if (!v) continue;
    s += owner(v) === me ? pieceValue(v, i) : -pieceValue(v, i);
  }
  return s;
}

// Negamax-style alpha-beta. A side with no move at its turn has lost (this also
// covers having no pieces), scored with depth so faster wins are preferred.
function search(board, toMove, me, depth, alpha, beta) {
  const moves = legalMoves(board, toMove);
  if (moves.length === 0) return toMove === me ? -100000 - depth : 100000 + depth;
  if (depth === 0) return evaluate(board, me);
  moves.sort((x, y) => y.captures.length - x.captures.length);
  const next = other(toMove);
  if (toMove === me) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(applyMove(board, m), next, me, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(applyMove(board, m), next, me, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/// Best move object for `player` via alpha-beta (default depth 6), or null when
/// the player has no legal move.
export function bestMove(board, player, depth = 6) {
  const moves = legalMoves(board, player);
  if (!moves.length) return null;
  moves.sort((x, y) => y.captures.length - x.captures.length);
  let best = moves[0];
  let bestV = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    const v = search(applyMove(board, m), other(player), player, depth - 1, alpha, Infinity);
    if (v > bestV) {
      bestV = v;
      best = m;
      alpha = Math.max(alpha, v);
    }
  }
  return best;
}
