# Playground design

Same playground, same core: text on a JetBrains Mono grid (ligatures off, one character per `1ch`), rows as 5 px underlines with endcaps in stacked lanes, tag and span on hover only, one case at a time with ‹ › and "n / total", the live conf editor with inline errors, the tree, the fold panel with one checkbox per tag, the gist, two domains, twenty-one cases. What follows changes composition, interaction and the visual system only.

## Moves

1. **The case is the page.** A sticky bar holds ‹, "n / 21", ›, a jump menu (native select, grouped by domain, so duplicate names cannot collide) and a theme switch. The case stays steppable at any scroll.
2. **The grid fits its column.** The wrap is measured from the container (`floor(width / 1ch)`) and breaks at spaces. No sideways scroll at any width.
3. **Output first.** Below the grid come the gist (large, `aria-live`, with a "37 → 21 characters" line and a verdict) and the fold panel, then the tree, then the conf. The editor is a sidebar on wide screens and a collapsed section otherwise; its error state is always visible, outside the collapse.
4. **Tree and grid are one thing.** Hovering a band lights its tree row; hovering a tree row washes its span on the grid. Bands are one tab stop, ↑ ↓ Home End move along them in reading order, a tap focuses one; all show the same tooltip. The tooltip also says what the row is: a node, a twin, or not in the tree.
5. **The legend and the fold panel merge.** One chip per tag: swatch in the band colour, real checkbox, label. Tags present in this text's tree come first, the rest follow under "not in this tree". A Reset returns to the case's own fold.
6. **Hidden and lost are drawn.** Hidden leaves: muted and struck through on the grid, their bands faded. Rows the tree did not keep: dashed bands. Twins: solid bands, "twin of x" in the tooltip and an `also` pill in the tree.

## Wireframes

