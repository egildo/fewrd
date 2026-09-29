---

description: "Task list for The DOM (rewrite, phase 2)"
---

# Tasks: The DOM (rewrite, phase 2: the DOM half)

**Input**: Design documents from `/specs/006-dom/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md), [quickstart.md](quickstart.md), and the brief, [`specs/rewrite-brief.md`](../rewrite-brief.md) section 5

**Tests**: Required by the brief: every task names its test. Tests are written first in each task and fail until its implementation lands. Core rules are tested with the spec's toy confs, inline (principle III's core-mechanics exception); the domain confs only through `cases/*.json`. Each test is titled after the requirement it checks, by its short name (`outer-wins-same-tag: suffix match dropped`), never by its number.

**Worked examples and case gists**: every one in the spec was hand-derived; each is now run as a test. Each goes into a test exactly as written. When the code disagrees, decide which is right by the rules: if the example or gist is wrong, correct it **in the spec** (and in `cases/*.json`) in the same commit, and say why in the commit message; never adjust only the test's expectation. If the code is wrong, fix the code. When done, change the spec's Status line and drop the "not yet run" marks that no longer apply.

**Open points**: the five points the spec held open (the own-tag rule of forcing, a forced row that would cross, normalised coordinates, fates on the node, bracket delimiters) were closed by the maintainer before implementation and are requirements and Assumptions of the spec; implement those, and do not extend them.

**Order**: as the phase 2 instructions give it: `normalise` fix; `Node` types and reserved names in compile; selection; forcing and re-derivation; tree and partition; roles and values; fates, `hidden`, `gist`; the cases' `fold`/`gist` and the regression; playground; fewrd-play; README; constitution wording check; CHANGELOG.

**Gate after every task**: `pnpm typecheck` and `pnpm test` pass. Commit per task or small group (conventional commits, ending with the co-author line the session gives), no push.

## Path Conventions

Single project. New: `src/derive.ts`, `src/dom.ts`, `src/fold.ts`, `test/normalise.test.ts`, `test/dom.test.ts`, `test/fold.test.ts`, `test/gist.test.ts`, `test/play.test.ts`. Edited: `src/normalise.ts`, `src/conf.ts`, `src/find.ts`, `src/index.ts`, `src/playground.ts`, `confs/it-pa.json`, `confs/common.json`, `cases/it-pa.json`, `cases/common.json`, `test/conf.test.ts`, `test/playground.test.ts`, `play/server.ts`, `play/cli.ts`, `play/README.md`, `README.md`, `CHANGELOG.md`, `specs/006-dom/spec.md` (examples corrected, marks removed). **Not touched**: `src/chart.ts`, `vite.lib.ts`, `tsconfig*.json`, `package.json`, `play/package.json`, `playground/*`.

Old code worth reading before writing (git history, not to be restored): `git show 004-connectors:src/render.ts` (the old fate pass: connectors, bracket pairs, separator runs, strength, closing punctuation).

---

## Phase 1: Setup

- [X] T001 Fix the unit mismatch in `src/normalise.ts` (`normalise-per-utf16-unit`, research `normalise-fix`): push one `at` entry per UTF-16 unit of each emitted character, both units of a surrogate pair mapping to the original start of their code point, so `at` has `text.length + 1` entries as its comment says. In `src/find.ts`, delete the `unit` array and its comment and map spans with `at[a]`, `at[b]` directly. **Test**: new `test/normalise.test.ts`, `normalise-per-utf16-unit: astral`: `normalise('😀 a')` gives text `😀 a` and `at` `[0, 0, 2, 3, 4]`; and `find` with `{ "w": { "rx": "/[a-z]/u" } }` on `😀  a` (two spaces) gives `w: [[4,5]]`. All of `test/find.test.ts` still passes.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the compile changes and the new types. Every story reads them.

- [X] T002 In `src/conf.ts`: `fate` accepts `'bracket'` (type `fate?: 'separator' | 'connector' | 'bracket'`, validation message `must be "separator", "connector" or "bracket"`) (`fate-bracket-accepted`); `doc` and `text` join the names that cannot be declared, with the same message as `^`, `$`, `*` ("is reserved and cannot be declared as a tag"), but not the names usable in atoms: an atom or `from` naming `doc` or `text` is an unknown tag unless declared, and it cannot be declared (`reserved-doc-and-text`). Keep `RESERVED` for atoms and add a separate list for declarations. **Test**: `test/conf.test.ts` gains `fate-bracket-accepted: bracket compiles`, `fate-bracket-accepted: another value is an error`, `reserved-doc-and-text: doc declared`, `reserved-doc-and-text: text declared`, `reserved-doc-and-text: an atom naming doc is an unknown tag`.

- [X] T003 Create `src/dom.ts` with the `Node` type exactly as `node-type` gives it (and data-model.md), and `src/fold.ts` with `export type Fold = (node: Node) => boolean`; export both from `src/index.ts`. `dom`, `hidden`, `gist` are declared here as stubs that throw `not implemented` until their tasks. **Test**: `pnpm typecheck`; `test/dom.test.ts` created with `node-type: a Node is plain JSON data` building a two-node tree by hand and round-tripping it through `JSON.stringify`/`JSON.parse`.

---

## Phase 3: User Story 1 - Get one tree from a chart (Priority: P1) 🎯 MVP

**Goal**: `dom(text, chart, conf)` returns the tree: selection, forcing, containment with water, roles, values.

**Independent Test**: `test/dom.test.ts` runs every worked example of `select-order` to `resolvers-see-normalised-text`, and `the-walk` step by step.

- [X] T004 [US1] Selection without forcing, in `src/dom.ts` (research `walk-order`, `chosen-set`, `dom-coordinates`): `dom` normalises the text, maps every chart row except `^`/`$` to copy coordinates through the inverse of the boundary map (original offset → first copy boundary for starts, last for ends), throws naming the tag when a row's tag is not in `conf.tags` (`dom-returns-a-tree`), sorts candidates by `(weak ? 1 : 0, -(length), key index in Object.keys(conf.tags), start)` and walks them: skip if already chosen; drop if it crosses a chosen row (`rel` is `overlaps` or `overlapped-by`); drop if it is inside a chosen row of the same tag (`rel` is `starts`, `during` or `finishes`); append its tag to the `also` of a chosen row it equals; else choose it. Build a flat provisional tree (`doc` with the chosen rows as nodes nested by containment is T006; here return `doc` with the chosen rows' nodes as a sorted flat list of children, enough to test selection). Add a `ponytail:` comment on the O(rows²) chosen-set scans. **Test**: `test/dom.test.ts`, one test per worked example, asserting the chosen tags and spans and `also`: `select-order: key order breaks a tie`, `select-order: keys swapped`, `select-order: weak waits`, `select-order: without weak`, `select-order: start breaks the last tie`, `crossing-loser-dropped: longer wins`, `outer-wins-same-tag: suffix match dropped`, `outer-wins-same-tag: other tag becomes a child` (children asserted in T006), `outer-wins-same-tag: separators`, `twins-become-also: code and ref`, `twins-become-also: keys swapped`, `otherwise-chosen: digit`, `dom-returns-a-tree: unknown tag throws`, `dom-returns-a-tree: empty text` (`doc (0,0)`, no children).

- [X] T005 [US1] Forcing and re-derivation (`forced-derivation-chosen`, research `derive-shared-module`, `derive-reports-rows`, `forcing`): move `pinned`, `Index`, `index` and `derive` from `src/find.ts` to new `src/derive.ts`, `index` taking an iterable of rows; `derive`'s `emit` gains `steps` (`{ row, as? }` per tag atom, `{ text, span, as? }` per regex atom, the `from` row first); `find` imports them and ignores `steps` (first commit: the move alone, `test/find.test.ts` green). Then in `src/dom.ts`: choosing a composed row runs `derivationOf(row)`, which indexes only the rows inside its span (with `^`/`$` when inside), runs the tag's searches in order, `from` rows inside in position order, and keeps the first emission spanning the row exactly, accepted by the resolver if the tag resolves (resolver roles from `valueOf`, a stub returning the copy text until T008), and none of whose rows crosses a chosen row (a usable derivation, `forced-derivation-chosen`; a forced row of the composed row's own tag is absorbed: its derivation's rows are forced instead); memoised per row key; no derivation: throw naming tag and span. Every step's row except `^`/`$` is chosen at once, recursively for composed ones, without the walk's tests, except that one equal to a chosen row of another tag becomes its twin. **Test**: `forced-derivation-chosen: recursion` (the `outer`/`inner` example, all seven rows chosen), `the-walk: step by step` (the walk's chart as `find` gives it, asserted first; then the chosen set, `num.also = ['amount']`, and the drop reason of `weight (5,9)`, `code (0,4)`, `num (5,6)`, `phrase (7,14)` via their absence), `selection-is-deterministic: same tree twice, and from a chart whose JSON lists tags in reverse` (`Chart.from` of a reversed-key JSON).

- [X] T006 [US1] Tree and water (`tree-by-containment`, research `tree-stack`): sort chosen rows by start ascending, end descending; nest with a stack; insert `text` nodes for every non-empty gap before, between and after a node's children (never inside a node with no children); map spans back to the original through `at` once, at the end. Replace T004's flat list. **Test**: `tree-by-containment: the walk's tree` (the whole tree of `the-walk`, deep-equal), `tree-by-containment: other tag becomes a child` (`num` › `digit`, `text "."`, `digit`), `leaves-partition-text: the walk` (leaves join to the text, each starts where the previous ended), `leaves-partition-text: every worked example` (loop over every toy conf and text of `test/dom.test.ts`: leaves partition, no two nodes cross, every child inside its parent, `also` only where twins were).

- [X] T007 [US1] Roles (`roles-from-forced-derivation`): after the tree is built, for each composed node set `attrs[as]` from its derivation's steps: the node object of the step's row (or of the node standing for it as a twin) for a tag atom, the step's text for a regex atom. Root nodes and water keep `{}`. **Test**: `roles-from-forced-derivation: tag atom` (`weight.attrs.unit === weight.children[2]`, same object), `roles-from-forced-derivation: regex atom` (the `price` example: `attrs.currency === '€ '`, children `text "€ "`, `n`).

- [X] T008 [US1] Values (`values-bottom-up`, `resolvers-see-normalised-text`, research `values-lazy`): memoised `valueOf(row)` on the copy's text: `undefined` when the tag has no resolver; root: `resolve({ value })`; composed: `resolve({ value, [as]: bound row's valueOf ?? its copy text, or the regex text })`; `null` throws `resolver of "<tag>" refused (<start>,<end>) at dom time` with original offsets. Forcing's acceptance (T005) uses it; nodes get `value` from it. **Test**: `values-bottom-up: weight and unit` (the example's tree with `value="5000 g"` and `value="kilogram"`, no value on `n`), `values-bottom-up: a refusal throws` (the `once` resolver; the error message names `n` and `(0,1)`), `resolvers-see-normalised-text: three spaces` (`word (0,7)` with `value "ab cd"`).

**Checkpoint**: `dom` complete; `pnpm test` green; the MVP is a tree a consumer can render.

---

## Phase 4: User Story 2 - Fold it and read the gist (Priority: P2)

**Goal**: `hidden` and `gist` with the four fate rules; the cases' gists reinstated and asserted.

**Independent Test**: `test/fold.test.ts` runs every fate-rule worked example; `test/gist.test.ts` asserts all 21 case gists.

- [X] T009 [US2] Fates, `hidden`, `gist` in `src/fold.ts` (`hidden-and-gist`, research `fates-on-the-node`, `fate-order`): `dom` copies each tag's `fate` onto its nodes and the original text onto `doc`, so the fold reads the tree alone (a tree parsed back from JSON folds with all four rules; a `doc` without `text` is an error). `hidden(doc, fold)`: (1) walk from `doc`, a node the policy folds is hidden with its whole subtree (the policy is never asked about `doc`); (2) connectors right to left: a connector leaf is hidden when the next leaf to its right that is not a separator is hidden; (3) brackets innermost first: hidden with their subtree when every non-separator leaf inside, except the delimiters (a leading and a trailing water child of exactly one character), is hidden and at least one is; (4) separator runs left to right: a run (separators and hidden leaves between two surviving non-separator leaves, or an edge) with no hidden leaf is untouched; otherwise all its separators are hidden except the strongest (`-` > `;` > `:` > `,` > space by contained character, leftmost on a tie), and that one too when the run is at an edge, right after the opening delimiter of a surviving bracket, or before a surviving leaf whose text begins with `.` `,` `;` `:` `!` `?` `)` `]` `}`. `gist` joins the text of leaves not hidden.  **Test**: `test/fold.test.ts` with the spec's conf `T`, one test per worked example: `fold-hides-subtree: a composed node` (tree asserted, then `Nota - fine`), `fold-hides-subtree: only a child inside a composed node` (`Nota ref - fine`), `fold-hides-subtree: nothing folded`, `connector-follows-its-right: folded right` (`Nota - fine`), `connector-follows-its-right: kept right` (`Nota del ref - fine`), `connector-follows-its-right: no mention follows` (`Nota del giorno`), `connector-follows-its-right: a kept connector bounds runs` (`A - B del ref - C`), `separators-untouched-without-a-fold: edges too` (` Nota, ref #12 `), `strongest-separator-survives: dash` (`Nota - fine`), `strongest-separator-survives: semicolon over comma` (`a; b`), `strongest-separator-survives: tie goes left` (`a b`), `no-separator-at-an-edge: start`, `…: end`, `…: bracket inner edge` (`Nota (fine)`), `…: before a full stop` (`Nota.`), `…: before a closing bracket` (`Nota (fine)`), `bracket-empties-out: emptied` (`Fornitura toner - saldo`), `bracket-empties-out: label stays` (`Fornitura toner (ref) - saldo`), `bracket-empties-out: water keeps it` (`Fornitura toner (urgente) - saldo`), `hidden-and-gist: the set` (folding `ref` in the first example: the `ref` node, its three leaves and the separator at `(4,5)`, and nothing else).

- [X] T010 [US2] The cases' `fold`/`gist` and the regression (`confs-for-the-fold`, `cases-carry-fold-and-gist`, `reinstated-gists`, `gist-regression`): in `confs/it-pa.json` set `"version": "it-pa@4"` and append `"paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }` after `sep`; in `confs/common.json` set `"version": "common@2"`, add pattern `"SEP"` copied verbatim from `confs/it-pa.json`, and append `"paren"` as above and `"sep": { "rx": "/%{SEP}/u", "fate": "separator" }`. Add `fold` and `gist` to every case of `cases/it-pa.json` (13) and `cases/common.json` (8) exactly as the two tables of `reinstated-gists` give them, `P-it` and `P-co` written out as lists. Add `fold?: string[]; gist?: string` to `PlaygroundCase` in `src/playground.ts`. **Test**: new `test/gist.test.ts`: `cases-carry-fold-and-gist: every case has both or neither` and `…: all 21 have both`; `gist-regression: <case name>` for each case (`gist(dom(text, find(text, conf), conf), (n) => fold.includes(n.tag)) === gist`); `gist-regression: nothing folded gives the text back` and `…: leaves partition the text` over every case. `test/it-pa.test.ts` and `test/common.test.ts` still pass unchanged. A gist that disagrees is judged by the rules (see the header); a corrected one is changed in the spec's table, in the case file and, if the difference from the old engine changes, in "Differences from the old engine", in the same commit.

**Checkpoint**: the library half of phase 2 is done.

---

## Phase 5: User Story 3 - See the tree and try folds in the playground (Priority: P3)

**Goal**: under the chart, the tree list and the fold panel; hidden leaves greyed.

**Independent Test**: `test/playground.test.ts` for the pure helpers; `pnpm dev` by eye per quickstart.md.

- [X] T011 [US3] In `src/playground.ts` (`playground-tree`, `playground-fold-panel`, `playground-mount`, research `playground-tree-and-fold`): export `treeLines(doc, text)` (one line per node but `doc`: two spaces per depth below `doc`, then `tag (start, end)`, then ` also=a,b` and ` value=…` when present, then the node's text in double quotes via `JSON.stringify`) and `greyed(doc, fold)` (spans of the leaves in `hidden(doc, fold)`, adjacent ones merged). In `mount`, under the drawing and legend: the tree as a `<pre>`-like list of `treeLines`, water lines dimmed; a fold panel of one checkbox per `Object.keys(compiled.tags)` in key order, checked state kept per case index in a `Map`, seeded from the case's `fold`; the gist printed under the panel; greyed spans drawn by cutting each text line into plain and `fewrd-grey` pieces, inline so the grid does not move. A box change redraws gist and greying only; a conf edit rebuilds the tree and keeps the checked tags that still exist. Keep the phase 1 behaviour otherwise, and the scoped-style injection. **Test**: `test/playground.test.ts` gains `playground-tree: treeLines of the walk` (the lines for `the-walk`'s tree, written out) and `playground-fold-panel: greyed merges adjacent hidden leaves` (on conf `T`'s `Nota ref #12 - fine` folding `ref`: `[[4,12]]`); then by eye with `pnpm dev`, the four checks of quickstart.md.

---

## Phase 6: User Story 4 - Open my own folder with fewrd-play (Priority: P4)

**Goal**: `fewrd-play` on `conf.json`, `cases.json`, `resolvers.ts` and the new `mount`.

**Independent Test**: `test/play.test.ts` over a temporary folder.

- [X] T012 [US4] In `play/server.ts`, `play/cli.ts`, `play/README.md` (`fewrd-play-folder`, research `fewrd-play-folder`): the CLI requires `conf.json` (error and usage when missing; usage text lists `conf.json`, `cases.json`, `cases.local.json`, `resolvers.ts|js`); the page fetches `/conf.json` and `/cases.json`, fills each case's missing `conf` with the folder name, and calls `mount(app, { confs: { [name]: { conf, resolvers } }, cases })`; the POST `/book.json` route and `save` are removed; the server writes nothing and still serves only `.json`, `.ts`, `.js` of the folder and the `/@fewrd/` files, on 127.0.0.1; `page()` stays exported. Replace every "book" and "recipes" in comments, usage and README with the new words. No dependency added; `play/package.json` untouched. **Test**: new `test/play.test.ts`: `fewrd-play-folder: serves conf.json and merged cases` (a temp folder with `conf.json`, `cases.json`, `cases.local.json`; `play({ dir, fewrd: <temp lib dir> })` on port 0; GET `/conf.json`, `/cases.json` (both lists appended), `/` (the page contains `confs:` and no `save`)), `fewrd-play-folder: POST is refused` (405), `fewrd-play-folder: a file outside the folder is 404`.

---

## Phase 7: User Story 5 - Read how the DOM half works (Priority: P5)

- [X] T013 [US5] In `README.md` (`readme-complete`): after The chart, add The tree (the `Node` type, water, leaves, `also`, roles, values, with the walk's tree as the example), Selection (`select-order`, take or drop, forcing, in the voice of The rules), The rules of the fold (`fold-hides-subtree`, connector fate, separator fate, emptying, and the order they apply), Rendering it yourself (a dozen lines walking the tree to HTML, marking `hidden` nodes with `data-fold`, the `.condensed [data-fold] { display: none }` switch); update Why (both halves, `text + conf → Chart → Node`), Quick start (ends with `dom` and `gist` on the shop conf, output checked by running it), The conf (`fate` takes `bracket`; `doc`, `text` reserved), Playground (tree, fold panel, greying; fewrd-play and its folder), Develop (new test files); badges honest: run `pnpm test` for the count and `pnpm build` then gzip `dist/index.js` for the size. **Test**: the quick start's code runs against the source as written (paste into a scratch script, run with `node`, compare the printed output); every rule in Selection and The rules of the fold matches a requirement of the spec.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T014 Constitution wording check (`constitution-wording`): compare `.specify/memory/constitution.md` principle II's section names with the README's headings from T013, and its Data Contracts' tree invariants with what `leaves-partition-text` tests. On any disagreement, fix the constitution with a PATCH bump (3.1.x) and a Sync Impact Report line. **Test**: a read-through; `grep` that every README heading named in principle II exists.

- [X] T015 `CHANGELOG.md` (`changelog-entry`): a new entry above phase 1's, "Unreleased: the rewrite, phase 2 (the DOM half)": Added (`dom`, `hidden`, `gist`, `Node`, `Fold`; `fate: 'bracket'`; reserved `doc`, `text`; brackets in both confs and separators in common; `fold`/`gist` on every case; the tree list and fold panel; `treeLines`, `greyed`); Changed (`normalise`'s boundary map per UTF-16 unit; `it-pa@4`, `common@2`; `fewrd-play` reads `conf.json` and writes nothing); version unchanged until release. **Test**: `pnpm typecheck`, `pnpm test`; the spec's Status line updated and every "not yet run" mark removed or kept only where an example still is not run (there should be none).

---

## Dependencies & Execution Order

- T001 first (it changes `find`'s mapping; every later test runs through it).
- T002, T003 before US1. T003 depends on nothing but T002's types.
- US1 is sequential: T004 → T005 → T006 → T007 → T008 (one file, `src/dom.ts`, each building on the last).
- US2: T009 needs T008's tree; T010 needs T009.
- US3 (T011) needs T009 (`hidden`) and T010 (`PlaygroundCase` fields).
- US4 (T012) needs T011's `mount` behaviour only through the built `dist/` at run time; its test does not import `src/playground.ts`, so it can run in parallel with T011 once T010 is done.
- US5 (T013) after T011 and T012. T014 after T013. T015 last.

### Parallel opportunities

- T011 [US3] and T012 [US4] touch different packages and different test files.
- Within T009, writing `test/fold.test.ts` can proceed while T008 lands (same toy conf, independent of values).

## Implementation Strategy

**MVP**: Phases 1–3 (T001–T008): `dom` returns the tree, fully tested on toy confs. A consumer can render it.

**Then**: Phase 4 makes fewrd do what its tagline says (the gist) and pins it on the real corpus; Phases 5–6 make it visible; Phases 7–8 make it documented and consistent. Commit per task; the gate passes after every commit.
