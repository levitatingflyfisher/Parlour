// The built page must at least parse. Every mount lives in one classic
// <script>; a stray quote anywhere in it blanks the whole cupboard while the
// logic tests stay green. The <head> theme script shares the same global
// lexical scope, so a duplicate top-level name between the two is also a
// load-time SyntaxError: compile them together to catch that.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function scriptsOf(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html has a head script and a body script', () => {
  assert.equal(scriptsOf(page).length, 2);
});

test('each script compiles, and all of them compile as one scope', () => {
  const scripts = scriptsOf(page);
  scripts.forEach((s, i) => assert.doesNotThrow(() => new vm.Script(s, { filename: `script${i}` })));
  assert.doesNotThrow(() => new vm.Script(scripts.join('\n;\n'), { filename: 'all' }));
});

test('the check catches a duplicate top-level name across scripts', () => {
  const scripts = scriptsOf(page);
  assert.throws(() => new vm.Script(scripts.join('\n;\n') + '\nconst THEME_KEY=1;'), SyntaxError);
});
