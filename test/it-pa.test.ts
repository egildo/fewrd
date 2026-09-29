import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chart, compile, find } from '../src/index.ts';
import { itPa, itPaResolvers } from '../confs/it-pa.ts';
import data from '../confs/it-pa.json' with { type: 'json' };
import cases from '../cases/it-pa.json' with { type: 'json' };

const TAGS = ['dated', 'protocol', 'cig', 'cup', 'chapter', 'cdr', 'provvedimento', 'amount', 'date', 'quotation', 'caps'];

/** The rows each case must give, as the text they cover; a tag not listed has no rows. */
const EXPECTED: Record<string, Record<string, string[]>> = {
  'PEC, channel with a dash': {
    protocol: ['Prot. n. 0023993', 'Pec - Prot. n. 0023993'],
    dated: ['Prot. n. 0023993 del 23/09/2026', 'Pec - Prot. n. 0023993 del 23/09/2026'],
    date: ['23/09/2026'],
    cup: ['CUP F84D26000210006'],
  },
  'PEC, channel with a colon': {
    protocol: ['Prot. n. 0018842', 'PEC: Prot. n. 0018842'],
    dated: ['Prot. n. 0018842 del 12/09/2026', 'PEC: Prot. n. 0018842 del 12/09/2026'],
    date: ['12/09/2026'],
  },
  Riscontro: {
    protocol: ['Prot. n. 0020117', 'Riscontro a: Prot. n. 0020117'],
    dated: ['Prot. n. 0020117 del 15/09/2026', 'Riscontro a: Prot. n. 0020117 del 15/09/2026'],
    date: ['15/09/2026'],
  },
  'Gateway, two registers in capitals': {
    protocol: ['Prot.N.0004821/2026', 'RIF.0007730/2026', 'PROT. N. 0031002', 'POSTA CERTIFICATA: PROT. N. 0031002'],
    dated: ['PROT. N. 0031002 DEL 19/09/2026', 'POSTA CERTIFICATA: PROT. N. 0031002 DEL 19/09/2026'],
    date: ['19/09/2026'],
    caps: ['POSTA CERTIFICATA'],
  },
  'Ledger tail': { cig: ['CIG Z1234ABCDE'], chapter: ['Capitolo SC04.0123'], amount: ['€ 12.450,00'] },
  Brackets: { cig: ['CIG Z9A8B7C6D5'] },
  'Integration chain, nested quotations': {
    protocol: ['Numero Protocollo 0012345', 'Protocollo 0012345'],
    dated: ['Numero Protocollo 0012345 del 03/02/2026', 'Protocollo 0012345 del 03/02/2026'],
    date: ['03/02/2026'],
    quotation: [
      'con oggetto: Nota di Integrazione per il provvedimento con oggetto: Liquidazione LIQUIDAZIONE ATTIVA - CIG Z1234ABCDE',
      'con oggetto: Liquidazione LIQUIDAZIONE ATTIVA - CIG Z1234ABCDE',
    ],
    caps: ['LIQUIDAZIONE ATTIVA'],
    cig: ['CIG Z1234ABCDE'],
  },
  'Short prose': {},
  'Connector, a provvedimento': { provvedimento: ['provvedimento ID 553422', 'ID 553422'], connector: ['del', 'di'] },
  'Connector, a chapter': { chapter: ['Cap. SC09.3161'], connector: ['di', 'sul'] },
  'Connectors, a chain': {
    chapter: ['Capitolo SC01.0001', 'Capitolo SC02.0002'],
    cdr: ['CdR 00.01.02.03'],
    connector: ['dal', 'al', 'a', 'sul'],
  },
  'Connector, no mention follows': { connector: ['del', 'di'] },
  'Connector, elided': { provvedimento: ['ID 551143'], connector: ["dell'"] },
};

const rowsOf = (chart: Chart, text: string, tag: string) => chart.spans(tag).map(([a, b]) => text.slice(a, b)).sort();

test('italian-conf-in-new-format: compiles with its four resolvers, no errors', () => {
  const { conf, errors } = compile(data, { resolvers: itPaResolvers });
  assert.deepEqual(errors, []);
  assert.equal(Object.keys(conf.tags).length, Object.keys(data.tags).length);
  assert.equal(conf.version, 'it-pa@4');
});

test('italian-conf-in-new-format: the spec shows the same conf as confs/it-pa.json', () => {
  const spec = readFileSync(new URL('../specs/005-chart/spec.md', import.meta.url), 'utf8');
  const start = spec.indexOf('  ```json\n  {\n    "version": "it-pa@3"');
  const block = spec.slice(start + '  ```json\n'.length, spec.indexOf('  ```\n', start + 10));
  // Phase 2 bumped the version and appended `paren`; the spec of phase 1 keeps the conf it was written with.
  const { paren, ...tags } = data.tags;
  assert.deepEqual(JSON.parse(block), { ...data, version: 'it-pa@3', tags });
  assert.equal(paren.fate, 'bracket');
});

test('italian-cases-tagged: every case is in the table', () => {
  assert.deepEqual(cases.map((c) => c.name).sort(), Object.keys(EXPECTED).sort());
});

for (const { name, text } of cases) {
  test(`italian-cases-tagged: ${name}`, () => {
    const chart = find(text, itPa);
    // Connectors are asserted on the five connector cases only; the other subjects have them too.
    const tags = name.startsWith('Connector') ? [...TAGS, 'connector'] : TAGS;
    for (const tag of tags) assert.deepEqual(rowsOf(chart, text, tag), [...(EXPECTED[name]?.[tag] ?? [])].sort(), tag);
  });

  test(`chart-invariants and find-is-deterministic: ${name}`, () => {
    const chart = find(text, itPa);
    const json = chart.toJSON();
    assert.deepEqual(json['^'], [[0, 0]]);
    assert.deepEqual(json['$'], [[text.length, text.length]]);
    for (const spans of Object.values(json)) {
      spans.forEach(([a, b], i) => {
        assert.ok(0 <= a && a <= b && b <= text.length);
        if (i) assert.ok(spans[i - 1][0] < a || (spans[i - 1][0] === a && spans[i - 1][1] < b));
      });
    }
    assert.deepEqual(Chart.from(JSON.parse(JSON.stringify(chart))).toJSON(), json);
    const reversed = { ...itPa, tags: Object.fromEntries(Object.entries(itPa.tags).reverse()) };
    assert.equal(JSON.stringify(find(text, reversed)), JSON.stringify(chart));
  });
}
