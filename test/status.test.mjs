// The status line's error treatment (colour language: an error is colour +
// icon + word, never colour alone), and the rule that no raw exception text
// ever reaches a person.
//
// renderStatus lives inline in index.template.html; this test extracts it and
// runs it against a minimal element stub, as stratego-mount.test.mjs does.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const script = template.slice(template.indexOf('<script>'));

function extract(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} found in index.template.html`);
  let depth = 0;
  for (let i = script.indexOf('{', start); i < script.length; i++) {
    if (script[i] === '{') depth++;
    else if (script[i] === '}' && --depth === 0) return script.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function stubEl() {
  const el = {
    children: [], classes: new Set(), attrs: {},
    get textContent() { return el.children.map((c) => c.text ?? c.textContent ?? '').join(''); },
    set textContent(v) { el.children = v ? [{ text: String(v) }] : []; },
    append(...cs) { el.children.push(...cs.map((c) => (typeof c === 'string' ? { text: c } : c))); },
    setAttribute(k, v) { el.attrs[k] = v; },
    classList: {
      toggle(c, on) { if (on) el.classes.add(c); else el.classes.delete(c); },
      add(c) { el.classes.add(c); },
    },
    innerHTML: '',
  };
  Object.defineProperty(el, 'className', {
    get() { return [...el.classes].join(' '); },
    set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  return el;
}
const doc = { createElement: () => stubEl(), createTextNode: (t) => ({ text: t }) };

const svgLine = script.match(/const ALERT_SVG=.*;\n/)[0];
const renderStatus = new Function('document', `${svgLine}${extract('renderStatus')}; return renderStatus;`)(doc);

test('a plain status is plain text with no error mark', () => {
  const el = stubEl();
  renderStatus(el, 'Your turn.');
  assert.equal(el.textContent, 'Your turn.');
  assert.equal(el.classes.has('err'), false);
});

test('an error status carries the urgency class, an icon and its words', () => {
  const el = stubEl();
  renderStatus(el, 'That spot isn’t legal.', { kind: 'error' });
  assert.equal(el.classes.has('err'), true);
  const icon = el.children.find((c) => c.classes && c.classes.has('status-icon'));
  assert.ok(icon, 'an icon element is present');
  assert.match(icon.innerHTML, /<svg/);
  assert.match(el.textContent, /That spot isn’t legal\./);
});

test('a later plain status clears the error mark', () => {
  const el = stubEl();
  renderStatus(el, 'Nope.', { kind: 'error' });
  renderStatus(el, 'Your turn.');
  assert.equal(el.classes.has('err'), false);
  assert.equal(el.textContent, 'Your turn.');
});

test('every refusal in the games is sent as an error', () => {
  // Each refusal message must be rendered with {kind:'error'}.
  const refusals = [
    /note\('Not enough letters\.'\)/,          // Wordle, via note()
    /isn’t in the word list/,                  // Wordle
    /isn’t a country I know/,                  // Globle
    /You already guessed/,                     // Globle
  ];
  for (const re of refusals) assert.match(script, re, `refusal ${re} still exists`);
  assert.match(extract('mountWordle'), /function note\(msg\)\{\s*h\.status\(msg,\s*\{kind:'error'\}\)/);
  const globle = extract('mountGloble');
  assert.match(globle, /isn’t a country I know[^;]*,\s*\{kind:'error'\}\)/);
  assert.match(globle, /You already guessed[^;]*,\s*\{kind:'error'\}\)/);
  assert.match(extract('mountBlokus'), /info\s*\?\s*\{kind:'error'\}/);
  assert.match(extract('mountSudoku'), /conf\.size[^;]*\{kind:'error'\}/);
});

test('no raw exception text is shown to people', () => {
  assert.doesNotMatch(script, /\balert\(/);
  assert.doesNotMatch(script, /String\(e\)|\$\{e\}|e\.message|err\.message/);
});
