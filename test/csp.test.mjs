// The "no network after load" promise is enforced by the browser when the page
// carries a Content-Security-Policy. The page is one inline script pair and one
// inline style, so their hashes are allowed (build.mjs computes them) instead of
// 'unsafe-inline'. The service worker is a separate context with its own rules;
// the page only registers it, which needs worker-src, not connect-src.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const template = readFileSync(new URL('../index.template.html', import.meta.url), 'utf8');

function policy(html) {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(m, 'a Content-Security-Policy meta tag is present');
  return Object.fromEntries(
    m[1].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...vals] = d.split(/\s+/);
      return [name, vals];
    }),
  );
}
const sha = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

test('the built page blocks every network connection and unlisted source', () => {
  const p = policy(page);
  assert.deepEqual(p['default-src'], ["'none'"]);
  assert.deepEqual(p['connect-src'], ["'none'"]);
  assert.deepEqual(p['worker-src'], ["'self'"]);
  assert.deepEqual(p['manifest-src'], ["'self'"]);
  assert.deepEqual(p['base-uri'], ["'none'"]);
  assert.deepEqual(p['form-action'], ["'none'"]);
  for (const [name, vals] of Object.entries(p)) {
    assert.ok(!vals.includes("'unsafe-inline'"), `${name} has no unsafe-inline`);
    assert.ok(!vals.includes("'unsafe-eval'"), `${name} has no unsafe-eval`);
    assert.ok(!vals.includes('*') && !vals.some((v) => /^https?:/.test(v)), `${name} names no remote host`);
  }
});

test('every inline script and style is allowed by its hash', () => {
  const p = policy(page);
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const styles = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2);
  assert.equal(styles.length, 1);
  for (const s of scripts) assert.ok(p['script-src'].includes(sha(s)), 'script hash listed');
  for (const s of styles) assert.ok(p['style-src'].includes(sha(s)), 'style hash listed');
  assert.equal(p['script-src'].length, scripts.length);
  assert.equal(p['style-src'].length, styles.length);
});

test('the page uses nothing the policy would block', () => {
  assert.ok(!/\sstyle\s*=/.test(page.replace(/<script>[\s\S]*?<\/script>/g, '')), 'no inline style attributes in markup');
  assert.ok(!/setAttribute\(\s*['"]style['"]|cssText|\son[a-z]+\s*=\s*["']/.test(page), 'no style attribute or inline handler is created');
  assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(template), 'the page makes no network call');
});
