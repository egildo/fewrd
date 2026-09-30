// node bench.ts <conf-dir> [texts] [--rounds 3]: time `find` and `dom` apart over a corpus.
// <conf-dir> is a fewrd-play folder (conf.json, resolvers.ts|js). [texts] is a .txt,
// one text a line, or a cases .json; default <conf-dir>/cases.json. A text's time is
// its best over the rounds, so a busy machine adds little. Prints markdown tables.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { compile, dom, find } from './src/index.ts';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { rounds: { type: 'string', default: '3' } } });
if (!positionals[0]) {
  console.error('usage: node bench.ts <conf-dir> [texts.txt | cases.json] [--rounds 3]');
  process.exit(1);
}
const dir = resolve(positionals[0]);
const rounds = Math.max(1, Number(values.rounds) || 1);

const resolversFile = ['resolvers.ts', 'resolvers.mts', 'resolvers.js', 'resolvers.mjs'].map((f) => join(dir, f)).find((f) => existsSync(f));
const mod = resolversFile ? await import(pathToFileURL(resolversFile).href) : {};
const { conf, errors } = compile(JSON.parse(readFileSync(join(dir, 'conf.json'), 'utf8')), { resolvers: mod.resolvers ?? mod.default });
if (errors.length) throw new Error(errors.map((e) => `${e.path}: ${e.message}`).join('; '));

const file = resolve(positionals[1] ?? join(dir, 'cases.json'));
const raw = readFileSync(file, 'utf8');
const texts = file.endsWith('.json') ? (JSON.parse(raw) as { text: string }[]).map((c) => c.text) : raw.split('\n').filter((l) => l.trim() !== '');
const n = texts.length;

/** What a row is to the engine: its tag's fate, else whether the tag is composed or a root. */
const kindOf = (tag: string) => {
  const def = conf.tags[tag];
  return def ? (def.fate ?? (def.search ? 'composed' : 'root')) : 'edge (^ $)';
};

for (const text of texts.slice(0, 500)) dom(text, find(text, conf), conf); // warm the JIT outside the clock

const findMs = new Float64Array(n).fill(Infinity);
const domMs = new Float64Array(n).fill(Infinity);
const rows = new Uint32Array(n);
const kinds = new Map<string, number>();
for (let r = 0; r < rounds; r++) {
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    const chart = find(texts[i], conf);
    const t1 = performance.now();
    dom(texts[i], chart, conf);
    const t2 = performance.now();
    findMs[i] = Math.min(findMs[i], t1 - t0);
    domMs[i] = Math.min(domMs[i], t2 - t1);
    if (r > 0) continue;
    for (const [tag] of chart.all()) {
      rows[i]++;
      kinds.set(kindOf(tag), (kinds.get(kindOf(tag)) ?? 0) + 1);
    }
  }
}

// Texts bucketed by chart size, to the nearest power of two: is the cost linear in the rows?
type Sum = { texts: number; chars: number; rows: number; find: number; dom: number };
const total: Sum = { texts: 0, chars: 0, rows: 0, find: 0, dom: 0 };
const buckets = new Map<number, Sum>();
for (let i = 0; i < n; i++) {
  const size = 2 ** Math.round(Math.log2(rows[i]));
  if (!buckets.has(size)) buckets.set(size, { texts: 0, chars: 0, rows: 0, find: 0, dom: 0 });
  for (const s of [total, buckets.get(size)!]) {
    s.texts++;
    s.chars += texts[i].length;
    s.rows += rows[i];
    s.find += findMs[i];
    s.dom += domMs[i];
  }
}

const us = (ms: number, per: number) => ((ms * 1000) / per).toFixed(ms * 1000 < per * 100 ? 1 : 0);
const line = (label: string, s: Sum) =>
  `| ${label} | ${s.texts} | ${(s.chars / s.texts).toFixed(0)} | ${(s.rows / s.texts).toFixed(1)} | ${us(s.find, s.texts)} | ${us(s.dom, s.texts)} | ${us(s.find + s.dom, s.texts)} | ${us(s.find + s.dom, s.rows)} |`;

console.log(`${file}\nconf ${conf.version}, ${Object.keys(conf.tags).length} tags · best of ${rounds} · node ${process.version}\n`);
console.log('| rows in the chart | texts | chars | rows | find µs | dom µs | both µs | µs a row |\n|---|---:|---:|---:|---:|---:|---:|---:|');
for (const size of [...buckets.keys()].sort((a, b) => a - b)) console.log(line(`~${size}`, buckets.get(size)!));
console.log(line('all', total));
console.log('\n| kind | rows a text |\n|---|---:|');
for (const [kind, count] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`| ${kind} | ${(count / n).toFixed(1)} |`);
