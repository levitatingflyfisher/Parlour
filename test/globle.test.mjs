import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES, dailyAnswer, findCountry, distanceKm, bearing, bearingArrow, proximity, guess,
} from '../games/globle.mjs';

test('COUNTRIES is a healthy table of well-formed centroids', () => {
  assert.ok(COUNTRIES.length >= 80 && COUNTRIES.length <= 100);
  for (const c of COUNTRIES) {
    assert.equal(typeof c.name, 'string');
    assert.ok(c.lat >= -90 && c.lat <= 90, `${c.name} lat in range`);
    assert.ok(c.lon >= -180 && c.lon <= 180, `${c.name} lon in range`);
  }
  // No duplicate names.
  assert.equal(new Set(COUNTRIES.map((c) => c.name)).size, COUNTRIES.length);
});

test('distanceKm is ~0 for identical points', () => {
  const p = { lat: 48.8566, lon: 2.3522 };
  assert.ok(distanceKm(p, p) < 1e-6);
  assert.equal(distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
});

test('distanceKm matches a known city pair (Paris↔London ≈ 343 km)', () => {
  const paris = { lat: 48.8566, lon: 2.3522 };
  const london = { lat: 51.5074, lon: -0.1278 };
  const d = distanceKm(paris, london);
  assert.ok(d > 320 && d < 365, `expected ~343 km, got ${d}`);
  // Symmetric.
  assert.ok(Math.abs(d - distanceKm(london, paris)) < 1e-9);
});

test('bearing points the right general way (cardinal cases)', () => {
  const origin = { lat: 0, lon: 0 };
  assert.ok(Math.abs(bearing(origin, { lat: 10, lon: 0 }) - 0) < 1e-6); // due north
  assert.ok(Math.abs(bearing(origin, { lat: 0, lon: 10 }) - 90) < 1e-6); // due east
  assert.ok(Math.abs(bearing(origin, { lat: -10, lon: 0 }) - 180) < 1e-6); // due south
  assert.ok(Math.abs(bearing(origin, { lat: 0, lon: -10 }) - 270) < 1e-6); // due west
});

test('bearingArrow snaps a bearing to one of the 8 compass arrows', () => {
  assert.equal(bearingArrow(0), '↑');
  assert.equal(bearingArrow(45), '↗');
  assert.equal(bearingArrow(90), '→');
  assert.equal(bearingArrow(135), '↘');
  assert.equal(bearingArrow(180), '↓');
  assert.equal(bearingArrow(225), '↙');
  assert.equal(bearingArrow(270), '←');
  assert.equal(bearingArrow(315), '↖');
  assert.equal(bearingArrow(360), '↑'); // wraps
  assert.equal(bearingArrow(20), '↑'); // snaps to nearest 45
});

test('answer north of guess yields an up-ish arrow', () => {
  // Egypt is roughly due-ish north of South Africa → arrow should be up-ish.
  const answer = findCountry('Egypt');
  const r = guess(answer, 'South Africa');
  assert.ok(['↑', '↗', '↖'].includes(r.arrow), `got ${r.arrow}`);
});

test('findCountry is case-insensitive, trims, and accepts aliases', () => {
  assert.equal(findCountry('france').name, 'France');
  assert.equal(findCountry('  FRANCE  ').name, 'France');
  assert.equal(findCountry('JaPaN').name, 'Japan');
  assert.equal(findCountry('USA').name, 'United States');
  assert.equal(findCountry('uk').name, 'United Kingdom');
  assert.equal(findCountry('UAE').name, 'United Arab Emirates');
});

test('findCountry rejects unknown names', () => {
  assert.equal(findCountry('Atlantis'), null);
  assert.equal(findCountry(''), null);
  assert.equal(findCountry('   '), null);
  assert.equal(findCountry(null), null);
  assert.equal(findCountry(undefined), null);
});

test('dailyAnswer is deterministic per seed and always in COUNTRIES', () => {
  assert.equal(dailyAnswer(20260629), dailyAnswer(20260629));
  assert.ok(COUNTRIES.includes(dailyAnswer(20260629)));
  // Always a real entry across a span of days.
  const picks = new Set();
  for (let d = 20260101; d <= 20260131; d++) {
    const a = dailyAnswer(d);
    assert.ok(COUNTRIES.includes(a), `seed ${d} -> a known country`);
    picks.add(a.name);
  }
  // It varies day to day (not a constant).
  assert.ok(picks.size > 1);
});

test('proximity is 100 at distance 0 and strictly lower for farther', () => {
  assert.equal(proximity(0), 100);
  assert.ok(proximity(15000) < proximity(1000));
  assert.ok(proximity(1000) < 100);
  assert.ok(proximity(20015) >= 0);
});

test('guess returns the full graded result, and a self-guess is correct at 0 km', () => {
  const answer = findCountry('Japan');
  const self = guess(answer, 'Japan');
  assert.equal(self.correct, true);
  assert.ok(self.km < 1e-6);
  assert.equal(self.proximity, 100);

  const far = guess(answer, 'Brazil');
  assert.equal(far.correct, false);
  assert.ok(far.km > 1000);
  assert.ok(far.proximity < 100);
  assert.ok(['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'].includes(far.arrow));

  // Unknown name → null.
  assert.equal(guess(answer, 'Narnia'), null);
});
