// User-visible copy uses proper punctuation: no spaced em dashes (the house
// style avoids them in copy) and curly apostrophes and quotes, never
// straight ones, in anything a player reads.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const template = read('../index.template.html');

// The page's scripts with comments removed: what is left is code and copy.
function scriptCode() {
  const scripts = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  return scripts
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/(^|[\s;{}),])\/\/.*$/, '$1')).join('\n');
}
const htmlText = template.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script>[\s\S]*?<\/script>/g, '');

test('no em dashes in copy the page shows', () => {
  const hits = scriptCode().split('\n').filter((l) => l.includes('—'));
  assert.deepEqual(hits, []);
  assert.doesNotMatch(htmlText.replace(/<!--[\s\S]*?-->/g, ''), /—/);
  for (const f of ['../manifest.webmanifest', '../404.html',
    '../fastlane/metadata/android/en-US/full_description.txt',
    '../fastlane/metadata/android/en-US/short_description.txt',
    '../fastlane/metadata/android/en-US/title.txt']) {
    assert.doesNotMatch(read(f), /—/, f);
    assert.doesNotMatch(read(f), /[A-Za-z]'[A-Za-z]/, f);
  }
});

test('no straight apostrophes or quotes inside copy', () => {
  const code = scriptCode();
  // A letter-apostrophe-letter inside a double-quoted string ("I'm", "'s turn").
  assert.deepEqual(code.match(/"[^"\n]*[A-Za-z]'[A-Za-z][^"\n]*"/g) || [], []);
  assert.deepEqual(code.match(/"'s /g) || [], []);
  // Straight double quotes shown around a word: '..."'+word+'"...'
  assert.deepEqual(code.match(/"'\s*\+\s*\w+\s*\+\s*'"/g) || [], []);
});
