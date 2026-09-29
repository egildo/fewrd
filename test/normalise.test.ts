import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, find } from '../src/index.ts';
import { normalise } from '../src/normalise.ts';

test('normalise-per-utf16-unit: astral', () => {
  const { text, at } = normalise('😀 a');
  assert.equal(text, '😀 a');
  assert.deepEqual(at, [0, 0, 2, 3, 4]);
  const { conf } = compile({ version: 't@1', tags: { w: { rx: '/[a-z]/u' } } });
  assert.deepEqual(find('😀  a', conf).toJSON().w, [[4, 5]]);
});

test('normalise-per-utf16-unit: an expansion maps every boundary inside it to its start', () => {
  const { text, at } = normalise('ﬁ x');
  assert.equal(text, 'fi x');
  assert.deepEqual(at, [0, 0, 1, 2, 3]);
});
