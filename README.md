<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/fewrd-logo.svg">
  <img src=".github/fewrd-logo-neg.svg" alt="fewrd" width="380">
</picture>

**Finds what recurs in a string, and lets a reader fold it away.**

[![npm](https://img.shields.io/npm/v/fewrd?style=flat-square&color=78C4B6)](https://www.npmjs.com/package/fewrd)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-78C4B6?style=flat-square)
![core: 6.5 kB gzip](https://img.shields.io/badge/core-6.5%20kB%20gzip-78C4B6?style=flat-square)
![types: strict](https://img.shields.io/badge/types-strict-78C4B6?style=flat-square)
![tests: 258 passing](https://img.shields.io/badge/tests-258%20passing-78C4B6?style=flat-square)
[![license: MIT](https://img.shields.io/badge/license-MIT-78C4B6?style=flat-square)](LICENSE)

</div>

---

A subject line from an Italian public administration, as filed:

> PEC: Prot. n. 0018842 del 12/09/2026 - Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa

The same line, with the protocol reference folded away:

> Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa

Nothing was thrown away. The protocol is still there as `0018842` and the date as `2026-09-12`, the word `del` that joined the date on went with it, and no dash was left dangling. An inbox line works the same way, with the `Re:`/`Fwd:` chain and the ticket key folded:

> Re: Fwd: Invoice INV-2026-0042 for $1,250.00 due 2026-10-15
>
> Invoice for $1,250.00 due 2026-10-15

while the amount reads as `1250.00 USD` and the due date as `2026-10-15`.

You describe what recurs in a **conf**, a JSON file of named patterns that a domain expert can read and edit. fewrd does the rest in two halves:

```
text + conf  →  find  →  chart      every row every pattern can see, nothing chosen   (cacheable)
chart        →  dom   →  tree       one reading: nodes, values, roles, water
tree + fold  →  gist  →  text       what the reader keeps, punctuation tidied
```

Rendering the tree is yours. fewrd stops at data.

## Install

```bash
npm install fewrd
```

ESM only, zero dependencies, types included. Runs in current Node and in any current browser or bundler.

> [!IMPORTANT]
> This README describes 1.0.0, a rewrite. Until it is on npm, `npm install fewrd` still gets 0.3.0, the older book-and-recipes API; the [changelog](CHANGELOG.md) says what changed and how to upgrade. Meanwhile, build this repository (`pnpm install && pnpm build`) and depend on the checkout.

## Quick start

A conf names **tags**, the kinds of thing to find. A **root tag** is found by a regular expression; a **composed tag** is built by a **search** that starts from the finds of another tag and grows outward. This one finds a product code, and a composed `sku` that is the code with the word before it:

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

Compile it once, with the functions it names, then find in any text:

```ts
import { compile, find, dom, gist } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { conf, errors } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });
console.log(errors);

const text = 'Refund approved - SKU: abc-1234 - customer notified';
const chart = find(text, conf);
console.log(chart.spans('sku'));
console.log(JSON.stringify(chart));
```

```
[]
[ [ 18, 31 ] ]
{"$":[[51,51]],"^":[[0,0]],"sep":[[6,7],[15,18],[16,18],[17,18],[21,23],[22,23],[31,34],[32,34],[33,34],[42,43]],"sku":[[18,31]],"sku-code":[[23,31]],"sku-word":[[18,21]]}
```

The chart is a map from each tag to its **rows**, each row a span `[start, end]` into your string: `text.slice(18, 31)` is `SKU: abc-1234`. It holds every row, including ones that overlap: the three `sep` rows ending at 18 are ` - `, `- ` and ` `. Now choose one reading, and fold it:

```ts
const doc = dom(text, chart, conf);
const sku = doc.children.find((n) => n.tag === 'sku')!;
console.log(sku.value);
console.log(sku.attrs.label);

console.log(gist(doc, (n) => n.tag === 'sku'));
console.log(gist(doc, () => false));
```

```
SKU: ABC-1234
{ tag: 'sku-word', start: 18, end: 21, attrs: {}, children: [] }
Refund approved - customer notified
Refund approved - SKU: abc-1234 - customer notified
```

`value` is what the `upper` resolver made of the row, and `attrs.label` is the node the search took for the atom it called `label`. Folding `sku` dropped the labelled code and one of the two dashes that were left side by side; folding nothing gives the text back.

## How it thinks

**The chart chooses nothing.** `find` keeps every row every pattern can produce, overlapping ones included, and it depends on the text and the conf alone. So a chart can be cached by text and conf version, and any number of readings can be built from one.

**The tree is one reading.** `dom` walks the chart's rows in a fixed order, keeps those that do not cross, re-runs each composed row's search to bind its roles, resolves values bottom-up, and fills the gaps with water. No two nodes cross; the leaves cover the text exactly once.

**The fold is a policy plus three fates.** A fold is a function from a node to a boolean. What it hides, the fates tidy up: a connector goes with what it introduced, a bracket empties out, and of the separators left side by side only the strongest survives.

The parts and the boundaries are drawn in [docs/architecture.md](docs/architecture.md); what fewrd is for, and what it deliberately is not, is in [docs/vision.md](docs/vision.md); every christened name is in the [glossary](docs/glossary.md).

## The conf

A conf is JSON, so it diffs, reviews and validates like any config. Its top level has three keys:

| key | holds |
|---|---|
| `version` | Required. Keys a cached chart: change it whenever a change to the conf can change what `find` returns. |
| `patterns` | Named regular-expression sources, spliced into other patterns as `%{NAME}`. |
| `tags` | Required. A map from tag name to tag. Its key order is a priority, read in one place only (below). |

**Patterns** are regex literals in a string, `"/source/flags"`, and JSON doubles the backslashes. `%{NAME}` splices in a named pattern as one group, so an `a|b` inside never leaks out, and named patterns may use each other. `%\{` is a literal `%{`. A named pattern inside a `[…]` character class is not supported.

**A tag** has exactly one of `rx` and `search`. With `rx` it is a root tag, found by that pattern. With `search`, a list of searches, it is composed, as `protocol` is in the Italian conf (`confs/it-pa.json`):

```json
"serial":    { "rx": "/\\d{7}(?:\\/\\d{4})?/u" },
"prot-word": { "rx": "/numero\\s+protocollo|protocollo|prot\\.?|rif\\.?/iu" },
"protocol":  { "resolve": "protocol", "search": [
  { "from": "serial", "back": [
    { "tag": "sep", "optional": true }, { "tag": "num-word", "optional": true }, { "tag": "sep", "optional": true },
    { "tag": "prot-word", "as": "label" }
  ] },
  { "from": "protocol", "back": [ { "tag": "sep", "optional": true }, { "tag": "channel", "as": "channel" } ] }
] }
```

**A search** starts from each row of its `from` tag and walks outward through a list of **atoms**, either `back` (leftward from the row's start, nearest atom first) or `forward` (rightward from its end), exactly one of the two. The second search above grows a `protocol` from a `protocol`: that is how a channel in front of an already labelled number joins it, and how repetition is written in general.

**An atom** is one of:

| atom | takes |
|---|---|
| `{ "tag": "sep" }` | a row of that tag |
| `{ "tag": ["w", "n"] }` | a row of any tag in the list |
| `{ "rx": "/…/u" }` | a stretch of the text itself |

Either kind may carry `"as": "name"`, which binds what the atom took to a **role** of that name, and `"optional": true`, which lets the search try the sequence with and without the atom. The outermost atom (the last in the list) may not be optional, and two regex atoms may not meet (merge them into one pattern).

**Reserved names.** `^` is the start of the text, a row at `(0,0)`; `$` is its end, a row at `(n,n)`; `*` is any tag. All three are usable in atoms and none can be declared. `doc` and `text` are the tree's own tags (its root, and the text no row covers): they cannot be declared either, nor used in atoms. A role may not be called `value`, `^`, `$` or `*`.

**`resolve`** names a function you pass to `compile`, the only code a conf ever reaches. A **resolver** gets `{ value, ...roles }`, where `value` is the row's own text and each role is the value of the row its atom took if that row's tag resolves, its text otherwise. It returns a string, the row's value, or `null` for "not this tag after all". Resolvers see the normalised text (NFKC, dashes as `-`, straight quotes, every run of whitespace as one space), and they must be pure, since both halves ask them. Nothing in the JSON is evaluated.

**`weak`** and **`fate`** are read only when `dom` chooses. A `weak` tag's rows fill only what the others leave. `fate` marks a tag the fold treats specially:

| fate | what it marks | what the fold does |
|---|---|---|
| `separator` | glue between words: spaces, dashes, commas | keeps the strongest one where it cut |
| `connector` | a word that joins what follows it on: `del`, `sul`, `per il` | folds it when what it joins folds |
| `bracket` | a pair of delimiters and what they hold, `"paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }` | empties it when everything inside goes |

**Key order is priority.** When two rows tie in `dom`, the tag whose key comes earlier in `tags` wins. `find` never reads the order: reorder the keys and the chart is the same.

**Alternatives go longest-first.** The scan offers one match per start position, and a match the word guard rejects (one that would start or end inside a word, see the rules of finding) is not retried shorter, so write `protocollo|prot`, never `prot|protocollo`.

**Compile errors** come back as a list of `{ path, tag, message }`, and `compile` never throws. A tag with any error is left out, every other tag keeps working, and a reference to a left-out tag simply finds nothing.

<details>
<summary>What the errors look like</summary>

```ts
import { compile } from 'fewrd';

const { conf, errors } = compile({
  version: 'shop@2',
  tags: {
    sku: { rx: '/%{SKU}/iu', resolve: 'uper' },
    price: { search: [{ from: 'amount', forward: [{ tag: 'cur', optinal: true }] }] },
    cur: { rx: '/€/u' },
  },
});
for (const e of errors) console.log(`${e.path} (${e.tag}): ${e.message}`);
console.log(Object.keys(conf.tags));
```

```
tags.sku.rx (sku): unknown pattern %{SKU}
tags.sku.resolve (sku): unknown resolver "uper"
tags.price.search[0].from (price): unknown tag "amount"
tags.price.search[0].forward[0].optinal (price): unknown key "optinal"
[ 'cur' ]
```

The other errors it reports: a tag with both or neither of `rx` and `search`, a search with both or neither of `back` and `forward`, a pattern that is not `/source/flags` or that the regex engine rejects, a circular `%{NAME}`, a reserved name declared as a tag or used as a role, a `fate` that is none of the three, a wrong type, an optional outermost atom, and two regex atoms that could meet.

</details>

## The rules of finding

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

Why the chart chooses nothing, and why the passes need no declared order, are recorded in [chart-complete-and-neutral](docs/decisions/chart-complete-and-neutral.md) and [passes-from-search-order](docs/decisions/passes-from-search-order.md).

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

```
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

## The tree

`dom(text, chart, conf)` takes the chart and returns one reading of it, a tree of plain objects:

```ts
type Node = {
  tag: string;                                    // a conf tag, or 'doc' (the root) or 'text' (water)
  start: number; end: number;                     // into your original string
  value?: string;                                 // the resolver's answer, only on tags that resolve
  attrs: Record<string, Node | string>;           // roles bound by `as`
  also?: string[];                                // tags of twins folded into this node
  fate?: 'separator' | 'connector' | 'bracket';   // the tag's fate, copied from the conf
  text?: string;                                  // your original string, on `doc` only
  children: Node[];                               // by containment, in text order, water included
};
```

The tree of the quick start, printed one node per line:

```
doc (0,51) "Refund approved - SKU: abc-1234 - customer notified"
  text (0,6) "Refund"
  sep (6,7) " "
  text (7,15) "approved"
  sep (15,18) " - "
  sku (18,31) "SKU: abc-1234" value="SKU: ABC-1234" label=sku-word(18,21)
    sku-word (18,21) "SKU"
    sep (21,23) ": "
    sku-code (23,31) "abc-1234"
  sep (31,34) " - "
  text (34,42) "customer"
  sep (42,43) " "
  text (43,51) "notified"
```

<details>
<summary>The few lines that printed it</summary>

```ts
import type { Node } from 'fewrd';

const show = (n: Node, depth = 0): string[] => [
  `${'  '.repeat(depth)}${n.tag} (${n.start},${n.end}) ${JSON.stringify(text.slice(n.start, n.end))}` +
    (n.value !== undefined ? ` value=${JSON.stringify(n.value)}` : '') +
    (n.also ? ` also=${n.also}` : '') +
    Object.entries(n.attrs).map(([as, v]) => ` ${as}=${typeof v === 'string' ? JSON.stringify(v) : `${v.tag}(${v.start},${v.end})`}`).join(''),
  ...n.children.flatMap((c) => show(c, depth + 1)),
];
console.log(show(doc).join('\n'));
```

</details>

The `text` nodes are **water**, the stretches of text that no node of the conf's tags covers.

**Selection** turns the chart's many readings into one. It walks the rows (all but `^` and `$`) in one fixed order and takes or drops each, and it depends on the chart, the conf and the key order of `tags`, nothing else. The examples below give a conf fragment and a text, then the children of `doc`: `›` opens a node's own children, `last=w(4,5)` is a role holding a node, and `currency="€ "` one holding text.

**Order.** Every non-weak row comes before every weak one; within each, the longer span first, then the tag whose key comes earlier in `tags`, then the earlier start.

```
ab: /a b/, bcd: /b c d/            on "a b c d"     →  text "a ", bcd (2,7)            (longer wins)
ab: /a b/, bc: /b c/               on "a b c"       →  ab (0,3), text " c"             (key order breaks the tie)
cde: /c d e/ weak, bc: /b c/       on "a b c d e"   →  text "a ", bc (2,5), text " d e" (weak waits)
```

**Take or drop.** A row that **crosses** a chosen row (overlaps it without either containing the other) is dropped. A row inside a chosen row of the same tag is dropped too: the outer wins, which is what clears away the suffix matches of the scan (`num` on `1.5` has rows `(0,3)` and `(2,3)`) and the partial rows of a self-grown search. A row with exactly a chosen row's span is a twin: its tag joins that node's `also`. Any other row is chosen.

```
num: /\d+(?:\.\d+)?/, digit: /\d/          on "1.5"    →  num (0,3) › digit (0,1), text ".", digit (2,3)
code: /[A-Z]\d{3}/, ref: /[A-Z]\d+/        on "A123"   →  code (0,4) also=ref
```

**Forcing.** When a composed row is chosen, its search is run again inside its own span with the same matcher `find` used, and every row that derivation took is chosen with it, at once. The derivation kept is the first, in the order `find` enumerates them (the tag's searches in order, `from` rows by position, an optional atom tried skipped before taken), that spans the row exactly, that its resolver accepts, and none of whose rows crosses a chosen row; with none, the composed row is dropped. Forced composed rows are forced the same way, down the tree.

A forced row of the composed row's own tag is not a node: its own derivation is forced in its place, so the outermost row of a self-grown tag absorbs its chain.

```
list: from w, forward [sp, w]; from list, forward [sp, w as last]     on "a b c"
  →  list (0,5) last=w(4,5) › w "a", sp " ", w "b", sp " ", w "c"
```

**Roles and values.** A composed node's `attrs[as]` is the node its kept derivation took for that atom, or the text a regex atom matched, or the text of an absorbed row. `value` is on nodes whose tag resolves, worked out bottom-up with the same resolvers on the same normalised text. A resolver that refuses in `dom` what it accepted in `find` is a bug, and `dom` throws naming the tag and the span.

```
price: from n, back [rx /€ ?/ as currency]     on "€ 5"   →  price (0,3) currency="€ " › text "€ ", n (2,3)
```

**Water.** The chosen rows nest by containment, and every stretch of text no chosen row covers becomes water. So the **leaves** (nodes with no children) cover the text exactly once, in order, and joining them gives the text back; no two nodes cross. The root is `doc`, spanning the whole text and carrying it in `text`, and each node carries its tag's `fate`, so the tree is all the fold needs: a tree that went through `JSON.stringify` and back folds the same.

`dom` throws when the chart holds a tag the conf does not declare (a chart of another conf) or a row that does not fall on a boundary of the text (a chart of another text). The decisions behind forcing are in [forcing-absorbs-own-tag](docs/decisions/forcing-absorbs-own-tag.md) and [outer-wins-same-tag](docs/decisions/outer-wins-same-tag.md).

## The rules of the fold

A **fold** is a function from a node to a boolean, the reader's policy: `true` for a node to fold away. `hidden(doc, fold)` returns the set of nodes the condensed view drops, and `gist(doc, fold)` the text of the leaves that are not in it. The policy is never asked about `doc`. Four rules apply, in this order, each seeing what the ones before it hid. The examples use this conf:

```json
{
  "version": "note@1",
  "tags": {
    "ref": { "search": [{ "from": "num", "back": [{ "tag": "sep", "optional": true }, { "tag": "lbl", "as": "label" }] }] },
    "num": { "rx": "/#\\d+/u" },
    "lbl": { "rx": "/ref|n\\./iu" },
    "paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" },
    "conn": { "rx": "/del|sul|per\\s+il/iu", "fate": "connector" },
    "sep": { "rx": "/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u", "fate": "separator" }
  }
}
```

**A node folds when the policy says so, or when an ancestor folds.** Every leaf under it is hidden.

```
"Nota ref #12 - fine"   fold ref  →  "Nota - fine"
"Nota ref #12 - fine"   fold num  →  "Nota ref - fine"
```

**A connector follows its right.** A leaf with the connector fate is hidden when the next leaf to its right that is not a separator is hidden, and stays otherwise. Connectors are decided right to left, so a connector before a hidden connector goes too.

```
"Nota del ref #12 - fine"   fold ref  →  "Nota - fine"
"Nota del ref #12 - fine"   fold num  →  "Nota del ref - fine"
```

**A bracket empties out.** A node with the bracket fate is hidden, with all it holds, when every leaf inside it that is not a separator is hidden and at least one is. Its **delimiters**, its first and last child when each is water exactly one character long (the `(` and the `)`), do not count and go with it. Brackets are decided innermost first.

```
"Fornitura toner (ref #12) - saldo"           fold ref  →  "Fornitura toner - saldo"
"Fornitura toner (ref #12 urgente) - saldo"   fold ref  →  "Fornitura toner (urgente) - saldo"
```

**The strongest separator survives.** Take each run of separators and hidden leaves between two surviving leaves that are not separators. If nothing in the run was hidden, its separators stay untouched, at the edges of the text too. Otherwise only the strongest survives, and a separator is as strong as the strongest mark it contains: `-` over `;` over `:` over `,` over a plain space, the leftmost on a tie. Not even that one survives at an edge of the text, right after the opening delimiter of a bracket that stays, or before closing punctuation (`.` `,` `;` `:` `!` `?` `)` `]` `}`).

```
"Nota, #12 - fine"   fold num  →  "Nota - fine"          "#12 - fine"        fold num  →  "fine"
"a; #1, b"           fold num  →  "a; b"                 "Nota (#12 fine)"   fold num  →  "Nota (fine)"
```

Folding nothing gives the text back, surrounding spaces included. Why a fate rides on the node and not in the conf is in [fates-on-the-node](docs/decisions/fates-on-the-node.md); how connectors became tags is in [connectors-are-tags-with-a-fate](docs/decisions/connectors-are-tags-with-a-fate.md).

## Rendering it yourself

fewrd stops at the tree. Both views from one tree take a few lines of yours: `hidden` says which nodes the condensed view drops, and CSS does the switch.

```ts
import { hidden, type Fold, type Node } from 'fewrd';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function html(doc: Node, fold: Fold): string {
  const gone = hidden(doc, fold);
  const text = doc.text!;
  const render = (n: Node): string => {
    const inner = n.children.length ? n.children.map(render).join('') : esc(text.slice(n.start, n.end));
    if (n.tag === 'text' && !gone.has(n)) return inner;
    return `<span data-tag="${n.tag}"${gone.has(n) ? ' data-fold' : ''}>${inner}</span>`;
  };
  return doc.children.map(render).join('');
}

console.log(html(doc, (n) => n.tag === 'sku'));
```

```css
.condensed [data-fold] { display: none }
```

With the class `condensed` on the container the reader sees `Refund approved - customer notified`; without it, the whole text.

<details>
<summary>What it prints on the quick start's tree</summary>

```
Refund<span data-tag="sep"> </span>approved<span data-tag="sep"> - </span><span data-tag="sku" data-fold><span data-tag="sku-word" data-fold>SKU</span><span data-tag="sep" data-fold>: </span><span data-tag="sku-code" data-fold>abc-1234</span></span><span data-tag="sep" data-fold> - </span>customer<span data-tag="sep"> </span>notified
```

</details>

## Playground

`pnpm dev` opens the playground on twenty-one cases from two domains, thirteen Italian subjects and eight inbox lines, each found with its own conf (`confs/it-pa.json`, `confs/common.json`). One case shows at a time: the text on a character grid with every row of the chart drawn as an underline in its tag's colour, stacked in lanes where rows overlap; a popover with tag, span and value on hover; the gist; the tags as chips that light their rows on hover, keep them lit on click, and fold with an eye; the tree; and the conf editor, a pane on the left from 1700 px wide and a drawer below that, recompiling as you type with errors listed by path.

Or mount it in a page of your own:

```ts
import { mount } from 'fewrd/playground';
import data from './shop.json' with { type: 'json' };

mount(document.getElementById('app')!, {
  confs: { shop: { conf: data, resolvers: { upper: (p) => p.value.toUpperCase() } } },
  cases: [{ name: 'refund', conf: 'shop', text: 'Refund approved - SKU: abc-1234 - customer notified', fold: ['sku'], gist: 'Refund approved - customer notified' }],
});
```

`confs` are named confs, as data, with their resolvers; every case names the conf it is found with, and may carry the `fold` it opens with and the `gist` that fold should give. The playground injects its own scoped styles and needs no stylesheet. It names Inter, JetBrains Mono and Material Symbols Rounded first and falls back to system fonts and text glyphs; `playground/index.html` loads them from Google Fonts for development only.

<details>
<summary>Every control, in detail</summary>

- **The bar** stays on screen while you scroll: ‹ and › step through the cases (so do the ← → keys, outside the editor and the menus), `n / 21` says where you are, a menu jumps to any case, grouped by conf, and a switch cycles the theme through auto, light and dark and remembers it.
- **The grid** sets the text in a monospace font, one character to a cell, wrapped at spaces to the width of the page. Every row of the chart is an underline in its tag's colour with a tick at each end, and rows that overlap stack in lanes below the line. Rows the tree did not keep are drawn thinner.
- **The popover.** Hover a band, or Tab to the bands and move along them with ↑ ↓, and a popover above the line gives its tag, its span, its value when it has one, and says when it is a twin or was not kept by the tree. The characters it covers light up, and so does its row in the tree.
- **The gist** comes next: the folded text, the characters it saves, and, when the fold is the case's own, whether it matches the gist the case expects.
- **The tag chips**, one per tag of the conf, the tags this tree holds first. Hovering a chip lights that tag's rows on the grid and in the tree; a click keeps it lit, several at once. The eye on the chip folds the tag out of the gist, and the hidden text is struck through on the grid. Tags that are not in this tree are listed after them as plain labels that do nothing. Reset returns to the case's own fold.
- **The tree** is the `dom` of the case, one line per node with its tag, span, `also`, value and text; hovering a line lights its span on the grid.
- **The conf editor** recompiles the conf as you type and finds the case again. From 1700 px wide it is a pane on the left; below that it is a drawer opened from the bar, where a badge counts the errors while it is closed. Broken JSON keeps the last good chart on screen; compile errors are listed with their paths, and the tags that compiled are drawn.

The design, its states and its colour tokens are in [docs/playground.md](docs/playground.md).

</details>

## fewrd-play

`fewrd-play`, the dev-only package under `play/`, opens a folder of your own in the same playground, served from the `fewrd` your project has installed:

```
path/to/folder/
  conf.json          the conf, as data
  cases.json         [{ "name": "refund", "text": "…", "fold": ["sku"], "gist": "…" }] (optional)
  cases.local.json   more cases, such as real texts kept out of git (optional)
  resolvers.ts       export const resolvers = { … }, or a default export (optional)
```

```bash
fewrd-play path/to/folder --open
```

`--port` (`-p`) picks the port, 4747 by default; `--open` (`-o`) opens the browser; `--fewrd` serves another `fewrd` build's `dist/`. It listens on 127.0.0.1 only and writes nothing, so edits made in the page stay in the page. It is not published to npm yet. From a checkout of this repository, after `pnpm build`, the same command is `node play/cli.ts path/to/folder --fewrd dist --open`; [play/README.md](play/README.md) has the details.

## Develop

```bash
pnpm install
pnpm typecheck   # tsc --strict, no emit
pnpm test        # node --test, TypeScript type-stripped: no build
pnpm dev         # the playground, on http://localhost:5577
```

That loop has no build step. `pnpm build`, run at publish and before running `fewrd-play` from a checkout, bundles the two public entries with vite into `dist/` and writes their types with `tsc`; `dist/` is never committed. The gate for any change is `pnpm typecheck` and `pnpm test`. It is developed on Node 25 and pnpm 10; the loop needs a Node that runs TypeScript files directly. There is no CI: the gate is run locally. One file runs on its own with `node --test test/fold.test.ts`.

**Tests.** The core rules are tested with small synthetic confs, one test per rule (`test/find.test.ts`, `test/dom.test.ts`, `test/fold.test.ts`). The two domain confs are tested through their cases: `test/it-pa.test.ts` and `test/common.test.ts` check the rows the cases must give, and `test/gist.test.ts` checks, for every case, that `gist(dom(text, find(text, conf), conf), fold)` is the gist it carries.

**A domain** is a conf as data, `confs/<name>.json`; its resolvers, `confs/<name>.ts`, which compiles the conf and throws on any compile error; its cases, `cases/<name>.json`, each `{ name, conf, text, fold, gist }`; a test that reads them; and a line in `playground/main.ts`. Adding one never changes `src/`. A conf names its resolvers as strings, so a call-graph tool sees every resolver in `confs/*.ts` as never called; `compile` is what checks those names, and an unknown one is a compile error with a test of its own.

**Documents.** The rules of finding, selection (under The tree) and the fold above are the single source of truth for `find`, `dom`, `hidden` and `gist`: a change to what those return changes these sections in the same branch. Work goes in rounds where the documents move first ([Docs move first](docs/principles.md#docs-move-first)); a round's spec, plan and tasks are written under `specs/` with the speckit skills in `.claude/skills/`. The badges are kept by hand: the test count from `pnpm test`, the size from `dist/index.js` gzipped after `pnpm build`. The design lives in `docs/`: the [vision](docs/vision.md), the [principles](docs/principles.md), the [architecture](docs/architecture.md), the [glossary](docs/glossary.md), the [decisions](docs/decisions/) and the [playground's design](docs/playground.md). The rounds that got here are recorded in `specs/`, starting from the [rewrite brief](specs/rewrite-brief.md).

## License

[MIT](LICENSE) © 2026 Egildo Tagliareni
