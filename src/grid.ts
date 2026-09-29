// The playground's geometry, pure and testable: wrapping the text into lines,
// cutting a row into per-line pieces, stacking rows into lanes, the tree as
// lines, the hidden leaves as spans, and a tag's band colour. Not a public
// entry: the playground imports it, the tests import it, nobody else.

import type { Row, Span } from './chart.ts';
import type { Node } from './dom.ts';
import { hidden, type Fold } from './fold.ts';

export type { Row };

/** Stack rows into lanes: each row on the first lane whose last row ends at or before its start. */
export function lanes(rows: Iterable<Row>): Row[][] {
  const out: Row[][] = [];
  const ends: number[] = [];
  for (const row of rows) {
    let i = ends.findIndex((end) => end <= row[1][0]);
    if (i < 0) {
      i = out.length;
      out.push([]);
      ends.push(0);
    }
    out[i].push(row);
    ends[i] = row[1][1];
  }
  return out;
}

/** Where each line of a text wrapped to `cols` characters starts: after the last space that fits, or hard at `cols` when there is none. */
export function wrap(text: string, cols: number): number[] {
  const starts = [0];
  for (let at = 0; text.length - at > cols; starts.push(at)) {
    const space = text.lastIndexOf(' ', at + cols - 1);
    at = space > at ? space + 1 : at + cols;
  }
  return starts;
}

/** Where a row falls on lines that start at `starts`: one piece per line it touches, columns within the line. */
export function segments([a, b]: Span, starts: readonly number[]): { line: number; from: number; to: number }[] {
  const out: { line: number; from: number; to: number }[] = [];
  starts.forEach((from, line) => {
    const end = starts[line + 1] ?? Infinity;
    if (a < end && b > from) out.push({ line, from: Math.max(a, from) - from, to: Math.min(b, end) - from });
  });
  return out;
}

/** The tree, one entry per node but `doc`, in text order: the node, its depth and a one-line description (tag, span, twins, value, the node's text). */
export function walk(doc: Node, text: string): { node: Node; depth: number; line: string }[] {
  const out: { node: Node; depth: number; line: string }[] = [];
  const visit = (n: Node, depth: number) => {
    const also = n.also ? ` also=${n.also.join(',')}` : '';
    const value = n.value !== undefined ? ` value=${JSON.stringify(n.value)}` : '';
    out.push({ node: n, depth, line: `${'  '.repeat(depth)}${n.tag} (${n.start}, ${n.end})${also}${value} ${JSON.stringify(text.slice(n.start, n.end))}` });
    for (const c of n.children) visit(c, depth + 1);
  };
  for (const c of doc.children) visit(c, 0);
  return out;
}
export const treeLines = (doc: Node, text: string): string[] => walk(doc, text).map((x) => x.line);

/** The spans of the leaves the fold hides, adjacent ones merged. */
export function greyed(doc: Node, fold: Fold): Span[] {
  const out = hidden(doc, fold);
  const spans: [number, number][] = [];
  const visit = (n: Node) => {
    if (n.children.length) return n.children.forEach(visit);
    if (!out.has(n)) return;
    const last = spans[spans.length - 1];
    if (last && last[1] === n.start) last[1] = n.end;
    else spans.push([n.start, n.end]);
  };
  doc.children.forEach(visit);
  return spans;
}

/** The twelve band hues, one lightness and chroma per theme (set in the palette). */
export const HUES = [20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320, 350];

/** The band slot of the tag at place `i` in its conf: a step of 5 slots is 150° of hue, so neighbours differ; the second lap shifts by one. */
export const slot = (i: number): number => (Math.max(0, i) * 5 + Math.floor(Math.max(0, i) / HUES.length)) % HUES.length;
