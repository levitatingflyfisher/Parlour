// Counted claims must match the code (audit checklist-02). The number of
// games is stated in prose in several docs; each statement must equal the
// registry, and the registry must equal the modules on disk. Test counts
// change with every commit, so the docs do not state them at all.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const template = read('index.template.html');

const registry = template.slice(template.indexOf('const GAMES = ['), template.indexOf('/*__MORE_GAMES__*/'));
const ids = [...registry.matchAll(/\bid:'([^']+)'/g)].map((m) => m[1]);
const modules = readdirSync(new URL('games/', root)).filter((f) => f.endsWith('.mjs'));

const WORDS = { twenty: 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
  'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28, 'twenty-nine': 29, thirty: 30 };

function docs() {
  const files = ['README.md', 'VISION.md', 'AGENTS.md', 'PRIVACY.md', 'manifest.webmanifest'];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(dir, root), { withFileTypes: true })) {
      const p = dir + e.name;
      if (e.isDirectory()) walk(p + '/');
      else if (/\.(md|txt)$/.test(e.name)) files.push(p);
    }
  };
  walk('docs/');
  walk('fastlane/');
  return files;
}

test('the registry lists one tile per game module', () => {
  assert.equal(ids.length, modules.length);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
});

test('every stated number of games matches the registry', () => {
  const n = ids.length;
  const bad = [];
  const re = /\b(\d+|twenty(?:-[a-z]+)?|thirty)\s+((?:[a-z+-]+\s+){0,4}?)games\b/gi;
  let seen = 0;
  for (const f of [...docs(), 'index.template.html']) {
    for (const m of read(f).matchAll(re)) {
      const raw = m[1].toLowerCase();
      const v = /^\d+$/.test(raw) ? Number(raw) : WORDS[raw];
      if (v === undefined) continue;
      if (v < 10) continue; // "two games", "4 games" are not the catalogue size
      seen++;
      if (v !== n) bad.push(`${f}: "${m[0]}"`);
    }
  }
  assert.ok(seen >= 5, `found only ${seen} stated counts; the pattern is broken`);
  assert.deepEqual(bad, []);
});

test('docs do not state a test count (it drifts every commit)', () => {
  const bad = [];
  for (const f of docs()) {
    for (const m of read(f).matchAll(/~?\b\d{2,4}\s+tests\b|\(\d{2,4} at the time of writing\)/g)) bad.push(`${f}: "${m[0]}"`);
  }
  assert.deepEqual(bad, []);
});

test('Stratego is badged for one player as well as two', () => {
  const line = registry.split('\n').find((l) => l.includes("id:'stratego'"));
  assert.match(line, /badges:\['1 player','2 players'\]/);
});
