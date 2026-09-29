import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chart, dom, find, type Node, type Resolve } from '../src/index.ts';
import { build, compiled, leaves, lines, show, treeOf } from './tree.ts';

const rx = (source: string, extra: object = {}) => ({ rx: `/${source}/u`, ...extra });

test('node-type: a Node is plain JSON data', () => {
  const leaf: Node = { tag: 'text', start: 0, end: 2, attrs: {}, children: [] };
  const doc: Node = { tag: 'doc', start: 0, end: 2, attrs: { first: leaf }, text: 'ab', children: [leaf] };
  const back = JSON.parse(JSON.stringify(doc)) as Node;
  assert.deepEqual(back.children[0], leaf);
  assert.equal(back.text, 'ab');
});

// ---- selection

test('select-order: key order breaks a tie', () => {
  const tags = { ab: rx('a b'), bc: rx('b c') };
  assert.equal(treeOf(tags, 'a b c'), lines('doc (0,5)', '  ab (0,3) "a b"', '  text (3,5) " c"'));
});
test('select-order: keys swapped', () => {
  const tags = { bc: rx('b c'), ab: rx('a b') };
  assert.equal(treeOf(tags, 'a b c'), lines('doc (0,5)', '  text (0,2) "a "', '  bc (2,5) "b c"'));
});
test('select-order: weak waits', () => {
  const tags = { cde: rx('c d e', { weak: true }), bc: rx('b c') };
  assert.equal(treeOf(tags, 'a b c d e'), lines('doc (0,9)', '  text (0,2) "a "', '  bc (2,5) "b c"', '  text (5,9) " d e"'));
});
test('select-order: without weak', () => {
  const tags = { cde: rx('c d e'), bc: rx('b c') };
  assert.equal(treeOf(tags, 'a b c d e'), lines('doc (0,9)', '  text (0,4) "a b "', '  cde (4,9) "c d e"'));
});
test('select-order: start breaks the last tie', () => {
  assert.equal(treeOf({ pair: rx('[a-z] [a-z]') }, 'a b c'), lines('doc (0,5)', '  pair (0,3) "a b"', '  text (3,5) " c"'));
});

test('crossing-loser-dropped: longer wins', () => {
  const tags = { ab: rx('a b'), bcd: rx('b c d') };
  assert.equal(treeOf(tags, 'a b c d'), lines('doc (0,7)', '  text (0,2) "a "', '  bcd (2,7) "b c d"'));
});

test('outer-wins-same-tag: suffix match dropped', () => {
  const tags = { num: rx('\\d+(?:\\.\\d+)?') };
  const { chart } = build(tags, '1.5');
  assert.deepEqual(chart.spans('num'), [[0, 3], [2, 3]]);
  assert.equal(treeOf(tags, '1.5'), lines('doc (0,3)', '  num (0,3) "1.5"'));
});
test('outer-wins-same-tag: other tag becomes a child', () => {
  const tags = { num: rx('\\d+(?:\\.\\d+)?'), digit: rx('\\d') };
  assert.equal(treeOf(tags, '1.5'), lines('doc (0,3)', '  num (0,3) "1.5"', '    digit (0,1) "1"', '    text (1,2) "."', '    digit (2,3) "5"'));
});
test('outer-wins-same-tag: separators', () => {
  const { chart } = build({ sep: rx('[ -]+') }, 'a - b');
  assert.deepEqual(chart.spans('sep'), [[1, 4], [2, 4], [3, 4]]);
  assert.equal(treeOf({ sep: rx('[ -]+') }, 'a - b'), lines('doc (0,5)', '  text (0,1) "a"', '  sep (1,4) " - "', '  text (4,5) "b"'));
});

test('twins-become-also: code and ref', () => {
  const tags = { code: rx('[A-Z]\\d{3}'), ref: rx('[A-Z]\\d+') };
  assert.equal(treeOf(tags, 'A123'), lines('doc (0,4)', '  code (0,4) "A123" also=[ref]'));
});
test('twins-become-also: keys swapped', () => {
  const tags = { ref: rx('[A-Z]\\d+'), code: rx('[A-Z]\\d{3}') };
  assert.equal(treeOf(tags, 'A123'), lines('doc (0,4)', '  ref (0,4) "A123" also=[code]'));
});

test('otherwise-chosen: a row that crosses nothing, has no same-tag row around it and no twin', () => {
  const doc = build({ num: rx('\\d+(?:\\.\\d+)?'), digit: rx('\\d') }, '1.5').doc;
  assert.deepEqual(doc.children[0].children.filter((c) => c.tag === 'digit').map((c) => [c.start, c.end]), [[0, 1], [2, 3]]);
});

