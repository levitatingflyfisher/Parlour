// The three mounts that listen for the physical keyboard (2048, Hangman,
// Wordle) added a window keydown listener that was only removed on the next
// keypress after the game closed. Each must now hand its removal to
// helpers.onClose, so closing a game leaves no listener behind and reopening
// one never stacks a second.
//
// The mounts live inline in index.template.html; this test extracts them and
// runs them against a permissive DOM stub.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G2048 from '../games/g2048.mjs';
import * as HANGMAN from '../games/hangman.mjs';
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

// Any property read or call on a stub element returns another stub, so a mount
// can build whatever DOM it likes. isConnected is true: the game is on screen.
function stub() {
  const self = new Proxy(function () {}, {
    get(t, k) {
      if (k === 'isConnected') return true;
      if (k === Symbol.toPrimitive) return () => '';
      if (k === 'length') return 0;
      if (k === Symbol.iterator) return function* () {};
      return (t[k] ??= stub());
    },
    set(t, k, v) { t[k] = v; return true; },
    apply: () => stub(),
  });
  return self;
}

function run(name, ns, lib) {
  const listeners = new Set();
  const window = {
    addEventListener: (ev, fn) => { if (ev === 'keydown') listeners.add(fn); },
    removeEventListener: (ev, fn) => { if (ev === 'keydown') listeners.delete(fn); },
  };
  const document = { createElement: () => stub(), createTextNode: () => stub(), getElementById: () => stub() };
  const mount = new Function('document', 'window', ns, 'setTimeout', 'clearTimeout',
    `${extract(name)}; return ${name};`)(document, window, lib, () => 0, () => {});
  return {
    listeners,
    open() {
      const closers = [];
      mount(stub(), { board: stub(), controls: stub(), status() {}, onClose: (fn) => closers.push(fn) });
      return () => closers.forEach((fn) => fn());
    },
  };
}

for (const [name, ns, lib] of [
  ['mountG2048', 'G2048', G2048], ['mountHangman', 'HANGMAN', HANGMAN], ['mountWordle', 'WORDLE', WORDLE],
]) {
  test(`${name}: closing the game removes its keydown listener at once`, () => {
    const r = run(name, ns, lib);
    const close = r.open();
    assert.equal(r.listeners.size, 1, 'one listener while open');
    close();
    assert.equal(r.listeners.size, 0, 'none after close, without waiting for a keypress');
  });

  test(`${name}: reopening does not stack listeners`, () => {
    const r = run(name, ns, lib);
    const closeFirst = r.open();
    closeFirst();
    r.open();
    assert.equal(r.listeners.size, 1);
  });
}
