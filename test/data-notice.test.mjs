// The fleet's web data notice. Parlour keeps its theme and game state in
// this browser, and clearing the browser's website data erases them. The
// family opens every app from one link in a phone browser, so the page says
// so once, at the top, in the shelf's quiet small text. The sentence is word
// for word ohStyle's ohWebDataNotice (curly apostrophe included). Checked in
// the built page, which is what ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const NOTICE =
  'Your data stays on this device, in this browser. ' +
  'If you clear the browser’s website data, it is erased.';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const body = page.match(/<body[^>]*>([\s\S]*?)<script>/)[1];
const words = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('the page says the data notice once, word for word', () => {
  assert.equal(words(body).split(NOTICE).length - 1, 1);
});

test('the notice opens the page, before the top line', () => {
  const at = body.indexOf('<p class="data-notice">');
  assert.ok(at >= 0, 'no data notice paragraph');
  assert.ok(at < body.indexOf('class="topline"'), 'the notice is not at the top');
  const p = body.slice(at).match(/<p class="data-notice">([\s\S]*?)<\/p>/)[1];
  assert.equal(words(p), NOTICE);
});

test('the notice is set in the quiet small text of the shelf foot', () => {
  const rule = page.match(/\.data-notice\{([^}]*)\}/);
  assert.ok(rule, 'no .data-notice style');
  assert.match(rule[1], /font-size:\.8rem/);
  assert.match(rule[1], /color:var\(--on-felt\)/);
});
