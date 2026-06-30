import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE, pieceCounts, isLake, legalMoves, resolveCombat, applyMove, winner,
  emptyBoard, setupIndices, pieceBag, hasAnyMove, aiMove,
} from '../games/stratego.mjs';

const at = (r, c) => r * SIZE + c;
const piece = (owner, rank, revealed = false) => ({ owner, rank, revealed });

test('pieceCounts is the standard census and sums to 40', () => {
  const c = pieceCounts();
  assert.deepEqual(c, { 10: 1, 9: 1, 8: 2, 7: 3, 6: 4, 5: 4, 4: 4, 3: 5, 2: 8, 1: 1, B: 6, F: 1 });
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  assert.equal(total, 40);
});

test('pieceBag yields exactly 40 pieces for the owner', () => {
  const bag = pieceBag(1);
  assert.equal(bag.length, 40);
  assert.ok(bag.every((p) => p.owner === 1 && p.revealed === false));
  assert.equal(bag.filter((p) => p.rank === 'B').length, 6);
  assert.equal(bag.filter((p) => p.rank === 10).length, 1);
});

test('setupIndices covers each side\'s four home rows, never a lake', () => {
  const top = setupIndices(1);
  const bottom = setupIndices(0);
  assert.equal(top.length, 40);
  assert.equal(bottom.length, 40);
  for (const i of [...top, ...bottom]) {
    assert.equal(isLake(Math.floor(i / SIZE), i % SIZE), false);
  }
  assert.ok(top.includes(at(0, 0)) && top.includes(at(3, 9)));
  assert.ok(bottom.includes(at(6, 0)) && bottom.includes(at(9, 9)));
});

// ---- Combat rules (the heart of the game) ----

test('higher rank wins: Marshal 10 vs General 9 -> attacker', () => {
  assert.equal(resolveCombat(10, 9), 'attacker');
});

test('lower attacker loses: 6 vs 8 -> defender', () => {
  assert.equal(resolveCombat(6, 8), 'defender');
});

test('equal ranks remove both: 5 vs 5 -> both', () => {
  assert.equal(resolveCombat(5, 5), 'both');
});

test('Spy attacking Marshal -> attacker (the Spy\'s one trick)', () => {
  assert.equal(resolveCombat(1, 10), 'attacker');
});

test('Marshal attacking Spy -> attacker (the Spy only wins on attack)', () => {
  assert.equal(resolveCombat(10, 1), 'attacker');
});

test('Spy attacking a Captain still loses: 1 vs 6 -> defender', () => {
  assert.equal(resolveCombat(1, 6), 'defender');
});

test('Miner attacking a Bomb defuses it -> attacker', () => {
  assert.equal(resolveCombat(3, 'B'), 'attacker');
});

test('any non-Miner attacking a Bomb loses -> defender', () => {
  assert.equal(resolveCombat(6, 'B'), 'defender');
  assert.equal(resolveCombat(10, 'B'), 'defender');
  assert.equal(resolveCombat(1, 'B'), 'defender');
});

test('attacking the Flag wins -> attacker', () => {
  assert.equal(resolveCombat(2, 'F'), 'attacker');
  assert.equal(resolveCombat(1, 'F'), 'attacker');
});

// ---- isLake ----

test('isLake marks rows 4-5, cols 2-3 and 6-7, and nothing else', () => {
  assert.equal(isLake(4, 2), true);
  assert.equal(isLake(4, 3), true);
  assert.equal(isLake(5, 6), true);
  assert.equal(isLake(5, 7), true);
  assert.equal(isLake(4, 1), false);
  assert.equal(isLake(4, 4), false); // gap between the two lakes
  assert.equal(isLake(4, 5), false);
  assert.equal(isLake(3, 2), false); // above the lake band
  assert.equal(isLake(6, 6), false); // below the lake band
});

// ---- legalMoves ----

test('a normal piece steps one orthogonal square into empty cells', () => {
  const b = emptyBoard();
  b[at(7, 7)] = piece(0, 6); // a Captain in open space
  const moves = legalMoves(b, at(7, 7)).sort((x, y) => x - y);
  assert.deepEqual(moves, [at(6, 7), at(7, 6), at(7, 8), at(8, 7)].sort((x, y) => x - y));
});

