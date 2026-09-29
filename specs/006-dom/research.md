# Research: The DOM (rewrite, phase 2)

Every decision below is either the brief's (section 5, cited as such), the spec's, or a choice the spec left to the plan. None reopens the brief. Each has a name, used by the plan and the tasks.

## derive-shared-module

**Decision**: Move `pinned`, the `Index` type and `index(chart)`, and `derive` from `src/find.ts` to a new `src/derive.ts`. `find.ts` imports them. `index` gains an optional filter so `dom` can build an index of only the rows inside a span: `index(rows: Iterable<Row>)` takes rows rather than a chart (`find` passes `chart.all()`).

**Rationale**: The brief says forcing runs "the same matcher as `find`"; two copies would drift. `derive` is a word of the vocabulary (brief 1), so it names the module.

**Alternatives considered**: exporting `derive` from `find.ts` (a module with two jobs and a public-looking internal); re-implementing a smaller matcher in `dom.ts` (drift).

## derive-reports-rows

**Decision**: `derive`'s `emit` gains a fourth argument, the derivation's steps: `emit(lo, hi, roles, steps)` where `steps` is `{ row: Row; as?: string }` for each tag atom taken and `{ text: string; as: string }` for each regex atom that has an `as`, in the order taken, the `from` row first as `{ row }`. `roles` stays as it is (strings, for resolvers). `find` ignores `steps`.

**Rationale**: forcing needs the rows, roles need to know which atom bound which row or text. `find`'s path is unchanged, so its tests prove the move.

## dom-coordinates

**Decision**: `dom` normalises the text once, builds the inverse of the boundary map (original offset → first copy boundary with that offset, for starts; → last, for ends), and maps every chart row into copy coordinates before selection. Selection, forcing and values run in copy coordinates on the copy's text, as `find` does. Nodes are built in original coordinates by mapping back through `at` once, at the end.

**Rationale**: regex atoms are matched on the normalised text (phase 1 `atoms-meet-the-cursor`), so the re-run must be too; resolvers see the normalised text (`resolvers-see-normalised-text`). The inverse is ambiguous only inside an NFKC expansion (spec Assumptions, *dom works on the copy*).

**Alternatives considered**: carrying copy spans in the chart (breaks the phase 1 contract: spans into the original); re-running `find` inside `dom` (the brief forbids: `dom` takes the chart).

## walk-order

**Decision**: Candidates are the chart's rows minus `^` and `$`, sorted once by `(weak ? 1 : 0, -(end - start), keyIndex, start)`. Key index is the tag's position in `Object.keys(conf.tags)`; a row whose tag has no index is an error (`dom-returns-a-tree`).

**Rationale**: `select-order` exactly, with every tie broken, so the sort's stability never matters.

## chosen-set

**Decision**: The chosen rows are a list plus a `Set` of their keys (`tag\0start\0end`, as `find` keys values); crossing and same-tag tests scan the list. `also` is a `Map` from chosen key to tag list.

**Rationale**: subjects are a few hundred characters and a few dozen rows. `ponytail:` comment: O(rows²) over the walk; index chosen rows by position if subjects grow.

## forcing

**Decision**: `take(row, own)` chooses a row: a row of the composed row's own tag (`own`) is not chosen, `force` runs on it instead (the outermost row of a self-grown tag absorbs its chain); a row already chosen is done; one equal to a chosen row of another tag becomes its twin; one crossing a chosen row fails; otherwise it is added and, if its tag is composed, `force`d. `force(row)` walks `derivationsOf(row)` in order; for each it saves the selection, `take`s every step's row that is not `^`/`$`, and on success records the derivation for the node (roles), on failure restores the saved selection and tries the next; none usable means `take` fails and the composed row is not chosen. `derivationsOf(row)` builds an index of the rows inside the span (plus `^`/`$` when inside, the row itself excluded), runs `derive` for each of the tag's searches in order, each `from` row inside in position order, and keeps, in order, every emission that spans exactly the row and that the resolver (if any) accepts; memoised per row key, independent of the chosen set. No acceptable derivation at all: throw, naming the tag and span (a refusal by the resolver says so). `ponytail:` the selection is snapshotted by copy per composed row tried; fine at subject length.

**Rationale**: the brief's forcing, depth-first, with the maintainer's two closings: the own-tag rule (`forced-derivation-chosen`) and the next-derivation-or-drop rule for a forced row that would cross. Keeping the memo independent of the chosen set makes it reusable for roles and values.

## values-lazy

**Decision**: A memoised `valueOf(row)`, used for the role values a resolver sees: the row's text when its tag does not resolve; for a root tag, `resolve({ value: copyText })`; for a composed tag, the value of its first acceptable derivation, which `derivationsOf` computed with `resolve({ value, ...roles })`, each role the bound row's `valueOf` or its copy text, or the regex text. A `null` from a root tag's resolver throws (`values-bottom-up`). A node's own `value` is the one its kept derivation gave.

