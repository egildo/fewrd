# Changelog

## Unreleased: the rewrite, phase 2 (the DOM half)

`package.json` stays at 0.3.0 until release; `fewrd-play` keeps its version too and is not published.

### Added

- `dom(text, chart, conf)`: from the chart, one tree of plain objects. Rows are selected (non-weak first, then longer, then earlier key in `tags`, then earlier start; a row that crosses a chosen one is dropped, so is one inside a chosen row of the same tag, a row with exactly a chosen row's span becomes a twin in `also`); each chosen composed row is derived again inside its own span, with the matcher of `find`, so its roles point at real nodes and the rows it took are chosen with it. A forced row of the composed row's own tag is absorbed (the outermost row of a self-grown tag keeps its chain's children, never a protocol inside a protocol); a derivation that would cross a chosen row gives way to the next, and the composed row is dropped when none is left. Values are resolved bottom-up. Water fills the gaps as `text` nodes, so the leaves cover the text exactly.
- `Node` and `Fold`. A node carries its tag's `fate`, and `doc` the original `text`, so the fold reads the tree alone and a tree parsed back from JSON folds the same.
- `hidden(doc, fold)` and `gist(doc, fold)`: the fold, then the connector fate, emptied brackets (delimiters not counted, a bracket nothing was cut from is left alone), and the separator fate (the strongest separator survives a cut, none at an edge, after an opening bracket or before closing punctuation).
- `fate: 'bracket'`; `doc` and `text` are reserved tag names.
- Brackets (`paren`) in both confs, and separators in the common one; `fold` and `gist` on every one of the 21 cases, asserted through `gist(dom(text, find(text, conf), conf), fold)`.
- The playground shows the tree as an indented list under the chart and a fold panel, one checkbox per tag, with the gist printed under it and the hidden leaves greyed out on the grid; `treeLines` and `greyed` on `fewrd/playground`. `pnpm dev` opens all 21 cases.
- `fewrd-play` reads the new folder (`conf.json`, `cases.json` with optional `fold` and `gist`, `cases.local.json`, `resolvers.ts`) and calls the new `mount`; it writes nothing.
- The README's tree, selection, fold and rendering sections; the spec, plan and tasks of phase 2 under `specs/006-dom/`.

### Changed

- `normalise`'s boundary map is per UTF-16 unit, and `find` no longer converts from code points.
- `it-pa@4` (gains `paren`) and `common@2` (gains `SEP`, `paren`, `sep`): their charts change.
- The matcher moved from `find.ts` to `derive.ts`, shared by `find` and `dom`; `find` is unchanged.
- Constitution 3.1.1.

## Unreleased: the rewrite, phase 1 (the finding half)

`package.json` stays at 0.3.0 until release.

### Added

- The conf: plain JSON with `version`, `patterns` (spliced as `%{NAME}`) and `tags`. Root tags (`rx`) and composed tags (`search`, growing `back` or `forward` from the rows of a `from` tag through atoms, with `as`, `optional`, and the reserved names `^`, `$`, `*`). `resolve` by name, `weak` and `fate` carried for the second half.
- `compile(data, { resolvers })`: never throws, reports `{ path, tag, message }`, leaves out only the tag with the error. Unknown keys, reserved `as` names, an optional outermost atom and two regex atoms in a row are errors.
- `Chart`: an immutable map from tag to sorted, unique rows (spans into the original string), always with `^` and `$`; `with`, `has`, `after`, `before`, `spans`, `all`, `size`, `toJSON` and `Chart.from`. `rel` gives the Allen relation of two spans.
- `find(text, conf)`: every match of every root tag, then every search from every row, in passes to a fixpoint. Complete and neutral: crossing rows, twins and rows inside rows are all kept. Depends on `(text, conf)` only, so a chart is cacheable by `(text, conf.version)`.
- The Italian conf in the new format, `confs/it-pa.json` (`it-pa@3`), tested through the subjects in `cases/it-pa.json`.
- A chart playground: `mount(el, { confs, cases })` from `fewrd/playground`. One case at a time, stepped with big buttons or the arrow keys; the text on a character grid in a monospace font, every row an underline with end ticks, stacked in lanes, its tag and `(start, end)` in a tooltip on hover with the covered characters highlighted, a legend of tag colours; a live editor for the conf of the case on screen. `pnpm dev` opens it on twenty cases from the Italian and common domains.
- A common conf in the new format, `confs/common.json` (`common@1`): links, emails, phones, IPs, ISO dates, money, percentages, versions, ticket keys, `@handles`, `#hashtags`, the `Re:`/`Fwd:` chain and quotations; its cases in `cases/common.json`. Every case now names its conf.
- The README rewritten for the finding half.

### Removed

- `read`, `gist`, `html`, `shown`; the types `Book`, `Recipe`, `Neighbour`, `Mention`, `Leaf`, `Cuts`, `Fold`; recipes as data and `book.schema.json`; `rest`, `glued`, `requires`, left and right neighbours; the old playground options (`data`, `book`, `fold`, `save`).
- Selection, the tree and the fold, with the separator and connector fates, return in phase 2.
