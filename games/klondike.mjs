// Klondike Solitaire — pure logic, no DOM. A "state" is an immutable snapshot
// {tableau:[7 piles], foundations:[4 piles], stock:[], waste:[]}. A card is
// {rank:1..13, suit:0..3, faceUp:bool}. Every move helper returns a NEW state
// (deep-copied) on success and the SAME state object unchanged when the move is
// illegal — so callers can compare by reference to detect a no-op.
//
// NOTE: each constant is its own `export` so the single-file build bundler
// (build.mjs) — which captures one identifier per `export` — keeps all of them.

// Suit glyphs. Colour alternates by index parity: even = black, odd = red.
export const SUITS = ['♠', '♥', '♣', '♦']; // ♠ ♥ ♣ ♦
// Rank labels, indexed by rank-1 (rank 1 = Ace … rank 13 = King).
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/// True when `suit` is a red suit (hearts ♥ or diamonds ♦). Odd indices are red.
export function isRed(suit) {
  return suit % 2 === 1;
}

/// A fresh, ordered 52-card deck (all face-down). Suit-major, Ace→King.
export function makeDeck() {
  const deck = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  return deck;
}

/// Deep-copy a state so move helpers never mutate their input.
function cloneState(s) {
  const copyPile = (p) => p.map((c) => ({ rank: c.rank, suit: c.suit, faceUp: c.faceUp }));
  return {
    tableau: s.tableau.map(copyPile),
    foundations: s.foundations.map(copyPile),
    stock: copyPile(s.stock),
    waste: copyPile(s.waste),
  };
}

/// If a tableau pile's new top is face-down, turn it face-up (mutates the pile).
function flipTop(pile) {
  if (pile.length && !pile[pile.length - 1].faceUp) pile[pile.length - 1].faceUp = true;
}

/// Deal a deck into a Klondike layout: tableau pile i (0-based) gets i+1 cards,
/// only each pile's top card face-up; the remaining 24 cards form the (face-down)
/// stock. Foundations and waste start empty. The deck is copied, not mutated.
export function deal(deck) {
  const d = deck.map((c) => ({ rank: c.rank, suit: c.suit, faceUp: false }));
  const tableau = [[], [], [], [], [], [], []];
  let idx = 0;
  for (let round = 0; round < 7; round++) {
    for (let pile = round; pile < 7; pile++) {
      tableau[pile].push(d[idx++]);
    }
  }
  for (const pile of tableau) if (pile.length) pile[pile.length - 1].faceUp = true;
  const stock = d.slice(idx); // 24 cards, all face-down
  return {
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
  };
}

/// Tableau stacking rule. With `ontoCard` null/undefined (an empty pile) only a
/// King may land. Otherwise `card` must be one rank lower AND the opposite
/// colour of `ontoCard`.
export function canStack(card, ontoCard) {
  if (!ontoCard) return card.rank === 13;
  return card.rank === ontoCard.rank - 1 && isRed(card.suit) !== isRed(ontoCard.suit);
}

/// Foundation rule. An empty foundation accepts only an Ace; otherwise `card`
/// must be the same suit and exactly one rank higher than the foundation's top.
export function canFoundation(card, foundationPile) {
  if (!foundationPile.length) return card.rank === 1;
  const top = foundationPile[foundationPile.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

/// True when the `count` topmost cards of `pile` form a liftable run: all
/// face-up and each card validly stacked on the one beneath it.
function isLiftableRun(pile, count) {
  if (count < 1 || count > pile.length) return false;
  const run = pile.slice(pile.length - count);
  for (const c of run) if (!c.faceUp) return false;
  for (let i = 1; i < run.length; i++) {
    if (!canStack(run[i], run[i - 1])) return false;
  }
  return true;
}

/// Turn one card from stock to waste (face-up). When the stock is empty, recycle
/// the waste back into a face-down stock (reversed) and leave the waste empty.
/// A no-op (stock and waste both empty) returns the same state.
export function drawFromStock(state) {
  if (state.stock.length > 0) {
    const next = cloneState(state);
    const card = next.stock.pop();
    card.faceUp = true;
    next.waste.push(card);
    return next;
  }
  if (state.waste.length === 0) return state;
  const next = cloneState(state);
  next.stock = next.waste.reverse().map((c) => ({ rank: c.rank, suit: c.suit, faceUp: false }));
  next.waste = [];
  return next;
}

/// Find the index of a foundation that accepts `card`, or -1 if none.
function foundationFor(state, card) {
  for (let i = 0; i < state.foundations.length; i++) {
    if (canFoundation(card, state.foundations[i])) return i;
  }
  return -1;
}

/// Move the top card of tableau pile `src` onto a matching foundation, flipping
/// the newly exposed tableau card. Returns the same state if illegal.
export function moveToFoundation(state, src) {
  const pile = state.tableau[src];
  if (!pile || !pile.length) return state;
  const card = pile[pile.length - 1];
  if (!card.faceUp) return state;
  const f = foundationFor(state, card);
  if (f === -1) return state;
  const next = cloneState(state);
  next.foundations[f].push(next.tableau[src].pop());
  flipTop(next.tableau[src]);
  return next;
}

/// Move a face-up run of `count` cards from tableau pile `fromPile` onto
/// `toPile`, flipping the newly exposed source card. Returns the same state if
/// the run is not liftable or the landing card cannot stack on the destination.
export function moveTableauToTableau(state, fromPile, count, toPile) {
  if (fromPile === toPile) return state;
  const from = state.tableau[fromPile];
  const to = state.tableau[toPile];
  if (!from || !to) return state;
  if (!isLiftableRun(from, count)) return state;
  const moving = from[from.length - count]; // the card that lands on the dest
  const destTop = to.length ? to[to.length - 1] : null;
  if (!canStack(moving, destTop)) return state;
  const next = cloneState(state);
  const run = next.tableau[fromPile].splice(next.tableau[fromPile].length - count, count);
  for (const c of run) next.tableau[toPile].push(c);
  flipTop(next.tableau[fromPile]);
  return next;
}

/// Move the top waste card onto tableau pile `toPile`. Same state if illegal.
export function moveWasteToTableau(state, toPile) {
  if (!state.waste.length) return state;
  const to = state.tableau[toPile];
  if (!to) return state;
  const card = state.waste[state.waste.length - 1];
  const destTop = to.length ? to[to.length - 1] : null;
  if (!canStack(card, destTop)) return state;
  const next = cloneState(state);
  next.tableau[toPile].push(next.waste.pop());
  return next;
}

/// Move the top waste card onto a matching foundation. Same state if illegal.
export function moveWasteToFoundation(state) {
  if (!state.waste.length) return state;
  const card = state.waste[state.waste.length - 1];
  const f = foundationFor(state, card);
  if (f === -1) return state;
  const next = cloneState(state);
  next.foundations[f].push(next.waste.pop());
  return next;
}

/// Won when all 52 cards sit on the foundations.
export function isWon(state) {
  let n = 0;
  for (const f of state.foundations) n += f.length;
  return n === 52;
}
