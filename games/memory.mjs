// Memory (concentration) — pure deck logic. Two of every symbol, shuffled with
// an injectable rng (so the shuffle is testable). Matching/turns live in the UI.

/// A shuffled deck: each symbol appears twice, every card has a unique id.
export function newDeck(symbols, rng = Math.random) {
  const cards = [];
  symbols.forEach((sym, s) => {
    cards.push({ id: s * 2, sym });
    cards.push({ id: s * 2 + 1, sym });
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
