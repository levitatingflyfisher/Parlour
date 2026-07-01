// Regression test for the vs-Computer "New game during the AI's think" race.
//
// mountStratego schedules the computer's reply with a ~500ms setTimeout. If the
// player restarts during that window, a stale callback with no generation guard
// runs against the fresh board — where the computer has no army yet — so
// STRATEGO.aiMove() returns null, STRATEGO.winner() sees a flagless player 1,
// and the brand-new game instantly flips to a "You wins!" game-over screen.
// Every sibling AI game (nim, checkers, chess, …) carries a `gen` epoch guard;
// this test pins the same contract onto Stratego.
//
// The mount layer lives inline in index.template.html and is not an importable
// module, so this test extracts mountStratego's source and evaluates it against
// a minimal DOM stub with controllable timers — no jsdom, no dependencies,
// per the repo's zero-dependency law.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as STRATEGO from '../games/stratego.mjs';

const template = readFileSync(
  new URL('../index.template.html', import.meta.url), 'utf8');

function extractMountStratego() {
  const start = template.indexOf('function mountStratego(host, h){');
  assert.ok(start >= 0, 'mountStratego found in index.template.html');
  const end = template.indexOf('\nfunction mountGomoku', start);
  assert.ok(end > start, 'end of mountStratego found');
  return template.slice(start, end);
}

// ---- Minimal DOM stub (only what mountStratego actually touches) ----
function makeEl(tag) {
  const el = {
    tag,
    children: [],
    listeners: Object.create(null),
    classes: new Set(),
    type: '',
    textContent: '',
    disabled: false,
    isConnected: true,
    _html: '',
    setAttribute() {},
    addEventListener(ev, fn) { (el.listeners[ev] ||= []).push(fn); },
    appendChild(c) { el.children.push(c); return c; },
    click() { if (el.disabled) return; for (const fn of el.listeners.click || []) fn(); },
  };
  el.classList = { add(...cs) { for (const c of cs) el.classes.add(c); } };
  Object.defineProperty(el, 'className', {
    get() { return [...el.classes].join(' '); },
    set(v) { el.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = v; el.children = []; }, // replacing markup drops children
  });
  return el;
}

// Manually-flushed timer queue standing in for window.setTimeout.
function makeTimers() {
  const queue = [];
  return {
    setTimeout(fn) { queue.push(fn); return queue.length; },
    flush() { while (queue.length) queue.shift()(); },
    pending() { return queue.length; },
  };
}

// Deterministic Math (placeRandom shuffles armies with Math.random) so the
// board layout — and therefore the scripted human move — never flakes.
function seededMath(seed) {
  let s = seed >>> 0;
  return {
    floor: Math.floor,
    random() { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; },
  };
}

function mountGame() {
  const timers = makeTimers();
  const host = makeEl('div');
  const statuses = [];
  const h = { controls: makeEl('div'), status: (msg) => statuses.push(msg) };
  const factory = new Function(
    'document', 'setTimeout', 'Math', 'STRATEGO',
    extractMountStratego() + '\nreturn mountStratego;');
  factory(
    { createElement: (t) => makeEl(t) },
    timers.setTimeout,
    seededMath(42),
    STRATEGO,
  )(host, h);
  const grid = () => host.children.find((c) => c.classes.has('board'));
  const control = (label) =>
    h.controls.children.find((b) => b.textContent === label);
  // Tap own pieces until one has a highlighted destination, then tap it —
  // exactly the two clicks a human makes; ends with the AI's turn queued.
  const playOneHumanMove = () => {
    for (let i = 0; i < 100; i++) {
      const cell = grid().children[i];
      if (!cell || cell.disabled) continue;
      cell.click();
      const after = grid();
      const target = after.children.findIndex((c) => c.classes.has('move'));
      if (target >= 0) { after.children[target].click(); return true; }
    }
    return false;
  };
  return { timers, statuses, control, playOneHumanMove };
}

test('New game during the computer\'s think aborts the stale queued AI move', () => {
  const { timers, statuses, control, playOneHumanMove } = mountGame();
  control('Ready ✓').click();                     // vs Computer is the default mode
  assert.ok(playOneHumanMove(), 'a human move was played');
  assert.equal(timers.pending(), 1, 'the AI reply is queued');

  control('New game').click();                    // restart mid-think
  assert.match(statuses.at(-1), /arrange your army/,
    'restart returns to the setup screen');

  timers.flush();                                 // the stale callback fires
  assert.match(statuses.at(-1), /arrange your army/,
    'the fresh game must still be in setup — a stale AI move must not run');
  assert.ok(!statuses.at(-1).includes('wins'),
    'no phantom game-over on a game that just restarted');
});

test('the computer still answers when the game is not restarted', () => {
  const { timers, statuses, control, playOneHumanMove } = mountGame();
  control('Ready ✓').click();
  assert.ok(playOneHumanMove(), 'a human move was played');
  timers.flush();                                 // the AI takes its turn
  assert.match(statuses.at(-1), /Your turn/,
    'after the computer moves, play returns to the human');
});
