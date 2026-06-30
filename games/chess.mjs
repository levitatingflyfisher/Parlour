// Chess — full legal-move generation, pure logic (no DOM). The board is a flat
// 64-array, index = rank*8 + file, with index 0 = a8 (top-left). White starts at
// the bottom (rows 6–7) and advances UPWARD toward row 0; Black starts at the top
// (rows 0–1) and advances DOWNWARD toward row 7. Pieces are single chars: white
// PNBRQK (upper-case), black pnbrqk (lower-case), null for an empty square.
//
// A `state` carries everything a position needs:
//   { board:[64], turn:'w'|'b', castling:{K,Q,k,q}, ep:index|null }
// where castling flags are white-kingside/queenside + black-kingside/queenside and
// `ep` is the square a pawn may capture onto en passant (the square the double-
// pushed pawn skipped over), or null.

// ---- geometry helpers ----------------------------------------------------
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const idx = (r, c) => (inb(r, c) ? r * 8 + c : -1); // -1 = off the board
const mirror = (i) => (7 - (i >> 3)) * 8 + (i & 7); // vertical flip (for black PST)
const isUpper = (p) => p < 'a'; // pieces are letters; upper-case = white
const colorOf = (p) => (p == null ? null : isUpper(p) ? 'w' : 'b');
const enemyOf = (c) => (c === 'w' ? 'b' : 'w');

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_D = ROOK_D.concat(BISHOP_D);

// ---- starting position ---------------------------------------------------
export function initialBoard() {
  const b = Array(64).fill(null);
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[c] = back[c]; // row 0 — black back rank
    b[8 + c] = 'p'; // row 1 — black pawns
    b[48 + c] = 'P'; // row 6 — white pawns
    b[56 + c] = back[c].toUpperCase(); // row 7 — white back rank
  }
  return b;
}

export function newGame() {
  return { board: initialBoard(), turn: 'w', castling: { K: true, Q: true, k: true, q: true }, ep: null };
}

// ---- attack detection ----------------------------------------------------
// True when square `sq` is attacked by ANY piece of colour `by` on `board`.
function isAttacked(board, sq, by) {
  const r = sq >> 3;
  const c = sq & 7;
  const N = by === 'w' ? 'N' : 'n';
  for (const [dr, dc] of KNIGHT) {
    const t = idx(r + dr, c + dc);
    if (t >= 0 && board[t] === N) return true;
  }
  const K = by === 'w' ? 'K' : 'k';
  for (const [dr, dc] of KING_D) {
    const t = idx(r + dr, c + dc);
    if (t >= 0 && board[t] === K) return true;
  }
  // Pawns: a white pawn sits one row BELOW the square it attacks (it moves up);
  // a black pawn sits one row ABOVE.
  const prow = by === 'w' ? r + 1 : r - 1;
  const P = by === 'w' ? 'P' : 'p';
  for (const dc of [-1, 1]) {
    const t = idx(prow, c + dc);
    if (t >= 0 && board[t] === P) return true;
  }
  const R = by === 'w' ? 'R' : 'r';
  const B = by === 'w' ? 'B' : 'b';
  const Q = by === 'w' ? 'Q' : 'q';
  for (const [dr, dc] of ROOK_D) {
    let rr = r + dr;
    let cc = c + dc;
    while (inb(rr, cc)) {
      const p = board[rr * 8 + cc];
      if (p) { if (p === R || p === Q) return true; break; }
      rr += dr; cc += dc;
    }
  }
  for (const [dr, dc] of BISHOP_D) {
    let rr = r + dr;
    let cc = c + dc;
    while (inb(rr, cc)) {
      const p = board[rr * 8 + cc];
      if (p) { if (p === B || p === Q) return true; break; }
      rr += dr; cc += dc;
    }
  }
  return false;
}

/// True when `color`'s king is under attack in `state`.
export function inCheck(state, color) {
  const k = color === 'w' ? 'K' : 'k';
  const sq = state.board.indexOf(k);
  if (sq < 0) return false;
  return isAttacked(state.board, sq, enemyOf(color));
}

