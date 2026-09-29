import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gist, hidden, type Node } from '../src/index.ts';
import { build, leaves, lines, show, type Tags } from './tree.ts';

/** The spec's toy conf T, in its key order. */
const T: Tags = {
  ref: { search: [{ from: 'num', back: [{ tag: 'sep', optional: true }, { tag: 'lbl', as: 'label' }] }] },
  num: { rx: '/#\\d+/u' },
  lbl: { rx: '/ref|n\\./iu' },
  paren: { rx: '/\\(.*?\\)/su', fate: 'bracket' },
  conn: { rx: '/del|sul|per\\s+il/iu', fate: 'connector' },
  sep: { rx: '/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u', fate: 'separator' },
};

/** The gist of `text` under T, folding these tags. */
const fold = (text: string, ...tags: string[]) => {
  const { doc } = build(T, text);
  return gist(doc, (n) => tags.includes(n.tag));
};
const names = (doc: Node, set: Set<Node>, text: string) => [...set].map((n) => `${n.tag}(${n.start},${n.end})`).sort();

const NOTA = 'Nota ref #12 - fine';

test('fold-hides-subtree: a composed node', () => {
  const { doc } = build(T, NOTA);
  assert.equal(
    show(doc, NOTA),
    lines(
      'doc (0,19)',
      '  text (0,4) "Nota"',
      '  sep (4,5) " "',
      '  ref (5,12) "ref #12" attrs={ label: → lbl (5,8) }',
      '    lbl (5,8) "ref"',
      '    sep (8,9) " "',
      '    num (9,12) "#12"',
      '  sep (12,15) " - "',
      '  text (15,19) "fine"',
    ),
  );
  assert.equal(fold(NOTA, 'ref'), 'Nota - fine');
});
test('fold-hides-subtree: only a child inside a composed node', () => assert.equal(fold(NOTA, 'num'), 'Nota ref - fine'));
test('fold-hides-subtree: nothing folded', () => assert.equal(fold(NOTA), NOTA));

test('hidden-and-gist: the set', () => {
  const { doc } = build(T, NOTA);
  const set = hidden(doc, (n) => n.tag === 'ref');
  assert.deepEqual(names(doc, set, NOTA), ['lbl(5,8)', 'num(9,12)', 'ref(5,12)', 'sep(4,5)', 'sep(8,9)']);
  assert.ok(!set.has(doc));
});
test('hidden-and-gist: the policy is never asked about doc', () => {
  const { doc } = build(T, NOTA);
  const asked: string[] = [];
  gist(doc, (n) => (asked.push(n.tag), false));
  assert.ok(!asked.includes('doc'));
  assert.ok(asked.includes('ref'));
});
test('hidden-and-gist: a tree parsed back from JSON folds with all four rules', () => {
  const text = 'Fornitura toner (ref #12) - saldo del ref #3';
  const { doc } = build(T, text);
  const back = JSON.parse(JSON.stringify(doc)) as Node;
  for (const tags of [['ref'], ['num'], ['ref', 'num']]) {
    const policy = (n: Node) => tags.includes(n.tag);
    assert.equal(gist(back, policy), gist(doc, policy));
  }
  assert.equal(gist(back, (n) => n.tag === 'ref'), 'Fornitura toner - saldo');
});
test('hidden-and-gist: a tree without its text says so', () => {
  const leaf: Node = { tag: 'text', start: 0, end: 1, attrs: {}, children: [] };
  assert.throws(() => gist({ tag: 'doc', start: 0, end: 1, attrs: {}, children: [leaf] }, () => false), /no text/);
});

test('connector-follows-its-right: folded right', () => assert.equal(fold('Nota del ref #12 - fine', 'ref'), 'Nota - fine'));
test('connector-follows-its-right: kept right', () => assert.equal(fold('Nota del ref #12 - fine', 'num'), 'Nota del ref - fine'));
test('connector-follows-its-right: no mention follows', () => assert.equal(fold('Nota del giorno', 'ref', 'num'), 'Nota del giorno'));
test('connector-follows-its-right: a kept connector bounds runs', () => assert.equal(fold('A - #1 - B del ref #2 - C', 'num'), 'A - B del ref - C'));
test('connector-follows-its-right: a connector before a hidden connector goes too', () => {
  assert.equal(fold('Nota sul del ref #1 - fine', 'ref'), 'Nota - fine');
});

test('separators-untouched-without-a-fold: edges too', () => assert.equal(fold(' Nota, ref #12 '), ' Nota, ref #12 '));

test('strongest-separator-survives: dash', () => assert.equal(fold('Nota, #12 - fine', 'num'), 'Nota - fine'));
test('strongest-separator-survives: semicolon over comma', () => assert.equal(fold('a; #1, b', 'num'), 'a; b'));
test('strongest-separator-survives: tie goes left', () => assert.equal(fold('a #1 b', 'num'), 'a b'));

test('no-separator-at-an-edge: start', () => assert.equal(fold('#12 - fine', 'num'), 'fine'));
test('no-separator-at-an-edge: end', () => assert.equal(fold('Nota - #12', 'num'), 'Nota'));
test('no-separator-at-an-edge: bracket inner edge', () => assert.equal(fold('Nota (#12 fine)', 'num'), 'Nota (fine)'));
test('no-separator-at-an-edge: before a full stop', () => assert.equal(fold('Nota #12.', 'num'), 'Nota.'));
test('no-separator-at-an-edge: before a closing bracket', () => assert.equal(fold('Nota (fine #12)', 'num'), 'Nota (fine)'));

test('bracket-empties-out: emptied', () => assert.equal(fold('Fornitura toner (ref #12) - saldo', 'ref'), 'Fornitura toner - saldo'));
test('bracket-empties-out: label stays', () => assert.equal(fold('Fornitura toner (ref #12) - saldo', 'num'), 'Fornitura toner (ref) - saldo'));
test('bracket-empties-out: water keeps it', () => assert.equal(fold('Fornitura toner (ref #12 urgente) - saldo', 'ref'), 'Fornitura toner (urgente) - saldo'));
test('bracket-empties-out: a bracket nothing was cut from stays, even empty', () => {
  assert.equal(fold('Nota ( ) fine'), 'Nota ( ) fine');
  assert.equal(fold('Nota () fine', 'num'), 'Nota () fine');
});
test('bracket-empties-out: innermost first', () => {
  const both: Tags = { ...T, sq: { rx: '/\\[.*\\]/su', fate: 'bracket' } };
  const run = (text: string) => gist(build(both, text).doc, (n) => n.tag === 'num');
  assert.equal(run('Nota [a (#1)] fine'), 'Nota [a] fine');
  assert.equal(run('Nota [(#1)] fine'), 'Nota fine');
});

test('fold-hides-subtree: every leaf is asked once, and leaves partition the text under any fold', () => {
  const { doc } = build(T, 'Fornitura toner (ref #12) - saldo');
  const all = leaves(doc).map((l) => 'Fornitura toner (ref #12) - saldo'.slice(l.start, l.end)).join('');
  assert.equal(all, 'Fornitura toner (ref #12) - saldo');
});
