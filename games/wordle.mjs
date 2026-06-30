// Wordle — the daily five-letter word hunt. Six tries; each guess is graded
// per letter against standard Wordle rules (exact matches claimed first, then
// 'present' only while unused answer letters of that kind remain, so duplicate
// letters resolve correctly). Pure logic, offline word lists bundled below —
// no server, no stored state: the puzzle is a deterministic function of the day.

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

// ~150 common five-letter solutions. Lowercase, exactly five letters.
export const ANSWERS = [
  'about', 'above', 'actor', 'acute', 'admit', 'adopt', 'adult', 'agent', 'agree', 'ahead',
  'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone', 'along', 'alter', 'among',
  'anger', 'angle', 'angry', 'apart', 'apple', 'apply', 'arena', 'argue', 'arise', 'aroma',
  'array', 'aside', 'asset', 'audio', 'avoid', 'awake', 'award', 'aware', 'badge', 'baker',
  'basic', 'basin', 'beach', 'beard', 'beast', 'begin', 'being', 'below', 'bench', 'berry',
  'birth', 'black', 'blade', 'blame', 'blank', 'blast', 'blaze', 'bleak', 'blend', 'bless',
  'blind', 'block', 'blood', 'bloom', 'board', 'boast', 'bonus', 'boost', 'booth', 'brain',
  'brand', 'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad',
  'brown', 'brush', 'build', 'built', 'bunch', 'burst', 'cabin', 'cable', 'candy', 'cargo',
  'carry', 'catch', 'cause', 'chain', 'chair', 'chalk', 'charm', 'chart', 'chase', 'cheap',
  'check', 'cheer', 'chess', 'chest', 'chief', 'child', 'china', 'chunk', 'claim', 'class',
  'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'clock', 'close', 'cloth', 'cloud',
  'coach', 'coast', 'color', 'couch', 'cough', 'could', 'count', 'court', 'cover', 'craft',
  'crane', 'crash', 'crawl', 'cream', 'creek', 'crime', 'crisp', 'cross', 'crowd', 'crown',
  'crumb', 'curve', 'cycle', 'daily', 'dairy', 'dance', 'dealt', 'death', 'debut', 'delay',
];

// ~150 further valid guess words. Combined with ANSWERS these form the set of
// words a player is permitted to enter.
const EXTRA = [
  'dense', 'depth', 'dirty', 'dodge', 'doubt', 'dozen', 'draft', 'drain', 'drama', 'drawn',
  'dream', 'dress', 'dried', 'drift', 'drill', 'drink', 'drive', 'drove', 'dwarf', 'eager',
  'eagle', 'early', 'earth', 'eaten', 'ebony', 'elbow', 'elder', 'elect', 'elite', 'email',
  'empty', 'enact', 'ended', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'equip', 'erase',
  'error', 'essay', 'event', 'every', 'exact', 'exalt', 'excel', 'exist', 'extra', 'fable',
  'faint', 'fairy', 'faith', 'false', 'fancy', 'fatal', 'fault', 'favor', 'feast', 'fence',
  'ferry', 'fetch', 'fever', 'fiber', 'field', 'fiery', 'fifth', 'fifty', 'fight', 'filed',
  'final', 'finch', 'finer', 'first', 'fixed', 'flair', 'flame', 'flash', 'flask', 'fleet',
  'flesh', 'float', 'flock', 'flood', 'floor', 'flora', 'flour', 'flown', 'fluid', 'flush',
  'focus', 'force', 'forge', 'forth', 'forty', 'forum', 'found', 'frame', 'frank', 'fraud',
  'fresh', 'front', 'frost', 'frown', 'fruit', 'fully', 'funny', 'gauge', 'geese', 'ghost',
  'giant', 'given', 'glass', 'gleam', 'glide', 'globe', 'gloom', 'glory', 'glove', 'grace',
  'grade', 'grain', 'grand', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'great',
  'greed', 'green', 'greet', 'grief', 'grill', 'grind', 'groom', 'gross', 'group', 'grove',
  'grown', 'guard', 'guess', 'guest', 'guide', 'guilt', 'habit', 'hairy', 'handy', 'happy',
];

export const ALLOWED = new Set([...ANSWERS, ...EXTRA]);

/// Deterministic puzzle for an integer seed (e.g. YYYYMMDD): the same seed
/// always yields the same answer, with no server and no stored state. Mixes the
/// seed's bits so consecutive days land on unrelated words.
export function dailyAnswer(seed) {
  let a = (seed >>> 0) || 1;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b);
  a = (a ^ (a >>> 16)) >>> 0;
  return ANSWERS[a % ANSWERS.length];
}

/// True when `word` is a permitted guess (case-insensitive).
export function isAllowed(word) {
  return ALLOWED.has(String(word).toLowerCase());
}

/// Grade `guess` against `answer`, returning five verdicts of
/// 'correct' | 'present' | 'absent' by standard Wordle rules: exact matches are
/// claimed first, then each remaining guess letter is 'present' only while an
/// unclaimed answer letter of that kind is still available (so a duplicate
/// guessed letter goes 'absent' once the answer's copies are exhausted).
export function score(guess, answer) {
  const g = String(guess).toLowerCase();
  const a = String(answer).toLowerCase();
  const out = new Array(WORD_LEN).fill('absent');
  const remaining = {};
  for (let i = 0; i < WORD_LEN; i++) {
    remaining[a[i]] = (remaining[a[i]] || 0) + 1;
  }
  // First pass: exact, in-place matches consume an answer letter each.
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === a[i]) {
      out[i] = 'correct';
      remaining[g[i]]--;
    }
  }
  // Second pass: 'present' only while unclaimed copies of that letter remain.
  for (let i = 0; i < WORD_LEN; i++) {
    if (out[i] === 'correct') continue;
    if (remaining[g[i]] > 0) {
      out[i] = 'present';
      remaining[g[i]]--;
    }
  }
  return out;
}
