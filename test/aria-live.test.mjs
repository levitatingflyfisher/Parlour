// `aria-live` sat on the whole stage, so a screen reader recited every cell
// of the board (81 for Sudoku) on each move (audit finding 10, the
// uncontested half). Only the status line speaks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');

test('the stage is not a live region', () => {
  assert.doesNotMatch(template, /id="stage"[^>]*aria-live/);
});

test('the status line is the one polite live region', () => {
  const live = [...template.matchAll(/aria-live=["']?(\w+)/g)];
  assert.equal(live.length, 1, `live regions: ${live.length}`);
  assert.equal(live[0][1], 'polite');
  assert.match(template, /<p class="status" id="status" aria-live="polite"><\/p>/);
});
