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
![tests: 261 passing](https://img.shields.io/badge/tests-261%20passing-78C4B6?style=flat-square)
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

## How it thinks

**The chart chooses nothing.** `find` keeps every row every pattern can produce, overlapping ones included, and it depends on the text and the conf alone. So a chart can be cached by text and conf version, and any number of readings can be built from one.

**The tree is one reading.** `dom` walks the chart's rows in a fixed order, keeps those that do not cross, re-runs each composed row's search to bind its roles, resolves values bottom-up, and fills the gaps with water. No two nodes cross; the leaves cover the text exactly once.

**The fold is a policy plus three fates.** A fold is a function from a node to a boolean. What it hides, the fates tidy up: a connector goes with what it introduced, a bracket empties out, and of the separators left side by side only the strongest survives.

The parts and the boundaries are drawn in [docs/architecture.md](docs/architecture.md); what fewrd is for, and what it deliberately is not, is in [docs/vision.md](docs/vision.md); every christened name is in the [glossary](docs/glossary.md).

## Reference

- [The conf](docs/reference/conf.md): what a conf holds, its reserved names and its compile errors.
- [The rules of finding](docs/reference/finding.md): what `find` does, and the chart it returns.
- [The tree](docs/reference/tree.md): the `Node` type, and how selection makes one reading of the chart.
- [The rules of the fold](docs/reference/fold.md): what `hidden` and `gist` drop, and how the fates tidy the cuts.

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

```output
Refund<span data-tag="sep"> </span>approved<span data-tag="sep"> - </span><span data-tag="sku" data-fold><span data-tag="sku-word" data-fold>SKU</span><span data-tag="sep" data-fold>: </span><span data-tag="sku-code" data-fold>abc-1234</span></span><span data-tag="sep" data-fold> - </span>customer<span data-tag="sep"> </span>notified
```

</details>

## Playground

`pnpm dev` opens the playground on twenty-one cases from two domains, thirteen Italian subjects and eight inbox lines, each found with its own conf (`confs/it-pa.json`, `confs/common.json`). One case shows at a time: the text on a character grid with every row of the chart drawn as an underline in its tag's colour, stacked in lanes where rows overlap; a popover with tag, span and value on hover; the gist; the tags as chips that light their rows on hover, keep them lit on click, and fold with an eye; the tree; and the conf editor, a pane on the left from 1700 px wide and a drawer below that, recompiling as you type with errors listed by path.

Or mount it in a page of your own:

<!-- not run: needs a browser -->
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
pnpm bench <conf-dir> [texts]   # times find and dom apart over a fewrd-play conf folder
```

That loop has no build step. `pnpm build`, run at publish and before running `fewrd-play` from a checkout, bundles the two public entries with vite into `dist/` and writes their types with `tsc`; `dist/` is never committed. The gate for any change is `pnpm typecheck` and `pnpm test`. It is developed on Node 25 and pnpm 10; the loop needs a Node that runs TypeScript files directly. There is no CI: the gate is run locally. One file runs on its own with `node --test test/fold.test.ts`.

**Tests.** The core rules are tested with small synthetic confs, one test per rule (`test/find.test.ts`, `test/dom.test.ts`, `test/fold.test.ts`). The two domain confs are tested through their cases: `test/it-pa.test.ts` and `test/common.test.ts` check the rows the cases must give, and `test/gist.test.ts` checks, for every case, that `gist(dom(text, find(text, conf), conf), fold)` is the gist it carries.

**A domain** is a conf as data, `confs/<name>.json`; its resolvers, `confs/<name>.ts`, which compiles the conf and throws on any compile error; its cases, `cases/<name>.json`, each `{ name, conf, text, fold, gist }`; a test that reads them; and a line in `playground/main.ts`. Adding one never changes `src/`. A conf names its resolvers as strings, so a call-graph tool sees every resolver in `confs/*.ts` as never called; `compile` is what checks those names, and an unknown one is a compile error with a test of its own.

**Documents.** The rules of finding, selection and the fold in [docs/reference/](docs/reference/) are the single source of truth for `find`, `dom`, `hidden` and `gist`: a change to what those return changes those pages in the same branch. Every document follows the [writing style](docs/style.md). Work goes in rounds where the documents move first ([Docs move first](docs/principles.md#docs-move-first)); a round's spec, plan and tasks are written under `specs/` with the speckit skills in `.claude/skills/`. The badges are kept by hand: the test count from `pnpm test`, the size from `dist/index.js` gzipped after `pnpm build`. The design lives in `docs/`: the [vision](docs/vision.md), the [principles](docs/principles.md), the [architecture](docs/architecture.md), the [glossary](docs/glossary.md), the [decisions](docs/decisions/) and the [playground's design](docs/playground.md). The rounds that got here are recorded in `specs/`, starting from the [rewrite brief](specs/rewrite-brief.md).

## License

[MIT](LICENSE) © 2026 Egildo Tagliareni
