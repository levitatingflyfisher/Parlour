// Re-tapping the mode that is already live must not throw the game away
// (audit humane-02 and five siblings; persona A1). Every "vs Computer" /
// "2 Players" pill and every Sudoku difficulty pill is guarded, as Stratego's
// already was.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as TICTACTOE from '../games/tictactoe.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const script = template.slice(template.indexOf('<script>'));

test('every mode pill ignores a tap on the mode already live', () => {
  const sites = [...script.matchAll(/\b(?:ctrl|mkBtn)\('(vs Computer|2 Players)',\s*\(\)\s*=>\s*\{([^}]*)\}/g)];
  assert.ok(sites.length >= 24, `found ${sites.length} mode pills`);
  const unguarded = sites
    .filter(([, label, body]) => {
      const m = label === 'vs Computer' ? 'ai' : '2p';
      return !new RegExp(`if\\(mode===?'${m}'\\)\\s*return|if\\(mode!==?'${m}'\\)`).test(body);
    })
    .map(([whole]) => whole.slice(0, 60));
  assert.deepEqual(unguarded, []);
});

test('Sudoku ignores a tap on the difficulty already chosen', () => {
  const start = script.indexOf('function mountSudoku(');
  const body = script.slice(start, script.indexOf('\nfunction ', start + 10));
  assert.match(body, /addEventListener\('click',\(\)=>\{\s*if\(diff===k\)\s*return;/);
});

// ---- behaviour, on Tic-Tac-Toe (the scaffold the others copy) ----
function makeEl() {
  const el = {
    children: [], listeners: {}, attrs: {}, classes: new Set(), textContent: '', disabled: false,
    set innerHTML(v) { el.children = []; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    appendChild(c) { el.children.push(c); return c; },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    click() { if (!el.disabled) for (const fn of el.listeners.click || []) fn(); },
  };
  el.classList = { add: (c) => el.classes.add(c) };
  Object.defineProperty(el, 'className', {
    get() { return [...el.classes].join(' '); },
    set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  return el;
}

test('re-tapping vs Computer mid-game keeps the board', () => {
  const s = script.indexOf('function mountTicTacToe(');
  const src = script.slice(s, script.indexOf('\nfunction mountConnect4', s));
  const mountTicTacToe = new Function('document', 'TICTACTOE', 'setTimeout',
    `${src}\n; return mountTicTacToe;`)({ createElement: makeEl }, TICTACTOE, () => 0);
  const host = makeEl(), controls = makeEl();
  mountTicTacToe(host, { controls, status() {} });
  host.children[4].click(); // centre; the computer's reply is on a (stubbed) timer
  const marked = () => host.children.map((b) => b.textContent).join('|');
  const before = marked();
  assert.match(before, /✕/);
  const vsAi = controls.children.find((b) => b.textContent === 'vs Computer');
  vsAi.click();
  assert.equal(marked(), before, 'the board survived the re-tap');
});
