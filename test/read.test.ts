import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { gist, html, read, type Book, type Cuts } from '../src/index.ts';
import { itPa } from '../recipes/it-pa.ts';
import { CASES } from '../playground/cases.ts';

const slice = (c: Cuts, s: { start: number; end: number }) => c.text.slice(s.start, s.end);
const byEntity = (c: Cuts, e: string) => c.mentions.find((m) => m.entity === e)!;
const folding = (...entities: string[]) => (m: { entity: string }) => entities.includes(m.entity);

test('leaves partition every case, character for character', () => {
  for (const { text } of CASES) {
    const c = read(text, itPa);
    assert.equal(c.leaves.map((l) => slice(c, l)).join(''), text);
    c.leaves.forEach((l, i) => i && assert.equal(l.start, c.leaves[i - 1].end));
  }
});

test('nothing folded: the gist is the original', () => {
  for (const { text } of CASES) assert.equal(gist(read(text, itPa), () => false), text);
});

test('a protocol grows greedily: channel, label, value, date', () => {
  const c = read('Pec - Prot. n. 0023993 del 23/09/2026 - Misura 1.7.2', itPa);
  const p = byEntity(c, 'protocol');
  assert.equal(slice(c, p.extent), 'Pec - Prot. n. 0023993 del 23/09/2026');
  assert.deepEqual(p.parts.map((x) => x.part), ['channel', 'label', 'value', 'date']);
  assert.equal(p.value, '0023993');
  assert.equal(gist(c, folding('protocol')), 'Misura 1.7.2');
});

test('a bare seven-digit number is no protocol', () => {
  assert.equal(read('Pratica 0023993 in corso', itPa).mentions.length, 0);
});

test('folding a middle mention keeps one separator, the strongest', () => {
  const c = read('Comune di Ghilarza - CUP F84D26000210006 - Trasmissione cronoprogramma', itPa);
  assert.equal(gist(c, folding('cup')), 'Comune di Ghilarza - Trasmissione cronoprogramma');
});

test('a fold that empties brackets takes them along', () => {
  const c = read('Fornitura toner (CIG Z1234ABCDE) - saldo', itPa);
  assert.equal(gist(c, folding('cig')), 'Fornitura toner - saldo');
});

test('no separator survives before closing punctuation', () => {
  const c = read('Liquidazione fattura, CIG Z1234ABCDE.', itPa);
  assert.equal(gist(c, folding('cig')), 'Liquidazione fattura.');
});

test('a quotation nests, and folding it folds what it holds', () => {
  const c = read('Nota di integrazione - Prot. n. 0001234 del 02/03/2026 con oggetto: Liquidazione CIG Z1234ABCDE', itPa);
  const q = byEntity(c, 'quotation');
  const inner = byEntity(c, 'cig');
  assert.equal(inner.parent, c.mentions.indexOf(q));
  assert.equal(gist(c, folding('quotation')), 'Nota di integrazione - Prot. n. 0001234 del 02/03/2026');
  assert.equal(gist(c, folding('quotation', 'protocol')), 'Nota di integrazione');
});

test('spans land on the original through NBSP and en-dashes', () => {
  const text = 'Pec – Prot. n.  0023993 del 23/09/2026 – Oggetto';
  const c = read(text, itPa);
  assert.equal(slice(c, byEntity(c, 'protocol').extent), 'Pec – Prot. n.  0023993 del 23/09/2026');
  assert.equal(gist(c, folding('protocol')), 'Oggetto');
});

test('html carries both views: data-fold marks what condensed drops', () => {
  const c = read('Comune di Ghilarza - CUP F84D26000210006 - Trasmissione', itPa);
  const out = html(c, folding('cup'));
  assert.match(out, /<span data-entity="cup" data-mention="0" data-fold><span data-part="label">CUP <\/span><span data-part="value">F84D26000210006<\/span><\/span>/);
  assert.equal((out.match(/data-sep data-fold/g) ?? []).length, 1);
  assert.equal(out.replace(/<[^>]+>/g, ''), c.text);
});

test('a reading survives JSON: it is cacheable', () => {
  const c = read(CASES[0].text, itPa);
  assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
});

