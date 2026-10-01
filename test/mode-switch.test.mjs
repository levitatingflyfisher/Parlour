// Switching "vs Computer" <-> "2 Players" mid-game keeps the board (persona A1,
// operator ruling Q-A1). The side to move passes to the computer, or back to a
// human, without a restart; switching to 2 Players cancels a computer move that
// is still on its timer. The computer keeps its usual side (the second player).
//
// Each mount lives inline in index.template.html, so its source is extracted and
// run against a small DOM stub with a hand-flushed timer queue (no jsdom, per the
// zero-dependency rule), as stratego-mount.test.mjs does.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as TICTACTOE from '../games/tictactoe.mjs';
import * as CONNECT4 from '../games/connect4.mjs';
import * as CHESS from '../games/chess.mjs';
import * as GOMOKU from '../games/gomoku.mjs';
import * as QUORIDOR from '../games/quoridor.mjs';
import * as CHECKERS from '../games/checkers.mjs';
import * as BLOKUS from '../games/blokus.mjs';
import * as DOTSBOXES from '../games/dotsboxes.mjs';
import * as HEX from '../games/hex.mjs';
import * as NIM from '../games/nim.mjs';
import * as REVERSI from '../games/reversi.mjs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');

function extractMount(name) {
  const start = template.indexOf(`function ${name}(host, h){`);
  assert.ok(start >= 0, `${name} found`);
  const ends = ['\nfunction mount', '\n/*__MORE_MOUNTS__*/']
    .map((m) => template.indexOf(m, start + 10)).filter((i) => i > start);
  return template.slice(start, Math.min(...ends));
}

function makeEl(tag) {
  const el = {
    tag, children: [], listeners: Object.create(null), classes: new Set(), attrs: {},
    style: {}, type: '', textContent: '', disabled: false, isConnected: true, _html: '',
    setAttribute(k, v) { el.attrs[k] = String(v); },
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    click() { if (el.disabled) return; for (const fn of el.listeners.click || []) fn(); },
  };
  el.classList = {
    add(...cs) { for (const c of cs) el.classes.add(c); },
    remove(...cs) { for (const c of cs) el.classes.delete(c); },
    contains(c) { return el.classes.has(c); },
  };
  Object.defineProperty(el, 'className', {
    get() { return [...el.classes].join(' '); },
    set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = v; el.children = []; },
  });
  return el;
}

// Classes that mark whose turn it is or what is selected, not what is on the board.
const TRANSIENT = new Set(['hint', 'play', 'sel', 'dest', 'cap', 'pv-ok', 'pv-bad', 'win']);
function snapshot(el) {
  const cls = [...el.classes].filter((c) => !TRANSIENT.has(c)).sort().join('.');
  return `${cls}:${el.textContent}[${el.children.map(snapshot).join(',')}]`;
}
function enabledButtons(el, out = []) {
  if (el.tag === 'button' && !el.disabled && (el.listeners.click || []).length) out.push(el);
  for (const c of el.children) enabledButtons(c, out);
  return out;
}

// Tap enabled buttons in board order until one of them changes the board.
function tapFirst(host) {
  const before = snapshot(host);
  for (let i = 0; i < 400; i++) {
    const b = enabledButtons(host)[i];
    if (!b) return;
    b.click();
    if (snapshot(host) !== before) return;
  }
}

// Blokus: pick the first piece in the tray, then tap squares until it lands.
function blokusMove(host) {
  const grid = () => host.children[0];
  const before = snapshot(grid());
  host.children[2].children.find((b) => !b.disabled).click();
  for (let i = 0; i < grid().children.length; i++) {
    grid().children[i].click();
    if (snapshot(grid()) !== before) return;
  }
}

// Checkers and Chess: tap the piece, then its destination (an opening move).
function twoTaps(host, { from, to }) {
  host.children[0].children[from].click();
  host.children[0].children[to].click();
}

// One entry per two-player game:
//  ns:      { NAME: module } globals the mount reads
//  ai:      [NAME, fn] the computer's move function, counted while timers flush
//  move:    plays one move for the side to move (a human's taps)
//  aiCount: optional, counts the computer's moves from the board instead
//  end:     [NAME, fn, value, trigger?] once armed, fn returns value so the next move
//           ends the game (after a call to trigger, when fn is also needed to move)
const GAMES = {
  mountTicTacToe: {
    ns: { TICTACTOE },
    move: (host) => host.children.find((b) => !b.disabled).click(),
    aiCount: (host) => host.children.filter((b) => b.textContent === '◯').length,
    end: ['TICTACTOE', 'winner', 'X'],
  },
  mountConnect4: { ns: { CONNECT4 }, ai: ['CONNECT4', 'bestMove'], move: tapFirst, end: ['CONNECT4', 'winner', 'R'] },
  mountReversi: { ns: { REVERSI }, ai: ['REVERSI', 'bestMove'], move: tapFirst, end: ['REVERSI', 'winner', 'B'] },
  mountNim: { ns: { NIM }, ai: ['NIM', 'bestMove'], move: tapFirst, end: ['NIM', 'isOver', true] },
  mountHex: { ns: { HEX }, ai: ['HEX', 'bestMove'], move: tapFirst, end: ['HEX', 'winner', 'R'] },
  mountDotsboxes: { ns: { DOTSBOXES }, ai: ['DOTSBOXES', 'bestMove'], move: tapFirst, end: ['DOTSBOXES', 'isOver', true] },
  mountBlokus: { ns: { BLOKUS }, ai: ['BLOKUS', 'aiMove'], move: blokusMove, end: ['BLOKUS', 'hasAnyMove', false] },
  mountCheckers: { ns: { CHECKERS }, ai: ['CHECKERS', 'bestMove'], move: (host) => twoTaps(host, CHECKERS.legalMoves(CHECKERS.emptyBoard(), 'r')[0]),
    end: ['CHECKERS', 'legalMoves', [], 'applyMove'] },
  mountQuoridor: { ns: { QUORIDOR }, ai: ['QUORIDOR', 'aiMove'], move: tapFirst, end: ['QUORIDOR', 'winner', 0] },
  mountGomoku: { ns: { GOMOKU }, ai: ['GOMOKU', 'bestMove'], move: tapFirst, end: ['GOMOKU', 'winner', 'B'] },
  mountChess: { ns: { CHESS }, ai: ['CHESS', 'bestMove'], move: (host) => twoTaps(host, { from: 52, to: 36 }), // e2-e4
    end: ['CHESS', 'status', 'checkmate'] },
};