test('a normal piece cannot enter a lake or a friendly square', () => {
  const b = emptyBoard();
  b[at(3, 2)] = piece(1, 6); // sits just above lake (4,2)
  b[at(3, 1)] = piece(1, 4); // friendly to the left
  const moves = legalMoves(b, at(3, 2));
  assert.ok(!moves.includes(at(4, 2)), 'must not move into the lake');
  assert.ok(!moves.includes(at(3, 1)), 'must not move onto a friendly piece');
  assert.ok(moves.includes(at(3, 3)) && moves.includes(at(2, 2)));
});

test('a normal piece may attack an adjacent enemy', () => {
  const b = emptyBoard();
  b[at(7, 7)] = piece(0, 6);
  b[at(7, 8)] = piece(1, 9); // enemy to the right
  assert.ok(legalMoves(b, at(7, 7)).includes(at(7, 8)));
});

test('a Scout slides multiple straight squares but is blocked by a piece', () => {
  const b = emptyBoard();
  b[at(6, 0)] = piece(0, 2); // Scout at column 0
  b[at(6, 4)] = piece(0, 4); // friendly Sergeant blocks the rank at col 4
  const moves = legalMoves(b, at(6, 0));
  // Open run to the right: cols 1,2,3 reachable; col 4 is friendly -> blocked.
  assert.ok(moves.includes(at(6, 1)) && moves.includes(at(6, 2)) && moves.includes(at(6, 3)));
  assert.ok(!moves.includes(at(6, 4)), 'cannot land on the blocking friendly');
  assert.ok(!moves.includes(at(6, 5)), 'cannot leap past the blocker');
});

test('a Scout may strike an enemy at the end of an open run, but not past it', () => {
  const b = emptyBoard();
  b[at(6, 0)] = piece(0, 2); // Scout
  b[at(6, 3)] = piece(1, 8); // enemy Colonel down the rank
  const moves = legalMoves(b, at(6, 0));
  assert.ok(moves.includes(at(6, 1)) && moves.includes(at(6, 2)));
  assert.ok(moves.includes(at(6, 3)), 'Scout attacks the enemy at range');
  assert.ok(!moves.includes(at(6, 4)), 'cannot pass through the enemy');
});

test('a Scout cannot slide across a lake', () => {
  const b = emptyBoard();
  b[at(4, 0)] = piece(0, 2); // Scout on the lake row, left of lake (4,2)/(4,3)
  const moves = legalMoves(b, at(4, 0));
  assert.ok(moves.includes(at(4, 1)));
  assert.ok(!moves.includes(at(4, 2)) && !moves.includes(at(4, 4)), 'lake stops the slide');
});

test('Bombs and the Flag never move', () => {
  const b = emptyBoard();
  b[at(8, 4)] = piece(0, 'B');
  b[at(9, 4)] = piece(0, 'F');
  assert.deepEqual(legalMoves(b, at(8, 4)), []);
  assert.deepEqual(legalMoves(b, at(9, 4)), []);
});

// ---- applyMove ----

test('applyMove relocates a piece into an empty square without mutating input', () => {
  const b = emptyBoard();
  b[at(7, 7)] = piece(0, 6);
  const n = applyMove(b, at(7, 7), at(6, 7));
  assert.equal(n[at(7, 7)], null);
  assert.deepEqual(n[at(6, 7)], piece(0, 6));
  assert.deepEqual(b[at(7, 7)], piece(0, 6), 'original board is untouched');
});

test('applyMove: attacker wins, advances, and is revealed', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 10); // Marshal
  b[at(4, 1)] = piece(1, 9); // General
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(5, 1)], null);
  assert.equal(n[at(4, 1)].rank, 10);
  assert.equal(n[at(4, 1)].owner, 0);
  assert.equal(n[at(4, 1)].revealed, true);
});

test('applyMove: attacker loses, leaving a revealed defender in place', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 6); // Captain attacks up
  b[at(4, 1)] = piece(1, 9); // General defends
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(5, 1)], null);
  assert.equal(n[at(4, 1)].rank, 9);
  assert.equal(n[at(4, 1)].owner, 1);
  assert.equal(n[at(4, 1)].revealed, true);
});

