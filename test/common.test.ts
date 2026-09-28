import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gist, read, type Cuts } from '../src/index.ts';
import { common } from '../recipes/common.ts';
import { COMMON_CASES } from '../playground/cases.ts';

const text = (name: string) => COMMON_CASES.find((c) => c.name === name)!.text;
const values = (c: Cuts, entity: string) => c.mentions.filter((m) => m.entity === entity).map((m) => m.value);
const folding = (...entities: string[]) => (m: { entity: string }) => entities.includes(m.entity);

test('leaves partition every common case, and folding nothing gives the text back', () => {
  for (const { text } of COMMON_CASES) {
    const c = read(text, common);
    assert.equal(c.leaves.map((l) => text.slice(l.start, l.end)).join(''), text);
    assert.equal(gist(c, () => false), text);
  }
});

test('money: three formats, one canonical value each', () => {
  assert.deepEqual(values(read(text('Reply chain, invoice'), common), 'money'), ['1250.00 USD']);
  assert.deepEqual(values(read(text('Prices, two formats'), common), 'money'), ['89.90 EUR', '74.90 EUR']);
});

test('a number with no currency is not money', () => {
  assert.deepEqual(values(read(text('Contacts'), common), 'money'), []);
  assert.deepEqual(values(read(text('Contacts'), common), 'percent'), ['15%']);
});

test('look-alikes resolve to nothing: bare version, octet > 255, month 13, too-short phone', () => {
  assert.equal(read(text('Look-alikes'), common).mentions.length, 0);
});

test('phone and email come out canonical', () => {
  const c = read(text('Contacts'), common);
  assert.deepEqual(values(c, 'phone'), ['+442079460958']);
  assert.deepEqual(values(c, 'email'), ['dana.reyes@example.org']);
});

test('a date takes its label, and a time joins it with T', () => {
  const c = read(text('Standup'), common);
  const date = c.mentions.find((m) => m.entity === 'date')!;
  assert.equal(date.value, '2026-10-02T14:30');
  assert.deepEqual(date.parts.map((p) => p.part), ['label', 'value']);
});

test('a url stops before trailing punctuation; a version needs its v or a label', () => {
  const ci = read(text('CI alert'), common);
  assert.deepEqual(values(ci, 'url'), ['https://ci.example.com/runs/8812']);
  assert.deepEqual(values(ci, 'version'), ['2.4.1']);
  assert.deepEqual(values(read(text('Quoted reply, read again inside'), common), 'version'), ['2.4.2']);
});

test('a quoted reply is read again inside', () => {
  const c = read(text('Quoted reply, read again inside'), common);
  const quote = c.mentions.findIndex((m) => m.entity === 'quote');
  const inside = c.mentions.filter((m) => m.parent === quote).map((m) => m.entity);
  assert.deepEqual(inside, ['ticket', 'version', 'handle']);
});

test('folding a reply chain and its ticket leaves the gist', () => {
  const c = read(text('Reply chain, invoice'), common);
  assert.equal(gist(c, folding('reply', 'ticket')), 'Invoice for $1,250.00 due 2026-10-15');
});