test('reading the same text against the same book twice is deterministic', () => {
  const a = read(CASES[0].text, itPa);
  const b = read(CASES[0].text, itPa);
  assert.deepEqual(a, b);
});

test('overlapping candidates: longest extent wins, then earlier recipe wins the tie', () => {
  const longWins: Book = {
    version: 'test-overlap@1',
    recipes: [
      { entity: 'short', anchor: /BC/u, glued: true },
      { entity: 'long', anchor: /ABCD/u, glued: true },
    ],
  };
  assert.deepEqual(read('ABCD', longWins).mentions.map((m) => m.entity), ['long']);

  const tieBreak: Book = {
    version: 'test-overlap@2',
    recipes: [
      { entity: 'first', anchor: /AB/u, glued: true },
      { entity: 'second', anchor: /AB/u, glued: true },
    ],
  };
  assert.deepEqual(read('AB', tieBreak).mentions.map((m) => m.entity), ['first']);
});

test('a weak recipe only fills gaps a stronger recipe leaves', () => {
  const overlapping: Book = {
    version: 'test-weak@1',
    recipes: [
      { entity: 'strong', anchor: /ABCD/u, glued: true },
      { entity: 'weak', anchor: /BC/u, glued: true, weak: true },
    ],
  };
  assert.deepEqual(read('ABCD', overlapping).mentions.map((m) => m.entity), ['strong']);

  const gapOnly: Book = {
    version: 'test-weak@2',
    recipes: [
      { entity: 'strong', anchor: /XYZ/u, glued: true },
      { entity: 'weak', anchor: /BC/u, glued: true, weak: true },
    ],
  };
  assert.deepEqual(read('ABCD', gapOnly).mentions.map((m) => m.entity), ['weak']);
});

test('an anchor may not start or end inside a word, unless its recipe is glued', () => {
  const strict: Book = { version: 'test-glued@1', recipes: [{ entity: 'code', anchor: /BC/u }] };
  assert.equal(read('ABCD', strict).mentions.length, 0);

  const glued: Book = { version: 'test-glued@2', recipes: [{ entity: 'code', anchor: /BC/u, glued: true }] };
  assert.deepEqual(read('ABCD', glued).mentions.map((m) => m.value), ['BC']);
});

test('html escapes special characters in leaf text', () => {
  const c = read('Nota & <avviso> "urgente"', itPa);
  const out = html(c, () => false);
  assert.ok(out.includes('&amp;'));
  assert.ok(out.includes('&lt;avviso&gt;'));
  assert.ok(out.includes('&quot;urgente&quot;'));
});

/** Strip `<span ...data-fold...>` subtrees (and their nesting) the way `.condensed [data-fold] { display: none }` would, then unescape — mirrors gist()'s raw text. */
function stripFolded(markup: string): string {
  let out = '';
  let depth = 0;
  let i = 0;
  while (i < markup.length) {
    if (markup[i] === '<') {
      const close = markup.indexOf('>', i);
      const tag = markup.slice(i, close + 1);
      if (/^<span\b/.test(tag)) {
        if (depth > 0) depth++;
        else if (/data-fold/.test(tag)) depth++;
      } else if (/^<\/span>/.test(tag) && depth > 0) depth--;
      i = close + 1;
      continue;
    }
    if (depth === 0) out += markup[i];
    i++;
  }
  return out.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

test('the condensed CSS toggle is equivalent to gist: stripping data-fold spans from html matches gist', () => {
  const fold = folding('protocol', 'cig', 'cup', 'amount', 'chapter', 'quotation');
  for (const { text } of CASES) {
    const c = read(text, itPa);
    assert.equal(stripFolded(html(c, fold)), gist(c, fold));
  }
});

test('a recipe book only imports the public surface, never engine internals', () => {
  const dir = new URL('../recipes/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    const imports = [...source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)].map((m) => m[1]);
    for (const spec of imports) {
      assert.ok(!/\/(read|render|compile)\.ts$/.test(spec), `recipes/${file} imports engine internal: ${spec}`);
    }
  }
});
