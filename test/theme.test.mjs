// Theme: light, dark, or follow the device (fleet ruling), default follow the
// device, switchable in one tap from the cupboard and from every game.
//
// Storage: ADR-0005 keeps games unsaved. The one thing Parlour writes is the
// theme choice, under one key, and only when it differs from the default.
// This file pins that: the key, the only storage API use in the page, and
// PRIVACY.md naming it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const template = read('../index.template.html');

function extract(name) {
  const start = template.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} found`);
  let depth = 0;
  for (let i = template.indexOf('{', start); i < template.length; i++) {
    if (template[i] === '{') depth++;
    else if (template[i] === '}' && --depth === 0) return template.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

const keyLine = template.match(/const THEME_KEY='[^']+';/);
const api = keyLine && new Function(
  `${keyLine[0]}\n${extract('readThemePref')}\n${extract('writeThemePref')}\n${extract('resolveTheme')}\n` +
  'return {THEME_KEY, readThemePref, writeThemePref, resolveTheme};')();

function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}
const throwing = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceeded'); },
  removeItem() { throw new Error('SecurityError'); },
};

test('the theme key is parlour.theme', () => {
  assert.ok(api, 'theme helpers present');
  assert.equal(api.THEME_KEY, 'parlour.theme');
});

test('default is follow the device', () => {
  assert.equal(api.readThemePref(memStore()), 'system');
  assert.equal(api.readThemePref(null), 'system');
  assert.equal(api.readThemePref(memStore({ 'parlour.theme': 'purple' })), 'system');
  assert.equal(api.readThemePref(throwing), 'system', 'blocked storage still renders');
});

test('a stored choice is read back', () => {
  assert.equal(api.readThemePref(memStore({ 'parlour.theme': 'dark' })), 'dark');
  assert.equal(api.readThemePref(memStore({ 'parlour.theme': 'light' })), 'light');
});

test('choosing follow-the-device stores nothing; light and dark store one key', () => {
  const s = memStore();
  api.writeThemePref(s, 'dark');
  assert.deepEqual([...s.m], [['parlour.theme', 'dark']]);
  api.writeThemePref(s, 'system');
  assert.equal(s.m.size, 0);
  assert.doesNotThrow(() => api.writeThemePref(throwing, 'dark'));
  assert.doesNotThrow(() => api.writeThemePref(null, 'dark'));
});

test('follow the device resolves from the media query', () => {
  assert.equal(api.resolveTheme('system', true), 'dark');
  assert.equal(api.resolveTheme('system', false), 'light');
  assert.equal(api.resolveTheme('light', true), 'light');
  assert.equal(api.resolveTheme('dark', false), 'dark');
});

test('the theme is applied before first paint (script in <head>)', () => {
  const head = template.slice(0, template.indexOf('</head>'));
  assert.match(head, /<script>[\s\S]*applyTheme\(readThemePref\(themeStore\(\)\)\)[\s\S]*<\/script>/);
});

test('the switch is one tap from the cupboard and from every game', () => {
  // One persistent control outside the cupboard and the stage, never hidden
  // while a game is open.
  const body = template.slice(template.indexOf('<body>'));
  const bar = body.match(/<div class="topline"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(bar, 'topline markup');
  for (const [v, label] of [['light', 'Light'], ['dark', 'Dark'], ['system', 'Auto']]) {
    assert.match(bar[0], new RegExp(`data-theme-choice="${v}"[^>]*>[^<]*${label}`), `${label} button`);
  }
  const hide = template.match(/body\.playing [^{]*\{display:none\}/g) || [];
  for (const rule of hide) assert.doesNotMatch(rule, /topline|themes/);
});

test('the page touches storage only through the theme key', () => {
  const script = template.replace(/<style>[\s\S]*?<\/style>/, '');
  const uses = script.match(/localStorage|sessionStorage|indexedDB|document\.cookie/g) || [];
  assert.deepEqual([...new Set(uses)], ['localStorage']);
  assert.equal((script.match(/localStorage/g) || []).length, 1, 'one accessor, in themeStore()');
  const keys = script.match(/(?:getItem|setItem|removeItem)\(([^,)]+)/g) || [];
  for (const k of keys) assert.match(k, /\((?:THEME_KEY)$/, `storage call ${k}`);
});

test('PRIVACY.md says exactly what is stored', () => {
  const privacy = read('../PRIVACY.md');
  assert.match(privacy, /parlour\.theme/);
  assert.doesNotMatch(privacy, /scores or preferences are stored/);
});
