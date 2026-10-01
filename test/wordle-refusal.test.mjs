// Wordle's refusal ("Not enough letters.") printed at the top of the panel
// and erased itself after 1.5 s, while the player's eyes were on the keys
// (audit finding 8, parked from the rollout). Now no timer: the refusal
// stays until the player's next key, which brings the row count back, and
// the refused row is marked where the eyes are.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as WORDLE from '../games/wordle.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const start = template.indexOf('function mountWordle(host, h){');
const src = template.slice(start, template.indexOf('\nfunction ', start + 10));

function makeEl(tag) {
  const el = {
    tag, children: [], listeners: {}, attrs: {}, textContent: '', classes: new Set(), isConnected: true,
    setAttribute(k, v) { el.attrs[k] = String(v); },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    append(...cs) { el.children.push(...cs); },
  };
  el.classList = { add: (...c) => c.forEach((x) => el.classes.add(x)), remove: (...c) => c.forEach((x) => el.classes.delete(x)) };
  Object.defineProperty(el, 'className', { get: () => [...el.classes].join(' '), set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(el, 'innerHTML', { get: () => '', set() { el.children = []; } });
  return el;
}

function mount() {
  const host = makeEl('div');
  const statuses = [];
  const timers = [];
  const keyHandlers = [];
  const h = { status: (t, o) => statuses.push({ t, kind: o && o.kind }) };
  const document = { createElement: (t) => makeEl(t) };
  const window = { addEventListener: (ev, fn) => keyHandlers.push(fn), removeEventListener() {} };
  const setTimeout = (fn, ms) => { timers.push(ms); return timers.length; };
  new Function('WORDLE', 'document', 'window', 'setTimeout', 'host', 'h', `${src}\n;mountWordle(host, h);`)(
    WORDLE, document, window, setTimeout, host, h);
  const key = (k) => keyHandlers.forEach((fn) => fn({ key: k, preventDefault() {} }));
  return { host, statuses, timers, key };
}

test('a refusal stays until the next key, with no timer', () => {
  const { statuses, timers, key } = mount();
  key('a'); key('b'); key('Enter');
  assert.equal(statuses.at(-1).t, 'Not enough letters.');
  assert.equal(statuses.at(-1).kind, 'error');
  assert.deepEqual(timers, [], 'no self-erasing timer');
  key('c');
  assert.match(statuses.at(-1).t, /row 1 of/);
  assert.notEqual(statuses.at(-1).kind, 'error');
});

test('the refused row is marked where the player is looking', () => {
  const { host, key } = mount();
  key('a'); key('Enter');
  const grid = host.children.find((c) => c.classes.has('wgrid'));
  const row = grid.children[0];
  assert.ok(row.classes.has('refused'), 'row carries the refusal mark');
  key('b');
  const row2 = host.children.find((c) => c.classes.has('wgrid')).children[0];
  assert.ok(!row2.classes.has('refused'), 'the mark clears with the message');
});
