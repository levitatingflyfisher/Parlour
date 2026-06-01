// Mastermind — pure code-breaking logic (no DOM). The app hides a secret 4-peg
// code drawn from 6 colours (repeats allowed); the player guesses and gets two
// feedback numbers per guess. `score` uses the canonical Mastermind method:
// first count exact (right-colour-right-place) pegs, then — over only the
// leftover pegs — match colours by the minimum of the remaining counts, so no
// peg is ever counted twice. All functions are pure (rng is injectable), so the
// scoring and win check are fully deterministic and testable; the board is UI.

/// The six peg colours (single-char keys); the UI maps these to swatch colours.
export const COLORS = ['r', 'o', 'y', 'g', 'b', 'p'];

/// Pegs in a code / guess.
export const CODE_LEN = 4;

/// How many guesses the player gets before the code is revealed.
export const MAX_GUESSES = 10;

/// A secret code: CODE_LEN colours from COLORS, repeats allowed, chosen with an
/// injectable rng (default Math.random) so a fixed rng yields a deterministic
/// code.
export function secret(rng = Math.random) {
  const code = [];
  for (let i = 0; i < CODE_LEN; i++) {
    code.push(COLORS[Math.floor(rng() * COLORS.length)]);
  }
  return code;
}

/// Standard Mastermind scoring of `guess` against `code` → {black, white}.
/// black = pegs of the right colour in the right place. white = pegs of the
/// right colour in the wrong place. Each peg is counted at most once: exact
/// matches are removed first, then whites are the per-colour minimum of the
/// counts that remain — so duplicates never double-count.
export function score(guess, code) {
  let black = 0;
  const codeLeft = {};
  const guessLeft = {};
  for (let i = 0; i < CODE_LEN; i++) {
    if (guess[i] === code[i]) {
      black++;
    } else {
      codeLeft[code[i]] = (codeLeft[code[i]] || 0) + 1;
      guessLeft[guess[i]] = (guessLeft[guess[i]] || 0) + 1;
    }
  }
  let white = 0;
  for (const c in guessLeft) {
    white += Math.min(guessLeft[c], codeLeft[c] || 0);
  }
  return { black, white };
}

/// A win is a perfect read: every peg right colour AND right place.
export function isWin(scoreResult) {
  return scoreResult.black === CODE_LEN;
}
