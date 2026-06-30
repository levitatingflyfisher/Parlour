// Nim — pure game logic (no DOM). Normal play: the player who takes the LAST
// object WINS. State is an array of heap sizes, e.g. [3, 5, 7]. The optimal
// strategy is the classic nim-sum (the XOR of every heap): always move to a
// position whose nim-sum is zero when you can — that hands a lost game to the
// opponent under perfect play.

export function initialHeaps() {
  return [3, 5, 7];
}

export function isOver(heaps) {
  return heaps.every((n) => n === 0);
}

/// The nim-sum: XOR of all heap sizes. Zero means the position is losing for
/// the player about to move (a winning move only exists when this is non-zero).
export function nimSum(heaps) {
  return heaps.reduce((acc, n) => acc ^ n, 0);
}

/// Every heap you could take from, with the most you could remove from it.
export function legalTakes(heaps) {
  const out = [];
  for (let i = 0; i < heaps.length; i++) {
    if (heaps[i] > 0) out.push({ heap: i, max: heaps[i] });
  }
  return out;
}

/// Remove `count` objects from heap `heapIndex`. Returns a NEW heaps array,
/// or null if the move is illegal (bad index, non-positive count, or asking
/// for more than the heap holds). The input array is never mutated.
export function take(heaps, heapIndex, count) {
  if (!Number.isInteger(heapIndex) || heapIndex < 0 || heapIndex >= heaps.length) return null;
  if (!Number.isInteger(count) || count < 1 || count > heaps[heapIndex]) return null;
  const next = heaps.slice();
  next[heapIndex] -= count;
  return next;
}

/// The optimal move as { heap, count }. From a non-zero nim-sum position this
/// returns the winning move — the one that makes the XOR of all heaps zero.
/// From a zero nim-sum (already losing) or no-win position it returns any
/// legal move: take one from the first non-empty heap.
export function bestMove(heaps) {
  const sum = nimSum(heaps);
  if (sum !== 0) {
    for (let i = 0; i < heaps.length; i++) {
      const target = heaps[i] ^ sum;
      if (target < heaps[i]) return { heap: i, count: heaps[i] - target };
    }
  }
  for (let i = 0; i < heaps.length; i++) {
    if (heaps[i] > 0) return { heap: i, count: 1 };
  }
  return null; // the game is already over
}