// ---- pseudo-legal generation --------------------------------------------
// Adds the castling moves available to `color` (rights set, squares empty, rook
// present, king not in/through/into check). The b1/b8 square only needs to be
// empty for queenside, not unattacked.
function addCastling(state, color, from, moves) {
  const b = state.board;
  const opp = enemyOf(color);
  if (color === 'w') {
    if (from !== 60) return;
    if (state.castling.K && b[61] == null && b[62] == null && b[63] === 'R'
      && !isAttacked(b, 60, opp) && !isAttacked(b, 61, opp) && !isAttacked(b, 62, opp)) {
      moves.push({ from: 60, to: 62 });
    }
    if (state.castling.Q && b[59] == null && b[58] == null && b[57] == null && b[56] === 'R'
      && !isAttacked(b, 60, opp) && !isAttacked(b, 59, opp) && !isAttacked(b, 58, opp)) {
      moves.push({ from: 60, to: 58 });
    }
  } else {
    if (from !== 4) return;
    if (state.castling.k && b[5] == null && b[6] == null && b[7] === 'r'
      && !isAttacked(b, 4, opp) && !isAttacked(b, 5, opp) && !isAttacked(b, 6, opp)) {
      moves.push({ from: 4, to: 6 });
    }
    if (state.castling.q && b[3] == null && b[2] == null && b[1] == null && b[0] === 'r'
      && !isAttacked(b, 4, opp) && !isAttacked(b, 3, opp) && !isAttacked(b, 2, opp)) {
      moves.push({ from: 4, to: 2 });
    }
  }
}

// All pseudo-legal moves from `from` for the side to move (own-king safety NOT yet
// enforced). Promotions are emitted as a single auto-queen move (promo:'q').
function genPseudo(state, from) {
  const board = state.board;
  const p = board[from];
  if (!p) return [];
  const color = colorOf(p);
  if (color !== state.turn) return [];
  const moves = [];
  const r = from >> 3;
  const c = from & 7;
  const lower = p.toLowerCase();
  const empty = (t) => board[t] == null;
  const enemy = (t) => board[t] != null && colorOf(board[t]) !== color;
  const push = (to, promo) => moves.push(promo ? { from, to, promo } : { from, to });

  if (lower === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    const one = idx(r + dir, c);
    if (one >= 0 && empty(one)) {
      if (r + dir === promoRow) push(one, 'q'); else push(one);
      const two = idx(r + 2 * dir, c);
      if (r === startRow && two >= 0 && empty(two)) push(two);
    }
    for (const dc of [-1, 1]) {
      const t = idx(r + dir, c + dc);
      if (t < 0) continue;
      if (enemy(t)) { if (r + dir === promoRow) push(t, 'q'); else push(t); }
      else if (t === state.ep && empty(t)) push(t); // en passant
    }
  } else if (lower === 'n') {
    for (const [dr, dc] of KNIGHT) {
      const t = idx(r + dr, c + dc);
      if (t >= 0 && (empty(t) || enemy(t))) push(t);
    }
  } else if (lower === 'k') {
    for (const [dr, dc] of KING_D) {
      const t = idx(r + dr, c + dc);
      if (t >= 0 && (empty(t) || enemy(t))) push(t);
    }
    addCastling(state, color, from, moves);
  } else {
    const dirs = lower === 'r' ? ROOK_D : lower === 'b' ? BISHOP_D : ALL_D;
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (inb(rr, cc)) {
        const t = rr * 8 + cc;
        if (empty(t)) { push(t); }
        else { if (enemy(t)) push(t); break; }
        rr += dr; cc += dc;
      }
    }
  }
  return moves;
}

// ---- legal moves & application ------------------------------------------
/// Every legal move from `from` as { from, to, promo? }. A move is legal when it
/// does not leave the mover's own king in check (castling path-safety is enforced
/// during generation). Returns [] for an empty square or an enemy piece.
export function legalMoves(state, from) {
  const out = [];
  for (const m of genPseudo(state, from)) {
    const ns = applyMove(state, m.from, m.to, m.promo);
    if (!inCheck(ns, state.turn)) out.push(m);
  }
  return out;
}

