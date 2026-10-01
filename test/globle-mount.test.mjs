// Globle's field was unbounded free text with autocomplete off, although
// the acceptable set is bundled and small: "Atlantis" was accepted, refused
// at the top of the panel and left in the field (audit finding 5, parked
// from the rollout). The field now offers the bundled countries, says how
// many there are, and has a visible label.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as GLOBLE from '../games/globle.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const start = template.indexOf('function mountGloble(host, h){');
const src = template.slice(start, template.indexOf('\nfunction mountSudoku', start));

function makeEl(tag) {
  const el = {
    tag, children: [], listeners: {}, attrs: {}, textContent: '', value: '', id: '',
    style: {}, classes: new Set(),
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    append(...cs) { el.children.push(...cs); },
    focus() {},
    querySelector(sel) { return find(el, (n) => n.tag === sel); },
  };
  Object.defineProperty(el, 'className', { get: () => [...el.classes].join(' '), set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(el, 'innerHTML', { get: () => '', set() { el.children = []; } });
  return el;
}
function find(root, pred) {
  for (const c of root.children) { if (pred(c)) return c; const d = find(c, pred); if (d) return d; }
  return null;
}
function all(root, pred, out = []) {
  for (const c of root.children) { if (pred(c)) out.push(c); all(c, pred, out); }
  return out;
}

function mount() {
  const host = makeEl('div'), controls = makeEl('div');
  const statuses = [];
  const h = { controls, status: (t) => statuses.push(t) };
  const document = { createElement: (t) => makeEl(t) };
  new Function('GLOBLE', 'document', 'host', 'h', `${src}\n;mountGloble(host, h);`)(GLOBLE, document, host, h);
  return { host, statuses };
}

test('the field offers the bundled countries, by a list it names', () => {
  const { host, statuses } = mount();
  const input = find(host, (n) => n.tag === 'input');
  const list = find(host, (n) => n.tag === 'datalist');
  assert.ok(list, 'a datalist of countries');
  assert.equal(input.attrs.list, list.id);
  const names = list.children.map((o) => o.value).sort();
  assert.deepEqual(names, GLOBLE.COUNTRIES.map((c) => c.name).sort());
  const label = find(host, (n) => n.tag === 'label');
  assert.ok(label && label.textContent.length > 0, 'a visible label');
  assert.match(statuses.at(-1), new RegExp(`one of ${GLOBLE.COUNTRIES.length} countries`));
});

test('a guessed country leaves the list', () => {
  const { host } = mount();
  const input = find(host, (n) => n.tag === 'input');
  const answerless = GLOBLE.COUNTRIES.map((c) => c.name);
  // Any country; if it happens to be today's answer the game ends and the
  // field (and its list) go away, which is also right.
  const pick = answerless[0];
  input.value = pick;
  for (const fn of input.listeners.keydown) fn({ key: 'Enter' });
  const list = find(host, (n) => n.tag === 'datalist');
  if (!list) return; // solved on the first guess
  assert.ok(!list.children.some((o) => o.value === pick));
  assert.equal(list.children.length, GLOBLE.COUNTRIES.length - 1);
});
