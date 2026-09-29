import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chart, compile, find, type Resolve } from '../src/index.ts';

type Tags = Record<string, unknown>;

/** chart-invariants, on the chart of `text`. */
function invariants(chart: Chart, text: string) {
  const json = chart.toJSON();
  const n = text.length;
  assert.deepEqual(json['^'], [[0, 0]]);
  assert.deepEqual(json['$'], [[n, n]]);
  for (const [tag, spans] of Object.entries(json)) {
    assert.ok(spans.length > 0, `${tag} present but empty`);
    spans.forEach(([a, b], i) => {
      assert.ok(0 <= a && a <= b && b <= n, `${tag} [${a},${b}] out of range`);
      if (i > 0) assert.ok(spans[i - 1][0] < a || (spans[i - 1][0] === a && spans[i - 1][1] < b), `${tag} not sorted and unique`);
    });
  }
  assert.deepEqual(Chart.from(json).toJSON(), json);
  assert.deepEqual(JSON.parse(JSON.stringify(chart)), json);
}

/** Compile a toy conf, find, check the invariants and find-is-deterministic (tags reversed), return the chart as JSON. */
function run(tags: Tags, text: string, resolvers?: Record<string, Resolve>) {
  const { conf, errors } = compile({ version: 't@1', tags }, { resolvers });
  assert.deepEqual(errors, []);
  const chart = find(text, conf);
  invariants(chart, text);
  const reversed = compile({ version: 't@1', tags: Object.fromEntries(Object.entries(tags).reverse()) }, { resolvers });
  assert.equal(JSON.stringify(find(text, reversed.conf)), JSON.stringify(chart), 'the key order of tags changed the chart');
  return chart.toJSON();
}

const TOYS = { w: { rx: '/[a-z]+/u' }, n: { rx: '/\\d+/u' }, sp: { rx: '/ /u' } };
const one = (o: unknown) => ({ search: [o] });

test('root-rows-every-match: the guard', () => {
  assert.deepEqual(run({ n: TOYS.n }, '12 345 x9').n, [[0, 2], [3, 6]]);
});
test('root-rows-every-match: overlap', () => {
  assert.deepEqual(run({ pair: { rx: '/[a-z] [a-z]/u' } }, 'a b c').pair, [[0, 3], [2, 5]]);
});
test('root-rows-every-match: zero length', () => {
  assert.deepEqual(run({ gap: { rx: '/x*/u' } }, 'ab'), { $: [[2, 2]], '^': [[0, 0]] });
});
test('root-rows-every-match: resolve', () => {
  const even: Resolve = (p) => (Number(p.value) % 2 === 0 ? p.value : null);
  assert.deepEqual(run({ even: { rx: '/\\d+/u', resolve: 'even' } }, '12 7 30', { even }).even, [[0, 2], [5, 7]]);
});
test('root-rows-every-match: a match is not retried shorter after the guard rejects it', () => {
  assert.equal(run({ t: { rx: '/prot|protocollo/u' } }, 'protocollo').t, undefined);
  assert.deepEqual(run({ t: { rx: '/protocollo|prot/u' } }, 'protocollo').t, [[0, 10]]);
});
test('root-rows-every-match: astral characters do not stop the scan', () => {
  assert.deepEqual(run({ e: { rx: '/\\p{Extended_Pictographic}/u' } }, '😀 😀').e, [[0, 2], [3, 5]]);
});

test('match-on-normalised-text', () => {
  const j = run({ n: TOYS.n }, 'x   12');
  assert.deepEqual(j.n, [[4, 6]]);
  assert.deepEqual(j.$, [[6, 6]]);
});
test('match-on-normalised-text: resolvers see the normalised text', () => {
  const seen: string[] = [];
  const spy: Resolve = (p) => (seen.push(p.value), p.value);
  run({ t: { rx: '/a-b/u', resolve: 'spy' } }, 'a–b', { spy });
  assert.ok(seen.includes('a-b'));
});
test('find on the empty text', () => {
  assert.deepEqual(run({ ...TOYS, s: one({ from: 'n', forward: [{ tag: 'sp' }] }) }, ''), { $: [[0, 0]], '^': [[0, 0]] });
});

test('searches-run-from-rows', () => {
  const j = run(
    {
      ...TOYS,
      labelled: one({ from: 'n', back: [{ tag: 'sp' }, { tag: 'w', as: 'label' }] }),
      counted: one({ from: 'w', forward: [{ tag: 'sp' }, { tag: 'n', as: 'count' }] }),
    },
    'no 42 ok',
  );
  assert.deepEqual(j.w, [[0, 2], [6, 8]]);
  assert.deepEqual(j.sp, [[2, 3], [5, 6]]);
  assert.deepEqual(j.n, [[3, 5]]);
  assert.deepEqual(j.labelled, [[0, 5]]);
  assert.deepEqual(j.counted, [[0, 5]]);
});

