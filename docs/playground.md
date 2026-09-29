# The playground's design

The playground is where a conf author sees what a conf does to real text: every row of the chart on the characters it covers, the tree `dom` chose, and the gist under a fold. This is its design as it stands after three rounds of review in September 2026; how to open and use it is in the [README](../README.md#playground), and the code is `src/playground.ts` with its geometry in `src/grid.ts`.

## Core choices

**The case is the page.** One case shows at a time. A sticky bar holds the conf button (below 1700 px), the word fewrd, ‹, `n / 21`, ›, a jump menu grouped by conf, and a theme switch. ← and → step through the cases unless focus is in a text field or a menu.

**A span is a distance.** The text sits on a character grid in JetBrains Mono, ligatures off, one character to a `1ch` cell, wrapped at spaces to as many columns as the card holds, measured in the grid's own font. Monospace is used only where positions must be legible, the grid and the conf editor; everything else is Inter, with tabular figures for spans.

**Rows are underlines.** Every chart row except `^` and `$` is a 5 px underline in its tag's colour, with a small tick at each end, so where it starts and stops is plain. Rows that overlap stack in lanes under the line, each row on the first lane with room. Nothing is labelled until asked.

**Solid lines only.** A row the tree did not keep is drawn thinner, 3 px in the same slot, never dashed. Hidden text is struck through in grey and its bands fade to a quarter.

**Output first.** Under the grid come the gist, then the tag chips, then the tree. The conf editor is out of the reading column: a pane at the widest layout, a drawer otherwise.

**Tree and grid are one thing.** Hovering a band lights its tree row; hovering a tree row washes its span on the grid.

**Chips are the interaction surface.** One chip per tag, which both lights the tag's rows and, through its eye, folds it. There is no checkbox and no separate legend.

**Delivered as one module.** The CSS is a string `mount` injects once, scoped under `.fewrd-pg`, because `fewrd/playground` is mounted by pages that load no stylesheet. Inter, JetBrains Mono and ten Material Symbols Rounded icons come from Google Fonts in `playground/index.html`, for development only; every stack falls back to system fonts, and every icon to a text glyph (‹ › ✓ ▾ ◐ ☀ ☾ {} ◉ ◌) until the icon font has really loaded.

## Layout at three widths

| width | bar | conf editor | columns | tree |
|---|---|---|---|---|
| below 720 px | no name, theme icon without its label, smaller counter | drawer | one; grid at 14 px on a 22 px line | collapsed |
| 720 to 1699 px | full | drawer | one, up to 1400 px wide | open |
| from 1700 px | full, no conf button | pane on the left, 38%, full height under the bar | two: the editor, then the reading column | open |

The tree's open state follows the width until the reader toggles it, and the reader's choice stands until the width crosses 720 px again.

**The drawer** is the same pane: fixed, full height under the sticky bar, `min(34rem, 100vw - 40px)` wide, sliding in from the left in 200 ms. The bar's `{}` button opens and closes it; Escape and a click on the scrim close it. Opening moves focus to the editor, closing by Escape returns it to the button. While it is closed the button carries the error count, or `!` for broken JSON. Crossing 1700 px closes it and docks the pane.

## A band

| state | what shows |
|---|---|
| rest | 5 px, the tag's colour, ticks at both ends |
| not in the tree | 3 px in the same slot |
| hidden by the fold | faded to .25 |
| hovered or focused | a soft ring of its own hue, the characters it covers tinted, its tree row lit, the popover open |
| lit by a chip | a soft ring, the characters tinted at a lower alpha |
| another tag is lit | faded to .45 (.18 if hidden) |

Bands are keyboard-reachable with one tab stop: Tab reaches the first (or the last one focused), and ↑ ↓ Home End move along them in reading order.

## A chip

| state | what shows |
|---|---|
| rest | pill, swatch, tag name, eye at the right |
| hover or keyboard focus | border in the tag's hue; its bands, characters and tree rows lit while it lasts |
| kept lit (clicked, `aria-pressed`) | filled with the hue at 16%; the same lighting, kept; several tags at once |
| folded (eye pressed) | name struck through and muted, the eye crossed out; independent of kept lit |
| inert (tag not in this tree) | a plain muted label after "not in this tree": no border, no focus, no eye, no hover |

The chips of tags in the tree come first, in conf order. Reset appears once the fold differs from the case's own, and returns to it. Folds and kept-lit tags are remembered per case until the page reloads; conf edits per conf likewise.

## The popover

- It shows the swatch and the tag, the span as `(start, end)`, the value when the row is a node with one, and a note when the row is a twin ("twin of x") or was not kept ("not kept by the tree").
- It is fixed-position, centred on the band piece, clamped 8 px from the viewport edges.
- It sits above the text line, never over the characters it describes. When that would run under the sticky bar, it goes below the last lane of the line. A 10 px arrow points at the band's centre.
- It follows scroll and resize while open, and goes on leave, blur and every redraw.

## States and words

- No rows: "Nothing found in this text with this conf."
- Otherwise, under the grid: "n rows in m lanes. Hover a band, or Tab to the bands and use ↑ ↓, to read it.", plus "Thin bands are rows the tree did not keep." when some are.
- Nothing left after folding: "(nothing left)", muted.
- The gist's meta: "51 → 35 characters", and when the fold is the case's own and the case has a gist, "matches the case's gist" (with a check) or "differs from the case's gist" (the expected gist in its tooltip).
- Broken JSON: a red border on the editor, "Invalid JSON. Showing the last good chart." with the parser's message, and the grid dimmed.
- Compile errors: "n errors in the conf. The tags that compiled are drawn.", then one line per error, `path (tag): message`.
- A tree that could not be built: "No gist: the tree could not be built.", and the error in place of the tree.
- Unknown conf: "No conf named x." No cases: "No cases to show."

## Tokens

Every colour, space, size, radius, weight, shadow and font is a custom property on the root. Light is the default; dark applies under `prefers-color-scheme: dark` unless `data-theme="light"`, and `data-theme="dark"` forces it, driven by the bar's switch (auto, light, dark, remembered in `localStorage`). Light neutrals are warm paper (hue 85), close together; dark neutrals are cool ink (hue 265), lifted, never black.

| token | light | dark |
|---|---|---|
| `--bg` | oklch(.965 .008 85) | oklch(.22 .012 265) |
| `--surface` | oklch(.977 .007 85) | oklch(.25 .013 265) |
| `--raised` (popover, chips) | oklch(.99 .005 85) | oklch(.29 .015 265) |
| `--sunken` (editor) | oklch(.948 .009 85) | oklch(.19 .011 265) |
| `--text` | oklch(.21 .015 265) | oklch(.94 .006 265) |
| `--muted` | oklch(.45 .015 85) | oklch(.74 .01 265) |
| `--faint` | oklch(.6 .012 85) | oklch(.58 .012 265) |
| `--line` | oklch(.91 .009 85) | oklch(.31 .013 265) |
| `--line-strong` | oklch(.84 .011 85) | oklch(.4 .015 265) |
| `--hover` | oklch(.935 .02 270) | oklch(.3 .03 270) |
| `--accent` | oklch(.5 .13 275) | oklch(.76 .09 275) |
| `--accent-fg` | oklch(.985 .005 85) | oklch(.2 .03 275) |
| `--ok` | oklch(.5 .09 155) | oklch(.78 .1 155) |
| `--warn` | oklch(.52 .09 70) | oklch(.8 .09 75) |
| `--err` | oklch(.5 .12 27) | oklch(.75 .11 25) |
| `--err-bg` | oklch(.962 .02 27) | oklch(.27 .04 25) |
| `--grey` (hidden text) | oklch(.7 .008 85) | oklch(.5 .01 265) |
| `--band-l` / `--band-c` | .64 / .105 | .74 / .1 |
| `--wash` (tint alpha) | 18% | 24% |
| `--shadow-sm` | 0 1px 2px oklch(.3 .02 85 / .07) | 0 1px 2px oklch(0 0 0 / .3) |
| `--shadow-pop` | 0 1px 2px oklch(.3 .02 85 / .08), 0 10px 28px oklch(.3 .02 85 / .16) | 0 1px 2px oklch(0 0 0 / .4), 0 10px 28px oklch(0 0 0 / .45) |

**Bands.** Twelve hues, `--band-0` to `--band-11` at 20, 50, 80 … 350, each `oklch(var(--band-l) var(--band-c) hue)`, so all twelve weigh the same within a theme. The tag at place *i* in its conf takes slot `(5i + ⌊i / 12⌋) mod 12`: a step of five slots is 150° of hue, so neighbouring tags never look alike, and a tag keeps its colour from case to case (`slot` in `src/grid.ts`).

**The same in both themes:** `--ui` (Inter, then system faces), `--mono` (JetBrains Mono, IBM Plex Mono, then system monospace), `--icon` (Material Symbols Rounded); spacing `--s1` to `--s6` at 4, 8, 12, 16, 24, 40 px; type `--t-xs` to `--t-xl` at 12, 13, 15, 18, 26 px; weights `--w-reg` 400, `--w-med` 500, `--w-semi` 600; radii `--r-s` 4, `--r-m` 8, `--r-l` 14 px and `--r-pill`; `--grid-size` 15 px on `--grid-lh` 24 px (14 on 22 below 720 px); `--band-h` 5 px, `--band-h-lost` 3 px, `--lane` 8 px; `--bar` 73 px; `--ic` 20 px, `--ic-s` 16 px (the eye); `--dur` 130 ms, `--dur-drawer` 200 ms; `--drawer-w` `min(34rem, 100vw - 40px)`; `--pane` 38%; `--scrim`, the text colour at 30%. Under `prefers-reduced-motion`, no transitions and no animation.
