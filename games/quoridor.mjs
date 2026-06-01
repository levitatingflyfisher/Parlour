// Quoridor — pure game logic (no DOM). A 9x9 board of cells (row 0 top, row 8
// bottom). Pawn 0 starts bottom-middle (8,4) and races for row 0; pawn 1 starts
// top-middle (0,4) and races for row 8. Each player has 10 walls. A wall fills a
// 2-cell-long groove between cells — horizontal (blocks vertical movement) or
// vertical (blocks horizontal movement) — at a slot (r,c) with r,c in 0..7.
//
// State: { pawns:[{r,c},{r,c}], walls:{h:Set, v:Set}, wallsLeft:[10,10], turn }
// Wall slots are stored as the string key `"${r},${c}"` (see wallKey).

const N = 9;            // cells per side
const W = N - 1;        // wall-slot rows/cols (0..7)
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const GOAL = [0, N - 1]; // goal row for pawn 0 and pawn 1

/// Canonical key for a wall slot at (r,c).
export function wallKey(r, c) { return r + ',' + c; }

// Is a single orthogonal step from (r,c) to the adjacent (nr,nc) blocked by a
// wall? A horizontal wall at slot (sr,sc) spans the boundary below row sr across
// columns sc and sc+1; a vertical wall spans the boundary right of col sc across
// rows sr and sr+1. Off-board slot keys are simply never present in the sets.
function blocked(walls, r, c, nr, nc) {
  if (nr === r - 1 && nc === c) {        // up
    return walls.h.has(wallKey(r - 1, c)) || walls.h.has(wallKey(r - 1, c - 1));
  }
  if (nr === r + 1 && nc === c) {        // down
    return walls.h.has(wallKey(r, c)) || walls.h.has(wallKey(r, c - 1));
  }
  if (nc === c - 1 && nr === r) {        // left
    return walls.v.has(wallKey(r, c - 1)) || walls.v.has(wallKey(r - 1, c - 1));
  }
  if (nc === c + 1 && nr === r) {        // right
    return walls.v.has(wallKey(r, c)) || walls.v.has(wallKey(r - 1, c));
  }
  return true; // not an orthogonal neighbour
}

const inBounds = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

/// A fresh game: pawns on their start cells, no walls, pawn 0 to move.
export function newGame() {
  return {
    pawns: [{ r: 8, c: 4 }, { r: 0, c: 4 }],
    walls: { h: new Set(), v: new Set() },
    wallsLeft: [10, 10],
    turn: 0,
  };
}

/// Legal pawn destinations for the player to move. Orthogonal steps not blocked
/// by a wall; if the opponent is adjacent you may jump straight over it, or — when
/// a wall or the board edge sits directly behind it — diagonally to either side.
export function pawnMoves(state) {
  const me = state.pawns[state.turn];
  const opp = state.pawns[1 - state.turn];
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = me.r + dr, nc = me.c + dc;
    if (!inBounds(nr, nc)) continue;
    if (blocked(state.walls, me.r, me.c, nr, nc)) continue;
    if (!(opp.r === nr && opp.c === nc)) {
      out.push({ r: nr, c: nc });
      continue;
    }
    // Opponent is in the way — try to jump.
    const br = nr + dr, bc = nc + dc;
    const straightOk = inBounds(br, bc) && !blocked(state.walls, nr, nc, br, bc);
    if (straightOk) {
      out.push({ r: br, c: bc });
    } else {
      const perps = dr !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (const [pr, pc] of perps) {
        const dr2 = nr + pr, dc2 = nc + pc;
        if (!inBounds(dr2, dc2)) continue;
        if (blocked(state.walls, nr, nc, dr2, dc2)) continue;
        out.push({ r: dr2, c: dc2 });
      }
    }
  }
  return out;
}

// Breadth-first reachability: can `start` reach any cell on `goalRow`?
function hasPath(walls, start, goalRow) {
  const seen = new Set([start.r * N + start.c]);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    if (cur.r === goalRow) return true;
    for (const [dr, dc] of DIRS) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (!inBounds(nr, nc)) continue;
      if (blocked(walls, cur.r, cur.c, nr, nc)) continue;
      const k = nr * N + nc;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ r: nr, c: nc });
    }
  }
  return false;
}

// Shortest-path distance from `start` to `goalRow`, or Infinity if walled off.
function dist(walls, start, goalRow) {
  const seen = new Set([start.r * N + start.c]);
  let frontier = [start], d = 0;
  while (frontier.length) {
    const next = [];
    for (const cur of frontier) {
      if (cur.r === goalRow) return d;
      for (const [dr, dc] of DIRS) {
        const nr = cur.r + dr, nc = cur.c + dc;
        if (!inBounds(nr, nc)) continue;
        if (blocked(walls, cur.r, cur.c, nr, nc)) continue;
        const k = nr * N + nc;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ r: nr, c: nc });
      }
    }
    frontier = next; d++;
  }
  return Infinity;
}

