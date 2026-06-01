// Hexcodle — guess the 6-digit hex colour. Each guess gets a *graded* signal:
// every digit tells you whether to go higher or lower, so you can reason your
// way in (a real "-le", not a binary right/wrong quiz).

export function isValidHex(s) {
  return /^#?[0-9a-fA-F]{6}$/.test(String(s).trim());
}

const digits = (s) => String(s).replace(/^#/, '').toLowerCase().split('').map((ch) => parseInt(ch, 16));

/// Per-digit verdict: 'lo' = your digit is too low (go higher), 'hi' = too
/// high (go lower), 'ok' = exact.
export function feedback(guess, target) {
  const g = digits(guess);
  const t = digits(target);
  return g.map((gv, i) => (gv < t[i] ? 'lo' : gv > t[i] ? 'hi' : 'ok'));
}

/// Summed per-nibble gap — 0 only on an exact match. A coarse "how close".
export function distance(guess, target) {
  const g = digits(guess);
  const t = digits(target);
  return g.reduce((s, gv, i) => s + Math.abs(gv - t[i]), 0);
}

/// Deterministic colour for a given integer seed (e.g. YYYYMMDD) — the same
/// seed always yields the same puzzle, with no server and no stored state.
export function dailyTarget(seed) {
  let a = seed >>> 0;
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 6; i++) {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out += hex[Math.floor(r * 16)];
  }
  return out;
}
