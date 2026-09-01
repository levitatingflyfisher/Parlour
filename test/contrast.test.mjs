// Contrast floor for Parlour's CSS, in every theme the page ships.
//
// The page's colours live as tokens on `:root` (light) with a dark overlay on
// `:root[data-theme="dark"]` once one exists. This test reads the <style> block
// straight out of index.template.html and checks text contrast two ways:
//
//  1. Automatically: every rule that sets both `color` and an opaque
//     `background` in the same declaration block (gradients are judged by their
//     worst stop, and a rule's own `opacity` is blended in).
//  2. By hand: text whose ground is inherited (text on felt, text on the paper
//     panel). Each entry names a selector and the grounds it can sit on; the
//     colour is read from that selector's own rule, so a change to the rule is
//     what the test judges.
//
// Floor: 4.5:1 for text (WCAG 1.4.3), everywhere, no large-text discount.
// Zero dependencies, per the repo rule.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');

// ---------- tiny CSS reader ----------
export function readRules(src) {
  const css = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>'))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; }
    else if (ch === '}') {
      const sel = stack.pop();
      if (buf.trim() && sel !== undefined) {
        const decls = {};
        for (const d of buf.split(';')) {
          const i = d.indexOf(':');
          if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
        }
        rules.push({ selector: sel.replace(/\s+/g, ' '), media: stack.slice(), decls });
      }
      buf = '';
    } else buf += ch;
  }
  return rules;
}

const RULES = readRules(template);

function tokensFor(theme) {
  const base = {};
  const apply = (sel) => {
    for (const r of RULES) if (r.selector === sel && r.media.length === 0)
      for (const [k, v] of Object.entries(r.decls)) if (k.startsWith('--')) base[k] = v;
  };
  apply(':root');
  if (theme === 'dark') apply(':root[data-theme="dark"]');
  return base;
}

function resolve(value, tokens, depth = 0) {
  if (depth > 8) throw new Error('var() cycle in ' + value);
  return value.replace(/var\((--[\w-]+)(?:,([^)]*))?\)/g, (_, name, fb) => {
    const v = tokens[name] ?? (fb && fb.trim());
    if (v === undefined) throw new Error('unknown token ' + name);
    return resolve(v, tokens, depth + 1);
  });
}

// ---------- colour maths ----------
function rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const blend = (fg, bg, a) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));

