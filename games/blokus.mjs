// Blokus Duo — pure game logic (no DOM). A 14×14 board, flat array of 196 cells,
// index = row*14 + col, each cell null (empty) | 0 (player 0) | 1 (player 1).
// Each player owns the full set of 21 polyominoes (the 1 monomino through the
// twelve 5-cell pentominoes). Blokus Duo starts in the centre: player 0's first
// piece must cover (4,4), player 1's must cover (9,9). After the first piece,
// every piece a player lays must touch one of THAT player's own pieces only
// corner-to-corner — it may never share an edge with its own colour — and pieces
// never overlap. Sharing an edge with the OPPONENT is perfectly fine. The same
// file is import-able by node:test and inlined for the browser as the BLOKUS
// namespace. CAREFUL: player 0 is falsy, so emptiness/ownership are tested
// strictly (=== null / === player), never by truthiness.

export const SIZE = 14;
export const START = [[4, 4], [9, 9]]; // start cell each player's first piece must cover
const at = (r, c) => r * SIZE + c;
const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

const EDGES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CORNERS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// The 21 standard Blokus polyominoes, each a base set of [row,col] cells.
// id is the array index; name is the canonical letter. Larger pieces sort later.
export const PIECES = [
  { id: 0,  name: 'I1', cells: [[0, 0]] },                                     // 1
  { id: 1,  name: 'I2', cells: [[0, 0], [0, 1]] },                             // 2
  { id: 2,  name: 'I3', cells: [[0, 0], [0, 1], [0, 2]] },                     // 3
  { id: 3,  name: 'V3', cells: [[0, 0], [1, 0], [1, 1]] },                     // 3
  { id: 4,  name: 'I4', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },             // 4
  { id: 5,  name: 'O4', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },             // 4 square
  { id: 6,  name: 'T4', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },             // 4
  { id: 7,  name: 'L4', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },             // 4
  { id: 8,  name: 'S4', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },             // 4 skew
  { id: 9,  name: 'F',  cells: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },     // 5
  { id: 10, name: 'I5', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },     // 5
  { id: 11, name: 'L5', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]] },     // 5
  { id: 12, name: 'N',  cells: [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]] },     // 5
  { id: 13, name: 'P',  cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },     // 5
  { id: 14, name: 'T5', cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },     // 5
  { id: 15, name: 'U',  cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },     // 5
  { id: 16, name: 'V5', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },     // 5
  { id: 17, name: 'W',  cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },     // 5
  { id: 18, name: 'X',  cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },     // 5
  { id: 19, name: 'Y',  cells: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]] },     // 5
  { id: 20, name: 'Z',  cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] },     // 5
];

// All piece ids 0..20 — a convenient "full hand" for a new player.
export const ALL_PIECE_IDS = PIECES.map((p) => p.id);

