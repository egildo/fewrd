<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/fewrd-logo.svg">
  <img src=".github/fewrd-logo-neg.svg" alt="fewrd" width="380">
</picture>

**Finds what recurs in a string, cuts it loose, and gets you the gist in a
few words.**

![dependencies: 0](https://img.shields.io/badge/dependencies-0-78C4B6?style=flat-square)
![types: strict](https://img.shields.io/badge/types-strict-78C4B6?style=flat-square)
![tests: 18 passing](https://img.shields.io/badge/tests-18%20passing-78C4B6?style=flat-square)

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

## See it fold

A real case, unfolded:

> Pec - Prot. n. 0023993 del 23/09/2026 - Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - CUP F84D26000210006 - Trasmissione cronoprogramma procedurale

The same reading, with `protocol` and `cup` folded away:

> Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - Trasmissione cronoprogramma procedurale

No dangling dash where the protocol number used to sit, no orphaned separator
before "Trasmissione" — fewrd decides which separator survives a fold and
which bracket empties out along with what was inside it. Both strings come
from the same `Cuts`; nothing gets re-parsed to produce the second one.

## The pieces

| name | what it is |
|---|---|
| `Recipe` | one pattern: a strict `anchor` (the value), closed lists of `left`/`right` neighbours (label, channel, date…), `requires`, `resolve`, `weak`, `rest` |
| `Book` | recipes in priority order, plus a `version` that keys a cached reading |
| `Mention` | one recognised thing: its `extent`, its `parts` in text order, a canonical `value`, and its `parent` when nested |
| `Leaf` | one piece of the partition: `text`, `sep`, `open`, `close`, or a mention's `part` |
| `Cuts` | the reading: `text`, `mentions`, `leaves`. The leaves cover the text in order, with no gap and no overlap. Survives a JSON round-trip |
| `Fold` | the caller's policy: which mentions a condensed view drops |

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

## Use

```ts
import { read, gist, html } from 'fewrd';
import { itPa } from 'fewrd/recipes/it-pa';

const cuts = read(subject, itPa);
const fold = (m) => ['protocol', 'cup'].includes(m.entity);
gist(cuts, fold);  // plain text
html(cuts, fold);  // tagged, both views
```

## Try it

```bash
pnpm dev   # playground on 5577 — every case in playground/cases.ts, folded and whole
```

## Recipes

`recipes/it-pa.ts` is the first book: Italian public administration codes
(protocol, CIG, CUP, chapter, amount, date, capitals tags, «con oggetto»).
`playground/cases.ts` holds the cases. The tests read those same cases.

## Work

```bash
pnpm test        # node --test, type stripping, no build
pnpm typecheck
pnpm dev         # playground on 5577
pnpm build       # dist/ for package consumers (runs automatically on publish)
```
