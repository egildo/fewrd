// find(text, conf) → Chart: root rows, then searches run from rows in passes
// until a pass adds nothing. Matching runs on the normalised copy; every span is
// mapped back to the original once, at the end.

import { Chart } from './chart.ts';
import type { Conf, Resolve } from './conf.ts';
import { derive, index, pinned, type Row } from './derive.ts';
import { normalise } from './normalise.ts';

type Compiled = Conf<RegExp, Resolve>;

const WORD = /[\p{L}\p{N}]/u;
const isWord = (ch: string | undefined) => ch !== undefined && WORD.test(ch);
/** A match may not start inside a word: its first char is a word char and so is the one before. */
const cutsWordAtStart = (s: string, start: number) => isWord(s[start]) && isWord(s[start - 1]);
/** …nor end inside one. */
const cutsWordAtEnd = (s: string, end: number) => isWord(s[end - 1]) && isWord(s[end]);

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

/** Every row the chart has for `text` under `conf`: complete, neutral, in original coordinates. */
export function find(text: string, conf: Compiled): Chart {
  const { text: s, at } = normalise(text);
  // Role values are computed as rows are accepted and dropped with the call; the chart never holds them.
  const values = new Map<string, string>();
  let chart = Chart.empty(s.length).with(roots(s, conf, values));
  // Searches run in code-unit order of their tag's name, so "first derivation" does not depend on key order.
  const names = Object.keys(conf.tags).sort();
  const valueOf = ([tag, [a, b]]: Row) => values.get(key(tag, a, b)) ?? s.slice(a, b);

  for (;;) {
    const ix = index(chart.all());
    const found: Row[] = [];
    for (const tag of names) {
      const def = conf.tags[tag];
      for (const search of def.search ?? []) {
        for (const span of chart.spans(search.from)) {
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
    const next = chart.with(found);
    if (next.size() === chart.size()) break;
    chart = next;
  }
  return Chart.empty(text.length).with([...chart.all()].map(([tag, [a, b]]): Row => [tag, [at[a], at[b]]]));
}