test('atoms-meet-the-cursor: alternatives', () => {
  const j = run({ ...TOYS, alt: one({ from: 'n', back: [{ tag: 'sp' }, { tag: ['w', 'n'] }] }) }, 'ab 7 42');
  assert.deepEqual(j.alt, [[0, 4], [3, 7]]);
});
test('atoms-meet-the-cursor: any tag', () => {
  const j = run({ ...TOYS, star: one({ from: 'n', back: [{ tag: 'sp' }, { tag: '*' }] }) }, 'ab 7 42');
  assert.deepEqual(j.star, [[0, 4], [0, 7], [3, 7]]);
});
test('atoms-meet-the-cursor: ^ and $', () => {
  const j = run(
    { w: TOYS.w, first: one({ from: 'w', back: [{ tag: '^' }] }), last: one({ from: 'w', forward: [{ tag: '$' }] }) },
    'ab cd',
  );
  assert.deepEqual(j.first, [[0, 2]]);
  assert.deepEqual(j.last, [[3, 5]]);
});
test('atoms-meet-the-cursor: regex between atoms', () => {
  const j = run(
    {
      open: { rx: '/\\(/u' },
      close: { rx: '/\\)/u' },
      group: one({ from: 'open', forward: [{ rx: '/[^()]*/u', as: 'inside' }, { tag: 'close' }] }),
    },
    '(ab) (c',
  );
  assert.deepEqual(j.group, [[0, 4]]);
});
test('atoms-meet-the-cursor: regex between atoms, going back', () => {
  const j = run(
    { close: { rx: '/\\)/u' }, open: { rx: '/\\(/u' }, group: one({ from: 'close', back: [{ rx: '/[^()]*/u' }, { tag: 'open' }] }) },
    'c) (ab)',
  );
  assert.deepEqual(j.group, [[3, 7]]);
});
test('atoms-meet-the-cursor: regex last', () => {
  const j = run(
    {
      n: TOYS.n,
      weight: one({ from: 'n', forward: [{ rx: '/ ?kg/u', as: 'unit' }] }),
      price: one({ from: 'n', back: [{ rx: '/€ ?/u', as: 'currency' }] }),
    },
    '€ 5 kg',
  );
  assert.deepEqual(j.n, [[2, 3]]);
  assert.deepEqual(j.weight, [[2, 6]]);
  assert.deepEqual(j.price, [[0, 3]]);
});
test('atoms-meet-the-cursor: empty regex slice', () => {
  const j = run(
    { open: { rx: '/\\(/u' }, close: { rx: '/\\)/u' }, group: one({ from: 'open', forward: [{ rx: '/[^()]*/u' }, { tag: 'close' }] }) },
    '()',
  );
  assert.deepEqual(j.group, [[0, 2]]);
});
test('atoms-meet-the-cursor: a regex atom binds the text it matched', () => {
  const seen: Record<string, string>[] = [];
  const spy: Resolve = (p) => (seen.push({ ...p }), p.value);
  run(
    { n: TOYS.n, weight: { resolve: 'spy', search: [{ from: 'n', forward: [{ rx: '/ ?kg/u', as: 'unit' }] }] } },
    '5 kg',
    { spy },
  );
  assert.deepEqual([...new Set(seen.map((r) => JSON.stringify(r)))], [JSON.stringify({ unit: ' kg', value: '5 kg' })]);
});
test('atoms-meet-the-cursor: optional', () => {
  const j = run(
    {
      ...TOYS,
      co: { rx: '/:/u' },
      entry: one({ from: 'n', back: [{ tag: 'sp', optional: true }, { tag: 'co', as: 'sign' }] }),
    },
    'k:7 k: 8',
  );
  assert.deepEqual(j.n, [[2, 3], [7, 8]]);
  assert.deepEqual(j.entry, [[1, 3], [5, 8]]);
});
test('atoms-meet-the-cursor: optional atoms in the middle, taken or skipped', () => {
  const k = run(
    { ...TOYS, dot: { rx: '/\\./u' }, t: one({ from: 'n', back: [{ tag: 'sp', optional: true }, { tag: 'dot', optional: true }, { tag: 'w' }] }) },
    'a. 1 a 2 a.3',
  );
  assert.deepEqual(k.t, [[0, 4], [5, 8], [9, 12]]);
});
test('atoms-meet-the-cursor: nothing possessive', () => {
  const j = run(
    {
      n: TOYS.n,
      sp: TOYS.sp,
      word: { rx: '/[a-z]+(?: [a-z]+)?/u' },
      named: one({ from: 'n', back: [{ tag: 'sp' }, { tag: 'word', as: 'label' }] }),
    },
    'big red 7',
  );
  assert.deepEqual(j.word, [[0, 7], [4, 7]]);
  assert.deepEqual(j.named, [[0, 9], [4, 9]]);
});

