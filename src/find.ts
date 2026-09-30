// find(text, conf) → Chart: root rows, then searches run from rows in passes
// until a pass adds nothing. Matching runs on the normalised copy; every span is
// mapped back to the original once, at the end.

import { Chart, type Edges, type Span } from './chart.ts';
import type { Conf, Resolve, Search } from './conf.ts';
import { derive, pinned, type Row } from './derive.ts';
import { normalise } from './normalise.ts';

type Compiled = Conf<RegExp, Resolve>;

const WORD = /[\p{L}\p{N}]/u;
const isWord = (s: string, i: number) => {
  const c = s.charCodeAt(i); // NaN past either end
  if (Number.isNaN(c)) return false;
  if (c < 0x80) return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  return WORD.test(s[i]);
};
/** A match may not start inside a word: its first char is a word char and so is the one before. */
const cutsWordAtStart = (s: string, start: number) => isWord(s, start) && isWord(s, start - 1);
/** …nor end inside one. */
const cutsWordAtEnd = (s: string, end: number) => isWord(s, end - 1) && isWord(s, end);

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const bySpan = (a: Span, b: Span) => a[0] - b[0] || a[1] - b[1];
/** The chart's order: start, end, tag name. */
const byRow = (a: Row, b: Row) => bySpan(a[1], b[1]) || byName(a[0], b[0]);

/** Into a sorted list, after what sorts equal. */
function insert<T>(list: T[], item: T, cmp: (a: T, b: T) => number): void {
  if (!list.length || cmp(list[list.length - 1], item) <= 0) return void list.push(item);
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cmp(list[mid], item) <= 0) lo = mid + 1;
    else hi = mid;
  }
  list.splice(lo, 0, item);
}

/** The tags a search reads: its `from` and every tag its atoms name. A `*` atom reads them all. */
const deps = new WeakMap<Search<RegExp>, readonly string[]>();
function readsOf(search: Search<RegExp>): readonly string[] {
  let tags = deps.get(search);
  if (!tags) {
    const atoms = search.forward ?? search.back ?? [];
    deps.set(search, (tags = [search.from, ...atoms.flatMap((a) => ('tag' in a ? a.tag : []))]));
  }
  return tags;
}

/** Pass zero: every match of every root tag, overlapping ones included. */
function roots(text: string, conf: Compiled, key: (tag: string, a: number, b: number) => number, values: Map<number, string>): Row[] {
  const rows: Row[] = [];
  for (const [tag, def] of Object.entries(conf.tags)) {
    if (!def.rx) continue;
    const re = pinned(def.rx, 'scan');
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index;
      const end = start + m[0].length;
      // Resume one code point after the start, so overlapping matches are found.
      re.lastIndex = start + (text.codePointAt(start)! > 0xffff ? 2 : 1);
      if (end === start || cutsWordAtStart(text, start) || cutsWordAtEnd(text, end)) continue;
      if (def.resolve) {
        const value = def.resolve({ value: m[0] });
        if (value === null) continue;
        values.set(key(tag, start, end), value);
      }
      rows.push([tag, [start, end]]);
    }
  }
  return rows;
}

/**
 * Every row the chart has for `text` under `conf`: complete, neutral, in original coordinates.
 *
 * The chart grows in place, sorted: a pass adds its rows once it is over, and
 * the next pass runs only the searches that read a tag the last one added to.
 * ponytail: each insert is a splice, O(rows); fine at subject length.
 */
export function find(text: string, conf: Compiled): Chart {
  const { text: s, at } = normalise(text);
  const m = s.length;
  // Searches run in code-unit order of their tag's name, so "first derivation" does not depend on key order.
  const names = Object.keys(conf.tags).sort();
  const index = new Map(['^', '$', ...names].map((t, i) => [t, i]));
  /** A row as one number, for the value map and the duplicate test. */
  const key = (tag: string, a: number, b: number) => (index.get(tag)! * (m + 1) + a) * (m + 1) + b;
  // Role values are computed as rows are accepted and dropped with the call; the chart never holds them.
  const values = new Map<number, string>();
  const valueOf = ([tag, [a, b]]: Row) => values.get(key(tag, a, b)) ?? s.slice(a, b);

  const seen = new Set<number>();
  const spans = new Map<string, Span[]>();
  const ix: Edges = { starts: new Map(), ends: new Map(), all: [] };
  const edge = (map: Map<number, Row[]>, pos: number, row: Row) => {
    const list = map.get(pos);
    if (list) insert(list, row, byRow);
    else map.set(pos, [row]);
  };
  /** True when the row is new. Rows come sorted, so the inserts mostly append. */
  const add = (row: Row): boolean => {
    const [tag, [a, b]] = row;
    const k = key(tag, a, b);
    if (seen.has(k)) return false;
    seen.add(k);
    const list = spans.get(tag);
    if (list) insert(list, row[1], bySpan);
    else spans.set(tag, [row[1]]);
    insert(ix.all, row, byRow);
    edge(ix.starts, a, row);
    edge(ix.ends, b, row);
    return true;
  };

  const first: Row[] = [['^', [0, 0]], ['$', [m, m]], ...roots(s, conf, key, values)];
  for (const row of first.sort(byRow)) add(row);
  let grew = new Set(spans.keys());
  while (grew.size) {
    const found: Row[] = [];
    for (const tag of names) {
      const def = conf.tags[tag];
      for (const search of def.search ?? []) {
        if (!readsOf(search).some((t) => t === '*' || grew.has(t))) continue;
        for (const span of spans.get(search.from) ?? []) {
          derive(s, ix, valueOf, search, [search.from, span], (lo, hi, roles) => {
            if (def.resolve) {
              // A row already accepted keeps its first value; no need to ask again.
              if (values.has(key(tag, lo, hi))) return;
              const value = def.resolve({ ...roles, value: s.slice(lo, hi) });
              if (value === null) return;
              values.set(key(tag, lo, hi), value);
            }
            found.push([tag, [lo, hi]]);
          });
        }
      }
    }
    grew = new Set();
    for (const row of found.sort(byRow)) if (add(row)) grew.add(row[0]);
  }
  return Chart.empty(text.length).with(ix.all.map(([tag, [a, b]]): Row => [tag, [at[a], at[b]]]));
}