// Translate a cell set so its top-left bounding corner sits at (0,0), then sort
// into a canonical order so two congruent sets compare equal.
function normalize(cells) {
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

const keyOf = (cells) => normalize(cells).map((c) => c.join(',')).join(';');

/// The unique orientations of a piece: the 8 symmetries (4 rotations × 2
/// reflections) with congruent duplicates removed. Each is a normalized cell
/// set anchored at (0,0). A monomino yields 1, an asymmetric piece (F, L, …)
/// yields 8, the X pentomino yields 1.
export function orientations(pieceCells) {
  const seen = new Map();
  let cur = pieceCells.map((c) => c.slice());
  for (let ref = 0; ref < 2; ref++) {
    for (let rot = 0; rot < 4; rot++) {
      const k = keyOf(cur);
      if (!seen.has(k)) seen.set(k, normalize(cur));
      cur = cur.map(([r, c]) => [c, -r]); // rotate 90° clockwise
    }
    cur = cur.map(([r, c]) => [r, -c]); // reflect across the vertical axis
  }
  return [...seen.values()];
}

/// A fresh, empty 14×14 board.
export function emptyBoard() {
  return Array(SIZE * SIZE).fill(null);
}

/// Cells placed so far by `player` (their score).
export function score(board, player) {
  let n = 0;
  for (const v of board) if (v === player) n++;
  return n;
}

// Has this player laid anything yet? Their first piece has special rules.
const hasPlayed = (board, player) => board.some((v) => v === player);

/// Full legality of laying `cells` (an oriented relative set) with its (0,0)
/// anchor at (atRow,atCol) for `player`. `isFirst` true means this is the
/// player's opening piece. A placement is legal iff every cell is on the board
/// and empty (no overlap), it shares no edge with the player's own colour, and
/// either — on the first piece — it covers the player's start cell, or — later —
/// it touches the player's own colour at a corner. Edge contact with the
/// OPPONENT is allowed.
export function canPlace(board, player, cells, atRow, atCol, isFirst) {
  const start = START[player];
  let coversStart = false;
  let touchesCorner = false;
  for (const [dr, dc] of cells) {
    const r = atRow + dr;
    const c = atCol + dc;
    if (!inB(r, c)) return false;          // off the board
    if (board[at(r, c)] !== null) return false; // overlap (any colour)
    if (start && r === start[0] && c === start[1]) coversStart = true;
    for (const [er, ec] of EDGES) {
      const nr = r + er;
      const nc = c + ec;
      if (inB(nr, nc) && board[at(nr, nc)] === player) return false; // own-edge: illegal
    }
    for (const [cr, cc] of CORNERS) {
      const nr = r + cr;
      const nc = c + cc;
      if (inB(nr, nc) && board[at(nr, nc)] === player) touchesCorner = true;
    }
  }
  if (isFirst) return coversStart;
  return touchesCorner;
}

/// Returns a NEW board with `player` laid over `cells` anchored at
/// (atRow,atCol). The input board is never mutated. Assumes the placement is
/// legal (validate with canPlace first).
export function place(board, player, cells, atRow, atCol) {
  const next = board.slice();
  for (const [dr, dc] of cells) next[at(atRow + dr, atCol + dc)] = player;
  return next;
}

// Internal enumerator: yields every legal {pieceId, cells, row, col} for
// `player` given the ids still in hand. Computes isFirst once. `cells` is the
// oriented relative set; pair it with (row,col) for place(). Callers that only
// need existence can stop at the first yield.
function* eachLegalPlacement(board, player, remainingPieceIds) {
  const isFirst = !hasPlayed(board, player);
  for (const pid of remainingPieceIds) {
    const piece = PIECES[pid];
    if (!piece) continue;
    for (const cells of orientations(piece.cells)) {
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (canPlace(board, player, cells, row, col, isFirst)) {
            yield { pieceId: pid, cells, row, col };
          }
        }
      }
    }
  }
}

/// Does `player` have at least one legal placement with the ids still in hand?
export function legalPlacementsExist(board, player, remainingPieceIds) {
  for (const _ of eachLegalPlacement(board, player, remainingPieceIds)) return true;
  return false;
}

/// Alias kept for callers that think in terms of "can this player still move?".
export function hasAnyMove(board, player, remainingPieceIds) {
  return legalPlacementsExist(board, player, remainingPieceIds);
}

/// A legal AI placement {pieceId, cells, row, col}, or null if none. Prefers
/// larger pieces (Blokus rewards shedding big shapes early); among the placements
/// of the largest still-playable piece it picks one at random for variety.
export function aiMove(board, player, remainingPieceIds) {
  const isFirst = !hasPlayed(board, player);
  // Try pieces from largest to smallest; first size with any legal placement wins.
  const ids = remainingPieceIds
    .filter((id) => PIECES[id])
    .sort((a, b) => PIECES[b].cells.length - PIECES[a].cells.length);
  let curSize = null;
  let bucket = [];
  for (const pid of ids) {
    const size = PIECES[pid].cells.length;
    if (curSize !== null && size !== curSize && bucket.length) break; // largest size exhausted
    curSize = size;
    for (const cells of orientations(PIECES[pid].cells)) {
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (canPlace(board, player, cells, row, col, isFirst)) {
            bucket.push({ pieceId: pid, cells, row, col });
          }
        }
      }
    }
  }
  if (!bucket.length) return null;
  return bucket[Math.floor(Math.random() * bucket.length)];
}
