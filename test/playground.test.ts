import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entities, initialSelection, type PlaygroundCase } from '../src/playground.ts';
import type { Book } from '../src/index.ts';

const book: Book = {
  version: 'test-playground@1',
  recipes: [
    { entity: 'code', anchor: /[A-Z]{3}\d{3}/u },
    { entity: 'amount', anchor: /\d+€/u },
  ],
};

const cases: PlaygroundCase[] = [
  { name: 'a', text: 'Ref ABC123 for 50€' },
  { name: 'b', text: 'Nothing recognizable here' },
];

test('entities lists distinct entities in first-appearance order', () => {
  assert.deepEqual(entities(book), ['code', 'amount']);
});

test('entities is empty for a book with no recipes', () => {
  assert.deepEqual(entities({ version: 'empty@1', recipes: [] }), []);
});

test('no fold supplied: initial selection is empty', () => {
  assert.deepEqual(initialSelection(book, cases), []);
});

test('a supplied fold seeds exactly the entities it would fold across the cases', () => {
  assert.deepEqual(initialSelection(book, cases, (m) => m.entity === 'amount'), ['amount']);
});

test('a fold matching nothing in the cases seeds nothing', () => {
  assert.deepEqual(initialSelection(book, cases, () => false), []);
});

test('a fold folding every entity seeds all of them, still book order', () => {
  assert.deepEqual(initialSelection(book, cases, () => true), ['code', 'amount']);
});