test('dom-returns-a-tree: unknown tag throws', () => {
  const conf = compiled({ w: rx('[a-z]+') });
  const chart = Chart.empty(3).with([['zzz', [0, 1]]]);
  assert.throws(() => dom('abc', chart, conf), /zzz/);
});
test('dom-returns-a-tree: empty text', () => {
  const { doc } = build({ w: rx('[a-z]+') }, '');
  assert.equal(show(doc, ''), 'doc (0,0)');
  assert.deepEqual(doc.children, []);
});
test('dom-returns-a-tree: a text no row covers is one water node', () => {
  assert.equal(treeOf({ n: rx('\\d+') }, 'no digits'), lines('doc (0,9)', '  text (0,9) "no digits"'));
});
test('dom-returns-a-tree: a chart of another text throws instead of guessing', () => {
  const conf = compiled({ w: rx('[a-z]+') });
  assert.throws(() => dom('a   b', Chart.empty(5).with([['w', [2, 3]]]), conf), /boundary/);
});

// ---- forcing

const OUTER = {
  outer: { search: [{ from: 'inner', forward: [{ tag: 'sp' }, { tag: 'n' }] }] },
  inner: { search: [{ from: 'w', forward: [{ tag: 'sp' }, { tag: 'n' }] }] },
  w: rx('[a-z]+'),
  n: rx('\\d+'),
  sp: rx(' '),
};
test('forced-derivation-chosen: recursion', () => {
  assert.equal(
    treeOf(OUTER, 'ab 1 2'),
    lines(
      'doc (0,6)',
      '  outer (0,6) "ab 1 2"',
      '    inner (0,4) "ab 1"',
      '      w (0,2) "ab"',
      '      sp (2,3) " "',
      '      n (3,4) "1"',
      '    sp (4,5) " "',
      '    n (5,6) "2"',
    ),
  );
});

const WALK = {
  weight: { search: [{ from: 'num', forward: [{ tag: 'sp' }, { tag: 'unit', as: 'unit' }] }] },
  code: rx('[a-z]+ \\d'),
  num: rx('\\d+(?:\\.\\d+)?'),
  amount: rx('\\d+\\.\\d+'),
  unit: rx('kg|g'),
  phrase: rx('[a-z]+ [a-z]+', { weak: true }),
  sp: rx(' '),
};
test('the-walk: step by step', () => {
  const text = 'ab 1.5 kg okay';
  const { doc, chart } = build(WALK, text);
  assert.deepEqual(chart.toJSON(), {
    $: [[14, 14]], '^': [[0, 0]], amount: [[3, 6]], code: [[0, 4]], num: [[3, 6], [5, 6]],
    phrase: [[7, 14]], sp: [[2, 3], [6, 7], [9, 10]], unit: [[7, 9]], weight: [[3, 9], [5, 9]],
  });
  assert.equal(
    show(doc, text),
    lines(
      'doc (0,14)',
      '  text (0,2) "ab"',
      '  sp (2,3) " "',
      '  weight (3,9) "1.5 kg" attrs={ unit: → unit (7,9) }',
      '    num (3,6) "1.5" also=[amount]',
      '    sp (6,7) " "',
      '    unit (7,9) "kg"',
      '  sp (9,10) " "',
      '  text (10,14) "okay"',
    ),
  );
  assert.deepEqual(leaves(doc).map((l) => [l.start, l.end]), [[0, 2], [2, 3], [3, 6], [6, 7], [7, 9], [9, 10], [10, 14]]);
});

test('selection-is-deterministic: same tree twice, and from a chart listing tags in reverse', () => {
  const conf = compiled(WALK);
  const chart = find('ab 1.5 kg okay', conf);
  const a = dom('ab 1.5 kg okay', chart, conf);
  assert.deepEqual(dom('ab 1.5 kg okay', chart, conf), a);
  assert.deepEqual(dom('ab 1.5 kg okay', Chart.from(Object.fromEntries(Object.entries(chart.toJSON()).reverse())), conf), a);
});

// ---- the own-tag rule (decision 1) and the crossing derivation (decision 2)

const LIST = {
  w: rx('[a-z]+'),
  sp: rx(' '),
  list: { search: [{ from: 'w', forward: [{ tag: 'sp' }, { tag: 'w' }] }, { from: 'list', forward: [{ tag: 'sp' }, { tag: 'w', as: 'last' }] }] },
};
test('forced-derivation-chosen: a forced row of the composed row\'s own tag is not a node', () => {
  const { chart, doc } = build(LIST, 'a b c');
  assert.deepEqual(chart.spans('list'), [[0, 3], [0, 5], [2, 5]]);
  assert.equal(
    show(doc, 'a b c'),
    lines(
      'doc (0,5)',
      '  list (0,5) "a b c" attrs={ last: → w (4,5) }',
      '    w (0,1) "a"',
      '    sp (1,2) " "',
      '    w (2,3) "b"',
      '    sp (3,4) " "',
      '    w (4,5) "c"',
    ),
  );
});
test('forced-derivation-chosen: a role on an absorbed row binds its text', () => {
  const tags = {
    w: rx('[a-z]+'),
    sp: rx(' '),
    list: { search: [{ from: 'w', forward: [{ tag: 'sp' }, { tag: 'list', as: 'rest' }] }, { from: 'w', forward: [{ tag: 'sp' }, { tag: 'w' }] }] },
  };
  assert.equal(
    treeOf(tags, 'a b c'),
    lines(
      'doc (0,5)',
      '  list (0,5) "a b c" attrs={ rest: "b c" }',
      '    w (0,1) "a"',
      '    sp (1,2) " "',
      '    w (2,3) "b"',
      '    sp (3,4) " "',
      '    w (4,5) "c"',
    ),
  );
});

