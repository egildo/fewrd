// find(text, conf) → Chart: root rows, then searches run from rows in passes
// until a pass adds nothing. Matching runs on the normalised copy; every span is
// mapped back to the original once, at the end.

import { Chart, type Span } from './chart.ts';
import type { Atom, Conf, Resolve, Search } from './conf.ts';
import { normalise } from './normalise.ts';

type Row = readonly [tag: string, span: Span];
type Compiled = Conf<RegExp, Resolve>;
type Roles = Readonly<Record<string, string>>;

const WORD = /[\p{L}\p{N}]/u;
const isWord = (ch: string | undefined) => ch !== undefined && WORD.test(ch);
/** A match may not start inside a word: its first char is a word char and so is the one before. */
const cutsWordAtStart = (s: string, start: number) => isWord(s[start]) && isWord(s[start - 1]);
/** …nor end inside one. */
const cutsWordAtEnd = (s: string, end: number) => isWord(s[end - 1]) && isWord(s[end]);

type Kind = 'scan' | 'back' | 'forward' | 'whole';
const bare = (flags: string) => flags.replace(/[gyd]/g, '');
const cache = new WeakMap<RegExp, Partial<Record<Kind, RegExp>>>();
/**
 * A regex pinned for one job, cached per RegExp: `scan` global, `back` anchored at
 * the end of what it is run on, `forward` sticky, `whole` anchored at both ends.
 * ponytail: `back` is run on the prefix, so it rescans it (O(n) per attempt) and a
 * lookahead in it cannot see past the cursor; fine at subject length.
 */
function pinned(rx: RegExp, kind: Kind): RegExp {
  let c = cache.get(rx);
  if (!c) cache.set(rx, (c = {}));
  return (c[kind] ??=
    kind === 'scan' ? new RegExp(rx.source, `${bare(rx.flags)}g`)
    : kind === 'back' ? new RegExp(`(?:${rx.source})$`, bare(rx.flags))
    : kind === 'forward' ? new RegExp(rx.source, `${bare(rx.flags)}y`)
    : new RegExp(`^(?:${rx.source})$`, bare(rx.flags)));
}

const key = (tag: string, start: number, end: number) => `${tag}\0${start}\0${end}`;

/** Pass zero: every match of every root tag, overlapping ones included. */
function roots(text: string, conf: Compiled, values: Map<string, string>): Row[] {
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

/** The previous chart, laid out by edge: where rows start, where they end, and all of them in order. */
interface Index {
  starts: Map<number, Row[]>;
  ends: Map<number, Row[]>;
  all: Row[];
}
function index(chart: Chart): Index {
  const ix: Index = { starts: new Map(), ends: new Map(), all: [...chart.all()] };
  for (const row of ix.all) {
    for (const [map, at] of [[ix.starts, row[1][0]], [ix.ends, row[1][1]]] as const) {
      const list = map.get(at);
      if (list) list.push(row);
      else map.set(at, [row]);
    }
  }
  return ix;
}

interface Pending {
  rx: RegExp;
  as?: string;
}

/**
 * One search from one row: every way its atoms can be taken, outward from the
 * row's edge, calling `emit` with the extent and the roles of each derivation.
 *
 * ponytail: a depth-first enumeration, exponential in the number of optional
 * atoms of one search; a `*` atom on a search that grows from its own tag makes
 * the chart quadratic in the text. Candidate rows are looked up by edge; a regex
 * atom between two atoms scans every row on its far side. Fine at subject length.
 */
function derive(
  text: string,
  ix: Index,
  values: ReadonlyMap<string, string>,
  search: Search<RegExp>,
  from: Span,
  emit: (lo: number, hi: number, roles: Roles) => void,
): void {
  const forward = search.forward !== undefined;
  const atoms: Atom<RegExp>[] = search.forward ?? search.back ?? [];
  const valueOf = ([tag, [s, e]]: Row) => values.get(key(tag, s, e)) ?? text.slice(s, e);
  const bind = (roles: Roles, as: string | undefined, value: string): Roles => (as === undefined ? roles : { ...roles, [as]: value });

  const go = (i: number, cursor: number, lo: number, hi: number, roles: Roles, pending?: Pending): void => {
    if (i === atoms.length) {
      if (!pending) return emit(lo, hi, roles);
      // A regex atom that is the last one taken: sticky at the cursor going forward, pinned to it going back.
      if (forward) {
        const re = pinned(pending.rx, 'forward');
        re.lastIndex = cursor;
        const m = re.exec(text);
        if (m) emit(lo, cursor + m[0].length, bind(roles, pending.as, m[0]));
      } else {
        const m = pinned(pending.rx, 'back').exec(text.slice(0, cursor));
        if (m) emit(m.index, hi, bind(roles, pending.as, m[0]));
      }
      return;
    }
    const atom = atoms[i];
    if (atom.optional) go(i + 1, cursor, lo, hi, roles, pending);
    if ('rx' in atom) {
      if (!pending) go(i + 1, cursor, lo, hi, roles, { rx: atom.rx, ...(atom.as !== undefined && { as: atom.as }) });
      return; // compile rejects two regex atoms that could meet
    }
    const names = typeof atom.tag === 'string' ? [atom.tag] : atom.tag;
    const wants = (tag: string) => names.includes('*') || names.includes(tag);
    const take = (row: Row, roles: Roles) => {
      const [s, e] = row[1];
      go(i + 1, forward ? e : s, forward ? lo : s, forward ? e : hi, bind(roles, atom.as, valueOf(row)));
    };
    if (!pending) {
      for (const row of (forward ? ix.starts : ix.ends).get(cursor) ?? []) if (wants(row[0])) take(row, roles);
      return;
    }
    // The pending regex spans exactly the gap between the cursor and the row this atom takes.
    const whole = pinned(pending.rx, 'whole');
    for (const row of ix.all) {
      if (!wants(row[0]) || (forward ? row[1][0] < cursor : row[1][1] > cursor)) continue;
      const gap = forward ? text.slice(cursor, row[1][0]) : text.slice(row[1][1], cursor);
      if (whole.test(gap)) take(row, bind(roles, pending.as, gap));
    }
  };
  go(0, forward ? from[1] : from[0], from[0], from[1], {});
}

/** Every row the chart has for `text` under `conf`: complete, neutral, in original coordinates. */
export function find(text: string, conf: Compiled): Chart {
  const { text: s, at } = normalise(text);
  // Role values are computed as rows are accepted and dropped with the call; the chart never holds them.
  const values = new Map<string, string>();
  let chart = Chart.empty(s.length).with(roots(s, conf, values));
  // Searches run in code-unit order of their tag's name, so "first derivation" does not depend on key order.
  const names = Object.keys(conf.tags).sort();

  for (;;) {
    const ix = index(chart);
    const found: Row[] = [];
    for (const tag of names) {
      const def = conf.tags[tag];
      for (const search of def.search ?? []) {
        for (const from of chart.spans(search.from)) {
          derive(s, ix, values, search, from, (lo, hi, roles) => {
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
    const next = chart.with(found);
    if (next.size() === chart.size()) break;
    chart = next;
  }
  return Chart.empty(text.length).with([...chart.all()].map(([tag, [a, b]]): Row => [tag, [at[a], at[b]]]));
}
