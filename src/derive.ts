// The search matcher, shared by `find` (which runs it over the whole chart) and
// `dom` (which re-runs it inside a chosen row's span to bind its roles).
// Matching runs on the normalised copy.

import type { Edges, Row, Span } from './chart.ts';
import type { Atom, Search } from './conf.ts';

export type { Row };
export type Roles = Readonly<Record<string, string>>;
/** One thing a derivation took: a row for a tag atom, the matched text for a regex atom (kept only when it has `as`). */
export type Step = { row: Row; as?: string } | { text: string; as: string };

type Kind = 'scan' | 'back' | 'forward' | 'whole';
const bare = (flags: string) => flags.replace(/[gyd]/g, '');
const cache = new WeakMap<RegExp, Partial<Record<Kind, RegExp>>>();
/**
 * A regex pinned for one job, cached per RegExp: `scan` global, `back` anchored at
 * the end of what it is run on, `forward` sticky, `whole` anchored at both ends.
 * ponytail: `back` is run on the prefix, so it rescans it (O(n) per attempt) and a
 * lookahead in it cannot see past the cursor; fine at subject length.
 */
export function pinned(rx: RegExp, kind: Kind): RegExp {
  let c = cache.get(rx);
  if (!c) cache.set(rx, (c = {}));
  return (c[kind] ??=
    kind === 'scan' ? new RegExp(rx.source, `${bare(rx.flags)}g`)
    : kind === 'back' ? new RegExp(`(?:${rx.source})$`, bare(rx.flags))
    : kind === 'forward' ? new RegExp(rx.source, `${bare(rx.flags)}y`)
    : new RegExp(`^(?:${rx.source})$`, bare(rx.flags)));
}

/** The rows of a skip's stop tags, by start with the furthest end so far, and by end with the nearest start from there on. */
type Stops = { byStart: Span[]; maxEnd: number[]; byEnd: Span[]; minStart: number[] };
const stopCache = new WeakMap<Edges, Map<string, Stops>>();
/**
 * Stop tags are root tags, complete before any search runs, so the index is built
 * once per chart (and per row's inside, in dom).
 */
