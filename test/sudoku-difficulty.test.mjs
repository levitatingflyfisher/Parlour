// Tapping another Sudoku difficulty mid-puzzle threw the puzzle away
// (audit finding 1, the step all six lenses agree on; persona A1). Now a
// new difficulty applies to the next puzzle once you have started one; on
// an untouched or solved puzzle it starts the new one at once.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as SUDOKU from '../games/sudoku.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const start = template.indexOf('function mountSudoku(host, h){');
const src = template.slice(start, template.indexOf('\nfunction mountKlondike', start));

function makeEl(tag) {
  const el = {
    tag, children: [], listeners: {}, attrs: {}, textContent: '', classes: new Set(), disabled: false,
    setAttribute(k, v) { el.attrs[k] = String(v); },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    click() { if (!el.disabled) (el.listeners.click || []).forEach((f) => f()); },
  };
  el.classList = { add: (...c) => c.forEach((x) => el.classes.add(x)) };
  Object.defineProperty(el, 'className', { get: () => [...el.classes].join(' '), set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(el, 'innerHTML', { get: () => '', set() { el.children = []; } });
  return el;
}
const walk = (n, out = []) => { for (const c of n.children) { out.push(c); walk(c, out); } return out; };

function mount() {
  const host = makeEl('div'), controls = makeEl('div');
  const statuses = [];
  const h = { controls, status: (t) => statuses.push(t) };
  new Function('SUDOKU', 'document', 'host', 'h', `${src}\n;mountSudoku(host, h);`)(
    SUDOKU, { createElement: (t) => makeEl(t) }, host, h);
  const board = () => walk(host).filter((e) => e.classes.has('sud-cell'));
  const labels = () => board().map((c) => c.attrs['aria-label']);
  const btn = (text) => walk(controls).find((e) => e.textContent === text);
  return { host, statuses, board, labels, btn };
}

test('mid-puzzle, a new difficulty waits for the next puzzle', () => {
  const m = mount();
  const empty = m.board().find((c) => c.attrs['aria-label'].startsWith('cell '));
  empty.click();
  // A number that does not clash, so the status shows the ordinary line.
  for (let n = 1; n <= 9; n++) {
    walk(m.host).find((e) => e.classes.has('sud-num') && e.textContent === n).click();
    if (!m.statuses.at(-1).startsWith('Clash')) break;
  }
  const before = m.labels();
  m.btn('Hard').click();
  assert.deepEqual(m.labels(), before, 'the puzzle in play is kept');
  assert.match(m.statuses.at(-1), /^Easy · .*next puzzle: Hard/);
  assert.equal(m.btn('Hard').attrs['aria-pressed'], 'true');
});

test('on an untouched puzzle, a new difficulty starts at once', () => {
  const m = mount();
  m.btn('Hard').click();
  assert.match(m.statuses.at(-1), /^Hard · /);
});
