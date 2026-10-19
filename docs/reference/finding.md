# The rules of finding

These six rules are the whole of what `find(text, conf)` does. It matches on a normalised copy of the text (NFKC, every dash as `-`, straight quotes, every run of whitespace as one space), so a pattern can say `-` and mean any dash, and it maps every span back to your string once, at the end.

Each example gives a conf fragment and a text, then the rows it yields (without `^` and `$`). The fragments are shorthand: `from n, back [sp optional, cur]` stands for `{ "from": "n", "back": [{ "tag": "sp", "optional": true }, { "tag": "cur" }] }`, `rx /…/` for a regex atom, and `as x` for a role. The root tags the fragments lean on are `n` `/\d+/`, `w` `/[a-z]+/`, `sp` a single space, `cur` `/€/` (`/[€$]/` where both signs appear), `num` `/#\d+/`, `lbl` `/ref/` and `said` `/said:/`.

**Every match of every root tag is a row.** A root tag's pattern is scanned over the whole text, and the scan resumes one code point after each match's start, so overlapping matches of one tag are all rows. Zero-length matches are skipped, a match may not start or end inside a run of letters or digits (the **word guard**), and a root tag with `resolve` keeps only the matches its resolver accepts.

```
n: /\d+/        on "12 345 x9"   →  n (0,2) (3,6)             ("45" and "9" would cut a word)
sep: /[ -]+/    on "a - b"       →  sep (1,4) (2,4) (3,4)
```

**Searches run from rows.** A search runs once per row of its `from` tag, outward from that row's edge, and yields a row of its own tag spanning everything it took, the `from` row included.

```
price: from n, back [sp optional, cur]      on "€ 5 and €7"
                                             →  price (0,3) (8,10)
```

**Atoms meet the cursor.** The **cursor** is the edge the search has reached. A tag atom takes a row that meets it: starts there going forward, ends there going back. A regex atom matches the text: between two atoms it must match exactly the gap up to the row the next atom takes, and as the last atom it matches at the cursor. Every way the atoms can be taken is a **derivation**, and all of them are kept: nothing is possessive.

```
quote: from said, forward [rx /.+/ as body, $]     on "Ann said: see you"   →  quote (4,17)
ref: from num, back [sp optional, lbl]             on "ref #1 ref#2"        →  ref (0,6) (7,12)
```

**Composed rows are filtered like root rows.** A composed tag with `resolve` keeps a derivation only if its resolver accepts `{ value, ...roles }`. Values are worked out on the way and never stored in the chart.

```
price: resolve euro, from n, back [cur as cur]     on "€5 $6"   →  price (0,2)
  with euro = (p) => (p.cur === '€' ? p.value : null)
```

**Passes run to a fixpoint.** Pass zero is the root rows. Each later **pass** runs every search against the chart of the pass before, and adds what it found at once. The same tag on the same span is one row, so the loop ends at the **fixpoint**, the first pass that adds nothing. A search may grow from its own tag, and that is how repetition is written.

```
list: from n, forward [sp, n]; from list, forward [sp, n]     on "1 2 3"
                                             →  list (0,3) (0,5) (2,5)
```

**The chart is complete and neutral.** Rows that cross, **twins** (two tags on one span) and rows inside rows are all kept. Choosing among them is the job of `dom`. The chart depends on the text and the conf only.

```
ab: /a b/, bc: /b c/, code: /[A-Z]\d{3}/, ref: /[A-Z]\d+/     on "a b c A123"
                                             →  ab (0,3)  bc (2,5)  code (6,10)  ref (6,10)
```

Why the chart chooses nothing, and why the passes need no declared order, are recorded in [chart-complete-and-neutral](../decisions/chart-complete-and-neutral.md) and [passes-from-search-order](../decisions/passes-from-search-order.md).

## The chart

A chart is a `Chart`, a map from tag to its rows, and nothing else: no values, no roles, no derivations. It keeps these promises:

- each tag's rows are sorted by start, then end, one row per tag and span;
- `^` at `(0,0)` and `$` at `(n,n)` are always there, and a tag with no rows is absent;
- every span points into your original string, not into the normalised copy `find` matched on;
- it is immutable: `chart.with(rows)` returns a new chart and shares the tag lists it did not touch;
- `Chart.from(chart.toJSON())` is the same chart, and the JSON form (tags in code-unit order) survives `JSON.stringify` and `JSON.parse` unchanged.

Because it depends on the text and the conf only, you can cache a chart by the text and `conf.version`, and build any number of trees from it. It answers a few questions:

| query | answers |
|---|---|
| `has(tag, start, end)` | whether that row is in the chart |
| `after(tag, pos)`, `before(tag, pos)` | the first span of the tag starting at or after `pos`; the last one ending at or before it. `*` stands for any tag, as in atoms |
| `spans(tag)`, `all()`, `size()` | one tag's rows; every row in position order; how many rows there are, `^` and `$` included |
| `edges()` | every row laid out by where it starts and where it ends, the question the matcher asks. `edges(rows)` does the same for any subset |
| `with(rows)`, `toJSON()`, `Chart.from(json)` | a new chart with rows added; the plain form; the chart back from it |
| `rel(a, b)` | the **Allen relation** of one span to another: one of thirteen names for how two intervals sit (`before`, `meets`, `overlaps`, `starts`, `during`, `finishes`, `equals` and their inverses). The text's edges meet the rows that touch them |

<details>
<summary>On the chart of the quick start</summary>

The [quick start](../../README.md#quick-start)'s conf and text, found:

```json
{
  "version": "shop@1",
  "patterns": {
    "SKU": "[A-Z]{3}-\\d{4}",
    "SEP": "(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+"
  },
  "tags": {
    "sku": {
      "resolve": "upper",
      "search": [
        { "from": "sku-code", "back": [{ "tag": "sep", "optional": true }, { "tag": "sku-word", "as": "label" }] }
      ]
    },
    "sku-code": { "rx": "/%{SKU}/iu" },
    "sku-word": { "rx": "/sku|code/iu" },
    "sep": { "rx": "/%{SEP}/u", "fate": "separator" }
  }
}
```

```ts
import { compile, find } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { conf } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });
const text = 'Refund approved - SKU: abc-1234 - customer notified';
const chart = find(text, conf);
```

Then:

```ts
import { Chart, rel } from 'fewrd';

console.log(chart.has('sku-code', 23, 31));
console.log(chart.after('sep', 22));
console.log(chart.before('sep', 22));
console.log(chart.after('*', 23));
console.log(chart.size());
console.log([...chart.all()].slice(0, 4));
console.log(chart.edges().ends.get(18));
const json = JSON.stringify(chart);
console.log(JSON.stringify(Chart.from(JSON.parse(json))) === json);
console.log(rel([18, 31], [23, 31]), rel([15, 18], [18, 31]), rel([0, 0], [0, 6]));
```

```output
true
[ 22, 23 ]
[ 17, 18 ]
[ 23, 31 ]
15
[
  [ '^', [ 0, 0 ] ],
  [ 'sep', [ 6, 7 ] ],
  [ 'sep', [ 15, 18 ] ],
  [ 'sep', [ 16, 18 ] ]
]
[ [ 'sep', [ 15, 18 ] ], [ 'sep', [ 16, 18 ] ], [ 'sep', [ 17, 18 ] ] ]
true
finished-by meets meets
```

</details>