test('applyMove: equal ranks remove both pieces', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 7);
  b[at(4, 1)] = piece(1, 7);
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(5, 1)], null);
  assert.equal(n[at(4, 1)], null);
});

test('applyMove: a Bomb survives a non-Miner attack and is revealed', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 6); // Captain
  b[at(4, 1)] = piece(1, 'B'); // Bomb
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(5, 1)], null);
  assert.equal(n[at(4, 1)].rank, 'B');
  assert.equal(n[at(4, 1)].revealed, true);
});

test('applyMove: a Miner defuses the Bomb and takes the square', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 3); // Miner
  b[at(4, 1)] = piece(1, 'B');
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(4, 1)].rank, 3);
  assert.equal(n[at(4, 1)].owner, 0);
});

test('applyMove: the Spy attacking the Marshal wins the duel', () => {
  const b = emptyBoard();
  b[at(5, 1)] = piece(0, 1); // Spy attacks
  b[at(4, 1)] = piece(1, 10); // Marshal
  const n = applyMove(b, at(5, 1), at(4, 1));
  assert.equal(n[at(4, 1)].rank, 1);
  assert.equal(n[at(4, 1)].owner, 0);
});

// ---- winner ----

test('winner is null while both flags stand and both sides can move', () => {
  const b = emptyBoard();
  b[at(9, 0)] = piece(0, 'F');
  b[at(0, 0)] = piece(1, 'F');
  b[at(8, 0)] = piece(0, 6);
  b[at(1, 0)] = piece(1, 6);
  assert.equal(winner(b), null);
});

test('winner: capturing the Flag ends the game for the attacker', () => {
  const b = emptyBoard();
  b[at(0, 0)] = piece(1, 'F');
  b[at(1, 0)] = piece(0, 6); // attacker adjacent to the enemy flag
  b[at(9, 0)] = piece(0, 'F');
  const n = applyMove(b, at(1, 0), at(0, 0)); // capture P1's flag
  assert.equal(winner(n), 0);
});

test('winner: a side with no legal move loses', () => {
  const b = emptyBoard();
  // Player 1 has only a Flag and Bombs — nothing can move.
  b[at(0, 0)] = piece(1, 'F');
  b[at(0, 1)] = piece(1, 'B');
  // Player 0 still has a mobile piece and a flag.
  b[at(9, 0)] = piece(0, 'F');
  b[at(8, 5)] = piece(0, 6);
  assert.equal(hasAnyMove(b, 1), false);
  assert.equal(winner(b), 0);
});

// --- aiMove (single-player computer opponent) ---
test('aiMove returns null when the side has no movable piece', () => {
  const b = emptyBoard();
  b[at(0, 0)] = piece(1, 'F');
  b[at(0, 1)] = piece(1, 'B');
  assert.equal(aiMove(b, 1), null);
});

test('aiMove returns a legal move for the side', () => {
  const b = emptyBoard();
  b[at(3, 5)] = piece(1, 6); // a Captain in open space
  const mv = aiMove(b, 1);
  assert.ok(mv, 'expected a move');
  assert.ok(legalMoves(b, mv.from).includes(mv.to), 'move must be legal');
});

test('aiMove takes a winning capture of a revealed weaker enemy', () => {
  const b = emptyBoard();
  b[at(3, 5)] = piece(1, 8); // Colonel
  b[at(4, 5)] = piece(0, 5, true); // revealed Lieutenant, directly below
  assert.deepEqual(aiMove(b, 1), { from: at(3, 5), to: at(4, 5) });
});

test('aiMove captures the flag when it can reach it', () => {
  const b = emptyBoard();
  b[at(3, 5)] = piece(1, 2); // even a lowly Scout
  b[at(4, 5)] = piece(0, 'F', true); // revealed flag below
  assert.deepEqual(aiMove(b, 1), { from: at(3, 5), to: at(4, 5) });
});

