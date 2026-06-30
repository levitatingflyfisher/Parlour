// Crazy Eights — pure game logic (no DOM). A standard 52-card deck; a card is
// { rank, suit } where rank is 2..14 (11=J, 12=Q, 13=K, 14=A) and suit is an
// index 0..3 into '♠♥♦♣'. You may play a card on the discard pile when it is an
// eight (wild), matches the top card's rank, or matches the currently active
// suit. After an eight is played the player names a new active suit, so the
// active suit can differ from the printed suit of the top card.

export const SUITS = ['♠', '♥', '♦', '♣'];

/// Display label for a rank: numbers as-is, then J/Q/K/A for 11..14.
export function rankLabel(rank) {
  if (rank <= 10) return String(rank);
  return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rank];
}

/// A fresh ordered 52-card deck: every rank 2..14 in every suit 0..3.
export function makeDeck() {
  const deck = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/// Fisher-Yates shuffle into a NEW array (the input is never mutated). `rng`
/// is injectable and must return a float in [0, 1); defaults to Math.random.
export function shuffle(deck, rng = Math.random) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/// Deal `handSize` cards to each of two players from the (already shuffled)
/// deck, turn the next card face-up as the discard pile, and keep the rest as
/// the draw pile. Returns { p0, p1, draw, discard:[topCard], activeSuit }.
/// The active suit starts as the top card's printed suit.
export function deal(deck, handSize = 7) {
  const p0 = deck.slice(0, handSize);
  const p1 = deck.slice(handSize, handSize * 2);
  const top = deck[handSize * 2];
  const draw = deck.slice(handSize * 2 + 1);
  return { p0, p1, draw, discard: [top], activeSuit: top.suit };
}

/// True when `card` may be played onto `topCard`: any eight is wild, otherwise
/// the rank must match the top card or the suit must match the active suit.
export function canPlay(card, topCard, activeSuit) {
  return card.rank === 8 || card.rank === topCard.rank || card.suit === activeSuit;
}

/// Every card in `hand` that is currently legal to play.
export function legalPlays(hand, topCard, activeSuit) {
  return hand.filter((c) => canPlay(c, topCard, activeSuit));
}

/// The card the computer should play, or null when it must draw. Prefers a
/// legal non-eight (saving its wild eights for later), then a legal eight,
/// then null when nothing at all is legal.
export function aiPlay(hand, topCard, activeSuit) {
  const legal = legalPlays(hand, topCard, activeSuit);
  if (!legal.length) return null;
  const nonEight = legal.find((c) => c.rank !== 8);
  return nonEight || legal[0];
}

/// The suit the computer should declare after playing an eight: whichever suit
/// it holds the most of (lowest suit index breaks ties). Returns 0 for an empty
/// hand (where the choice is moot — the player has already emptied their hand).
export function aiSuit(hand) {
  const counts = [0, 0, 0, 0];
  for (const c of hand) counts[c.suit]++;
  let best = 0;
  for (let s = 1; s < 4; s++) {
    if (counts[s] > counts[best]) best = s;
  }
  return best;
}
