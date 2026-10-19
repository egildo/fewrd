# `mount`

`mount`, from `fewrd/playground`, draws the playground into an element of your page: one case at a time, its chart on a character grid, its tree, its gist under a fold, and a live conf editor.

<!-- not run: needs a browser -->
```ts
import { mount, type PlaygroundConf, type PlaygroundCase } from 'fewrd/playground';
```

## Signature

`mount(el, { confs, cases })` returns nothing. `el` is the element to draw into; `confs` maps a name to a `PlaygroundConf`; `cases` is a list of `PlaygroundCase`, shown in that order.

```ts
interface PlaygroundConf {
  conf: unknown;                                  // the conf, as data
  resolvers?: Readonly<Record<string, Resolve>>;  // the functions its tags' `resolve` name
}

interface PlaygroundCase {
  name: string;
  conf: string;     // the key in `confs` this case is found with
  text: string;
  fold?: string[];  // the tags folded when the case is first shown
  gist?: string;    // the gist that fold should give
}
```

## Example

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

## What it draws

- **The bar** stays on screen while you scroll: ‹ and › step through the cases (so do the ← → keys, outside the editor and the menus), `n / 21` says where you are, a menu jumps to any case, grouped by conf, and a switch cycles the theme through auto, light and dark and remembers it.
- **The grid** sets the text in a monospace font, one character to a cell, wrapped at spaces to the width of the page. Every row of the chart is an underline in its tag's colour with a tick at each end, and rows that overlap stack in lanes below the line. Rows the tree did not keep are drawn thinner.
- **The popover.** Hover a band, or Tab to the bands and move along them with ↑ ↓, and a popover above the line gives its tag, its span, its value when it has one, and says when it is a twin or was not kept by the tree. The characters it covers light up, and so does its row in the tree.
- **The gist** comes next: the folded text, the characters it saves, and, when the fold is the case's own, whether it matches the gist the case expects.
- **The tag chips**, one per tag of the conf, the tags this tree holds first. Hovering a chip lights that tag's rows on the grid and in the tree; selecting it keeps it lit, several at once. The eye on the chip folds the tag out of the gist, and the hidden text is struck through on the grid. Tags that are not in this tree are listed after them as plain labels that do nothing. Reset returns to the case's own fold.
- **The tree** is the `dom` of the case, one line per node with its tag, span, `also`, value and text; hovering a line lights its span on the grid.
- **The conf editor** recompiles the conf as you type and finds the case again. From 1700 px wide it is a pane on the left; below that it is a drawer opened from the bar, where a badge counts the errors while it is closed. Broken JSON keeps the last good chart on screen; compile errors are listed with their paths, and the tags that compiled are drawn.

The design, its states and its colour tokens are in [The playground's design](../playground.md).
