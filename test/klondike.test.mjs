import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUITS, RANKS, isRed, makeDeck, deal, canStack, canFoundation,
  drawFromStock, moveToFoundation, moveTableauToTableau,
  moveWasteToTableau, moveWasteToFoundation, isWon,
} from '../games/klondike.mjs';

// --- small helpers for building literal cards/states -----------------------
const card = (rank, suit, faceUp = true) => ({ rank, suit, faceUp });
// suits: 0=♠ black, 1=♥ red, 2=♣ black, 3=♦ red
const SPADE = 0, HEART = 1, CLUB = 2, DIAMOND = 3;

function emptyState() {
  return {
    tableau: [[], [], [], [], [], [], []],
    foundations: [[], [], [], []],
    stock: [],
    waste: [],
  };
}

test('makeDeck builds 52 unique cards, all face-down', () => {
  const d = makeDeck();
  assert.equal(d.length, 52);
  const seen = new Set(d.map((c) => c.rank + ':' + c.suit));
  assert.equal(seen.size, 52);
  assert.ok(d.every((c) => c.faceUp === false));
  assert.equal(SUITS.length, 4);
  assert.equal(RANKS.length, 13);
});

test('isRed: odd suit indices are red, even are black', () => {
  assert.equal(isRed(SPADE), false);
  assert.equal(isRed(HEART), true);
  assert.equal(isRed(CLUB), false);
  assert.equal(isRed(DIAMOND), true);
});

test('a fresh deal: 28 tableau cards, exactly the 7 tops face-up, 24 stock, empty foundations/waste', () => {
  const state = deal(makeDeck());
  assert.equal(state.tableau.length, 7);
  let total = 0, faceUp = 0;
  state.tableau.forEach((pile, i) => {
    assert.equal(pile.length, i + 1, `pile ${i} should hold ${i + 1} cards`);
    total += pile.length;
    pile.forEach((c, j) => {
      const isTop = j === pile.length - 1;
      assert.equal(c.faceUp, isTop, `card ${j} of pile ${i} face-up should be ${isTop}`);
      if (c.faceUp) faceUp += 1;
    });
  });
  assert.equal(total, 28, '28 cards across the tableau');
  assert.equal(faceUp, 7, 'exactly the 7 pile tops face-up');
  assert.equal(state.stock.length, 24);
  assert.ok(state.stock.every((c) => c.faceUp === false), 'stock is face-down');
  assert.equal(state.waste.length, 0);
  assert.equal(state.foundations.length, 4);
  assert.ok(state.foundations.every((f) => f.length === 0));
  // conservation: 28 + 24 = 52
  assert.equal(total + state.stock.length, 52);
});

test('deal does not mutate the source deck', () => {
  const deck = makeDeck();
  deal(deck);
  assert.ok(deck.every((c) => c.faceUp === false), 'source deck untouched');
});

test('canStack: descending rank + ALTERNATING colour', () => {
  // red 7 on black 8 → ok (descending, alternating)
  assert.equal(canStack(card(7, HEART), card(8, SPADE)), true);
  // black 7 on red 8 → ok
  assert.equal(canStack(card(7, CLUB), card(8, DIAMOND)), true);
  // red 7 on red 8 → same colour → reject
  assert.equal(canStack(card(7, HEART), card(8, DIAMOND)), false);
  // black 7 on black 8 → same colour → reject
  assert.equal(canStack(card(7, SPADE), card(8, CLUB)), false);
  // not descending by one (6 on 8) → reject even if alternating
  assert.equal(canStack(card(6, HEART), card(8, SPADE)), false);
  // ascending (9 on 8) → reject
  assert.equal(canStack(card(9, HEART), card(8, SPADE)), false);
});

test('canStack: an empty tableau pile (null) accepts only a King', () => {
  assert.equal(canStack(card(13, SPADE), null), true);
  assert.equal(canStack(card(13, HEART), null), true);
  assert.equal(canStack(card(12, SPADE), null), false);
  assert.equal(canStack(card(1, HEART), null), false);
  assert.equal(canStack(card(13, SPADE), undefined), true);
});

test('canFoundation: Ace-first, then ascending same-suit', () => {
  assert.equal(canFoundation(card(1, HEART), []), true, 'Ace onto empty foundation');
  assert.equal(canFoundation(card(2, HEART), []), false, 'non-Ace onto empty foundation');
  const aceH = [card(1, HEART)];
  assert.equal(canFoundation(card(2, HEART), aceH), true, '2♥ on A♥');
  assert.equal(canFoundation(card(3, HEART), aceH), false, 'must be exactly +1');
  assert.equal(canFoundation(card(2, DIAMOND), aceH), false, 'wrong suit rejected');
  assert.equal(canFoundation(card(2, SPADE), aceH), false, 'wrong suit rejected');
});

test('drawFromStock: turns one card face-up onto the waste', () => {
  const s = emptyState();
  s.stock = [card(5, SPADE, false), card(9, HEART, false)]; // top = last
  const out = drawFromStock(s);
  assert.notEqual(out, s, 'returns a new state');
  assert.equal(s.stock.length, 2, 'input untouched');
  assert.equal(out.stock.length, 1);
  assert.equal(out.waste.length, 1);
  assert.deepEqual(out.waste[0], card(9, HEART, true), 'drawn card is face-up on waste');
});

