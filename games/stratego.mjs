// Stratego — pure game logic (no DOM). A 10x10 board held as a flat array of
// 100 cells, index = row*10 + col. Each cell is null or a piece object
// {owner, rank, revealed}. owner is 0 (Player 1, bottom rows 6-9) or 1
// (Player 2, top rows 0-3). rank is a number 1..10 or 'B' (Bomb) or 'F' (Flag).
//
// Ranks: Marshal 10, General 9, Colonel 8, Major 7, Captain 6, Lieutenant 5,
// Sergeant 4, Miner 3, Scout 2, Spy 1, plus Bomb 'B' and Flag 'F'. Two 2x2
// lakes sit in the centre (rows 4-5, cols 2-3 and cols 6-7) and are impassable.
//
// Combat: higher rank wins; equal ranks remove both; the Spy beats the Marshal
// ONLY when the Spy attacks; a Miner defuses a Bomb, any other attacker loses to
// a Bomb; attacking the Flag wins the game.

export const SIZE = 10;

// Internal rank constants (kept in the IIFE scope, not part of the namespace).
const MARSHAL = 10;
const MINER = 3;
const SCOUT = 2;
const SPY = 1;
const BOMB = 'B';
const FLAG = 'F';

const at = (r, c) => r * SIZE + c;
const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Long-form names, handy for the UI and for status lines.
const NAMES = {
  10: 'Marshal', 9: 'General', 8: 'Colonel', 7: 'Major', 6: 'Captain',
  5: 'Lieutenant', 4: 'Sergeant', 3: 'Miner', 2: 'Scout', 1: 'Spy',
  B: 'Bomb', F: 'Flag',
};
// Compact glyph shown on a board square.
const GLYPHS = {
  10: '10', 9: '9', 8: '8', 7: '7', 6: '6',
  5: '5', 4: '4', 3: '3', 2: '2', 1: 'S',
  B: '✸', F: '⚑',
};

/// The standard per-side piece census, keyed by rank. Sums to 40.
export function pieceCounts() {
  return { 10: 1, 9: 1, 8: 2, 7: 3, 6: 4, 5: 4, 4: 4, 3: 5, 2: 8, 1: 1, B: 6, F: 1 };
}

/// Long-form rank name, e.g. rankName(10) === 'Marshal', rankName('B') === 'Bomb'.
export function rankName(rank) {
  return NAMES[rank] || String(rank);
}

/// Compact board glyph for a rank.
export function rankGlyph(rank) {
  return GLYPHS[rank] || String(rank);
}

/// True when (r,c) is one of the four lake squares — rows 4-5, cols 2-3 / 6-7.
export function isLake(r, c) {
  return (r === 4 || r === 5) && ((c === 2 || c === 3) || (c === 6 || c === 7));
}

/// A fresh, empty 10x10 board.
export function emptyBoard() {
  return Array(SIZE * SIZE).fill(null);
}

/// The flat indices of `owner`'s four home rows, front-to-back from the centre.
/// Player 0 owns rows 9,8,7,6; Player 1 owns rows 0,1,2,3. None are lakes.
export function setupIndices(owner) {
  const rows = owner === 0 ? [9, 8, 7, 6] : [0, 1, 2, 3];
  const out = [];
  for (const r of rows) for (let c = 0; c < SIZE; c++) out.push(at(r, c));
  return out;
}

/// A bag of all 40 piece objects for `owner`, in census order (unshuffled).
/// Callers shuffle this and zip it against setupIndices(owner) to place pieces.
export function pieceBag(owner) {
  const counts = pieceCounts();
  const bag = [];
  for (const rank of Object.keys(counts)) {
    const key = rank === 'B' || rank === 'F' ? rank : Number(rank);
    for (let i = 0; i < counts[rank]; i++) bag.push({ owner, rank: key, revealed: false });
  }
  return bag;
}

const isFixed = (rank) => rank === BOMB || rank === FLAG;

/// The destination indices a piece at `pos` may move or attack into. Bombs and
/// the Flag never move. Scouts slide any number of clear orthogonal squares and
/// may strike an enemy at the end of that run. Every other piece steps one
/// orthogonal square. No piece may enter a lake or a square held by its owner.
export function legalMoves(board, pos) {
  const piece = board[pos];
  if (!piece || isFixed(piece.rank)) return [];
  const r0 = Math.floor(pos / SIZE);
  const c0 = pos % SIZE;
  const out = [];
  const maxStep = piece.rank === SCOUT ? SIZE : 1;
  for (const [dr, dc] of DIRS) {
    let r = r0 + dr;
    let c = c0 + dc;
    let step = 0;
    while (step < maxStep && inBounds(r, c) && !isLake(r, c)) {
      const target = board[at(r, c)];
      if (!target) {
        out.push(at(r, c)); // empty — slide on
      } else {
        if (target.owner !== piece.owner) out.push(at(r, c)); // enemy — attack, then stop
        break; // any piece (friend or foe) blocks further travel
      }
      r += dr;
      c += dc;
      step++;
    }
  }
  return out;
}

/// The verdict of an attack: 'attacker', 'defender', or 'both' (mutual loss).
/// Resolution order matters: the Flag is captured by anyone; a Bomb is only
/// defused by a Miner; the Spy uniquely fells the Marshal when it is the one
/// attacking; equal ranks trade off; otherwise the higher rank prevails.
export function resolveCombat(attackerRank, defenderRank) {
  if (defenderRank === FLAG) return 'attacker';
  if (defenderRank === BOMB) return attackerRank === MINER ? 'attacker' : 'defender';
  if (attackerRank === SPY && defenderRank === MARSHAL) return 'attacker';
  if (attackerRank === defenderRank) return 'both';
  return attackerRank > defenderRank ? 'attacker' : 'defender';
}

/// Apply a move or attack, returning a NEW board (the input is never mutated).
/// A plain move relocates the piece. An attack runs resolveCombat: the winner
/// ends up on the destination square and is marked revealed; on a mutual loss
/// both squares clear; a Bomb that survives stays put and is revealed.
export function applyMove(board, from, to) {
  const next = board.map((p) => (p ? { ...p } : null));
  const mover = next[from];
  if (!mover) return next;
  const target = next[to];
  if (!target) {
    next[to] = mover;
    next[from] = null;
    return next;
  }
  const verdict = resolveCombat(mover.rank, target.rank);
  if (verdict === 'attacker') {
    mover.revealed = true;
    next[to] = mover;
    next[from] = null;
  } else if (verdict === 'defender') {
    target.revealed = true; // stays on `to`
    next[from] = null;
  } else {
    next[from] = null;
    next[to] = null;
  }
  return next;
}

/// True when `owner` has at least one piece with a legal move.
export function hasAnyMove(board, owner) {
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (p && p.owner === owner && legalMoves(board, i).length) return true;
  }
  return false;
}

/// The winning owner (0 or 1) or null. A side wins by capturing the opponent's
/// Flag, or when the opponent has no legal move left. Flag capture is checked
/// first. Returns null while the game is still live.
export function winner(board) {
  let flag0 = false;
  let flag1 = false;
  for (const p of board) {
    if (p && p.rank === FLAG) {
      if (p.owner === 0) flag0 = true;
      else flag1 = true;
    }
  }
  if (!flag0) return 1;
  if (!flag1) return 0;
  if (!hasAnyMove(board, 0)) return 1;
  if (!hasAnyMove(board, 1)) return 0;
  return null;
}
