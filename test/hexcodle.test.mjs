import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidHex, feedback, distance, dailyTarget } from '../games/hexcodle.mjs';

test('isValidHex accepts 6 hex digits, with or without #', () => {
  assert.equal(isValidHex('a1b2c3'), true);
  assert.equal(isValidHex('#A1B2C3'), true);
  assert.equal(isValidHex('a1b2c'), false); // 5 digits
  assert.equal(isValidHex('xyzxyz'), false); // not hex
});

test('feedback marks each digit as too-low, too-high, or correct', () => {
  // Each digit of the guess vs the target: go higher (lo), lower (hi), or ok.
  assert.deepEqual(feedback('000000', 'ffffff'), ['lo', 'lo', 'lo', 'lo', 'lo', 'lo']);
  assert.deepEqual(feedback('ffffff', '000000'), ['hi', 'hi', 'hi', 'hi', 'hi', 'hi']);
  assert.deepEqual(feedback('a1b2c3', 'a1b2c3'), ['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);
  assert.deepEqual(feedback('0f0f0f', 'f0f0f0'), ['lo', 'hi', 'lo', 'hi', 'lo', 'hi']);
});

test('distance is the summed per-digit gap (0 only on an exact match)', () => {
  assert.equal(distance('000000', '000000'), 0);
  assert.equal(distance('000000', '00000f'), 15);
  assert.ok(distance('123456', '123457') < distance('123456', '1234ff'));
});

test('dailyTarget is deterministic per seed and always a valid colour', () => {
  assert.equal(dailyTarget(20260629), dailyTarget(20260629));
  assert.notEqual(dailyTarget(1), dailyTarget(2));
  assert.equal(isValidHex(dailyTarget(20260629)), true);
});
