// Closing a game must run one shared teardown (audit finding: closeGame only
// cleared the stage, so each game cleaned up after itself by hand). A game
// registers what it must undo with helpers.onClose(fn); closeGame runs those
// once and forgets them, so a reopened game never meets a stale one.
//
// openGame and closeGame live inline in index.template.html; this test extracts
// them and runs them against small stubs, as the other mount tests do.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

function shell() {
  const classes = new Set();
  const classList = (set) => ({
    add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
  });
  const stageEl = { classList: classList(new Set()), innerHTML: 'x' };
  const els = {};
  const document = {
    title: '',
    body: { classList: classList(classes) },
    getElementById: (id) => (els[id] ||= { addEventListener() {} }),
  };
  const location = { hash: '', pathname: '/', search: '' };
  const history = { replaceState() {} };
  const window = { scrollTo() {} };
  const decl = script.match(/^\s*const closers\s*=\s*\[\];/m);
  assert.ok(decl, 'a shared list of close callbacks is declared');
  const make = new Function('document', 'stageEl', 'location', 'history', 'window', 'HOME_TITLE', 'renderStatus',
    `${decl[0]}\n${extract('openGame')}\n${extract('closeGame')}\nreturn { openGame, closeGame };`);
  return make(document, stageEl, location, history, window, 'Parlour', () => {});
}

test('closeGame runs every onClose callback once, then forgets them', () => {
  const { openGame, closeGame } = shell();
  let ran = 0;
  openGame({ id: 'g', name: 'G', mount: (host, h) => { h.onClose(() => ran++); h.onClose(() => ran++); } });
  assert.equal(ran, 0, 'nothing runs while the game is open');
  closeGame();
  assert.equal(ran, 2);
  closeGame();
  assert.equal(ran, 2, 'a second close does not run them again');
});

test('a reopened game does not inherit the last game\'s callbacks', () => {
  const { openGame, closeGame } = shell();
  const log = [];
  openGame({ id: 'a', name: 'A', mount: (host, h) => h.onClose(() => log.push('a')) });
  closeGame();
  openGame({ id: 'b', name: 'B', mount: (host, h) => h.onClose(() => log.push('b')) });
  closeGame();
  assert.deepEqual(log, ['a', 'b']);
});

test('one failing callback does not stop the others', () => {
  const { openGame, closeGame } = shell();
  let ran = false;
  openGame({ id: 'a', name: 'A', mount: (host, h) => { h.onClose(() => { throw new Error('x'); }); h.onClose(() => { ran = true; }); } });
  closeGame();
  assert.ok(ran);
});
