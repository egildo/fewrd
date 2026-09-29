import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dom, find, gist, type Conf, type Resolve } from '../src/index.ts';
import { itPa } from '../confs/it-pa.ts';
import { common } from '../confs/common.ts';
import itPaCases from '../cases/it-pa.json' with { type: 'json' };
import commonCases from '../cases/common.json' with { type: 'json' };
import { invariants } from './tree.ts';

type Case = { name: string; conf: string; text: string; fold?: string[]; gist?: string };
const confs: Record<string, Conf<RegExp, Resolve>> = { 'it-pa': itPa, common };
const all: Case[] = [...itPaCases, ...commonCases];

test('cases-carry-fold-and-gist: every case has both or neither', () => {
  for (const c of all) assert.equal(c.fold === undefined, c.gist === undefined, c.name);
});
test('cases-carry-fold-and-gist: all 21 have both', () => {
  assert.equal(all.length, 21);
  assert.ok(all.every((c) => c.fold && c.gist !== undefined));
});

for (const c of all) {
  const doc = () => dom(c.text, find(c.text, confs[c.conf]), confs[c.conf]);
  if (c.gist !== undefined) {
    test(`gist-regression: ${c.conf} / ${c.name}`, () => {
      assert.equal(gist(doc(), (n) => c.fold!.includes(n.tag)), c.gist);
    });
  }
  test(`gist-regression: nothing folded gives the text back, ${c.conf} / ${c.name}`, () => {
    assert.equal(gist(doc(), () => false), c.text);
  });
  test(`leaves-partition-text: ${c.conf} / ${c.name}`, () => invariants(doc(), c.text));
}
