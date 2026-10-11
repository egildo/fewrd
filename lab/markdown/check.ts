// node check.ts conf.json file.md: fewrd's tree and commonmark's, counted kind by kind.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compile, dom, find, type Node } from '../../src/index.ts';

const cm = createRequire(import.meta.url)('commonmark');
const [confPath, mdPath] = process.argv.slice(2);
const md = readFileSync(mdPath, 'utf8');
const { conf, errors } = compile(JSON.parse(readFileSync(confPath, 'utf8')));
if (errors.length) console.log(errors);
const text = md.replace(/^ +/gm, (sp) => '·'.repeat(sp.length)).replace(/\n/g, '¶');

/** fewrd tag → commonmark node type. A node counts by its own tag; a twin counts only inside list structure (a one-item list is also its item). */
const KIND: [RegExp, string][] = [
  [/^(heading|setext)$/, 'heading'],
  [/^([bo]l\d|list_.*)$/, 'list'],
  [/^([bo]i\d|line_.*)$/, 'item'],
  [/^(anchor|autolink)$/, 'link'],
  [/^image$/, 'image'],
  [/^bold$/, 'strong'],
  [/^italic$/, 'emph'],
  [/^code$/, 'code'],
  [/^fenced$/, 'code_block'],
  [/^quote$/, 'block_quote'],
  [/^hr$/, 'thematic_break'],
  [/^br$/, 'linebreak'],
];
const ours: Record<string, number> = {};
const walk = (n: Node) => {
  const seen = new Set<string>();
  const twins = /^([bo][lei]\d|(list|line|entry)_.*)$/.test(n.tag) ? (n.also ?? []) : [];
  for (const t of [n.tag, ...twins]) for (const [rx, kind] of KIND) if (rx.test(t)) seen.add(kind);
  for (const k of seen) ours[k] = (ours[k] ?? 0) + 1;
  n.children.forEach(walk);
};
walk(dom(text, find(text, conf), conf));

const theirs: Record<string, number> = {};
const w = new cm.Parser().parse(md).walker();
for (let e; (e = w.next()); ) if (e.entering) theirs[e.node.type] = (theirs[e.node.type] ?? 0) + 1;

let same = true;
for (const kind of new Set(KIND.map(([, k]) => k))) {
  const [a, b] = [ours[kind] ?? 0, theirs[kind] ?? 0];
  if (a !== b) same = false;
  console.log(`${a === b ? ' ' : '✗'} ${kind.padEnd(15)} fewrd ${String(a).padStart(3)}   commonmark ${String(b).padStart(3)}`);
}
console.log(same ? 'all counts match' : 'counts differ');
