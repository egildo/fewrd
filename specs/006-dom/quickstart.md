# Quickstart: validating phase 2

Prerequisites: Node ≥ 22.13, `pnpm install` done, branch `rewrite`.

## Gate

```bash
pnpm typecheck
pnpm test
```

Both green. `pnpm test` runs, among the others:

- `test/normalise.test.ts`: `normalise-per-utf16-unit`.
- `test/dom.test.ts`: every selection, tree, role and value worked example of the spec, and `the-walk` step by step.
- `test/fold.test.ts`: every fate-rule worked example, including folding a composed node and folding only a child inside one.
- `test/gist.test.ts`: 21 of 21 cases give their recorded `gist`; every case gives its text back with nothing folded; every tree's leaves partition its text.
- `test/find.test.ts`, `test/it-pa.test.ts`, `test/common.test.ts`: phase 1, still green after the matcher move and the conf bumps.

## By eye

```bash
pnpm dev     # http://localhost:5577
```

1. Case 1 (PEC, channel with a dash): under the chart, the tree lists `dated` holding one `protocol`, which holds `channel`, a separator, the label and the number as children (no protocol inside it); the fold panel has `dated`, `protocol`, `cig`, `cup`, `chapter`, `quotation` ticked; the gist reads as in `reinstated-gists`; those characters are grey on the grid.
2. Untick everything: the gist is the text; nothing is grey.
3. Case "Brackets": tick only `cig`: the bracket goes grey with it and the gist is `Fornitura di toner per le stampanti degli uffici - saldo`.
4. Edit the conf (rename a tag): the panel's boxes follow the conf's tags.

## fewrd-play

```bash
mkdir -p /tmp/fp && cd /tmp/fp
# conf.json: the README quick start's conf; cases.json: one case with fold and gist
npx fewrd-play . --fewrd /path/to/fewrd/dist --open
```

The page mounts with the folder's conf, draws the case, lists the tree, and folds. Without `conf.json`, the CLI exits 1 and prints its usage.
