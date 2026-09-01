// Klondike's seventh pile was sliced off at phone width (audit dmmt-04 and
// seven siblings): the card width came from the viewport (12.5vw) while the
// seven columns live in a container ~76px narrower than the viewport. The card
// width must come from the container, so seven cards and six gaps always fit.
//
// No browser here (zero deps), so this evaluates the declared formula for the
// container widths the page produces: viewport - 36px (.wrap padding) - 40px
// (.panel padding), with the panel capped at 560px.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');
const css = template.slice(0, template.indexOf('</style>'));

function decl(selector, prop) {
  const re = new RegExp(`(?:^|\\})\\s*${selector.replace(/[.]/g, '\\.')}\\{([^}]*)\\}`, 'm');
  const m = css.match(re);
  assert.ok(m, `${selector} rule`);
  const d = m[1].split(';').map((x) => x.trim()).find((x) => x.startsWith(prop + ':'));
  return d && d.slice(prop.length + 1).trim();
}

// Evaluates min()/calc() over px and cqi, the only units the formula may use.
function evalLength(expr, cqi) {
  const js = expr
    .replace(/(\d+(?:\.\d+)?)cqi/g, (_, n) => `(${n}*${cqi}/100)`)
    .replace(/(\d+(?:\.\d+)?)px/g, '$1')
    .replace(/calc\(/g, '(')
    .replace(/min\(/g, 'Math.min(')
    .replace(/max\(/g, 'Math.max(');
  assert.match(js, /^[\d\s.+\-*/(),Mathminax]+$/, `unexpected units in ${expr}`);
  return Function(`return ${js}`)();
}

test('card width is derived from the container, not the viewport', () => {
  const cw = decl('.klon', '--cw');
  assert.ok(cw, '--cw declared');
  assert.doesNotMatch(cw, /vw/, 'no viewport units in the card width');
  assert.match(cw, /cqi/);
  assert.equal(decl('.klon', 'container-type'), 'inline-size');
});

test('seven cards and six gaps fit the tableau at every width', () => {
  const cw = decl('.klon', '--cw');
  const gap = parseFloat(decl('.klon .ktableau', 'gap'));
  for (const viewport of [320, 360, 390, 412, 768, 1024]) {
    const container = Math.min(viewport - 36, 920 - 36, 560) - 40;
    const card = evalLength(cw, container);
    assert.ok(7 * card + 6 * gap <= container + 0.01,
      `${viewport}px: 7×${card.toFixed(1)} + 6×${gap} > ${container}`);
    assert.ok(card >= 30, `${viewport}px: cards still readable (${card.toFixed(1)}px)`);
    assert.ok(card <= 60, `${viewport}px: capped at 60px`);
  }
});

test('a fallback for engines without container units still fits at 360px', () => {
  const fb = css.match(/\.klon\{--cw:(min\([^;]*vw[^;]*\));/);
  // The fallback lives outside @supports and may use vw; it must fit too.
  if (!fb) return;
  const expr = fb[1].replace(/(\d+(?:\.\d+)?)vw/g, (_, n) => `${n}cqi`);
  const container = 360 - 36 - 40;
  const card = evalLength(expr, 360);
  assert.ok(7 * card + 30 <= container + 0.01, `fallback ${card}`);
});