// '#rrggbbaa' → {rgb, alpha}; '#rgb' / '#rrggbb' → alpha 1
function parseHex(h) {
  const s = h.replace('#', '');
  if (s.length === 8) return { rgb: rgb(s.slice(0, 6)), alpha: parseInt(s.slice(6), 16) / 255 };
  if (s.length === 6 || s.length === 3) return { rgb: rgb(s), alpha: 1 };
  return null;
}
const hexes = (v) => (v.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(parseHex).filter(Boolean);

function mergedDecls(selector) {
  const out = {};
  let found = false;
  for (const r of RULES) {
    if (r.media.length) continue;
    if (r.selector.split(',').map((s) => s.trim()).includes(selector)) {
      Object.assign(out, r.decls); found = true;
    }
  }
  return found ? out : null;
}

// Text colour of a rule as rendered over `ground` (rgb), honouring alpha and opacity.
function effectiveText(decls, tokens, ground) {
  const c = hexes(resolve(decls.color, tokens))[0];
  if (!c) return null;
  let fg = c.alpha < 1 ? blend(c.rgb, ground, c.alpha) : c.rgb;
  const op = decls.opacity !== undefined ? parseFloat(decls.opacity) : 1;
  if (op < 1) fg = blend(fg, ground, op);
  return fg;
}

// Inherited grounds, by token name. The panel is a paper→paper-edge gradient.
const PANEL = ['--paper', '--paper-edge'];
const FELT = ['--felt', '--felt-deep', '--felt-hi'];

// selector → grounds it sits on. Colour comes from the selector's own rule.
const INHERITED = {
  'header.top': FELT,
  '.stage': FELT,
  '.back': FELT,
  '.shelf-foot': FELT,
  '.shelf-foot a': FELT,
  '.panel': PANEL,
  '.tile': PANEL,
  '.tile p': PANEL,
  '.badge': PANEL,
  '.badge.le': PANEL,
  '.btn.ghost': PANEL,
  '.lvl-label': PANEL,
  '.hex .hexcap': PANEL,
  '.hangman .hm-meter': PANEL,
  '.hangman .hm-meter b': PANEL,
  '.hex2 .legend': PANEL,
  '.hex2 .legend .r': PANEL,
  '.hex2 .legend .b': PANEL,
  '.mines .cell.n1': ['--board'],
  '.mines .cell.n2': ['--board'],
  '.mines .cell.n3': ['--board'],
  '.mines .cell.n4': ['--board'],
  '.mines .cell.n5': ['--board'],
  '.mines .cell.n6': ['--board'],
  '.mines .cell.n7': ['--board'],
  '.mines .cell.n8': ['--board'],
  '.mm .mm-revlabel': PANEL,
  '.nim-rowlabel': ['--felt'],
  '.c8 .opp-label': PANEL,
  '.c8 .pile': ['--felt'],
  '.c8 .you-label': PANEL,
  '.c8 .suit-ask': PANEL,
  '.bk .bk-hint': PANEL,
  '.st .key': PANEL,
  '.st .hide p': ['--felt-deep'],
  '.globe .gname': ['--paper'],
  '.globe .gkm': ['--paper'],
  '.globe .gnote': PANEL,
  '.globe .garrow': ['--paper'],
  '.sud-cell': ['--paper'],
  '.sud-cell.given': ['--paper'],
  '.status': PANEL,
  '.status.err': PANEL,
  '.wordle-legend': PANEL,
  '.mark': FELT,
  '.themes button': FELT,
  '.mm .mm-num': ['--row'],
  '.wordle .wkey': ['--key'],
};

// Rules the automatic sweep may skip, each with its reason.
const EXEMPT = {
  '.hangman .hm-key.miss': 'a spent, disabled key; WCAG 1.4.3 exempts inactive controls',
};

for (const theme of ['light', 'dark']) {
  const tokens = tokensFor(theme);
  const hasDark = RULES.some((r) => r.selector === ':root[data-theme="dark"]');

  test(`${theme}: every rule with its own text + background clears 4.5:1`, (t) => {
    if (theme === 'dark' && !hasDark) return t.skip('no dark theme yet');
    const fails = [];
    let checked = 0;
    for (const r of RULES) {
      if (r.media.length || !r.decls.color) continue;
      if (Object.keys(EXEMPT).some((e) => r.selector.split(',').map((s) => s.trim()).includes(e))) continue;
      const bgv = r.decls.background ?? r.decls['background-color'];
      if (!bgv) continue;
      let colour;
      try { colour = resolve(r.decls.color, tokens); } catch { continue; }
      if (/transparent|initial|inherit/.test(colour)) continue;
      const stops = hexes(resolve(bgv, tokens)).filter((s) => s.alpha === 1);
      if (!stops.length) continue;
      let worst = Infinity;
      for (const s of stops) {
        const fg = effectiveText(r.decls, tokens, s.rgb);
        if (!fg) continue;
        worst = Math.min(worst, ratio(fg, s.rgb));
      }
      if (worst === Infinity) continue;
      checked++;
      if (worst < 4.5) fails.push(`${r.selector}: ${worst.toFixed(2)}:1`);
    }
    assert.ok(checked >= 25, `the sweep found only ${checked} rules; the reader is broken`);
    assert.deepEqual(fails, [], 'text below 4.5:1');
  });

  test(`${theme}: text on inherited grounds clears 4.5:1`, (t) => {
    if (theme === 'dark' && !hasDark) return t.skip('no dark theme yet');
    const fails = [];
    for (const [sel, grounds] of Object.entries(INHERITED)) {
      const d = mergedDecls(sel);
      assert.ok(d, `selector ${sel} not found in the stylesheet`);
      if (!d.color) { fails.push(`${sel}: sets no color`); continue; }
      for (const g of grounds) {
        const ground = hexes(resolve(`var(${g})`, tokens))[0].rgb;
        const fg = effectiveText(d, tokens, ground);
        const r = ratio(fg, ground);
        if (r < 4.5) fails.push(`${sel} on ${g}: ${r.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(fails, [], 'text below 4.5:1');
  });
}

test('per-game blocks do not re-declare the theme tokens', () => {
  // A game root that pins --paper/--ink back to fixed values would keep that
  // game light when the page is dark.
  const pinned = RULES.filter((r) => r.selector !== ':root' && !r.selector.startsWith(':root[')
    && Object.keys(r.decls).some((k) => ['--paper', '--paper-edge', '--ink', '--felt', '--brass', '--x', '--o'].includes(k)))
    .map((r) => r.selector);
  assert.deepEqual(pinned, []);
});