// Geometry-only legality: slot in range, free, not overlapping a parallel wall,
// not crossing a perpendicular one. (Does NOT check the path constraint.)
function slotFree(walls, type, r, c) {
  if (r < 0 || r >= W || c < 0 || c >= W) return false;
  if (type === 'h') {
    if (walls.h.has(wallKey(r, c)) || walls.h.has(wallKey(r, c - 1)) ||
        walls.h.has(wallKey(r, c + 1))) return false;
    if (walls.v.has(wallKey(r, c))) return false; // crossing
    return true;
  }
  if (type === 'v') {
    if (walls.v.has(wallKey(r, c)) || walls.v.has(wallKey(r - 1, c)) ||
        walls.v.has(wallKey(r + 1, c))) return false;
    if (walls.h.has(wallKey(r, c))) return false; // crossing
    return true;
  }
  return false;
}

/// True when the player to move may legally place a `type` ('h'|'v') wall at
/// slot (r,c): they have a wall left, the slot is free and non-crossing, and —
/// crucially — BOTH pawns still have a path to their goal row afterwards.
export function canPlaceWall(state, type, r, c) {
  if (state.wallsLeft[state.turn] <= 0) return false;
  if (!slotFree(state.walls, type, r, c)) return false;
  const nh = new Set(state.walls.h), nv = new Set(state.walls.v);
  (type === 'h' ? nh : nv).add(wallKey(r, c));
  const w = { h: nh, v: nv };
  if (!hasPath(w, state.pawns[0], GOAL[0])) return false;
  if (!hasPath(w, state.pawns[1], GOAL[1])) return false;
  return true;
}

/// Place a wall and pass the turn, returning a new state. Assumes legality has
/// been checked by the caller (canPlaceWall).
export function placeWall(state, type, r, c) {
  const nh = new Set(state.walls.h), nv = new Set(state.walls.v);
  (type === 'h' ? nh : nv).add(wallKey(r, c));
  const wallsLeft = state.wallsLeft.slice();
  wallsLeft[state.turn] -= 1;
  return {
    pawns: state.pawns.map((p) => ({ r: p.r, c: p.c })),
    walls: { h: nh, v: nv },
    wallsLeft,
    turn: 1 - state.turn,
  };
}

/// Move the active pawn to (r,c) and pass the turn, returning a new state.
export function movePawn(state, r, c) {
  const pawns = state.pawns.map((p) => ({ r: p.r, c: p.c }));
  pawns[state.turn] = { r, c };
  return {
    pawns,
    walls: { h: new Set(state.walls.h), v: new Set(state.walls.v) },
    wallsLeft: state.wallsLeft.slice(),
    turn: 1 - state.turn,
  };
}

/// 0 if pawn 0 has reached row 0, 1 if pawn 1 has reached row 8, else null.
export function winner(state) {
  if (state.pawns[0].r === GOAL[0]) return 0;
  if (state.pawns[1].r === GOAL[1]) return 1;
  return null;
}

/// A simple but always-legal AI for the player to move. Usually it steps along
/// its shortest path to goal; occasionally — when the opponent is doing at least
/// as well and walls remain — it drops the wall that most slows the opponent
/// without setting itself back. Returns {kind:'move',r,c} or {kind:'wall',type,r,c}.
export function aiMove(state) {
  const me = state.turn;
  const myGoal = GOAL[me];
  const oppGoal = GOAL[1 - me];
  const opp = state.pawns[1 - me];

  const moves = pawnMoves(state);
  let bestMove = null, bestD = Infinity;
  for (const mv of moves) {
    const d = dist(state.walls, mv, myGoal);
    if (d < bestD) { bestD = d; bestMove = mv; }
  }

  const myD = dist(state.walls, state.pawns[me], myGoal);
  const oppD = dist(state.walls, opp, oppGoal);

  if (state.wallsLeft[me] > 0 && oppD <= myD && Math.random() < 0.4) {
    let bestWall = null, bestGain = 0;
    for (let r = 0; r < W; r++) {
      for (let c = 0; c < W; c++) {
        for (const t of ['h', 'v']) {
          if (!canPlaceWall(state, t, r, c)) continue;
          const nh = new Set(state.walls.h), nv = new Set(state.walls.v);
          (t === 'h' ? nh : nv).add(wallKey(r, c));
          const w = { h: nh, v: nv };
          const gain = (dist(w, opp, oppGoal) - oppD) - (dist(w, state.pawns[me], myGoal) - myD);
          if (gain > bestGain) { bestGain = gain; bestWall = { t, r, c }; }
        }
      }
    }
    if (bestWall) return { kind: 'wall', type: bestWall.t, r: bestWall.r, c: bestWall.c };
  }

  if (bestMove) return { kind: 'move', r: bestMove.r, c: bestMove.c };
  if (moves.length) return { kind: 'move', r: moves[0].r, c: moves[0].c };
  return null;
}
