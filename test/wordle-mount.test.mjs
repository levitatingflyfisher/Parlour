// Wordle's result must not rely on three fills alone (audit writing-01 and
// seven siblings): every scored tile and key carries a mark and an accessible
// name naming its state, and a legend says what the marks mean.
//
// mountWordle lives inline in index.template.html; this test extracts it and
// runs it against a minimal DOM stub, as stratego-mount.test.mjs does.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as WORDLE from '../games/wordle.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const script = template.slice(template.indexOf('<script>'));

function extract(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} found`);
  let depth = 0;
  for (let i = script.indexOf('{', start); i < script.length; i++) {
    if (script[i] === '{') depth++;
    else if (script[i] === '}' && --depth === 0) return script.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function makeEl(tag) {
  const el = {
    tag, children: [], listeners: {}, classes: new Set(), attrs: {}, text: '', isConnected: true,
    get textContent() { return el.text + el.children.map((c) => c.textContent).join(''); },
    set textContent(v) { el.text = String(v); el.children = []; },
    set innerHTML(v) { el.text = ''; el.children = []; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k]; },
    appendChild(c) { el.children.push(c); return c; },
    append(...cs) { for (const c of cs) el.children.push(typeof c === 'string' ? { textContent: c, children: [] } : c); },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    click() { for (const fn of el.listeners.click || []) fn(); },
  };
  el.classList = { add: (...cs) => cs.forEach((c) => el.classes.add(c)), contains: (c) => el.classes.has(c) };
  Object.defineProperty(el, 'className', {
    get() { return [...el.classes].join(' '); },
    set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  return el;
}
const all = (el) => [el, ...el.children.flatMap((c) => (c.children ? all(c) : []))];

function mount() {
  const host = makeEl('div');
  const statuses = [];
  const h = { status: (t) => statuses.push(t), controls: makeEl('div'), board: host };
  const document = { createElement: makeEl };
  const window = { addEventListener() {}, removeEventListener() {} };
  const fn = new Function('document', 'window', 'WORDLE', 'setTimeout',
    `${extract('mountWordle')}; return mountWordle;`)(document, window, WORDLE, () => 0);
  fn(host, h);
  return host;
}

function type(host, word) {
  const keys = all(host).filter((e) => e.classes && e.classes.has('wkey'));
  for (const ch of word + '⏎') {
    const k = ch === '⏎' ? keys.find((x) => x.textContent === 'Enter')
      : keys.find((x) => x.text === ch);
    assert.ok(k, `key ${ch}`);
    k.click();
  }
}

test('scored tiles name their state and carry a state class', () => {
  const host = mount();
  // A word that is not today's answer but is allowed: pick any allowed word.
  const guess = ['crane', 'slate', 'audio'].find((w) => WORDLE.isAllowed(w));
  type(host, guess);
  const scored = all(host).filter((e) => e.classes && e.classes.has('wcell')
    && ['correct', 'present', 'absent'].some((s) => e.classes.has(s)));
  assert.equal(scored.length, 5, 'one scored row of five');
  const words = { correct: 'right spot', present: 'in the word, wrong spot', absent: 'not in the word' };
  for (const c of scored) {
    const state = ['correct', 'present', 'absent'].find((s) => c.classes.has(s));
    assert.equal(c.getAttribute('aria-label'), `${c.text.toUpperCase()}, ${words[state]}`);
  }
});

test('scored keys name their state too', () => {
  const host = mount();
  const guess = ['crane', 'slate', 'audio'].find((w) => WORDLE.isAllowed(w));
  type(host, guess);
  const keys = all(host).filter((e) => e.classes && e.classes.has('wkey')
    && ['correct', 'present', 'absent'].some((s) => e.classes.has(s)));
  assert.ok(keys.length >= 5);
  for (const k of keys) assert.match(k.getAttribute('aria-label'), /^[A-Z], (right spot|in the word, wrong spot|not in the word)$/);
});

test('a legend explains the three states in words', () => {
  const host = mount();
  const legend = all(host).find((e) => e.classes && e.classes.has('wordle-legend'));
  assert.ok(legend, 'legend present');
  const text = legend.textContent;
  for (const w of ['Right spot', 'Wrong spot', 'Not in the word']) assert.match(text, new RegExp(w));
});

test('two of the three states carry a visible mark, so grey-scale still reads', () => {
  // Grey-scale test: present (#86661a) and absent (#6f675c) are near the same
  // grey, so each coloured state must differ by shape as well as fill.
  const css = template.slice(0, template.indexOf('</style>'));
  for (const s of ['correct', 'present']) {
    assert.match(css, new RegExp(`\\.wordle \\.wcell\\.${s}::after\\{[^}]*content:"[^"]+"`), `tile ${s} mark`);
    assert.match(css, new RegExp(`\\.wordle \\.wkey\\.${s}::after\\{[^}]*content:"[^"]+"`), `key ${s} mark`);
  }
});
