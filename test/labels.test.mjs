// Icon actions carry a short visible word (fleet ruling: a tooltip or an
// aria-label is never a command's only name).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');

test('Wordle backspace key says Delete', () => {
  assert.match(template, /k==='back'\)\{[^}]*textContent='Delete'/);
});

test('Sudoku erase key says Erase', () => {
  assert.match(template, /er\.innerHTML='<span aria-hidden="true">⌫<\/span> Erase'/);
});

test('no action button is named only by an aria-label over a lone glyph', () => {
  const lone = [...template.matchAll(/textContent='([^A-Za-z0-9'\s]{1,2})';\s*\w+\.setAttribute\('aria-label'/g)]
    .map((m) => m[0]);
  assert.deepEqual(lone, []);
});
