// The fleet's one publisher line, word for word as ohStyle's
// ohPublisherLine, in the shelf footer as in the other fleet apps. Checked
// in the built page, which is what ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the shelf footer names the publisher', () => {
  const foot = page.match(/<p class="shelf-foot">([\s\S]*?)<\/p>/)[1];
  assert.match(foot, /Published by Intergenerational Symbolic Systems\./);
});
