# The conf

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

**Alternatives go longest-first.** The scan offers one match per start position, and a match the word guard rejects (one that would start or end inside a word, see [the rules of finding](finding.md)) is not retried shorter, so write `protocollo|prot`, never `prot|protocollo`.

**Compile errors** come back as a list of `{ path, tag, message }`, and `compile` never throws. A tag with any error is left out, every other tag keeps working, and a reference to a left-out tag finds nothing.

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

```output
tags.sku.rx (sku): unknown pattern %{SKU}
tags.sku.resolve (sku): unknown resolver "uper"
tags.price.search[0].from (price): unknown tag "amount"
tags.price.search[0].forward[0].optinal (price): unknown key "optinal"
[ 'cur' ]
```

The other errors it reports: a tag with both or neither of `rx` and `search`, a search with both or neither of `back` and `forward`, a pattern that is not `/source/flags` or that the regex engine rejects, a circular `%{NAME}`, a reserved name declared as a tag or used as a role, a `fate` that is none of the three, a wrong type, an optional outermost atom, and two regex atoms that could meet.

</details>
