// dom(text, chart, conf) → Node: from the complete, neutral chart, one tree.
// Selection picks rows that do not cross (order, take or drop, forcing), the
// forced derivations bind roles, resolvers give values, water fills the gaps.
// Matching runs on the normalised copy, as in `find`; nodes are in original
// coordinates. The fold lives in fold.ts and reads the tree alone.

import { edges, rel, type Chart, type Row, type Span } from './chart.ts';
import type { Conf, Fate, Resolve } from './conf.ts';
import { derive, type Step } from './derive.ts';
import { normalise } from './normalise.ts';

export type Node = {
  /** A conf tag, or reserved: 'doc' (the root), 'text' (water). */
  tag: string;
  /** Into the original string. */
  start: number;
  end: number;
  /** The resolver's answer, only on tags that resolve. */
  value?: string;
  /** Roles bound by `as`: a Node for a tag atom, the text for a regex atom (or for a row the node absorbed). */
  attrs: Record<string, Node | string>;
  /** Tags of twins folded into this node, in selection order. */
  also?: string[];
  /** The conf tag's fate, copied here so the fold reads the tree alone. */
  fate?: Fate;
  /** The original string, on `doc` only. */
  text?: string;
  /** By containment, in text order, water included. */
  children: Node[];
};

type Compiled = Conf<RegExp, Resolve>;
type Derivation = { steps: readonly Step[]; value?: string };
type Candidate = { row: Row; weak: boolean; rank: number };

