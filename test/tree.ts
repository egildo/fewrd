// Helpers shared by the tree and fold tests: build a tree from a toy conf, check
// the tree invariants on it, print it the way the spec writes trees.

import assert from 'node:assert/strict';
import { Chart, compile, dom, find, type Node, type Resolve } from '../src/index.ts';

export type Tags = Record<string, unknown>;

/** The leaves of a tree, in order (a childless `doc` has none). */
export function leaves(n: Node): Node[] {
  return n.children.length ? n.children.flatMap(leaves) : n.tag === 'doc' ? [] : [n];
}

/** leaves-partition-text and the rest of the tree invariants. */
export function invariants(doc: Node, text: string) {
  assert.equal(doc.tag, 'doc');
  assert.deepEqual([doc.start, doc.end], [0, text.length]);
  let pos = 0;
  for (const l of leaves(doc)) {
    assert.equal(l.start, pos, `leaf ${l.tag} starts at ${l.start}, expected ${pos}`);
    pos = l.end;
  }
  assert.equal(pos, text.length);
  assert.equal(leaves(doc).map((l) => text.slice(l.start, l.end)).join(''), text);
  const all: Node[] = [];
  const walk = (n: Node) => {
    all.push(n);
    for (const c of n.children) {
      assert.ok(n.start <= c.start && c.end <= n.end, `${c.tag} (${c.start},${c.end}) escapes ${n.tag} (${n.start},${n.end})`);
      walk(c);
    }
    for (const v of Object.values(n.attrs)) if (typeof v !== 'string') assert.ok(descendants(n).includes(v), 'a role is not a descendant');
    if (n.also) assert.ok(n.also.length > 0);
  };
  const descendants = (n: Node): Node[] => n.children.flatMap((c) => [c, ...descendants(c)]);
  walk(doc);
  for (const a of all) for (const b of all) if (a !== b && a.tag !== 'doc' && b.tag !== 'doc') assert.ok(!(a.start < b.start && b.start < a.end && a.end < b.end), 'two nodes cross');
}

/** The tree as the spec writes it: one node per line, indented by depth. */
export function show(doc: Node, text: string): string {
  const line = (n: Node, depth: number): string[] => {
    const parts = [`${'  '.repeat(depth)}${n.tag} (${n.start},${n.end})`];
    if (n.tag !== 'doc') parts.push(JSON.stringify(text.slice(n.start, n.end)));
    if (n.also) parts.push(`also=[${n.also.join(',')}]`);
    if (n.value !== undefined) parts.push(`value=${JSON.stringify(n.value)}`);
    const roles = Object.entries(n.attrs);
    if (roles.length) parts.push(`attrs={ ${roles.map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : `→ ${v.tag} (${v.start},${v.end})`}`).join(', ')} }`);
    return [parts.join(' '), ...n.children.flatMap((c) => line(c, depth + 1))];
  };
  return line(doc, 0).join('\n');
}

export function compiled(tags: Tags, resolvers?: Record<string, Resolve>) {
  const { conf, errors } = compile({ version: 't@1', tags }, { resolvers });
  assert.deepEqual(errors, []);
  return conf;
}

/** find, dom, the tree invariants, and selection-is-deterministic: the same tree from a chart whose JSON lists its tags in reverse. */
export function build(tags: Tags, text: string, resolvers?: Record<string, Resolve>) {
  const conf = compiled(tags, resolvers);
  const chart = find(text, conf);
  const doc = dom(text, chart, conf);
  invariants(doc, text);
  const reversed = Chart.from(Object.fromEntries(Object.entries(chart.toJSON()).reverse()));
  assert.deepEqual(dom(text, reversed, conf), doc);
  return { doc, chart, conf };
}

/** `show` of the tree of `text` under `tags`. */
export const treeOf = (tags: Tags, text: string, resolvers?: Record<string, Resolve>) => show(build(tags, text, resolvers).doc, text);

/** The tree as lines with leading indentation trimmed of a template literal's common margin. */
export const lines = (...rows: string[]) => rows.join('\n');
