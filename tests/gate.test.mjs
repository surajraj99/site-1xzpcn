import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate, checkAnswer } from '../site/js/gate.js';

test('accepts slashed numeric forms', () => {
  assert.equal(normalizeDate('04/29'), '04-29');
  assert.equal(normalizeDate('4/29'), '04-29');
  assert.equal(normalizeDate('04 / 29'), '04-29');
});

test('accepts compact and dashed numeric forms', () => {
  assert.equal(normalizeDate('0429'), '04-29');
  assert.equal(normalizeDate('4-29'), '04-29');
  assert.equal(normalizeDate('04.29'), '04-29');
  assert.equal(normalizeDate('04-29'), '04-29');
});

test('accepts month names in either order, any case', () => {
  assert.equal(normalizeDate('april 29'), '04-29');
  assert.equal(normalizeDate('Apr 29'), '04-29');
  assert.equal(normalizeDate('APRIL 29th'), '04-29');
  assert.equal(normalizeDate('29 april'), '04-29');
  assert.equal(normalizeDate('29 Apr'), '04-29');
  assert.equal(normalizeDate('Apr. 29'), '04-29');
  assert.equal(normalizeDate('29th april'), '04-29');
});

test('accepts a trailing two- or four-digit year', () => {
  assert.equal(normalizeDate('april 29, 2025'), '04-29');
  assert.equal(normalizeDate('29 april 2025'), '04-29');
  assert.equal(normalizeDate('4/29/25'), '04-29');
  assert.equal(normalizeDate('04/29/2025'), '04-29');
  assert.equal(normalizeDate('4-29-25'), '04-29');
  assert.equal(normalizeDate('04.29.2026'), '04-29');
});

test('tolerates leading and trailing whitespace', () => {
  assert.equal(normalizeDate('  04/29  '), '04-29');
});

test('rejects nonsense without throwing', () => {
  assert.equal(normalizeDate(''), null);
  assert.equal(normalizeDate('   '), null);
  assert.equal(normalizeDate('hello'), null);
  assert.equal(normalizeDate('13/45'), null);
  assert.equal(normalizeDate('0/0'), null);
  assert.equal(normalizeDate(null), null);
  assert.equal(normalizeDate(undefined), null);
});

test('rejects invalid calendar dates', () => {
  assert.equal(normalizeDate('2/30'), null);
  assert.equal(normalizeDate('29/29'), null);
});

test('rejects valid dates embedded in other text', () => {
  assert.equal(normalizeDate('hello0429'), null);
  assert.equal(normalizeDate('04/29abc'), null);
  assert.equal(normalizeDate('not-a-date-04-29'), null);
  assert.equal(normalizeDate('0429 extra'), null);
});

test('rejects malformed and incomplete dates', () => {
  assert.equal(normalizeDate('4/2/9'), null);
  assert.equal(normalizeDate('042'), null);
  assert.equal(normalizeDate('04292025'), null);
  assert.equal(normalizeDate('april'), null);
  assert.equal(normalizeDate('29'), null);
});

test('checkAnswer compares normalized forms', () => {
  assert.equal(checkAnswer('april 29th', '04-29'), true);
  assert.equal(checkAnswer('0429', '04-29'), true);
  assert.equal(checkAnswer('08/11', '04-29'), false);
  assert.equal(checkAnswer('garbage', '04-29'), false);
});
