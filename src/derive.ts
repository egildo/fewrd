// The search matcher, shared by `find` (which runs it over the whole chart) and
// `dom` (which re-runs it inside a chosen row's span to bind its roles).
// Matching runs on the normalised copy.

import type { Edges, Row } from './chart.ts';
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
): void {
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
    const { stop } = pending;
    /** A skip's gap may not take any part of a row of its stop tags. ponytail: scans every row; fine at subject length. */
    const clear = (a: number, b: number) => !stop || !ix.all.some(([t, [s, e]]) => s < b && e > a && stop.includes(t));
    for (const row of ix.all) {
      if (!wants(row) || (forward ? row[1][0] < cursor : row[1][1] > cursor)) continue;
      const gap = forward ? text.slice(cursor, row[1][0]) : text.slice(row[1][1], cursor);
      if (whole.test(gap) && (forward ? clear(cursor, row[1][0]) : clear(row[1][1], cursor))) take(row, bind(roles, pending.as, gap), grab(steps, pending.as, gap));
    }
  };
  go(0, forward ? from[1][1] : from[1][0], from[1][0], from[1][1], {}, [{ row: from }]);
}
