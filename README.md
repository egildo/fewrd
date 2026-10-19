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
![tests: 262 passing](https://img.shields.io/badge/tests-262%20passing-78C4B6?style=flat-square)
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

ESM only, zero dependencies, types included. Runs in current Node and in any current browser or bundler. Coming from 0.3.0, the book-and-recipes API: the [changelog](CHANGELOG.md) says what changed and how to upgrade.

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

```output
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

```output
SKU: ABC-1234
{ tag: 'sku-word', start: 18, end: 21, attrs: {}, children: [] }
Refund approved - customer notified
Refund approved - SKU: abc-1234 - customer notified
```

`value` is what the `upper` resolver made of the row, and `attrs.label` is the node the search took for the atom it called `label`. Folding `sku` dropped the labelled code and one of the two dashes that were left side by side; folding nothing gives the text back.

## Documentation

- **How-to guides:** [render the tree as HTML](docs/how-to/render-html.md); [try a conf live](docs/how-to/try-a-conf-live.md), in the playground or with `fewrd-play`.
- **Reference:** [the conf](docs/reference/conf.md), [the rules of finding](docs/reference/finding.md), [the tree](docs/reference/tree.md), [the rules of the fold](docs/reference/fold.md) and the [glossary](docs/glossary.md).
- **Explanation:** [how fewrd works](docs/how-it-works.md), the [vision](docs/vision.md) and the [architecture](docs/architecture.md).

Every page is listed in the [map](docs/README.md). To work on fewrd itself, read [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Egildo Tagliareni