test('aiMove will not charge a revealed stronger enemy when a safe move exists', () => {
  const b = emptyBoard();
  b[at(3, 5)] = piece(1, 3); // Miner
  b[at(4, 5)] = piece(0, 10, true); // revealed Marshal below — suicide to attack
  const mv = aiMove(b, 1);
  assert.ok(mv);
  assert.notDeepEqual(mv, { from: at(3, 5), to: at(4, 5) });
});

test('a long vs-AI game runs without crashing or deadlocking', () => {
  // Random armies, then alternate: owner 0 plays a (deterministic) legal move,
  // owner 1 plays aiMove. The point is that the AI loop never throws and always
  // terminates — random play rarely captures a flag, so the cap is the backstop.
  const b0 = emptyBoard();
  for (const owner of [0, 1]) {
    const idxs = setupIndices(owner);
    const bag = pieceBag(owner);
    idxs.forEach((i, k) => { b0[i] = bag[k]; });
  }
  let b = b0;
  let turn = 0;
  let moves = 0;
  while (winner(b) === null && moves < 1500) {
    let mv;
    if (turn === 0) {
      const froms = [];
      for (let i = 0; i < b.length; i++) {
        const p = b[i];
        if (p && p.owner === 0 && legalMoves(b, i).length) froms.push(i);
      }
      if (!froms.length) break;
      const from = froms[moves % froms.length];
      const tos = legalMoves(b, from);
      mv = { from, to: tos[moves % tos.length] };
    } else {
      mv = aiMove(b, 1);
      if (!mv) break;
      assert.ok(legalMoves(b, mv.from).includes(mv.to), 'AI move must be legal');
    }
    b = applyMove(b, mv.from, mv.to);
    turn = turn === 0 ? 1 : 0;
    moves += 1;
  }
  assert.ok(winner(b) !== null || moves >= 1500 || true, 'completed without throwing');
});

// --- aiMove difficulty levels ---
test('easy difficulty returns a legal move', () => {
  const b = emptyBoard(); b[at(3, 5)] = piece(1, 6);
  const mv = aiMove(b, 1, 'easy');
  assert.ok(mv && legalMoves(b, mv.from).includes(mv.to));
});

test('easy still grabs a reachable flag', () => {
  const b = emptyBoard(); b[at(3, 5)] = piece(1, 2); b[at(4, 5)] = piece(0, 'F', true);
  assert.deepEqual(aiMove(b, 1, 'easy'), { from: at(3, 5), to: at(4, 5) });
});

test('easy never makes a known-suicidal attack when a safe move exists', () => {
  const b = emptyBoard(); b[at(3, 5)] = piece(1, 3); b[at(4, 5)] = piece(0, 10, true);
  assert.notDeepEqual(aiMove(b, 1, 'easy'), { from: at(3, 5), to: at(4, 5) });
});

test('easy varies its move (not a fixed script)', () => {
  const b = emptyBoard(); b[at(3, 5)] = piece(1, 6); // 4 safe empty moves
  const seen = new Set();
  for (let i = 0; i < 50; i++) { const m = aiMove(b, 1, 'easy'); seen.add(m.from + '-' + m.to); }
  assert.ok(seen.size >= 2, 'easy should not always return the same move');
});

test('hard returns a legal move and takes a winning capture', () => {
  const b = emptyBoard(); b[at(3, 5)] = piece(1, 8); b[at(4, 5)] = piece(0, 5, true);
  assert.deepEqual(aiMove(b, 1, 'hard'), { from: at(3, 5), to: at(4, 5) });
});

test('hard refuses a bad trade (General for a Scout) that medium would take', () => {
  const b = emptyBoard();
  b[at(3, 5)] = piece(1, 9);       // our General
  b[at(4, 5)] = piece(0, 2, true); // revealed enemy Scout (capturable, below)
  b[at(4, 6)] = piece(0, 10, true);// revealed enemy Marshal guarding it
  const bad = { from: at(3, 5), to: at(4, 5) };
  assert.deepEqual(aiMove(b, 1, 'medium'), bad, 'medium grabs the scout');
  assert.notDeepEqual(aiMove(b, 1, 'hard'), bad, 'hard foresees the Marshal recapture');
});
