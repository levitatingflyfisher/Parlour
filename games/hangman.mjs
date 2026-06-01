// Hangman — pure word logic (no DOM). A small offline word list is bundled so
// the game works with no network and no server. The masking, win check, and
// wrong-letter tally are all pure functions of (word, guessed-Set), so they're
// fully deterministic and testable; the gallows/keyboard live in the UI.

/// ~60 common, family-friendly words (4–8 letters, lowercase, no proper nouns).
export const WORDS = [
  // 4 letters
  'bear', 'frog', 'fish', 'star', 'moon', 'tree', 'ship', 'book', 'cake', 'lamp',
  // 5 letters
  'apple', 'bread', 'chair', 'cloud', 'eagle', 'grape', 'house', 'juice', 'lemon',
  'ocean', 'piano', 'river', 'table', 'water', 'zebra',
  // 6 letters
  'basket', 'candle', 'flower', 'garden', 'hammer', 'island', 'jacket', 'kitten',
  'ladder', 'orange', 'pencil', 'rabbit', 'turtle', 'yellow', 'button', 'carrot',
  'cookie', 'pillow', 'rocket', 'winter',
  // 7 letters
  'dolphin', 'blanket', 'biscuit', 'kitchen', 'balloon', 'rainbow', 'pumpkin',
  'sandals', 'cabbage', 'popcorn',
  // 8 letters
  'elephant', 'mountain', 'umbrella', 'starfish', 'dinosaur',
];

/// A word from WORDS, chosen with an injectable rng (default Math.random) so a
/// fixed rng yields a deterministic pick.
export function pickWord(rng = Math.random) {
  return WORDS[Math.floor(rng() * WORDS.length)];
}

/// The display string: letters in `guessed` (a Set) are shown, every other
/// letter becomes '_', and characters are joined by spaces. Non-letters (e.g. a
/// space or hyphen) are always revealed.
export function revealed(word, guessed) {
  return word
    .split('')
    .map((ch) => (!/[a-z]/i.test(ch) || guessed.has(ch) ? ch : '_'))
    .join(' ');
}

/// True only when every (distinct) letter of `word` is in `guessed`.
export function isWon(word, guessed) {
  return word
    .split('')
    .every((ch) => !/[a-z]/i.test(ch) || guessed.has(ch));
}

/// The guessed letters that do NOT appear in `word`, in the order they were
/// guessed (Set insertion order).
export function wrongGuesses(word, guessed) {
  return [...guessed].filter((ch) => !word.includes(ch));
}

/// How many wrong guesses end the game.
export const MAX_WRONG = 6;