const byPosition = (a: Row, b: Row) => a[1][0] - b[1][0] || a[1][1] - b[1][1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const inside = (a: Span, b: Span) => {
  const r = rel(a, b);
  return r === 'starts' || r === 'during' || r === 'finishes';
};
const isEdge = (row: Row) => row[0] === '^' || row[0] === '$';

/**
 * The tree of `text`: a `doc` node over the whole text, one node per chosen
 * row, water as `text` nodes. Throws when the chart holds a row of a tag the
 * conf does not declare, or when a resolver refuses a row it accepted in `find`.
 *
 * ponytail: the crossing test walks the boundaries inside the row (O(its length))
 * and the same-tag test scans the chosen rows of that tag; a composed row's
 * derivations are all enumerated, as in `find`. An interval tree if subjects grow.
 */
export function dom(text: string, chart: Chart, conf: Compiled): Node {
  const { text: s, at } = normalise(text);
  const m = s.length;

  // The chart's spans are original; the matcher works on the copy. An original
  // start goes to the first copy boundary with that offset, an end to the last.
  // ponytail: a row edge that `find` placed inside an NFKC expansion is not recovered.
  const first = new Int32Array(text.length + 1).fill(-1);
  const last = new Int32Array(text.length + 1).fill(-1);
  for (let j = 0; j < at.length; j++) {
    if (first[at[j]] < 0) first[at[j]] = j;
    last[at[j]] = j;
  }
  const rank = new Map(Object.keys(conf.tags).map((t, i) => [t, i]));
  const all: Row[] = [];
  const candidates: Candidate[] = [];
  for (const [tag, [a, b]] of chart.all()) {
    if (tag === '^') all.push(['^', [0, 0]]);
    else if (tag === '$') all.push(['$', [m, m]]);
    else {
      const r = rank.get(tag);
      if (r === undefined) throw new Error(`the chart has rows of "${tag}", which the conf does not declare`);
      const lo = first[a] ?? -1;
      const hi = last[b] ?? -1;
      if (lo < 0 || hi < 0) throw new Error(`${tag} (${a},${b}) is not on a boundary of the text: is this the chart of another text?`);
      const row: Row = [tag, [lo, hi]];
      all.push(row);
      candidates.push({ row, weak: conf.tags[tag].weak === true, rank: r });
    }
  }
  all.sort(byPosition);
  const span = (row: Row) => `${row[0]} (${at[row[1][0]]},${at[row[1][1]]})`;

  // Values and derivations, computed lazily and memoised, on the copy's text.
  // Every row is the one object `all` holds, so the maps go by identity.
  const derivations = new Map<Row, Derivation[]>();
  const values = new Map<Row, string>();
  const busy = new Set<Row>();
  const refused = new Set<Row>();

  function derivationsOf(row: Row): Derivation[] {
    const known = derivations.get(row);
    if (known) return known;
    if (busy.has(row)) return [];
    busy.add(row);
    const [tag, [lo, hi]] = row;
    const def = conf.tags[tag];
    const within = all.filter((r) => lo <= r[1][0] && r[1][1] <= hi && r !== row);
    const ix = edges(within);
    const out: Derivation[] = [];
    for (const search of def.search ?? []) {
      for (const from of within) {
        if (from[0] !== search.from) continue;
        derive(s, ix, valueOf, search, from, (a, b, roles, steps) => {
          if (a !== lo || b !== hi) return;
          if (!def.resolve) return void out.push({ steps });
          const value = def.resolve({ ...roles, value: s.slice(lo, hi) });
          if (value === null) refused.add(row);
          else out.push({ steps, value });
        });
      }
    }
    busy.delete(row);
    if (!out.length) {
      throw new Error(refused.has(row) ? `resolver of "${tag}" refused (${at[lo]},${at[hi]}) at dom time` : `no derivation of ${span(row)}: is this the chart of this conf?`);
    }
    derivations.set(row, out);
    return out;
  }

  /** The value a role takes from a row: its resolved value, else its text. Bottom-up by recursion. */
  function valueOf(row: Row): string {
    const def = conf.tags[row[0]];
    if (!def?.resolve) return s.slice(row[1][0], row[1][1]);
    let v = values.get(row);
    if (v === undefined) {
      if (def.search) v = derivationsOf(row)[0].value!;
      else {
        const r = def.resolve({ value: s.slice(row[1][0], row[1][1]) });
        if (r === null) throw new Error(`resolver of "${row[0]}" refused (${at[row[1][0]]},${at[row[1][1]]}) at dom time`);
        v = r;
      }
      values.set(row, v);
    }
    return v;
  }

  // Selection. Order: non-weak first, then longer, then earlier key in `tags`, then earlier start.
  candidates.sort(
    (a, b) =>
      Number(a.weak) - Number(b.weak) ||
      b.row[1][1] - b.row[1][0] - (a.row[1][1] - a.row[1][0]) ||
      a.rank - b.rank ||
      a.row[1][0] - b.row[1][0],
  );
  // `chosen` never holds two rows that cross, nor two on one span (the second is a
  // twin), so it is indexed by span, by tag, and by edge for the crossing test.
  const chosen: Row[] = [];
  const bySpan = new Map<number, Row>();
  const byTag = new Map<string, Row[]>();
  /** The furthest end of the chosen rows starting at each boundary, and the earliest start of those ending there. */
  const reach = new Int32Array(m + 1).fill(-1);
  const root = new Int32Array(m + 1).fill(m + 1);
  const also = new Map<Row, string[]>();
  const used = new Map<Row, Derivation>();
  const twinOf = new Map<Row, Row>();
  /** How to take back every change to the selection, latest last. */
  const trail: (() => void)[] = [];
  const undoTo = (mark: number) => {
    while (trail.length > mark) trail.pop()!();
  };

  const spanKey = ([, [a, b]]: Row) => a * (m + 1) + b;
  /** A chosen row has one edge strictly inside the span and the other strictly outside it. */
  const crosses = ([a, b]: Span) => {
    for (let p = a + 1; p < b; p++) if (reach[p] > b || root[p] < a) return true;
    return false;
  };
  function choose(row: Row) {
    const [tag, [a, b]] = row;
    let list = byTag.get(tag);
    if (!list) byTag.set(tag, (list = []));
    const [reached, rooted] = [reach[a], root[b]];
    chosen.push(row);
    list.push(row);
    bySpan.set(spanKey(row), row);
    if (b > reached) reach[a] = b;
    if (a < rooted) root[b] = a;
    trail.push(() => {
      chosen.pop();
      list.pop();
      bySpan.delete(spanKey(row));
      reach[a] = reached;
      root[b] = rooted;
    });
  }
  function twin(row: Row, node: Row): true {
    const list = also.get(node);
    if (!list) {
      also.set(node, [row[0]]);
      trail.push(() => also.delete(node));
    } else if (!list.includes(row[0])) {
      list.push(row[0]);
      trail.push(() => list.pop());
    }
    const was = twinOf.get(row);
    if (was !== node) {
      twinOf.set(row, node);
      trail.push(() => (was === undefined ? twinOf.delete(row) : twinOf.set(row, was)));
    }
    return true;
  }

  /**
   * Choose `row`, and force its derivation: every row it took is chosen at
   * once. `own` is the composed row being forced: a row of its own tag is not a
   * node, its own derivation is forced instead (the outermost row of a
   * self-grown tag absorbs its chain). A derivation any of whose rows crosses a
   * chosen row is skipped for the next; with none left the row is not chosen.
   * A forced row skips the walk's same-tag test and nothing else.
   */
  function take(row: Row, own?: string): boolean {
    if (own !== undefined && row[0] === own) return force(row, own, false);
    const there = bySpan.get(spanKey(row));
    if (there) return there[0] === row[0] || twin(row, there);
    if (crosses(row[1])) return false;
    const mark = trail.length;
    choose(row);
    if (!conf.tags[row[0]].search || force(row, row[0], true)) return true;
    undoTo(mark);
    return false;
  }
  function force(row: Row, own: string, node: boolean): boolean {
    for (const d of derivationsOf(row)) {
      const mark = trail.length;
      if (d.steps.every((st) => !('row' in st) || isEdge(st.row) || take(st.row, own))) {
        if (node) {
          used.set(row, d);
          trail.push(() => used.delete(row));
        }
        return true;
      }
      undoTo(mark);
    }
    return false;
  }

  for (const { row } of candidates) {
    if (bySpan.get(spanKey(row))?.[0] === row[0]) continue;
    if (crosses(row[1])) continue;
    if (byTag.get(row[0])?.some((c) => inside(row[1], c[1]))) continue;
    take(row);
  }

  // The tree: sorted by start, then end descending, nested with a stack.
  const doc: Node = { tag: 'doc', start: 0, end: text.length, attrs: {}, text, children: [] };
  const nodeOf = new Map<Row, Node>();
  const stack: { node: Node; lo: number; hi: number }[] = [{ node: doc, lo: 0, hi: m }];
  for (const row of [...chosen].sort((a, b) => a[1][0] - b[1][0] || b[1][1] - a[1][1])) {
    const [tag, [lo, hi]] = row;
    while (stack[stack.length - 1].lo > lo || stack[stack.length - 1].hi < hi) stack.pop();
    const def = conf.tags[tag];
    const value = def.resolve ? (def.search ? used.get(row)!.value : valueOf(row)) : undefined;
    // Built a key at a time, in the documented order, without the spreads a literal would need.
    const node = { tag, start: at[lo], end: at[hi] } as Node;
    if (value !== undefined) node.value = value;
    node.attrs = {};
    const twins = also.get(row);
    if (twins) node.also = twins;
    if (def.fate !== undefined) node.fate = def.fate;
    node.children = [];
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, lo, hi });
    nodeOf.set(row, node);
  }

  // Roles, from each composed node's forced derivation.
  for (const row of chosen) {
    const d = used.get(row);
    if (!d) continue;
    const node = nodeOf.get(row)!;
    for (const st of d.steps) {
      if (st.as === undefined) continue;
      if ('row' in st) {
        const twinned = twinOf.get(st.row);
        node.attrs[st.as] = nodeOf.get(st.row) ?? (twinned && nodeOf.get(twinned)) ?? s.slice(st.row[1][0], st.row[1][1]);
      } else node.attrs[st.as] = st.text;
    }
  }

  // Water: every non-empty gap inside a node that has children.
  const fill = (n: Node) => {
    // A node with nothing inside it is a leaf, except the root: a text no row covers is one water node.
    if (!n.children.length && (n !== doc || !n.end)) return;
    const out: Node[] = [];
    let pos = n.start;
    const gap = (to: number) => {
      if (to > pos) out.push({ tag: 'text', start: pos, end: to, attrs: {}, children: [] });
    };
    for (const c of n.children) {
      gap(c.start);
      out.push(c);
      pos = c.end;
      fill(c);
    }
    gap(n.end);
    n.children = out;
  };
  fill(doc);
  return doc;
}