**Rationale**: forcing needs values before the tree exists (a resolving composition accepts on its roles' values); recursion over the derivation is bottom-up by construction. A row's value and its node's value differ only when the first acceptable derivation was unusable.

## tree-stack

**Decision**: Chosen rows sorted by start ascending, end descending; a stack of open nodes, popping while the top ends at or before the new start; each node pushed as a child of the top. Then one recursive pass inserts water: for each node with children, a `text` node for each non-empty gap. `attrs` filled last, from each composed row's steps, looking up the node by row key (or by its twin's key).

**Rationale**: `tree-by-containment`; the attrs point at the same objects as `children`.

## fates-on-the-node

**Decision** (the maintainer's, replacing an earlier plan with a module-level `WeakMap`): `Node` gains `fate?: 'separator' | 'connector' | 'bracket'`, copied from the conf's tag when `dom` builds the node, and `doc` gains `text?: string`, the original string. `hidden(doc, fold)` and `gist(doc, fold)` then read the tree alone, with the brief's signatures and no hidden state; a tree parsed back from JSON folds with all four rules.

**Rationale**: no global state, no third argument, and the tree is self-sufficient data, which is what "fewrd returns plain objects" promises. The text is needed because a node holds spans (separator strength and closing punctuation are read from the text, and `gist` returns it).

**Alternatives considered**: a `WeakMap` keyed by the doc (loses fates through JSON); a `conf` argument (changes the brief's signatures).

## fate-order

**Decision** (spec Assumptions): in `hidden`, four passes over the leaves in order: rule 1 (walk from `doc`, hide a folded node's subtree), connectors right to left, brackets innermost first (post-order), then separator runs left to right. Strength by `'-' > ';' > ':' > ','`, contained characters, leftmost on a tie. Closing punctuation `/^[.,;:!?)\]}]/` on the next surviving leaf's text. A bracket's delimiters are its first and last child when each is a water leaf of exactly one character; they are left out of the emptying test, the opening one is the inner edge of the separator rule, and a bracket is emptied only when at least one content leaf is hidden.

## confs-bump

**Decision** (spec `confs-for-the-fold`): `it-pa.json` → `it-pa@4` with `paren` appended after `sep`; `common.json` → `common@2` with `patterns.SEP` (the Italian source, verbatim) and `paren`, `sep` appended. The phase 1 row assertions stay as written.

## cases-shape

**Decision**: `cases/*.json` items become `{ name, conf, text, fold?, gist? }`; every case of both files gets both, as in `reinstated-gists`. `PlaygroundCase` in `src/playground.ts` gains `fold?: string[]; gist?: string`. The regression lives in a new `test/gist.test.ts` that imports both case files and both compiled confs.

## playground-tree-and-fold

**Decision**: Two pure helpers, exported from `fewrd/playground` for tests: `treeLines(doc, text): string[]` (one line per node but `doc`: indentation of two spaces per depth, then `tag (start, end)`, then ` also=a,b`, ` value=…`, then the node's text in quotes) and `greyed(doc, fold): Span[]` (the spans of the hidden leaves, merged where adjacent). `mount` keeps a `Map<caseIndex, Set<string>>` of fold choices, seeded from the case's `fold`; the panel lists `Object.keys(compiled.tags)`; the grid greys the characters of `greyed` spans with a class on per-character overlays on the existing text line.

**Rationale**: the DOM glue stays untestable in node; its logic does not.

## fewrd-play-folder

**Decision**: `play/server.ts` serves `conf.json` (read-only) and `cases.json` merged with `cases.local.json` as before; the page imports `mount` from `fewrd/playground`, fills each case's missing `conf` with the folder's name, and calls `mount(app, { confs: { [name]: { conf, resolvers } }, cases })`. The POST route and `save` go. `cli.ts` checks for `conf.json` instead of `book.json`. `page()` stays exported for the test.

## normalise-fix

**Decision**: in `normalise`, push one `at` entry per UTF-16 unit of each emitted character (`for (let j = 0; j < ch.length; j++) at.push(i)`); in `find`, map spans with `at[a]`, `at[b]` directly and delete the `unit` array.

## tests

**Decision**: one `test()` per requirement worked example, titled `<requirement-name>: <what>` as in phase 1: `test/dom.test.ts` (`select-order`, `crossing-loser-dropped`, `outer-wins-same-tag`, `twins-become-also`, `otherwise-chosen`, `forced-derivation-chosen`, `the-walk`, `selection-is-deterministic`, `dom-returns-a-tree`, `tree-by-containment`, `leaves-partition-text`, `roles-from-forced-derivation`, `values-bottom-up`, `resolvers-see-normalised-text`), `test/fold.test.ts` (`fold-hides-subtree`, `connector-follows-its-right`, `separators-untouched-without-a-fold`, `strongest-separator-survives`, `no-separator-at-an-edge`, `bracket-empties-out`, `hidden-and-gist`), `test/gist.test.ts` (`gist-regression`, `cases-carry-fold-and-gist`), `test/normalise.test.ts`, additions to `test/conf.test.ts` and `test/playground.test.ts`, `test/play.test.ts`.