function mountGame(name) {
  const cfg = GAMES[name];
  const queue = [];
  let calls = 0, armed = false, ended = false;
  const globals = {};
  for (const [k, mod] of Object.entries(cfg.ns)) globals[k] = { ...mod };
  if (cfg.ai) {
    const [ns, fn] = cfg.ai;
    globals[ns][fn] = (...a) => { calls++; return cfg.ns[ns][fn](...a); };
  }
  if (cfg.end) {
    const [ns, fn, value, trigger] = cfg.end;
    globals[ns][fn] = (...a) => ((trigger ? ended : armed) ? value : cfg.ns[ns][fn](...a));
    if (trigger) globals[ns][trigger] = (...a) => { if (armed) ended = true; return cfg.ns[ns][trigger](...a); };
  }
  const names = Object.keys(globals);
  const factory = new Function('document', 'setTimeout', ...names,
    `${extractMount(name)}\nreturn ${name};`);
  const host = makeEl('div');
  const controls = makeEl('div');
  const statuses = [];
  factory({ createElement: (t) => makeEl(t) }, (fn) => { queue.push(fn); return queue.length; },
    ...names.map((n) => globals[n]))(host, { board: host, controls, status: (m) => statuses.push(m) });
  const g = {
    host, statuses,
    pill: (label) => controls.children.find((b) => b.textContent === label).click(),
    board: () => snapshot(host),
    move: () => { const before = snapshot(host); cfg.move(host); assert.notEqual(snapshot(host), before, 'a move was played'); },
    pending: () => queue.length,
    flush() { for (let i = 0; queue.length && i < 50; i++) queue.shift()(); },
    // The computer's moves so far: counted on the board, or by calls to its move function.
    aiMoves: () => (cfg.aiCount ? cfg.aiCount(host) : calls),
    canTap: () => enabledButtons(host).length > 0,
    arm: (on = true) => { armed = on; ended = false; },
    controls: () => controls.children,
  };
  return g;
}

for (const name of Object.keys(GAMES)) {
  const game = name.replace(/^mount/, '');

  test(`${game}: 2 Players mid-think keeps the board and cancels the computer's move`, () => {
    const g = mountGame(name);           // vs Computer is the default
    g.move();
    assert.ok(g.pending() > 0, 'the computer\'s reply is queued');
    const before = g.board(), ai0 = g.aiMoves();
    g.pill('2 Players');
    assert.equal(g.board(), before, 'switching kept the board');
    g.flush();
    assert.equal(g.board(), before, 'the queued computer move did not land');
    assert.equal(g.aiMoves(), ai0, 'the computer did not move');
    assert.ok(g.canTap(), 'the second player can now take the turn');
  });

  test(`${game}: vs Computer mid-game keeps the board and the computer takes its turn`, () => {
    const g = mountGame(name);
    g.pill('2 Players');
    g.move();                             // the first player moves; the second is to move
    const before = g.board(), ai0 = g.aiMoves();
    g.pill('vs Computer');
    assert.equal(g.board(), before, 'switching kept the board');
    g.flush();
    assert.equal(g.aiMoves(), ai0 + 1, 'the computer made one move');
    assert.notEqual(g.board(), before, 'the computer\'s move is on the board');
    assert.ok(g.canTap(), 'the turn came back to the human');
  });

  test(`${game}: switching away and back during the think makes exactly one computer move`, () => {
    const g = mountGame(name);
    g.move();
    const ai0 = g.aiMoves();
    g.pill('2 Players');
    g.pill('vs Computer');
    g.flush();
    assert.equal(g.aiMoves(), ai0 + 1, 'one computer move, not two');
    assert.ok(g.canTap(), 'the turn came back to the human');
  });

  for (const [played, other] of [['2 Players', 'vs Computer'], ['vs Computer', '2 Players']]) {
    test(`${game}: a game finished in ${played} keeps its result after a switch to ${other}`, () => {
      const g = mountGame(name);
      if (played === '2 Players') g.pill('2 Players');
      g.arm();
      g.move();                           // this move ends the game
      g.flush();
      const result = g.statuses.at(-1), board = g.board();
      g.pill(other);
      for (const b of g.controls()) {     // e.g. Quoridor's Move / Wall redraw the stage
        if (!['vs Computer', '2 Players', 'New game'].includes(b.textContent)) b.click();
      }
      g.flush();
      assert.equal(g.statuses.at(-1), result, 'the result keeps the mode it was played in');
      assert.equal(g.board(), board, 'the finished board stays');
      g.arm(false);
      g.pill('New game');                 // the next game is in the new mode
      g.move();
      assert.equal(g.pending() > 0, other === 'vs Computer', `the new game is ${other}`);
    });
  }
}
