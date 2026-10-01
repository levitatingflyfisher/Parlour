// Installed PWAs only fetch a new build promptly when sw.js changes, and the
// worker drops old caches by name. So the cache name must change whenever a
// shipped file changes: build.mjs stamps it with a hash of those files, and
// this test fails if a shipped file changed without a rebuild.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');

test('the service-worker cache name is stamped with the shipped files', () => {
  const assets = JSON.parse(sw.match(/const ASSETS = (\[[^\]]*\]);/)[1].replace(/'/g, '"'))
    .filter((a) => a !== './');
  assert.ok(assets.includes('index.html'), 'index.html is cached');
  const h = createHash('sha256');
  for (const a of assets) h.update(readFileSync(new URL(a, root)));
  const want = `parlour-${h.digest('hex').slice(0, 10)}`;
  assert.equal(sw.match(/const CACHE = '([^']+)';/)[1], want,
    'run `npm run build` to restamp sw.js after changing a shipped file');
});
