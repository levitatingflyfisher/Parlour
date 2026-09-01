// The page names the app wherever a person lands (audit dmmt-01): a deep link
// such as #wordle is a page a relative can be sent, so its tab title and its
// screen both say Parlour.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const script = template.slice(template.lastIndexOf('<script>'));

function body(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let i = script.indexOf('{', start); i < script.length; i++) {
    if (script[i] === '{') depth++;
    else if (script[i] === '}' && --depth === 0) return script.slice(start, i + 1);
  }
}

test('a game sets the tab title to "<game> · Parlour" and closing restores it', () => {
  assert.match(body('openGame'), /document\.title\s*=\s*`\$\{g\.name\} · Parlour`/);
  assert.match(body('closeGame'), /document\.title\s*=\s*HOME_TITLE/);
  assert.match(script, /const HOME_TITLE\s*=\s*document\.title/);
});

test('the wordmark stays on screen during play', () => {
  assert.match(template, /<p class="mark"[^>]*>Parlour<span class="dot">\.<\/span><\/p>/);
  assert.match(template, /body:not\(\.playing\) \.mark\{visibility:hidden\}/);
});
