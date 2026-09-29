// The chart: every row of every tag, as spans into the original string, and
// nothing else. Immutable; `with` copies only the tag lists it touches.

export type Span = readonly [start: number, end: number];
export type AllenRelation =
  | 'before' | 'meets' | 'overlaps' | 'starts' | 'during' | 'finishes' | 'equals'
  | 'after' | 'met-by' | 'overlapped-by' | 'started-by' | 'contains' | 'finished-by';

type Row = readonly [tag: string, span: Span];

const byPosition = (a: Span, b: Span) => a[0] - b[0] || a[1] - b[1];
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const NONE: readonly Span[] = [];

/**
 * ponytail: `has` and `before` scan a tag's sorted list and `after` binary-searches
 * it; `*` visits every tag. Enough at subject length; index by position if subjects grow.
 */
export class Chart {
  readonly #rows: ReadonlyMap<string, readonly Span[]>;
  readonly #n: number;

  private constructor(rows: ReadonlyMap<string, readonly Span[]>, n: number) {
    this.#rows = rows;
    this.#n = n;
  }

  /** A chart of a text of length `n`: only `^` (0,0) and `$` (n,n). */
  static empty(n: number): Chart {
    return new Chart(
      new Map<string, readonly Span[]>([
        ['^', [[0, 0]]],
        ['$', [[n, n]]],
      ]),
      n,
    );
  }

  /** The inverse of `toJSON`. The text length is where `$` sits (else the furthest row end). */
  static from(json: Record<string, readonly Span[]>): Chart {
    const rows: Row[] = Object.entries(json).flatMap(([tag, spans]) => spans.map((s): Row => [tag, [s[0], s[1]]]));
    const n = json['$']?.[0]?.[1] ?? Math.max(0, ...rows.map(([, s]) => s[1]));
    return Chart.empty(n).with(rows);
  }

  toJSON(): Record<string, Span[]> {
    const out: Record<string, Span[]> = {};
    for (const tag of [...this.#rows.keys()].sort(byName)) out[tag] = this.#rows.get(tag)!.map((s): Span => [s[0], s[1]]);
    return out;
  }

  /** A new chart with these rows added; triples already present are ignored, untouched tag lists are shared. */
  with(rows: Iterable<Row>): Chart {
    const groups = new Map<string, Span[]>();
    for (const [tag, span] of rows) {
      const g = groups.get(tag);
      if (g) g.push(span);
      else groups.set(tag, [span]);
    }
    let next: Map<string, readonly Span[]> | undefined;
    for (const [tag, incoming] of groups) {
      const old = this.#rows.get(tag) ?? NONE;
      const merged = [...old];
      for (const s of incoming) if (!merged.some((m) => m[0] === s[0] && m[1] === s[1])) merged.push(s);
      if (merged.length === old.length) continue;
      (next ??= new Map(this.#rows)).set(tag, merged.sort(byPosition));
    }
    return next ? new Chart(next, this.#n) : this;
  }

  /** Total rows, `^` and `$` included: the fixpoint test. */
  size(): number {
    let total = 0;
    for (const list of this.#rows.values()) total += list.length;
    return total;
  }

  #lists(tag: string): Iterable<readonly Span[]> {
    if (tag === '*') return this.#rows.values();
    const list = this.#rows.get(tag);
    return list ? [list] : [];
  }

  has(tag: string, start: number, end: number): boolean {
    for (const list of this.#lists(tag)) if (list.some((s) => s[0] === start && s[1] === end)) return true;
    return false;
  }

  /** The first span of `tag` with start ≥ `pos`. */
  after(tag: string, pos: number): Span | undefined {
    let best: Span | undefined;
    for (const list of this.#lists(tag)) {
      let lo = 0;
      let hi = list.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid][0] < pos) lo = mid + 1;
        else hi = mid;
      }
      if (lo < list.length && (!best || byPosition(list[lo], best) < 0)) best = list[lo];
    }
    return best;
  }

  /** The last span of `tag` (latest in position order) with end ≤ `pos`. */
  before(tag: string, pos: number): Span | undefined {
    let best: Span | undefined;
    for (const list of this.#lists(tag)) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i][1] > pos) continue;
        if (!best || byPosition(list[i], best) > 0) best = list[i];
        break;
      }
    }
    return best;
  }

  /** The tag's rows, sorted; empty for an absent tag. */
  spans(tag: string): readonly Span[] {
    return this.#rows.get(tag) ?? NONE;
  }

  /** Every row of every tag in position order: start, then end, then tag name. */
  all(): Iterable<Row> {
    const rows: Row[] = [];
    for (const [tag, list] of this.#rows) for (const s of list) rows.push([tag, s]);
    return rows.sort((a, b) => byPosition(a[1], b[1]) || byName(a[0], b[0]));
  }
}

/**
 * The Allen relation of `a` to `b`. Tested in this order, so for zero-length
 * spans the text's edges meet the rows that touch them.
 */
export function rel(a: Span, b: Span): AllenRelation {
  const [as, ae] = a;
  const [bs, be] = b;
  if (as === bs && ae === be) return 'equals';
  if (ae < bs) return 'before';
  if (be < as) return 'after';
  if (ae === bs) return 'meets';
  if (be === as) return 'met-by';
  if (as < bs) return ae < be ? 'overlaps' : ae === be ? 'finished-by' : 'contains';
  if (as === bs) return ae < be ? 'starts' : 'started-by';
  return ae < be ? 'during' : ae === be ? 'finishes' : 'overlapped-by';
}
