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
});

test('accepts month names in either order, any case', () => {
  assert.equal(normalizeDate('april 29'), '04-29');
  assert.equal(normalizeDate('Apr 29'), '04-29');
  assert.equal(normalizeDate('APRIL 29th'), '04-29');
  assert.equal(normalizeDate('29 april'), '04-29');
});

test('rejects nonsense without throwing', () => {
  assert.equal(normalizeDate(''), null);
  assert.equal(normalizeDate('hello'), null);
  assert.equal(normalizeDate('13/45'), null);
  assert.equal(normalizeDate('0/0'), null);
  assert.equal(normalizeDate(null), null);
});

test('checkAnswer compares normalized forms', () => {
  assert.equal(checkAnswer('april 29th', '04-29'), true);
  assert.equal(checkAnswer('0429', '04-29'), true);
  assert.equal(checkAnswer('08/11', '04-29'), false);
  assert.equal(checkAnswer('garbage', '04-29'), false);
});
