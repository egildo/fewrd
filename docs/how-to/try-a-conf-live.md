# Try a conf live

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

The design, its states and its colour tokens are in [docs/playground.md](../playground.md).

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

`--port` (`-p`) picks the port, 4747 by default; `--open` (`-o`) opens the browser; `--fewrd` serves another `fewrd` build's `dist/`. It listens on 127.0.0.1 only and writes nothing, so edits made in the page stay in the page. It is not published to npm yet. From a checkout of this repository, after `pnpm build`, the same command is `node play/cli.ts path/to/folder --fewrd dist --open`; [play/README.md](../../play/README.md) has the details.