test('composed-rows-resolve', () => {
  const canon: Resolve = (p) => ({ kg: 'kilogram', g: 'gram' })[p.value] ?? null;
  const metric: Resolve = (p) => (p.unit === 'kilogram' ? p.value : null);
  const j = run(
    {
      n: TOYS.n,
      sp: TOYS.sp,
      unit: { rx: '/kg|g/u', resolve: 'canon' },
      weight: { resolve: 'metric', search: [{ from: 'n', forward: [{ tag: 'sp' }, { tag: 'unit', as: 'unit' }] }] },
    },
    '5 kg 3 g',
    { canon, metric },
  );
  assert.deepEqual(j.unit, [[2, 4], [7, 8]]);
  assert.deepEqual(j.weight, [[0, 4]]);
});
test('composed-rows-resolve: a role bound to a row of a tag without resolve gets its text', () => {
  const seen: Record<string, string>[] = [];
  const spy: Resolve = (p) => (seen.push({ ...p }), p.value);
  run({ ...TOYS, lab: { resolve: 'spy', search: [{ from: 'n', back: [{ tag: 'sp' }, { tag: 'w', as: 'label' }] }] } }, 'no 42', { spy });
  assert.deepEqual([...new Set(seen.map((r) => JSON.stringify(r)))], [JSON.stringify({ label: 'no', value: 'no 42' })]);
});
test('composed-rows-resolve: values are not stored in the chart', () => {
  const canon: Resolve = (p) => p.value.toUpperCase();
  const j = run({ w: { rx: '/[a-z]+/u', resolve: 'canon' } }, 'ab', { canon });
  assert.deepEqual(j, { $: [[2, 2]], '^': [[0, 0]], w: [[0, 2]] });
});

test('passes-to-a-fixpoint', () => {
  const list = {
    search: [
      { from: 'n', forward: [{ tag: 'sp' }, { tag: 'n' }] },
      { from: 'list', forward: [{ tag: 'sp' }, { tag: 'n' }] },
    ],
  };
  const text = '1 2 3';
  const j = run({ n: TOYS.n, sp: TOYS.sp, list }, text);
  assert.deepEqual(j.list, [[0, 3], [0, 5], [2, 5]]);
  const { conf } = compile({ version: 't@1', tags: { n: TOYS.n, sp: TOYS.sp, list } });
  assert.equal(find(text, conf).size(), 10);
});
test('passes-to-a-fixpoint: a long self-growing search', () => {
  const list = {
    search: [
      { from: 'n', forward: [{ tag: 'sp' }, { tag: 'n' }] },
      { from: 'list', forward: [{ tag: 'sp' }, { tag: 'n' }] },
    ],
  };
  const text = Array.from({ length: 100 }, (_, i) => i + 1).join(' ');
  const { conf } = compile({ version: 't@1', tags: { n: TOYS.n, sp: TOYS.sp, list } });
  const chart = find(text, conf);
  invariants(chart, text);
  assert.equal(chart.spans('list').length, 4950);
});
test('passes-to-a-fixpoint: * on a self-growing search stops', () => {
  const j = run({ w: TOYS.w, sp: TOYS.sp, grow: one({ from: 'w', forward: [{ tag: 'sp' }, { tag: '*' }] }) }, 'a b c');
  assert.ok(j.grow.length > 0);
});

test('chart-complete-and-neutral: crossing, twins and rows inside rows are all kept', () => {
  const j = run(
    { xy: { rx: '/x\\.y/u' }, twin: { rx: '/x\\.y/u' }, yz: { rx: '/y\\.z/u' }, xyz: { rx: '/x\\.y\\.z/u' } },
    'x.y.z',
  );
  assert.deepEqual([j.xy, j.twin, j.yz, j.xyz], [[[0, 3]], [[0, 3]], [[2, 5]], [[0, 5]]]);
});

