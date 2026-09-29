import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, find } from '../src/index.ts';
import { common, commonResolvers } from '../confs/common.ts';
import data from '../confs/common.json' with { type: 'json' };
import cases from '../cases/common.json' with { type: 'json' };

const rows = (name: string, tag: string) => {
  const { text } = cases.find((c) => c.name === name)!;
  return find(text, common).spans(tag).map(([a, b]) => text.slice(a, b));
};

test('common-conf: compiles with its resolvers, no errors', () => {
  assert.deepEqual(compile(data, { resolvers: commonResolvers }).errors, []);
});

test('common-conf: every case says which conf it uses, and it is this one', () => {
  assert.ok(cases.every((c) => c.conf === 'common'));
});

test('common-conf: the reply chain, invoice case', () => {
  const name = 'Reply chain, invoice';
  assert.deepEqual(rows(name, 'reply-chain'), ['Re: Fwd:']);
  assert.deepEqual(rows(name, 'ticket'), ['INV-2026-0042']);
  assert.deepEqual(rows(name, 'money'), ['$1,250.00']);
  assert.deepEqual(rows(name, 'deadline'), ['due 2026-10-15']);
});

test('common-conf: look-alikes resolve to nothing', () => {
  const name = 'Look-alikes';
  for (const tag of ['version', 'version-ref', 'ip', 'date', 'phone']) assert.deepEqual(rows(name, tag), [], tag);
});

test('common-conf: contacts and versions', () => {
  assert.deepEqual(rows('Contacts', 'email'), ['Dana.Reyes@Example.org']);
  assert.deepEqual(rows('Contacts', 'phone'), ['+44 20 7946 0958']);
  assert.deepEqual(rows('CI alert', 'version'), ['v2.4.1']);
});
