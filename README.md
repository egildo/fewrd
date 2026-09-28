<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/fewrd-logo.svg">
  <img src=".github/fewrd-logo-neg.svg" alt="fewrd" width="380">
</picture>

**Finds what recurs in a string, cuts it loose, and gets you the gist in a
few words.**

[![npm](https://img.shields.io/npm/v/fewrd?style=flat-square&color=78C4B6)](https://www.npmjs.com/package/fewrd)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-78C4B6?style=flat-square)
![core: 4 kB gzip](https://img.shields.io/badge/core-4%20kB%20gzip-78C4B6?style=flat-square)
![types: strict](https://img.shields.io/badge/types-strict-78C4B6?style=flat-square)
![tests: 52 passing](https://img.shields.io/badge/tests-52%20passing-78C4B6?style=flat-square)
[![license: MIT](https://img.shields.io/badge/license-MIT-78C4B6?style=flat-square)](LICENSE)

</div>

---

## Why

Your text is hiding treasure: protocol numbers under five different aliases,
dates wedged between dashes, amounts that only count with a `€` stapled on.
fewrd digs it all out in one pass, remembers exactly where each piece lives,
then folds away whatever a reader doesn't need — no regex spaghetti, no
stray commas left behind.

```
normalise → anchors → expand → merge → segment  ⇒  Cuts      (depends on text + book only: cacheable)
                                    render(Cuts, fold)  ⇒  gist | tagged html   (always dynamic)
```

## Install

```bash
npm install fewrd
```

```bash
pnpm add fewrd
```

ESM only, zero dependencies, types included. Runs in Node 18+ and any current
browser or bundler.

## Quick start

Describe what recurs as a **book** of recipes, in JSON:

```json
{
  "$schema": "./node_modules/fewrd/book.schema.json",
  "version": "shop@1",
  "defs": { "SKU": "[A-Z]{3}-\\d{4}" },
  "recipes": [
    {
      "entity": "sku",
      "anchor": "/%{SKU}/iu",
      "left": [{ "part": "label", "rx": "/(?:sku|code)\\s*:?\\s*/iu" }],
      "resolve": "upper"
    }
  ]
}
```

Compile it once, then read any text with it:

```ts
import { compile, gist, html, read } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { book, errors } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });

const cuts = read('Refund approved - SKU: abc-1234 - customer notified', book);
cuts.mentions[0].value;                 // 'ABC-1234'
gist(cuts, (m) => m.entity === 'sku');  // 'Refund approved - customer notified'
html(cuts, (m) => m.entity === 'sku');  // both views in one markup, see Rendering
```

## See it fold

A real Italian public-administration subject, unfolded:

> Pec - Prot. n. 0023993 del 23/09/2026 - Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - CUP F84D26000210006 - Trasmissione cronoprogramma procedurale

The same reading, with `protocol` and `cup` folded away:

> Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - Trasmissione cronoprogramma procedurale

No dangling dash where the protocol number used to sit, no orphaned separator
before "Trasmissione" — fewrd decides which separator survives a fold and
which bracket empties out along with what was inside it. Both strings come
from the same `Cuts`; nothing gets re-parsed to produce the second one.

Or an inbox line, with the `Re:`/`Fwd:` chain and the ticket key folded:

> Re: Fwd: Invoice INV-2026-0042 for $1,250.00 due 2026-10-15
>
> Invoice for $1,250.00 due 2026-10-15

…while the money still reads as `1250.00 USD` and the date as `2026-10-15`.

## The pieces

| name | what it is |
|---|---|
| `BookData` | a book as plain JSON: patterns as `"/source/flags"`, shared `defs` spliced in as `%{NAME}`, `resolve` by name |
| `compile` | `BookData` + your named resolvers → a `Book`, plus a list of errors. Never throws |
| `Recipe` | one pattern: a strict `anchor` (the value), closed lists of `left`/`right` neighbours (label, channel, date…), `requires`, `resolve`, `weak`, `rest`, `glued` |
| `Book` | recipes in priority order, plus a `version` that keys a cached reading |
| `Mention` | one recognised thing: its `extent`, its `parts` in text order, a canonical `value`, and its `parent` when nested |
| `Leaf` | one piece of the partition: `text`, `sep`, `open`, `close`, or a mention's `part` |
| `Cuts` | the reading: `text`, `mentions`, `leaves`. The leaves cover the text in order, with no gap and no overlap. Survives a JSON round-trip |
| `Fold` | your policy: which mentions a condensed view drops |

## The rules

- **Anchors are strict and neighbours are generous.** A neighbour's regex is
  pinned to the edge it grows from. Each neighbour attaches at most once, and
  after each attachment the list is tried again from the top.
- **Nothing cuts a word.** An anchor or a neighbour may not start or end
  inside a run of letters or digits (opt out with `glued`).
- **Longest extent wins, then priority.** `weak` recipes only fill gaps.
- **A `rest` recipe runs to the end of its level**, and what follows its
  anchor is read again inside it. Folding it folds everything it holds.
- **Separator fate.** Separators between two surviving leaves stay untouched
  when no fold fell among them. Otherwise only the strongest survives
  (`-` > `;` > `:` > `,` > space), and none survives at an edge, after an
  opening bracket or before closing punctuation. Brackets a fold empties go
  with it.
- **One HTML, both views.** `html()` emits every leaf and marks what the
  condensed view drops with `data-fold`. The whole switch is
  `.condensed [data-fold] { display: none }`.

## Books as data

A book is JSON, so it diffs, reviews and validates like any config. Point its
`$schema` at `./node_modules/fewrd/book.schema.json` (relative to the file)
and your editor flags typos, wrong types and missing fields as you type.

| key | what it holds |
|---|---|
| `version` | required; change it whenever a recipe change can change output |
| `defs` | named pattern fragments, source only: `{ "DATE": "\\d{4}-\\d{2}-\\d{2}" }` |
| `recipes` | required; in priority order |
| `recipes[].entity` | required; what the recipe recognises |
| `recipes[].anchor` | required; a pattern, the value itself |
| `recipes[].left` / `right` | neighbours: `{ "part": "label", "rx": "/…/iu" }` |
| `recipes[].requires` | parts that must attach, e.g. `["currency"]` |
| `recipes[].resolve` | the name of a resolver you pass to `compile` |
| `recipes[].weak` / `rest` / `glued` | flags, see The rules |

**Patterns** are regex literals in a string: `"/source/flags"` — JSON doubles
the backslashes. `%{NAME}` splices in a fragment from `defs` as one unit (an
`a|b` inside never leaks out) and fragments may use other fragments. `%\{` is
a literal `%{`. Fragments inside a `[…]` character class aren't supported.

**Resolvers** are the only code in a book: functions from the attached parts'
text to a canonical value, or `null` for "not this entity after all". Nothing
in the JSON is ever evaluated.

```ts
const resolvers = {
  upper: (p) => p.value.toUpperCase(),
  // a bare 1.2.3 is too often something else: a version needs its v or a label
  version: (p) => (p.label || p.value.startsWith('v') ? p.value.replace(/^v/, '') : null),
};
```

**Errors** come back as `{ path, recipe, entity, message }` — a bad regex or
flag, an unknown or circular fragment, an unknown resolver, a wrong type, a
typo'd key. A recipe with any error is left out; every other recipe keeps
working, in order.

```ts
compile({ version: 'x@1', recipes: [{ entity: 'sku', anchor: '/%{SKU/iu', resolve: 'uper' }] });
// errors:
//   recipes[0].anchor  (sku)  Invalid regular expression: /%{SKU/iu: Incomplete quantifier
//   recipes[0].resolve (sku)  unknown resolver "uper"
```

A `Book` can also be written directly in TypeScript, with `RegExp`s and
functions in place of strings and names; `read` doesn't care which.

## Rendering

```ts
import { gist, html, shown, type Fold } from 'fewrd';

const fold: Fold = (m) => ['protocol', 'cup'].includes(m.entity);
gist(cuts, fold);   // the condensed view as plain text
html(cuts, fold);   // every leaf, tagged; what the condensed view drops carries data-fold
shown(cuts, fold);  // one boolean per leaf, for your own renderer
```

Mentions come out as `<span data-entity data-mention>`, parts as
`<span data-part>`, separators as `<span data-sep>`, nested as the mentions
nest. Toggle between the full and condensed view with one class:

```css
.condensed [data-fold] { display: none; }
```

## Playground

Try your own book in the browser — the same playground this repo uses, with
your recipes and your cases:

```ts
import { mount } from 'fewrd/playground';
import data from './shop.json' with { type: 'json' };

mount(document.getElementById('app')!, {
  data,                                  // edit the JSON live; errors show inline
  resolvers,                             // your named resolvers
  cases: [{ name: 'refund', text: 'Refund approved - SKU: abc-1234 - customer notified' }],
  fold: (m) => m.entity === 'sku',       // optional: which entities start folded
});
```

Every edit recompiles the book and re-reads every case; invalid JSON keeps the
last good result on screen, and reset brings the original back. Pass
`book` instead of `data`/`resolvers` for a read-only view of a compiled
`Book`. The playground injects its own scoped styles, so it needs no
stylesheet; serve it with whatever dev server you already use.

## Demo books

Two books live in this repo as working examples and starting points. They are
not part of the package — copy what you need.

- [`recipes/common`](recipes/common.json) — what recurs in any inbox, chat or
  ticket: URLs, emails, phones, IPv4, ISO dates and times, money in three
  formats, percentages, versions, ticket keys, @handles, #hashtags, `Re:`/`Fwd:`
  chains and quoted replies. Its [resolvers](recipes/common.ts) mostly say
  no: a bare `1.2.3`, an octet over 255, month 13, a phone too short.
- [`recipes/it-pa`](recipes/it-pa.json) — Italian public administration
  codes: protocol, CIG, CUP, chapter, amount, date, capitals tags,
  «con oggetto».

Their cases are in [`playground/cases.ts`](playground/cases.ts); the tests read
those same cases.

## Develop

```bash
pnpm install
pnpm dev         # playground on 5577, both demo books, JSON editable live
pnpm test        # node --test, type stripping, no build
pnpm typecheck
pnpm build       # minified dist/ + types, what npm gets (runs on publish)
```

## License

[MIT](LICENSE) © 2026 Egildo Tagliareni