// C (weak, so walked after the others) has two derivations of `a b c d`: the first takes `ab` and `cd`, the second `a` and `bcd`.
// `bcd` (longer) is chosen first and crosses `ab`.
const CROSSING = (both: boolean) => ({
  a: rx('a'),
  ab: rx('a b'),
  cd: rx('c d'),
  bcd: rx('b c d'),
  sp: rx(' '),
  C: {
    weak: true,
    search: [
      { from: 'ab', forward: [{ tag: 'sp' }, { tag: 'cd' }] },
      ...(both ? [{ from: 'a', forward: [{ tag: 'sp' }, { tag: 'bcd' }] }] : []),
    ],
  },
});
test('forced-derivation-chosen: the first derivation none of whose rows crosses a chosen row', () => {
  const { doc, chart } = build(CROSSING(true), 'a b c d');
  assert.ok(chart.has('C', 0, 7));
  const c = doc.children.find((n) => n.tag === 'C')!;
  assert.deepEqual(c.children.map((n) => n.tag), ['a', 'sp', 'bcd']);
});
test('forced-derivation-chosen: with none, the composed row is dropped as a crossing loser', () => {
  const { doc, chart } = build(CROSSING(false), 'a b c d');
  assert.ok(chart.has('C', 0, 7));
  assert.ok(!show(doc, 'a b c d').includes('C ('));
});

// ---- tree

test('tree-by-containment: the walk\'s tree, water only between and around', () => {
  const { doc } = build(WALK, 'ab 1.5 kg okay');
  assert.deepEqual(doc.children.map((n) => n.tag), ['text', 'sp', 'weight', 'sp', 'text']);
  assert.deepEqual(doc.children[2].children.map((n) => n.tag), ['num', 'sp', 'unit']);
  assert.deepEqual(doc.children[0], { tag: 'text', start: 0, end: 2, attrs: {}, children: [] });
});

// ---- roles

test('roles-from-forced-derivation: tag atom', () => {
  const { doc } = build(WALK, 'ab 1.5 kg okay');
  const weight = doc.children[2];
  assert.equal(weight.attrs.unit, weight.children[2]);
  assert.deepEqual(doc.children[0].attrs, {});
});
test('roles-from-forced-derivation: regex atom', () => {
  const tags = { price: { search: [{ from: 'n', back: [{ rx: '/€ ?/u', as: 'currency' }] }] }, n: rx('\\d+') };
  assert.equal(treeOf(tags, '€ 5'), lines('doc (0,3)', '  price (0,3) "€ 5" attrs={ currency: "€ " }', '    text (0,2) "€ "', '    n (2,3) "5"'));
});

// ---- values

const CANON: Record<string, Resolve> = {
  canon: (p) => ({ kg: 'kilogram', g: 'gram' })[p.value] ?? null,
  metric: (p) => (p.unit === 'kilogram' ? `${parseInt(p.value) * 1000} g` : null),
};
const VALUED = {
  weight: { resolve: 'metric', search: [{ from: 'n', forward: [{ tag: 'sp' }, { tag: 'unit', as: 'unit' }] }] },
  unit: rx('kg|g', { resolve: 'canon' }),
  n: rx('\\d+'),
  sp: rx(' '),
};
test('values-bottom-up: weight and unit', () => {
  assert.equal(
    treeOf(VALUED, '5 kg', CANON),
    lines(
      'doc (0,4)',
      '  weight (0,4) "5 kg" value="5000 g" attrs={ unit: → unit (2,4) }',
      '    n (0,1) "5"',
      '    sp (1,2) " "',
      '    unit (2,4) "kg" value="kilogram"',
    ),
  );
});
test('values-bottom-up: a refusal throws, naming the tag and the span', () => {
  let calls = 0;
  const once: Resolve = (p) => (calls++ === 0 ? p.value : null);
  const conf = compiled({ n: rx('\\d+', { resolve: 'once' }) }, { once });
  const chart = find('7', conf);
  assert.deepEqual(chart.spans('n'), [[0, 1]]);
  assert.throws(() => dom('7', chart, conf), /resolver of "n" refused \(0,1\) at dom time/);
});
test('resolvers-see-normalised-text: three spaces', () => {
  const echo: Resolve = (p) => p.value;
  assert.equal(treeOf({ word: rx('[a-z]+ [a-z]+', { resolve: 'echo' }) }, 'ab   cd', { echo }), lines('doc (0,7)', '  word (0,7) "ab   cd" value="ab cd"'));
});
test('leaves-partition-text: astral characters and a collapsed run', () => {
  const doc = build({ w: rx('[a-z]+') }, '😀 ab   cd').doc;
  assert.deepEqual(doc.children.filter((n) => n.tag === 'w').map((n) => [n.start, n.end]), [[3, 5], [8, 10]]);
});