test('chart-complete-and-neutral: packing, a row reached by two derivations appears once', () => {
  const viaSerial = { from: 'n', back: [{ tag: 'sp' }, { tag: 'w', as: 'label' }] };
  const viaNumbered = { from: 'numbered', back: [{ tag: '^' }] };
  const numbered = one({ from: 'n', back: [{ tag: 'sp' }, { tag: 'w' }] });
  const text = 'ab 12';
  const direct = run({ ...TOYS, numbered, protocol: { search: [viaSerial] } }, text).protocol;
  const indirect = run({ ...TOYS, numbered, protocol: { search: [viaNumbered] } }, text).protocol;
  const both = run({ ...TOYS, numbered, protocol: { search: [viaSerial, viaNumbered] } }, text);
  assert.deepEqual(direct, [[0, 5]]);
  assert.deepEqual(indirect, [[0, 5]]);
  assert.deepEqual(both.protocol, [[0, 5]], 'two derivations, one row');
  assert.deepEqual(both.numbered, [[0, 5]]);
});

test('passes-to-a-fixpoint: rows inside rows are kept', () => {
  const j = run(
    { ...TOYS, phrase: one({ from: 'w', forward: [{ tag: 'sp' }, { tag: 'w' }] }) },
    'aa bb cc',
  );
  // phrases [0,5], [3,8] cross; the words inside them stay rows of their own.
  assert.deepEqual(j.phrase, [[0, 5], [3, 8]]);
  assert.deepEqual(j.w, [[0, 2], [3, 5], [6, 8]]);
});

test('chart-holds-rows-only', () => {
  const canon: Resolve = (p) => p.value.toUpperCase();
  const j = run({ w: { rx: '/[a-z]+/u', resolve: 'canon' } }, 'ab cd', { canon });
  for (const spans of Object.values(j)) for (const s of spans) assert.ok(s.length === 2 && s.every(Number.isInteger));
});

test('compile-never-throws: a reference to a left-out tag finds no rows', () => {
  const { conf, errors } = compile({ version: 't@1', tags: { n: TOYS.n, a: { rx: '/(/u' }, b: one({ from: 'a', forward: [{ tag: 'n' }] }) } });
  assert.equal(errors.length, 1);
  assert.deepEqual(find('1', conf).toJSON(), { $: [[1, 1]], '^': [[0, 0]], n: [[0, 1]] });
});

test('quickstart: a conf by hand', () => {
  const { conf, errors } = compile({
    version: 't@1',
    tags: {
      n: { rx: '/\\d+/u' },
      sp: { rx: '/ /u' },
      list: {
        search: [
          { from: 'n', forward: [{ tag: 'sp' }, { tag: 'n' }] },
          { from: 'list', forward: [{ tag: 'sp' }, { tag: 'n' }] },
        ],
      },
    },
  });
  assert.deepEqual(errors, []);
  assert.equal(
    JSON.stringify(find('1 2 3', conf)),
    '{"$":[[5,5]],"^":[[0,0]],"list":[[0,3],[0,5],[2,5]],"n":[[0,1],[2,3],[4,5]],"sp":[[1,2],[3,4]]}',
  );
});

test('readme: the quick start prints what the README shows', () => {
  const { conf, errors } = compile(
    {
      version: 'shop@1',
      patterns: { SKU: '[A-Z]{3}-\\d{4}' },
      tags: {
        sku: { resolve: 'upper', search: [{ from: 'sku-code', back: [{ tag: 'sep', optional: true }, { tag: 'sku-word', as: 'label' }] }] },
        'sku-code': { rx: '/%{SKU}/iu' },
        'sku-word': { rx: '/sku|code/iu' },
        sep: { rx: '/[\\s:]+/u' },
      },
    },
    { resolvers: { upper: (p) => p.value.toUpperCase() } },
  );
  assert.deepEqual(errors, []);
  const chart = find('Refund approved - SKU: abc-1234 - customer notified', conf);
  assert.deepEqual(chart.spans('sku'), [[18, 31]]);
  assert.deepEqual(chart.spans('sku-code'), [[23, 31]]);
  assert.equal(
    JSON.stringify(chart),
    '{"$":[[51,51]],"^":[[0,0]],"sep":[[6,7],[15,16],[17,18],[21,23],[22,23],[31,32],[33,34],[42,43]],"sku":[[18,31]],"sku-code":[[23,31]],"sku-word":[[18,21]]}',
  );
  assert.deepEqual(chart.after('sep', 22), [22, 23]);
  assert.deepEqual(chart.before('sep', 22), [17, 18]);
  assert.deepEqual(chart.after('*', 23), [23, 31]);
  assert.equal(chart.size(), 13);
});
