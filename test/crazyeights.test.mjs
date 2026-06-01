import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeDeck, shuffle, deal, canPlay, legalPlays, aiPlay, aiSuit, rankLabel,
} from '../games/crazyeights.mjs';

const card = (rank, suit) => ({ rank, suit });

test('makeDeck is 52 unique cards spanning every rank and suit', () => {
  const deck = makeDeck();
  assert.equal(deck.length, 52);
  const keys = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
  assert.equal(keys.size, 52);
  // ranks 2..14 in suits 0..3, nothing out of range.
  for (const c of deck) {
    assert.ok(c.rank >= 2 && c.rank <= 14);
    assert.ok(c.suit >= 0 && c.suit <= 3);
  }
});

test('shuffle returns a new array, keeps every card, and is deterministic for a seeded rng', () => {
  const deck = makeDeck();
  let n = 0;
  const seq = [0.9, 0.1, 0.5, 0.42, 0.7, 0.3, 0.8, 0.2, 0.6, 0.05];
  const rng = () => seq[n++ % seq.length];
  const a = shuffle(deck, rng);
  assert.equal(a.length, 52);
  assert.notEqual(a, deck); // a fresh array
  assert.deepEqual(deck, makeDeck()); // input untouched
  assert.equal(new Set(a.map((c) => `${c.rank}-${c.suit}`)).size, 52);
  // same seed -> same order.
  n = 0;
  assert.deepEqual(shuffle(deck, () => seq[n++ % seq.length]), a);
});

test('deal hands out two hands, a discard array, a draw pile, and an active suit', () => {
  const deck = makeDeck();
  const { p0, p1, draw, discard, activeSuit } = deal(deck, 7);
  assert.equal(p0.length, 7);
  assert.equal(p1.length, 7);
  assert.ok(Array.isArray(discard));
  assert.equal(discard.length, 1);
  assert.equal(draw.length, 52 - 7 - 7 - 1);
  assert.equal(activeSuit, discard[0].suit);
  // every dealt card is accounted for exactly once.
  const all = [...p0, ...p1, ...draw, ...discard];
  assert.equal(all.length, 52);
});

test('canPlay matches on rank', () => {
  const top = card(5, 0); // 5♠
  assert.ok(canPlay(card(5, 2), top, 0)); // 5♦ matches rank 5
});

test('canPlay matches on the active suit', () => {
  const top = card(5, 0); // 5♠, active suit ♠ (0)
  assert.ok(canPlay(card(9, 0), top, 0)); // 9♠ matches suit
  assert.ok(!canPlay(card(9, 1), top, 0)); // 9♥ matches neither
});

test('canPlay allows any eight regardless of rank or suit', () => {
  const top = card(5, 0);
  assert.ok(canPlay(card(8, 3), top, 0)); // 8♣ is wild even off-rank/off-suit
  assert.ok(canPlay(card(8, 1), top, 0));
});

test('canPlay respects the active suit after an eight (not the printed suit)', () => {
  // The top card is an 8 of ♠ (suit 0) but the player declared ♥ (suit 1).
  const top = card(8, 0);
  const activeSuit = 1; // ♥
  // A non-eight ♥ is playable only because activeSuit governs.
  assert.ok(canPlay(card(4, 1), top, activeSuit));
  // A non-eight ♠ matches the printed suit but NOT the active suit -> illegal.
  assert.ok(!canPlay(card(4, 0), top, activeSuit));
  // And a same-rank-as-8 card (rank 8) would be a wild anyway, so use rank 9:
  assert.ok(!canPlay(card(9, 0), top, activeSuit));
});

test('legalPlays filters the hand to playable cards only', () => {
  const top = card(5, 0); // 5♠, active ♠
  const hand = [
    card(5, 2), // matches rank
    card(9, 0), // matches suit
    card(8, 1), // wild eight
    card(2, 1), // matches nothing
    card(13, 3), // matches nothing
  ];
  const legal = legalPlays(hand, top, 0);
  assert.equal(legal.length, 3);
  assert.deepEqual(legal, [card(5, 2), card(9, 0), card(8, 1)]);
});

test('aiPlay prefers a legal non-eight over an eight', () => {
  const top = card(5, 0); // active ♠
  const hand = [card(8, 1), card(9, 0)]; // eight + a suit match
  const chosen = aiPlay(hand, top, 0);
  assert.deepEqual(chosen, card(9, 0)); // the non-eight
});

test('aiPlay falls back to an eight when no non-eight is legal', () => {
  const top = card(5, 0); // active ♠
  const hand = [card(8, 2), card(2, 1), card(13, 1)]; // only the eight is legal
  assert.deepEqual(aiPlay(hand, top, 0), card(8, 2));
});

test('aiPlay returns null only when nothing is legal', () => {
  const top = card(5, 0); // active ♠
  const hand = [card(2, 1), card(13, 1), card(7, 2)]; // no rank/suit match, no eight
  assert.equal(aiPlay(hand, top, 0), null);
});

test('aiSuit returns the most-common suit in the hand', () => {
  const hand = [card(2, 2), card(7, 2), card(9, 2), card(3, 0), card(4, 1)];
  assert.equal(aiSuit(hand), 2); // three ♦ beats one ♠ and one ♥
});

test('aiSuit breaks ties by the lowest suit index', () => {
  const hand = [card(2, 1), card(3, 0)]; // one ♥, one ♠ — tie -> ♠ (0)
  assert.equal(aiSuit(hand), 0);
});

test('rankLabel renders face cards and the ace', () => {
  assert.equal(rankLabel(2), '2');
  assert.equal(rankLabel(10), '10');
  assert.equal(rankLabel(11), 'J');
  assert.equal(rankLabel(12), 'Q');
  assert.equal(rankLabel(13), 'K');
  assert.equal(rankLabel(14), 'A');
});