Wide (at least 1100 px):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ fewrd  [‹] [ 7 / 21 ] [›]  [Integration chain…      ▾]           [◐ auto] │ sticky
├───────────────────────────────────────────────┬──────────────────────────┤
│ ┌ grid card ────────────────────────────────┐ │ ▾ Conf  it-pa  [2 errors]│
│ │ Integrazione del provvedimento – Numero … │ │ ┌──────────────────────┐ │
│ │ ▬▬▬▬▬▬ ▬▬▬                                │ │ │ {                    │ │
│ │  ▬▬▬▬▬▬▬▬▬▬▬▬                             │ │ │   "version": …       │ │
│ │ hint: hover or Tab to a band              │ │ │                      │ │ sticky,
│ └───────────────────────────────────────────┘ │ └──────────────────────┘ │ full
│ ┌ Gist ── 210 → 96 characters ── ✓ matches ─┐ │ ┌ error ───────────────┐ │ height
│ │ Integrazione … (18px mono, live region)   │ │ │ tags.x.from: unknown │ │
│ └───────────────────────────────────────────┘ │ └──────────────────────┘ │
│ ┌ Fold  tick a tag to drop it   [Reset] ────┐ │                          │
│ │ (▬ protocol) (▬ cig) (▬ sep) …            │ │                          │
│ │ not in this tree: (▬ cdr) (▬ euro) …      │ │                          │
│ └───────────────────────────────────────────┘ │                          │
│ ▾ Tree  59 nodes                              │                          │
│ │ dated  0–37  │ "Numero Protocollo …"       │ │                          │
│ │  protocol 0–22 = "0012345"                 │ │                          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

Medium (720 to 1099 px, e.g. 900): one column; the conf is a collapsed card.

```
┌──────────────────────────────────────────────────┐
│ fewrd [‹] [ 7 / 21 ] [›] [Integration chain ▾] ◐ │ sticky
├──────────────────────────────────────────────────┤
│ ┌ grid card (about 94 columns) ────────────────┐ │
│ │ text, bands, hint                            │ │
│ └──────────────────────────────────────────────┘ │
│ ┌ Gist ────────────────────────────────────────┐ │
│ └──────────────────────────────────────────────┘ │
│ ┌ Fold ──────────────────────────────── Reset ─┐ │
│ │ chips, wrapping                              │ │
│ └──────────────────────────────────────────────┘ │
│ ▸ Conf  it-pa  [2 errors]      (collapsed)       │
│ [error box, visible even when collapsed]         │
│ ▾ Tree  59 nodes                                 │
└──────────────────────────────────────────────────┘
```

Narrow (below 720 px, e.g. 480):

```
┌────────────────────────────────┐
│ [‹] [ 7 / 21 ] [›] [Integr… ▾] ◐│ sticky, one row
├────────────────────────────────┤
│ ┌ grid card (about 45 cols) ─┐ │
│ │ Integrazione del provved-  │ │
│ │ imento – Numero …          │ │
│ │ ▬▬▬▬ ▬▬                    │ │
│ └────────────────────────────┘ │
│ ┌ Gist ──────────────────────┐ │
│ ┌ Fold ──────────────────────┐ │
│ │ chips wrap                 │ │
│ ▸ Conf  it-pa  [2 errors]      │
│ ▸ Tree  59 nodes  (collapsed)  │
└────────────────────────────────┘
```

## Interaction

- ← → step through cases anywhere except inside the editor, a select or a checkbox (the old build let a focused checkbox steal the arrows and lost focus).
- Every control has a visible `:focus-visible` ring (2 px accent, 2 px offset). Buttons are `<button>`; chips are `<label>` around a real `<input type=checkbox>`; the gist and the case status are live regions.
- A redraw always clears the tooltip and the highlights (the old build left them stuck).
- Transitions: 120 to 150 ms on colour, border, opacity and transform of controls and bands; none under `prefers-reduced-motion`.
- The conf and tree open by default only when they fit (1100 and 720 px); the user's toggle wins until the width crosses a breakpoint.

## States and micro-copy

- Empty text or no rows: "Nothing found in this text with this conf."
- Nothing left after folding: "(nothing left)", muted.
- Invalid JSON: red border on the editor, a box "Invalid JSON. Showing the last good chart." plus the parser message; the grid card is dimmed.
- Compile errors: "n errors in the conf. The tags that compiled are drawn." then one line per error as `path (tag): message`.
- Unknown conf: "No conf named X." No cases: "No cases to show."
- Verdict: "matches the case's gist" (green) or "differs from the case's gist" (amber, expected text in the tooltip). Hidden once the fold is edited; the Reset button appears instead.

## Visual system

Scales: spacing 4, 8, 12, 16, 24, 40 px (`--s1` to `--s6`); type 12, 13, 15, 18, 26 px (`--t-xs` to `--t-xl`); radii 4, 8, 14 px and pill. UI face: the system font. Grid face: JetBrains Mono 15 px on a 24 px line (14 px under 720), lane pitch 8 px, band 5 px. Band hue is not a hash: tag *i* of the conf gets hue `i × 137.5° + 25°`, so 30 tags stay apart.

| variable | light | dark |
|---|---|---|
| `--bg` | #f6f6f2 | #111214 |
| `--surface` | #ffffff | #191b1f |
| `--sunken` (editor) | #efefe9 | #0c0d0f |
| `--text` | #1b1c20 | #e8e9ed |
| `--muted` | #5f626b | #9a9ea9 |
| `--line` | #dedfd8 | #2a2d33 |
| `--hover` (row) | #e9edfb | #232838 |
| `--accent` | #3455d6 | #93a6ff |
| `--accent-fg` | #ffffff | #0e1226 |
| `--ok` | #17754a | #63d69e |
| `--warn` | #9a5b00 | #f2b661 |
| `--err` | #b3261e | #ff9c95 |
| `--err-bg` | #fdeeec | #2f1a19 |
| `--tip-bg` | #1b1c20 | #eceef3 |
| `--tip-fg` | #f5f6f8 | #17181c |
| `--grey` (hidden text) | #9b9ea6 | #5d616b |
| `--band-s` | 60% | 58% |
| `--band-l` | 40% | 66% |
| `--wash` (highlight alpha) | .22 | .30 |
| `--shadow` | 0 8px 28px rgb(20 22 30 / .18) | 0 8px 28px rgb(0 0 0 / .55) |

Same in both themes: `--mono`, `--ui`, `--s1`…`--s6`, `--t-xs`…`--t-xl`, `--r-s` 4px, `--r-m` 8px, `--r-l` 14px, `--r-pill` 999px, `--grid-size` 15px, `--grid-lh` 24px, `--band-h` 5px, `--lane` 8px, `--bar` 73px (sticky bar height). Theme: `prefers-color-scheme` by default; `data-theme="light|dark"` on the root overrides it, driven by the bar's switch (auto, light, dark; remembered in `localStorage`).

## Delivery

The CSS stays a string injected by `playground.ts`: the module is published as `fewrd/playground` and mounted by `fewrd-play` on pages that load no stylesheet, so a separate file would break both. `mount(el, options)` keeps its signature.

## Round 2

Six refinements. The core stays: character grid, 5 px underlines with endcaps in lanes, hover reveal, one case at a time, live editor, tree, fold chips, gist, two domains. Where this section disagrees with the first one (dashed bands, system font, heavy gist card, the palette), this section wins.

1. **Monospace only where positions must be legible.** JetBrains Mono is the face of the preview grid (text and bands) and of the conf textarea. The bar, case name, jump menu, chips, tree, gist, hints, meta and popover use Inter. Spans such as `(0, 22)` use Inter's tabular figures (`font-variant-numeric: tabular-nums`), so digits line up without going monospace.
2. **Solid lines only.** No dashed or dotted stroke anywhere; the "not in this tree" chips lose their dashed border too. **Rows the tree did not keep are drawn thinner:** 3 px instead of 5 px, centred in the same slot, same colour, endcaps intact. A thin line reads as "less", needs no legend beyond one hint sentence, and stays distinct from hidden leaves, which are faded (opacity .25) and struck through.
3. **Hover.** The band lights up (a soft ring of its own hue), all its pieces when it wraps over lines. The characters it covers get a rounded tint of the band's hue at low alpha plus a hairline inset ring, aligned to the character cells, absolutely positioned so nothing moves. A popover shows the tag with its swatch, the span, the value when there is one, and a one-line note for twins and rows not kept. Keyboard focus shows the same three things, with a stronger two-ring focus outline on the band.
4. **Popover placement.** Fixed-position, centred on the hovered band piece and clamped to 8 px from the viewport edges. It sits **above the text line** (never over the characters it describes); if that would run under the sticky bar or off the top, it goes **below the last lane** of that line. A 10 px arrow points at the band's centre, on the bottom edge when above and the top edge when below. It follows scroll and resize while it is open, and it is removed on leave, blur and every redraw.
5. **The gist is quiet.** No border, no background, no accent bar: a small uppercase label, the counts as muted meta on the same line, a small check with "matches the case's gist", then the text in Inter at 17 px.
6. **Fonts and icons from a CDN, dev-time only.** `playground/index.html` loads Inter, JetBrains Mono and Material Symbols Rounded (a seven-icon subset) from Google Fonts. The injected CSS names them first in its stacks and falls back to system fonts. Each icon is a span with the ligature name inside and a text fallback (‹ › ✓ ▾ ◐ ☀ ☾) in `data-fb`; the root gets `data-icons` only once the icon font has actually loaded, so a blocked CDN shows the text glyphs.
7. **Palette.** One cool neutral scale (hue 275, chroma rising with depth) with four surface levels, one indigo accent, and twelve band hues as `oklch(var(--band-l) var(--band-c) hue)`: lightness and chroma are the same for all twelve within a theme, so bands weigh the same on both backgrounds. A tag takes slot `(i × 5 + ⌊i / 12⌋) mod 12`, *i* being its place in the conf: a step of 5 slots is 150° of hue, so consecutive tags never look alike, and a tag keeps its colour from case to case.

Every colour, space, radius, size, weight, shadow and font is a custom property on the root. Light is the default; dark applies under `prefers-color-scheme` unless `data-theme="light"`, and `data-theme="dark"` forces it.

| token | light | dark |
|---|---|---|
| `--bg` | oklch(.962 .007 275) | oklch(.17 .012 275) |
| `--surface` | oklch(.988 .003 275) | oklch(.215 .014 275) |
| `--raised` (popover, chips) | oklch(1 0 0) | oklch(.27 .016 275) |
| `--sunken` (editor) | oklch(.935 .009 275) | oklch(.14 .01 275) |
| `--text` | oklch(.22 .02 275) | oklch(.93 .006 275) |
| `--muted` | oklch(.46 .02 275) | oklch(.72 .012 275) |
| `--faint` | oklch(.6 .015 275) | oklch(.56 .014 275) |
| `--line` | oklch(.9 .009 275) | oklch(.3 .015 275) |
| `--line-strong` | oklch(.8 .012 275) | oklch(.4 .018 275) |
| `--hover` | oklch(.94 .025 275) | oklch(.27 .04 275) |
| `--accent` | oklch(.5 .2 275) | oklch(.78 .13 275) |
| `--accent-fg` | oklch(.99 0 0) | oklch(.2 .04 275) |
| `--ok` / `--warn` / `--err` | oklch(.5 .13 155) / oklch(.52 .12 70) / oklch(.52 .18 27) | oklch(.8 .14 155) / oklch(.82 .12 75) / oklch(.76 .15 25) |
| `--err-bg` | oklch(.96 .025 27) | oklch(.25 .05 25) |
| `--grey` (hidden text) | oklch(.68 .01 275) | oklch(.5 .012 275) |
| `--band-l` / `--band-c` | .60 / .15 | .76 / .13 |
| `--wash` (tint alpha) | 20% | 28% |
| `--shadow-sm` | 0 1px 2px oklch(.2 .02 275 / .08) | 0 1px 2px oklch(0 0 0 / .4) |
| `--shadow-pop` | 0 1px 2px oklch(.2 .02 275 / .1), 0 10px 28px oklch(.2 .02 275 / .18) | 0 1px 2px oklch(0 0 0 / .5), 0 10px 28px oklch(0 0 0 / .6) |

Band hues, the same in both themes: `--band-0`…`--band-11` at 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320, 350.

Same in both themes: `--ui` (Inter, system-ui), `--mono` (JetBrains Mono), `--icon`, spacing `--s1`…`--s6` (4, 8, 12, 16, 24, 40), type `--t-xs`…`--t-xl` (12, 13, 15, 18, 26), weights `--w-reg` 400, `--w-med` 500, `--w-semi` 600, radii `--r-s` 4, `--r-m` 8, `--r-l` 14, `--r-pill`, `--grid-size`, `--grid-lh`, `--band-h` 5, `--band-h-lost` 3, `--lane` 8, `--ic` 20 (icon size), `--dur` 130 ms.
