# Changelog

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
