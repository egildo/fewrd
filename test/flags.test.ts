import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, find } from '../src/index.ts';
import { lines, treeOf, type Tags } from './tree.ts';

/** The chart of `text` under a toy conf, as JSON; the conf must compile clean. */
function chartOf(tags: Tags, text: string) {
  const { conf, errors } = compile({ version: 't@1', tags });
  assert.deepEqual(errors, []);
  return find(text, conf).toJSON();
}
const errorsOf = (tags: Tags) => compile({ version: 't@1', tags }).errors.map((e) => `${e.path}: ${e.message}`);

const LINES = {
  heading: { search: [{ from: 'hash', back: [{ tag: ['bol', '^'] }] }] },
  hash: { rx: '/#{1,6} /u' },
  nl: { rx: '/¶/u', effects: [{ flag: 'bol', at: 'end' }] },
  bol: {},
};

// ---- flags

test('flags: an effect places a zero-width row, and a search takes it as a condition', () => {
  const json = chartOf(LINES, 'x # y¶# z');
  assert.deepEqual(json.bol, [[6, 6]]);
  assert.deepEqual(json.heading, [[6, 8]]);
});
test('flags: never nodes, even when a chosen row took one', () => {
  assert.equal(
    treeOf(LINES, 'x # y¶# z'),
    lines('doc (0,9)', '  text (0,2) "x "', '  hash (2,4) "# "', '  text (4,5) "y"', '  nl (5,6) "¶"', '  heading (6,8) "# " also=[hash]', '  text (8,9) "z"'),
  );
});
test('flags: a composed row places them too, and later passes read them', () => {
  const tags = {
    pair: { search: [{ from: 'w', forward: [{ tag: 'sp' }, { tag: 'w' }] }], effects: [{ flag: 'pe', at: 'end' }] },
    after: { search: [{ from: 'n', back: [{ tag: 'sp' }, { tag: 'pe' }] }] },
    w: { rx: '/[a-z]+/u' },
    n: { rx: '/\\d+/u' },
    sp: { rx: '/ /u' },
    pe: {},
  };
  const json = chartOf(tags, 'a b 1 c 2');
  assert.deepEqual(json.pe, [[3, 3]]);
  assert.deepEqual(json.after, [[3, 5]]);
});
test('flags: * takes no flag', () => {
  const tags = {
    any: { search: [{ from: 'sp', forward: [{ tag: '*' }] }] },
    w: { rx: '/[a-z]+/u' },
    sp: { rx: '/ /u', effects: [{ flag: 'f', at: 'end' }] },
    f: {},
  };
  assert.deepEqual(chartOf(tags, 'a b').any, [[1, 3]]);
});
test('flags: compile errors', () => {
  assert.deepEqual(errorsOf({ f: { fate: 'separator' } }), ['tags.f.fate: a flag (a tag with neither rx nor search) takes none of resolve, weak, fate and effects']);
  assert.deepEqual(errorsOf({ w: { rx: '/a/u', effects: [{ flag: 'w', at: 'end' }] } }), ['tags.w.effects[0].flag: "w" is not a flag: a flag has neither rx nor search']);
  assert.deepEqual(errorsOf({ w: { rx: '/a/u', effects: [{ flag: 'nope', at: 'middle' }] } }), [
    'tags.w.effects[0].flag: unknown tag "nope"',
    'tags.w.effects[0].at: must be "start" or "end"',
  ]);
});

// ---- counted atoms