test('drawFromStock: an empty stock recycles the waste (reversed, face-down)', () => {
  const s = emptyState();
  s.waste = [card(2, SPADE, true), card(3, HEART, true), card(4, CLUB, true)];
  const out = drawFromStock(s);
  assert.equal(out.waste.length, 0, 'waste emptied');
  assert.equal(out.stock.length, 3, 'all waste cards back in stock');
  assert.ok(out.stock.every((c) => c.faceUp === false), 'recycled stock is face-down');
  // reversed: last-drawn (top of waste) becomes the bottom of the new stock
  assert.deepEqual(out.stock.map((c) => c.rank), [4, 3, 2]);
  // stock + waste both empty → genuine no-op (returns same reference)
  const empty = emptyState();
  assert.equal(drawFromStock(empty), empty, 'both empty is a no-op (same ref)');
});

test('moveTableauToTableau: moving the last face-up card flips the new tableau top', () => {
  const s = emptyState();
  // pile 0: a face-down 9♥ under a face-up 6♠  (6♠ is the only face-up card)
  s.tableau[0] = [card(9, HEART, false), card(6, SPADE, true)];
  // pile 1: a face-up red 7♦ to receive the black 6♠
  s.tableau[1] = [card(7, DIAMOND, true)];
  const out = moveTableauToTableau(s, 0, 1, 1);
  assert.notEqual(out, s, 'legal move returns new state');
  assert.equal(out.tableau[0].length, 1, '6♠ left pile 0');
  assert.equal(out.tableau[0][0].faceUp, true, 'the freshly exposed 9♥ flipped face-up');
  assert.deepEqual(out.tableau[1].map((c) => c.rank), [7, 6]);
  // original state untouched
  assert.equal(s.tableau[0][0].faceUp, false);
});

test('moveTableauToTableau: rejects same-colour / non-descending landings', () => {
  const s = emptyState();
  s.tableau[0] = [card(6, HEART, true)];   // red 6
  s.tableau[1] = [card(7, DIAMOND, true)]; // red 7 — same colour
  assert.equal(moveTableauToTableau(s, 0, 1, 1), s, 'same-colour landing rejected (no-op)');
});

test('moveTableauToTableau: moves a valid multi-card run', () => {
  const s = emptyState();
  // run on pile 0: red8, black7, red6 (descending, alternating)
  s.tableau[0] = [card(10, SPADE, false), card(8, HEART, true), card(7, SPADE, true), card(6, DIAMOND, true)];
  s.tableau[1] = [card(9, CLUB, true)]; // black 9 receives red 8 head of run
  const out = moveTableauToTableau(s, 0, 3, 1);
  assert.equal(out.tableau[1].map((c) => c.rank).join(','), '9,8,7,6');
  assert.equal(out.tableau[0].length, 1);
  assert.equal(out.tableau[0][0].faceUp, true, 'exposed 10♠ flipped');
  // a broken run (not internally stacked) cannot lift
  const bad = emptyState();
  bad.tableau[0] = [card(8, HEART, true), card(5, SPADE, true)]; // 5 not on 8
  bad.tableau[1] = [card(9, CLUB, true)];
  assert.equal(moveTableauToTableau(bad, 0, 2, 1), bad, 'broken run rejected');
});

test('moveToFoundation / moveWasteToFoundation enforce the foundation rule', () => {
  const s = emptyState();
  s.foundations[0] = [card(1, HEART)]; // A♥
  s.tableau[0] = [card(8, SPADE, false), card(2, HEART, true)]; // 2♥ on top
  const out = moveToFoundation(s, 0);
  assert.equal(out.foundations[0].map((c) => c.rank).join(','), '1,2');
  assert.equal(out.tableau[0].length, 1);
  assert.equal(out.tableau[0][0].faceUp, true, 'exposed source card flipped');
  // illegal: a 3♥ has no home yet (foundation top is A♥)
  const s2 = emptyState();
  s2.foundations[0] = [card(1, HEART)];
  s2.tableau[0] = [card(3, HEART, true)];
  assert.equal(moveToFoundation(s2, 0), s2, 'gap rejected (no-op)');
  // waste → foundation
  const s3 = emptyState();
  s3.waste = [card(1, SPADE, true)];
  const out3 = moveWasteToFoundation(s3);
  assert.equal(out3.foundations.some((f) => f.length === 1 && f[0].rank === 1), true);
  assert.equal(out3.waste.length, 0);
});

test('isWon: true only with all 52 cards on the foundations', () => {
  const s = emptyState();
  assert.equal(isWon(s), false);
  // four full A→K foundations, one suit each
  for (let suit = 0; suit < 4; suit++) {
    s.foundations[suit] = [];
    for (let rank = 1; rank <= 13; rank++) s.foundations[suit].push(card(rank, suit));
  }
  assert.equal(isWon(s), true);
  // one card short → not won
  s.foundations[3].pop();
  assert.equal(isWon(s), false);
});