/// Returns a NEW state with the move applied: piece relocated, en-passant capture
/// resolved, promotion done (defaults to queen), castling rook shifted, castling
/// rights and the en-passant target updated, and the side to move flipped. The
/// input state and its board are not mutated.
export function applyMove(state, from, to, promo) {
  const board = state.board.slice();
  const piece = board[from];
  const color = colorOf(piece);
  const lower = piece.toLowerCase();
  const fr = from >> 3;
  const fc = from & 7;
  const tr = to >> 3;
  const tc = to & 7;
  let ep = null;

  board[from] = null;

  // En passant: a pawn moving diagonally onto the (empty) ep target removes the
  // pawn that sits beside the origin (same row as `from`, same file as `to`).
  if (lower === 'p' && to === state.ep && board[to] == null && fc !== tc) {
    board[fr * 8 + tc] = null;
  }

  // Place the piece, promoting on the last rank.
  let placed = piece;
  if (lower === 'p' && (tr === 0 || tr === 7)) {
    const pr = promo || 'q';
    placed = color === 'w' ? pr.toUpperCase() : pr.toLowerCase();
  }
  board[to] = placed;

  // A two-square pawn push exposes an en-passant target on the skipped square.
  if (lower === 'p' && Math.abs(tr - fr) === 2) ep = ((fr + tr) >> 1) * 8 + fc;

  // Castling: the king moved two files, so shuttle the rook to the king's far side.
  if (lower === 'k' && Math.abs(tc - fc) === 2) {
    if (tc === 6) { board[fr * 8 + 5] = board[fr * 8 + 7]; board[fr * 8 + 7] = null; }
    else { board[fr * 8 + 3] = board[fr * 8 + 0]; board[fr * 8 + 0] = null; }
  }

  // Castling rights: lose both on a king move; lose one when its rook leaves or is
  // captured on its home square (56=a1,63=h1,0=a8,7=h8).
  const cst = { K: state.castling.K, Q: state.castling.Q, k: state.castling.k, q: state.castling.q };
  if (piece === 'K') { cst.K = false; cst.Q = false; }
  if (piece === 'k') { cst.k = false; cst.q = false; }
  if (from === 56 || to === 56) cst.Q = false;
  if (from === 63 || to === 63) cst.K = false;
  if (from === 0 || to === 0) cst.q = false;
  if (from === 7 || to === 7) cst.k = false;

  return { board, turn: enemyOf(color), castling: cst, ep };
}

/// Every legal move for the side to move, flattened across the whole board.
export function allMoves(state) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && colorOf(p) === state.turn) {
      const ms = legalMoves(state, i);
      for (const m of ms) out.push(m);
    }
  }
  return out;
}

/// 'checkmate' | 'stalemate' | 'check' | 'ongoing' for the side to move.
export function status(state) {
  const moves = allMoves(state);
  const chk = inCheck(state, state.turn);
  if (moves.length === 0) return chk ? 'checkmate' : 'stalemate';
  return chk ? 'check' : 'ongoing';
}

// ---- evaluation & search -------------------------------------------------
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const MATE = 1e7;

// Piece-square tables (Michniewski "simplified evaluation"), written rank-8-first
// so they line up with this board's index 0 = a8. Used directly for white pieces
// and via vertical mirror for black.
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

// Static evaluation from WHITE's perspective: material + piece-square bonus.
function evaluate(board) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const t = p.toLowerCase();
    if (isUpper(p)) s += VAL[t] + PST[t][i];
    else s -= VAL[t] + PST[t][mirror(i)];
  }
  return s;
}

// Captures (high-value victims) and promotions first — cheap move ordering that
// makes alpha-beta prune far harder.
function orderMoves(board, moves) {
  const score = (m) => {
    const v = board[m.to];
    let s = v ? VAL[v.toLowerCase()] : 0;
    if (m.promo) s += 800;
    return s;
  };
  moves.sort((a, b) => score(b) - score(a));
}

// Negamax with alpha-beta; returns the value from the side-to-move's perspective.
function search(state, depth, alpha, beta) {
  const moves = allMoves(state);
  if (moves.length === 0) {
    return inCheck(state, state.turn) ? -(MATE + depth) : 0; // mate (sooner = worse) / stalemate
  }
  if (depth === 0) return state.turn === 'w' ? evaluate(state.board) : -evaluate(state.board);
  orderMoves(state.board, moves);
  let best = -Infinity;
  for (const m of moves) {
    const ns = applyMove(state, m.from, m.to, m.promo);
    const val = -search(ns, depth - 1, -beta, -alpha);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/// Best move for the side to move via alpha-beta (default depth 3), as
/// { from, to, promo? }, or null when there is no legal move.
export function bestMove(state, depth = 3) {
  const moves = allMoves(state);
  if (moves.length === 0) return null;
  orderMoves(state.board, moves);
  let best = moves[0];
  let bestV = -Infinity;
  let alpha = -Infinity;
  for (const m of moves) {
    const ns = applyMove(state, m.from, m.to, m.promo);
    const v = -search(ns, depth - 1, -Infinity, -alpha);
    if (v > bestV) { bestV = v; best = m; }
    if (v > alpha) alpha = v;
  }
  return best;
}
