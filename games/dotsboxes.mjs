// Dots & Boxes — pure game logic (no DOM). A 5×5 lattice of dots frames a 4×4
// grid of boxes joined by edges. Edges live in two sets: `h` (horizontal, drawn
// between two side-by-side dots) and `v` (vertical, between two stacked dots). A
// move fills one empty edge; sealing the 4th side of a box claims it for the
// mover, who then plays again. The game ends once every box is owned — the most
// boxes wins. The same files are import-able by node:test and inlined for the
// browser as the DOTSBOXES namespace.

export const DOTS = 5;        // dots per side
const N = DOTS - 1;           // boxes per side (also h-edges per row, v-edge rows)

// Horizontal edges: DOTS rows × N cols, index = r*N + c.
// Vertical   edges: N rows × DOTS cols, index = r*DOTS + c.
// Boxes:            N rows × N cols,    index = br*N + bc.
const H_COUNT = DOTS * N;
const V_COUNT = N * DOTS;
export const BOXES = N * N;

// The four edge references [set, index] that border box `b`.
function boxSides(b) {
  const br = Math.floor(b / N);
  const bc = b % N;
  return [
    ['h', br * N + bc],         // top
    ['h', (br + 1) * N + bc],   // bottom
    ['v', br * DOTS + bc],      // left
    ['v', br * DOTS + bc + 1],  // right
  ];
}

// The boxes an edge borders: one along the rim of the grid, two inside it.
function boxesOfEdge(type, index) {
  const out = [];
  if (type === 'h') {
    const r = Math.floor(index / N);
    const c = index % N;
    if (r - 1 >= 0) out.push((r - 1) * N + c); // box above
    if (r < N) out.push(r * N + c);            // box below
  } else {
    const r = Math.floor(index / DOTS);
    const c = index % DOTS;
    if (c - 1 >= 0) out.push(r * N + (c - 1)); // box to the left
    if (c < N) out.push(r * N + c);            // box to the right
  }
  return out;
}

const isFilled = (model, type, index) => (type === 'h' ? model.h : model.v)[index];

// How many of box `b`'s four sides are currently drawn.
function sidesDrawn(model, b) {
  let n = 0;
  for (const [t, i] of boxSides(b)) if (isFilled(model, t, i)) n++;
  return n;
}

/// A fresh game: every edge empty, no box owned, player 0 to move, scores 0–0.
export function newGame() {
  return {
    h: Array(H_COUNT).fill(false),
    v: Array(V_COUNT).fill(false),
    owner: Array(BOXES).fill(null),
    turn: 0,
    scores: [0, 0],
  };
}

/// Every still-empty edge, as {type:'h'|'v', index} (horizontals first).
export function legalEdges(model) {
  const out = [];
  for (let i = 0; i < model.h.length; i++) if (!model.h[i]) out.push({ type: 'h', index: i });
  for (let i = 0; i < model.v.length; i++) if (!model.v[i]) out.push({ type: 'v', index: i });
  return out;
}

/// Returns a NEW model with `edge` drawn. Any box it completes is assigned to the
/// current player and the SAME player moves again; if no box is completed the
/// turn passes. The input model is never mutated.
export function claimEdge(model, type, index) {
  const next = {
    h: model.h.slice(),
    v: model.v.slice(),
    owner: model.owner.slice(),
    turn: model.turn,
    scores: model.scores.slice(),
  };
  if (type === 'h') next.h[index] = true;
  else next.v[index] = true;

  let claimed = 0;
  for (const b of boxesOfEdge(type, index)) {
    if (next.owner[b] === null && sidesDrawn(next, b) === 4) {
      next.owner[b] = next.turn;
      next.scores[next.turn]++;
      claimed++;
    }
  }
  // Completing one or two boxes earns another turn; otherwise play passes.
  if (claimed === 0) next.turn = next.turn === 0 ? 1 : 0;
  return next;
}

/// True once every box is owned (equivalently, every edge is drawn).
export function isOver(model) {
  return model.owner.every((o) => o !== null);
}

/// 0 | 1 | 'draw' once the board is full, else null. Decided by box count.
export function winner(model) {
  if (!isOver(model)) return null;
  let a = 0;
  let b = 0;
  for (const o of model.owner) {
    if (o === 0) a++;
    else if (o === 1) b++;
  }
  if (a > b) return 0;
  if (b > a) return 1;
  return 'draw';
}

// Boxes this edge would complete (those sitting at 3 drawn sides already).
function edgeCompletes(model, type, index) {
  let n = 0;
  for (const b of boxesOfEdge(type, index)) if (sidesDrawn(model, b) === 3) n++;
  return n;
}

// Would drawing this edge hand a box its giveaway 3rd side?
function edgeGivesThird(model, type, index) {
  for (const b of boxesOfEdge(type, index)) if (sidesDrawn(model, b) === 2) return true;
  return false;
}

/// Heuristic AI as {type, index} (or null if the board is full):
/// 1) take any edge that completes a box; 2) else any edge that does not give an
/// opponent a 3rd side; 3) else any remaining edge.
export function bestMove(model) {
  const edges = legalEdges(model);
  if (!edges.length) return null;
  for (const e of edges) if (edgeCompletes(model, e.type, e.index) > 0) return e;
  const safe = edges.filter((e) => !edgeGivesThird(model, e.type, e.index));
  if (safe.length) return safe[0];
  return edges[0];
}
