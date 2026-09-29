<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/fewrd-logo.svg">
  <img src=".github/fewrd-logo-neg.svg" alt="fewrd" width="380">
</picture>

**Finds what recurs in a string, and keeps every place it found it.**

[![npm](https://img.shields.io/npm/v/fewrd?style=flat-square&color=78C4B6)](https://www.npmjs.com/package/fewrd)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-78C4B6?style=flat-square)
![core: 4 kB gzip](https://img.shields.io/badge/core-4%20kB%20gzip-78C4B6?style=flat-square)
![types: strict](https://img.shields.io/badge/types-strict-78C4B6?style=flat-square)
![tests: 107 passing](https://img.shields.io/badge/tests-107%20passing-78C4B6?style=flat-square)
[![license: MIT](https://img.shields.io/badge/license-MIT-78C4B6?style=flat-square)](LICENSE)

</div>

---

## Why

Your text is hiding treasure: protocol numbers under five different aliases,
dates wedged between dashes, amounts that only count with a `€` stapled on.
fewrd digs it all out and remembers exactly where each piece lives, every
reading of it, the ones that overlap included. It makes no choice among them:
choosing is a second job, and it comes after.

```
normalise → root rows → searches, pass after pass  ⇒  Chart    (depends on text + conf only: cacheable)
```

The rewrite splits what the old engine did in one go. This half **finds**:
`text + conf → Chart`. The other half, still to come, selects one reading from
the chart, builds the tree, and folds away what a reader doesn't need. Until
then fewrd stops at the chart.

## Install

```bash
npm install fewrd
```

```bash
pnpm add fewrd
```

ESM only, zero dependencies, types included. Runs in current Node and in any
current browser or bundler.

## Quick start

Describe what recurs as a **conf**, in JSON. Root tags match a regex; composed
tags are built by searches that grow outward from the rows of another tag:

```json
{
  "version": "shop@1",
  "patterns": { "SKU": "[A-Z]{3}-\\d{4}" },
  "tags": {
    "sku": {
      "resolve": "upper",
      "search": [
        { "from": "sku-code", "back": [{ "tag": "sep", "optional": true }, { "tag": "sku-word", "as": "label" }] }
      ]
    },
    "sku-code": { "rx": "/%{SKU}/iu" },
    "sku-word": { "rx": "/sku|code/iu" },
    "sep": { "rx": "/[\\s:]+/u" }
  }
}
```

Compile it once, then find in any text with it:

```ts
import { compile, find } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { conf, errors } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });

const text = 'Refund approved - SKU: abc-1234 - customer notified';
const chart = find(text, conf);

chart.spans('sku');          // [[18, 31]]   text.slice(18, 31) is 'SKU: abc-1234'
chart.spans('sku-code');     // [[23, 31]]
JSON.stringify(chart);
// {"$":[[51,51]],"^":[[0,0]],"sep":[[6,7],[15,16],[17,18],[21,23],[22,23],[31,32],[33,34],[42,43]],
//  "sku":[[18,31]],"sku-code":[[23,31]],"sku-word":[[18,21]]}
```

The chart holds spans into your string, nothing else. The `sep` rows overlap
(`": "` and `" "` both end at 23) because every match is a row.

## The conf

A conf is JSON, so it diffs, reviews and validates like any config.

| key | what it holds |
|---|---|
| `version` | required; keys a cached chart. Change it whenever a change to the conf can change the chart |
| `patterns` | named regex sources, spliced into others as `%{NAME}` |
| `tags` | required; a name → tag map. Its key order is the priority the second half will use; `find` never reads it |
| `tags.T.rx` | a root tag: a pattern, `"/source/flags"` |
| `tags.T.search` | a composed tag: a list of searches. A tag has exactly one of `rx` and `search` |
| `tags.T.resolve` | the name of a resolver you pass to `compile` |
| `tags.T.weak`, `tags.T.fate` | carried through, read only by the second half (`fate` is `"separator"` or `"connector"`) |
| `search.from` | the tag whose rows the search starts from |
| `search.back` / `search.forward` | exactly one: the atoms, leftward from the row's start or rightward from its end |
| atom | `{ "tag": "name" }`, `{ "tag": ["a", "b"] }` or `{ "rx": "/…/u" }`, with an optional `"as"` (a role name) and `"optional"` |

**Patterns** are regex literals in a string: `"/source/flags"`, and JSON doubles
the backslashes. `%{NAME}` splices in a named pattern as one unit (an `a|b`
inside never leaks out), and named patterns may use others. `%\{` is a literal
`%{`. Named patterns inside a `[…]` character class aren't supported.

**Reserved names.** `^` is the start of the string, `$` its end, `*` any tag.
Use them in atoms; you cannot declare a tag with one of those names, and
`from` names a declared tag.

**Resolvers** are the only code in a conf: a function from `{ value, ...roles }`
to a string, or `null` for "not this tag after all". `value` is the row's own
text; every atom with `as` adds a role, the value of the row it took if that
row's tag has a resolver, its text otherwise. `as` may not be `value`, `^`,
`$` or `*`. Resolvers see the normalised text. Nothing in the JSON is ever
evaluated.

**Alternatives go longest-first.** The scanner offers one match per start
position, and the word guard rejects it without trying a shorter one, so write
`protocollo|prot`, never `prot|protocollo`.

**Errors** come back as `{ path, tag, message }`: an unknown tag in `from` or in
an atom, a tag with both or neither of `rx` and `search`, a search with both or
neither of `back` and `forward`, a bad pattern, an unknown or circular
`%{NAME}`, an unknown resolver, a reserved name declared, a wrong type, an
unknown key (a typo such as `optinal` is an error, not a silent no-op), an
`as` that is reserved, an `optional` outermost atom (the last of `back` or of
`forward`: skipped, it would leave the row ending in glue), and two regex atoms
in a row ("merge them into one pattern"). `compile` never throws. A tag with
any error is left out; every other tag keeps working, in order.

```ts
compile({ version: 'x@1', tags: { sku: { rx: '/%{SKU/iu', resolve: 'uper' } } });
// errors:
//   tags.sku.rx       (sku)  Invalid regular expression: /%{SKU/iu: Incomplete quantifier
//   tags.sku.resolve  (sku)  unknown resolver "uper"
```

## The rules

- **Every match of every root tag is a row.** A tag with `rx` is scanned over
  the whole normalised text. Overlapping matches of the same tag are all rows
  (the scan resumes one position after each match's start). Zero-length
  matches are skipped. A match may not start or end inside a run of letters or
  digits. A root tag with `resolve` keeps only the matches its resolver
  accepts.
- **Searches run from rows.** A search runs once per row of its `from` tag,
  outward from that row's edge: `back` leftward from its start, atoms
  nearest-first; `forward` rightward from its end. It produces a row of its
  own tag, from the leftmost to the rightmost thing it matched, the `from` row
  included.
- **Atoms meet the cursor.** A tag atom takes any row of its tag (or of any
  listed tag, or of any tag for `*`) that meets the cursor: starts there going
  forward, ends there going back. A regex atom is matched against the text
  itself: if another atom follows it, it must match exactly the slice between
  the cursor and the row that atom takes; if it is last, it matches at the
  cursor. `optional` means the sequence is tried with and without the atom.
  Every combination that completes is a derivation, and all are kept. Nothing
  about a match is possessive.
- **Composed rows are filtered like root rows.** A search's tag with `resolve`
  keeps a derivation only if the resolver accepts it, given `{ value, ...roles }`.
  Values are worked out on the way and never stored in the chart.
- **Passes run to a fixpoint.** Pass zero is the root rows. Each later pass
  runs every search against the previous chart only, and adds its rows at
  once. The same tag on the same span is one row, so a pass that adds nothing
  ends the loop. A search may grow from its own tag: that is how repetition is
  written, and it stops when the text runs out.
- **The chart is complete and neutral.** Crossing rows, twins on one span, rows
  inside rows: all kept. Choosing among them is the second half's job. The
  chart depends on the text and the conf only, so cache it by
  `(text, conf.version)`.

Selection, the tree, the fold, and the separator and connector fates are not
here yet: they come with the second half.

## The chart

On the chart of the quick start:

```ts
chart.spans('sep');            // [[6, 7], [15, 16], [17, 18], [21, 23], [22, 23], ...]: sorted by start, then end
chart.has('sku-code', 23, 31); // true
chart.after('sep', 22);        // [22, 23]: the first span of the tag starting at or after 22
chart.before('sep', 22);       // [17, 18]: the last span of the tag ending at or before 22
chart.after('*', 23);          // [23, 31]: '*' means any tag
[...chart.all()];              // every [tag, span], in position order
chart.size();                  // 13: total rows, `^` and `$` included
JSON.stringify(chart);         // plain data...
Chart.from(JSON.parse(json));  // ...and back
```

A chart is a map from tag to its rows, each row a span `[start, end]` into
**your original string**, not the normalised copy `find` matched on. Nothing
else: no values, no roles, no derivations. Its invariants:

- rows sorted by start, then end, one row per `(tag, start, end)`;
- `^` at `(0, 0)` and `$` at `(n, n)` always present, a tag with no rows absent;
- `Chart.from(chart.toJSON())` equals the chart, and the JSON form (tags in
  code-unit order) survives `JSON.stringify` and `JSON.parse` unchanged;
- it is immutable: `chart.with(rows)` returns a new chart and shares the tag
  lists it did not touch.

`rel(a, b)` gives the Allen relation of one span to another (`before`, `meets`,
`overlaps`, `starts`, `during`, `finishes`, `equals` and the inverses). The
text's edges meet the rows that touch them: `rel([0, 0], [0, 5])` is `meets`.

## Playground

`pnpm dev` opens the playground on twenty subjects from two domains, twelve
Italian public-administration ones and eight from a common inbox. One subject
shows at a time: step through them with the big ‹ › buttons or the arrow keys,
the counter between them says where you are.

The subject's text sits on a character grid, a monospace font with every
character exactly one `ch` wide, wrapped every 90 characters. Each row of the
chart is an underline with a small tick at each end, so where it starts and
stops is plain; rows that overlap stack in lanes below the line. Nothing is
labelled: hover a band and a tooltip gives its tag and `(start, end)` while the
characters it covers light up. A row of chips under the drawing is the legend
of tag colours. On the left, the conf of the subject on screen recompiles as
you type and the subject is found again. A mistake in the JSON shows beside the
editor and the drawing stays; compile errors are listed with their paths and
the tags that compiled are drawn. Each domain keeps its own edits.

Or mount it in a page of your own:

```ts
import { mount } from 'fewrd/playground';
import data from './shop.json' with { type: 'json' };

mount(document.getElementById('app')!, {
  confs: { shop: { conf: data, resolvers } },     // named confs, shown and edited as JSON
  cases: [{ name: 'refund', conf: 'shop', text: 'Refund approved - SKU: abc-1234' }],
});
```

The playground injects its own scoped styles, so it needs no stylesheet. It asks
for a monospace font by name (JetBrains Mono, then IBM Plex Mono, then the
system's); `playground/index.html` loads JetBrains Mono from Google Fonts, for
development only, and your page can load whichever it likes. It finds only: no
values, no fold, no tree yet. `fewrd-play`, the old dev-only package under
`play/`, is not updated for the new engine.

## Develop

```bash
pnpm install
pnpm typecheck   # tsc --strict, no emit
pnpm test        # node --test, TypeScript type-stripped: no build
pnpm dev         # the playground, on http://localhost:5577
```

There is no build step in that loop. `pnpm build` (run at publish) bundles the
two public entries with vite and writes their types with `tsc`. The Italian
conf, `confs/it-pa.json`, is tested through its subjects in
`cases/it-pa.json`, the common one, `confs/common.json`, by a small test; the core rules are tested with small synthetic confs. The
rules above are the single source of truth for `find`: a change to what it
returns changes them in the same commit. The design is in
[`specs/rewrite-brief.md`](specs/rewrite-brief.md) and
[`specs/005-chart/`](specs/005-chart/spec.md).

## License

MIT