function stops(ix: Edges, tags: readonly string[]): Stops {
  let byTags = stopCache.get(ix);
  if (!byTags) stopCache.set(ix, (byTags = new Map()));
  const key = tags.join('\0');
  let st = byTags.get(key);
  if (!st) {
    const spans = ix.all.filter((r) => tags.includes(r[0])).map((r) => r[1]);
    const byStart = [...spans].sort((x, y) => x[0] - y[0]);
    const byEnd = [...spans].sort((x, y) => x[1] - y[1]);
    const maxEnd = [-Infinity];
    for (const [, e] of byStart) maxEnd.push(Math.max(maxEnd[maxEnd.length - 1], e));
    const minStart = new Array<number>(byEnd.length + 1).fill(Infinity);
    for (let i = byEnd.length - 1; i >= 0; i--) minStart[i] = Math.min(minStart[i + 1], byEnd[i][0]);
    byTags.set(key, (st = { byStart, maxEnd, byEnd, minStart }));
  }
  return st;
}
/** The first index whose value is at least `v` (`gt`: more than `v`). */
function bound(list: Span[], side: 0 | 1, v: number, gt = false): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (gt ? list[mid][side] <= v : list[mid][side] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
/** Where the row after a skip may start (forward) or end (back): from the cursor to the nearest stop row; empty when one crosses the cursor. */
function reach(st: Stops, cursor: number, forward: boolean): [number, number] {
  if (forward) {
    const i = bound(st.byStart, 0, cursor);
    if (st.maxEnd[i] > cursor) return [cursor, cursor - 1];
    return [cursor, i < st.byStart.length ? st.byStart[i][0] : Number.MAX_SAFE_INTEGER];
  }
  const i = bound(st.byEnd, 1, cursor, true);
  if (st.minStart[i] < cursor) return [cursor + 1, cursor];
  return [i > 0 ? st.byEnd[i - 1][1] : 0, cursor];
}

interface Pending {
  rx: RegExp;
  as?: string;
  stop?: readonly string[];
}

/**
 * One search from one row: every way its atoms can be taken, outward from the
 * row's edge, calling `emit` with the extent, the roles and the steps of each
 * derivation (the `from` row first). `valueOf` is the value a role takes from a row.
 *
 * ponytail: a depth-first enumeration, exponential in the number of optional
 * atoms of one search; a `*` atom on a search that grows from its own tag makes
 * the chart quadratic in the text. Candidate rows are looked up by edge; a regex
 * atom between two atoms scans every row on its far side. Fine at subject length.
 */
export function derive(
  text: string,
  ix: Edges,
  valueOf: (row: Row) => string,
  search: Search<RegExp>,
  from: Row,
  emit: (lo: number, hi: number, roles: Roles, steps: readonly Step[]) => void,
  outer: Edges = ix,
): void {
  /** What a same atom repeats: the text of the row of that tag ending where `from` starts, or nothing. `outer` holds it in dom, where `ix` is one row's inside. */
  const repeat = (tag: string) => {
    const row = outer.ends.get(from[1][0])?.find((r) => r[0] === tag);
    return row ? text.slice(row[1][0], row[1][1]) : '';
  };
  const forward = search.forward !== undefined;
  const atoms: Atom<RegExp>[] = search.forward ?? search.back ?? [];
  const bind = (roles: Roles, as: string | undefined, value: string): Roles => (as === undefined ? roles : { ...roles, [as]: value });
  const grab = (steps: readonly Step[], as: string | undefined, matched: string): readonly Step[] =>
    as === undefined ? steps : [...steps, { text: matched, as }];

  const go = (i: number, cursor: number, lo: number, hi: number, roles: Roles, steps: readonly Step[], pending?: Pending): void => {
    if (i === atoms.length) {
      if (!pending) return emit(lo, hi, roles, steps);
      // A regex atom that is the last one taken: sticky at the cursor going forward, pinned to it going back.
      if (forward) {
        const re = pinned(pending.rx, 'forward');
        re.lastIndex = cursor;
        const m = re.exec(text);
        if (m) emit(lo, cursor + m[0].length, bind(roles, pending.as, m[0]), grab(steps, pending.as, m[0]));
      } else {
        const m = pinned(pending.rx, 'back').exec(text.slice(0, cursor));
        if (m) emit(m.index, hi, bind(roles, pending.as, m[0]), grab(steps, pending.as, m[0]));
      }
      return;
    }
    const atom = atoms[i];
    if ('same' in atom) {
      // A stretch of exactly that text at the cursor, taken like a regex atom's match.
      const want = repeat(atom.same);
      const [a, b] = forward ? [cursor, cursor + want.length] : [cursor - want.length, cursor];
      if (a < 0 || text.slice(a, b) !== want) return;
      return go(i + 1, forward ? b : a, forward ? lo : a, forward ? b : hi, bind(roles, atom.as, want), grab(steps, atom.as, want));
    }
    if (atom.optional) go(i + 1, cursor, lo, hi, roles, steps, pending);
    if ('rx' in atom) {
      if (!pending) go(i + 1, cursor, lo, hi, roles, steps, { rx: atom.rx, ...(atom.as !== undefined && { as: atom.as }), ...(atom.stop && { stop: atom.stop }) });
      return; // compile rejects two regex atoms that could meet
    }
    const names = typeof atom.tag === 'string' ? [atom.tag] : atom.tag;
    // `*` is any row with some text in it: never `^`, `$` or a flag, which only mark a place.
    const wants = ([tag, [a, b]]: Row) => names.includes(tag) || (a < b && names.includes('*'));
    const take = (row: Row, roles: Roles, steps: readonly Step[]) => {
      const [s, e] = row[1];
      go(i + 1, forward ? e : s, forward ? lo : s, forward ? e : hi, bind(roles, atom.as, valueOf(row)), [...steps, { row, ...(atom.as !== undefined && { as: atom.as }) }]);
    };
    if (!pending) {
      for (const row of (forward ? ix.starts : ix.ends).get(cursor) ?? []) if (wants(row)) take(row, roles, steps);
      return;
    }
    // The pending regex spans exactly the gap between the cursor and the row this atom takes.
    const whole = pinned(pending.rx, 'whole');
    const fits = (row: Row) => {
      const gap = forward ? text.slice(cursor, row[1][0]) : text.slice(row[1][1], cursor);
      if (whole.test(gap)) take(row, bind(roles, pending.as, gap), grab(steps, pending.as, gap));
    };
    if (pending.stop) {
      // A skip's gap may not take any part of a stop row, so only the rows up to the nearest one can end it.
      // Never past the rows there are: in dom, `ix` holds only the rows inside one row. `ix.all` is sorted by start.
      const [a, b] = reach(stops(ix, pending.stop), cursor, forward);
      if (!ix.all.length) return;
      const [lo, hi] = forward ? [a, Math.min(b, ix.all[ix.all.length - 1][1][0])] : [Math.max(a, ix.all[0][1][0]), b];
      for (let p = lo; p <= hi; p++) for (const row of (forward ? ix.starts : ix.ends).get(p) ?? []) if (wants(row)) fits(row);
      return;
    }
    for (const row of ix.all) if (wants(row) && (forward ? row[1][0] >= cursor : row[1][1] <= cursor)) fits(row);
  };
  go(0, forward ? from[1][1] : from[1][0], from[1][0], from[1][1], {}, [{ row: from }]);
}