const WS = { w: { rx: '/[a-z]+/u' }, sp: { rx: '/ /u' } };
test('counted: times takes exactly that many', () => {
  const tags = { run: { search: [{ from: 'w', forward: [{ tag: ['sp', 'w'], times: 4 }] }] }, ...WS };
  assert.deepEqual(chartOf(tags, 'a b c d').run, [[0, 5], [2, 7]]);
});
test('counted: min and max take every count between', () => {
  const tags = { run: { search: [{ from: 'w', forward: [{ tag: ['sp', 'w'], min: 2, max: 4 }] }] }, ...WS };
  assert.deepEqual(chartOf(tags, 'a b c d').run, [[0, 3], [0, 4], [0, 5], [2, 5], [2, 6], [2, 7], [4, 7]]);
});
test('counted: compile errors', () => {
  const run = (atom: object) => ({ run: { search: [{ from: 'w', forward: [atom] }] }, ...WS });
  assert.deepEqual(errorsOf(run({ tag: 'w', min: 0, max: 2 })), ['tags.run.search[0].forward[0]: the outermost atom must not be optional']);
  assert.deepEqual(errorsOf(run({ rx: '/a/u', times: 2 })), ['tags.run.search[0].forward[0]: only a tag atom can be counted']);
  assert.deepEqual(errorsOf(run({ tag: 'w', times: 2, max: 3 })), ['tags.run.search[0].forward[0]: must have times, or min and max, not both']);
  assert.deepEqual(errorsOf(run({ tag: 'w', min: 3, max: 2 })), ['tags.run.search[0].forward[0]: min and max must both be whole numbers, 0 ≤ min ≤ max, max ≥ 1']);
});

// ---- skip

test('skip: takes any gap up to the next atom, and binds it', () => {
  const tags = { quote: { search: [{ from: 'said', forward: [{ skip: true, as: 'body' }, { tag: '$' }] }] }, said: { rx: '/said:/u' } };
  assert.deepEqual(chartOf(tags, 'Ann said: see you').quote, [[4, 17]]);
});
test('skip: compile errors', () => {
  const run = (...atoms: object[]) => ({ run: { search: [{ from: 'w', forward: atoms }] }, ...WS });
  assert.deepEqual(errorsOf(run({ tag: 'sp' }, { skip: true })), ['tags.run.search[0].forward[1]: a skip must have an atom after it']);
  assert.deepEqual(errorsOf(run({ skip: true, optional: true }, { tag: 'w' })), ['tags.run.search[0].forward[0].optional: a skip atom takes only as and stop']);
  assert.deepEqual(errorsOf(run({ skip: true }, { rx: '/a/u' })), [
    'tags.run.search[0].forward[1]: two regex or skip atoms in a row (optional atoms between do not separate them): merge them into one pattern',
  ]);
});

test('flags: a search can start from ^ or $, the text edges', () => {
  const tags = { first: { search: [{ from: '^', forward: [{ tag: 'w' }] }] }, last: { search: [{ from: '$', back: [{ tag: 'w' }] }] }, ...WS };
  const json = chartOf(tags, 'a b c');
  assert.deepEqual([json.first, json.last], [[[0, 1]], [[4, 5]]]);
  assert.deepEqual(errorsOf({ bad: { search: [{ from: '*', forward: [{ tag: 'w' }] }] }, ...WS }), ['tags.bad.search[0].from: unknown tag "*"']);
});

test('skip: stop keeps the gap off rows of those tags', () => {
  const tags = {
    rest: { search: [{ from: 'said', forward: [{ skip: true, stop: 'nl' }, { tag: ['nl', '$'] }] }] },
    said: { rx: '/said:/u' },
    nl: { rx: '/¶/u' },
  };
  assert.deepEqual(chartOf(tags, 'said: hi¶there¶').rest, [[0, 9]]);
  const loose = { ...tags, rest: { search: [{ from: 'said', forward: [{ skip: true }, { tag: ['nl', '$'] }] }] } };
  assert.deepEqual(chartOf(loose, 'said: hi¶there¶').rest, [[0, 9], [0, 15]]);
});
test('skip: stop compile errors', () => {
  const run = (atom: object) => ({ run: { search: [{ from: 'w', forward: [atom, { tag: 'w' }] }] }, p: { search: [{ from: 'w', forward: [{ tag: 'sp' }] }] }, ...WS });
  assert.deepEqual(errorsOf(run({ tag: 'sp', stop: 'sp' })), ['tags.run.search[0].forward[0].stop: only a skip atom takes stop']);
  assert.deepEqual(errorsOf(run({ skip: true, stop: 'p' })), ['tags.run.search[0].forward[0].stop: "p" is not a root tag: a skip stops only at rows found by rx']);
  assert.deepEqual(errorsOf(run({ skip: true, stop: ['sp', 'nope'] })), ['tags.run.search[0].forward[0].stop[1]: unknown tag "nope"']);
});
