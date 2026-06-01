// Hex — the classic connection game on an 11x11 rhombus. Pure logic, no DOM.
// Board is a flat array of SIZE*SIZE, index = r*SIZE + c, each cell null/'R'/'B'.
// Red joins the TOP edge (r=0) to the BOTTOM edge (r=SIZE-1); Blue joins the
// LEFT edge (c=0) to the RIGHT edge (c=SIZE-1). On a hex grid each cell has six
// neighbours; the two acute corners belong to both players, and — a lovely
// property of Hex — exactly one side always connects, so a full board never draws.

export const SIZE = 11;

// The six hex-grid neighbour offsets (in row,col). The diagonal pair
// (-1,+1)/(+1,-1) is what turns a square array into a rhombic hex board.
const NB = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1]];

const other = (p) => (p === 'R' ? 'B' : 'R');

function neighbours(idx) {
  const r = (idx / SIZE) | 0;
  const c = idx % SIZE;
  const out = [];
  for (const [dr, dc] of NB) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
  }
  return out;
}

export function emptyBoard() {
  return Array(SIZE * SIZE).fill(null);
}

export function available(board) {
  const out = [];
  for (let i = 0; i < board.length; i++) if (board[i] == null) out.push(i);
  return out;
}

/// Places `player` at `idx`; returns a NEW board, or null if the cell is taken.
export function place(board, idx, player) {
  if (board[idx] != null) return null;
  const next = board.slice();
  next[idx] = player;
  return next;
}

// Flood-fill from one of `player`'s edges through same-colour cells; true if the
// far edge is reached. (Red: top→bottom by row; Blue: left→right by column.)
function connects(board, player) {
  const N = SIZE;
  const seen = new Uint8Array(N * N);
  const stack = [];
  if (player === 'R') {
    for (let c = 0; c < N; c++) if (board[c] === 'R') { seen[c] = 1; stack.push(c); }
  } else {
    for (let r = 0; r < N; r++) { const i = r * N; if (board[i] === 'B') { seen[i] = 1; stack.push(i); } }
  }
  while (stack.length) {
    const idx = stack.pop();
    const r = (idx / N) | 0;
    const c = idx % N;
    if (player === 'R' ? r === N - 1 : c === N - 1) return true;
    for (const n of neighbours(idx)) {
      if (!seen[n] && board[n] === player) { seen[n] = 1; stack.push(n); }
    }
  }
  return false;
}

/// 'R' | 'B' | null. Hex can't draw, but a partial board has no winner yet.
export function winner(board) {
  if (connects(board, 'R')) return 'R';
  if (connects(board, 'B')) return 'B';
  return null;
}

// Minimum number of empty cells `player` must still claim to join their two
// edges: own stones cost 0, empties cost 1, the opponent's stones are walls.
// A 0/1-weighted Dijkstra from the near edge to the far edge (∞ if walled off).
function pathCost(board, player) {
  const N = SIZE;
  const M = N * N;
  const opp = other(player);
  const cost = (i) => (board[i] === player ? 0 : board[i] === opp ? Infinity : 1);
  const dist = new Array(M).fill(Infinity);
  const done = new Uint8Array(M);
  const seed = (i) => { const w = cost(i); if (w < dist[i]) dist[i] = w; };
  if (player === 'R') for (let c = 0; c < N; c++) seed(c);
  else for (let r = 0; r < N; r++) seed(r * N);

  for (let it = 0; it < M; it++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < M; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u === -1) break;
    done[u] = 1;
    const r = (u / N) | 0;
    const c = u % N;
    if (player === 'R' ? r === N - 1 : c === N - 1) return dist[u]; // first popped target is minimal
    for (const n of neighbours(u)) {
      const w = cost(n);
      if (w === Infinity) continue;
      const nd = dist[u] + w;
      if (nd < dist[n]) dist[n] = nd;
    }
  }
  return Infinity;
}

// Positive favours `me`: how much further the opponent must travel than we must.
function evaluate(board, me) {
  return pathCost(board, other(me)) - pathCost(board, me);
}

/// A reasonable, legal move for `player`: take an immediate win, else block the
/// opponent's immediate win, else the empty cell that most improves our
/// shortest-connection lead — with a gentle pull toward the strong centre.
export function bestMove(board, player) {
  const opp = other(player);
  const empties = available(board);
  if (!empties.length) return -1;

  for (const i of empties) { const b = place(board, i, player); if (winner(b) === player) return i; }
  for (const i of empties) { const b = place(board, i, opp); if (winner(b) === opp) return i; }

  const mid = (SIZE - 1) / 2;
  let bestIdx = empties[0];
  let bestScore = -Infinity;
  for (const i of empties) {
    const b = place(board, i, player);
    const r = (i / SIZE) | 0;
    const c = i % SIZE;
    const score = evaluate(b, player) - (Math.abs(r - mid) + Math.abs(c - mid)) * 0.01;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}
