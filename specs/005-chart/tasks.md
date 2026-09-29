---

description: "Task list for The Chart (rewrite, phase 1)"
---

# Tasks: The Chart (rewrite, phase 1: the finding half)

**Input**: Design documents from `/specs/005-chart/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md), [quickstart.md](quickstart.md), and the brief, [`specs/rewrite-brief.md`](../rewrite-brief.md)

**Tests**: Required by the brief: every task names its test. Tests are written first in each group and fail until the implementation task after them lands. Core rules are tested with the spec's toy confs, inline (principle III's core-mechanics exception); the Italian conf only through `cases/it-pa.json`. Each test is named after the requirement it checks, by its short name (`root-rows-every-match: the guard`), never by its number.

**Worked examples**: every example in the spec is hand-written and marked "not yet run". Each goes into a test exactly as written. When the code disagrees, decide which is right by the rules: if the example is wrong, correct it **in the spec** in the same commit; never adjust only the test's expectation. If the code is wrong, fix the code.

**Order**: the brief's (section 4, step 7): types and compile, Chart, root scan, matcher, pass loop, `find`, the Italian conf and its case assertions, playground, README, CHANGELOG.

**Gate after every task group**: `pnpm typecheck` and `pnpm test` pass. Commit per group (conventional commits), no push.

## Path Conventions

Single project. New: `src/conf.ts`, `src/chart.ts`, `src/find.ts`, `src/index.ts`, `src/playground.ts`, `confs/it-pa.json`, `confs/it-pa.ts`, `playground/index.html`, `playground/main.ts`, `test/*.test.ts`, `CHANGELOG.md`. Edited: `package.json`, `tsconfig.json`, `README.md`, `specs/005-chart/spec.md` (examples corrected, marks removed). **Not touched**: `src/normalise.ts`, `play/`, `vite.lib.ts`, `tsconfig.build.json`, `cases/*.json`.

Old code worth reading before writing (git history, not to be restored): `git show main:src/compile.ts` (splicing, `isObj`, error style), `git show main:src/read.ts` (word guard, `pinned()`, `WeakMap` cache), `git show main:src/playground.ts` (scoped style injection, editor with inline errors).

---

## Phase 1: Setup

- [x] T001 Point config at the new layout: in `tsconfig.json` `include`, replace `"recipes"` with `"confs"`; in `package.json`, remove `"book.schema.json"` from `files` and the `"./book.schema.json"` entry from `exports` (keep `.` and `./playground`, keep the version). **Test**: `pnpm typecheck` and `pnpm test` still pass on the slate.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the conf types, `compile`, and the `Chart`. Every story reads them.

### Types and compile

- [x] T002 [P] Write `test/conf.test.ts` (imports from `../src/index.ts`), one test per bullet, named after the requirement:
  - `compile-never-throws`: `compile` on `null`, `[]`, `'x'`, `42`, `{}` returns errors and never throws; one test per error kind, each asserting `path`, `tag` and that the tag is left out: unknown tag in `from`; unknown tag in an atom (a name and a name inside a list); a tag with both `rx` and `search`; a tag with neither; a search with both `back` and `forward`; a search with neither; a bad pattern (not `/source/flags`, and an invalid regex like `/(/u`); an unknown `%{NAME}`; a circular `%{A}`→`%{B}`→`%{A}`; an unknown resolver; a reserved name (`^`, `$`, `*`) declared as a tag; a reserved name in `from`; wrong types (`version` not a non-empty string, `weak` not a boolean, `fate` not `separator`/`connector`, an atom that is not an object).
  - `compile-never-throws: one broken tag`: with three tags and the middle one broken, the other two compile and keep their key order.
  - `compile-never-throws: a reference to a left-out tag`: tag `b` searches `from: "a"`, `a` has a bad pattern; exactly one error (for `a`), and `b` is kept.
  - `patterns-splice-by-name`: `%{X}` with `X = "a|b"` spliced into `/%{X}c/u` matches `ac` and `bc` but not `a` alone (one unit); recursive splicing; `%\{` stays literal.
  - `resolvers-by-name`: a named resolver arrives as the same function on the compiled tag.
  - `conf-is-plain-data`: `weak` and `fate` pass through compile unchanged; `patterns` is kept as given.
  - `priority-is-key-order`: the compiled `tags` keys are in the data's key order.
- [x] T003 Write `src/conf.ts` exactly per [contracts/public-api.md](contracts/public-api.md) and `compiled-conf-is-the-same-shape` in research: the generic types `Conf<P = string, R = string>`, `Tag<P, R>`, `Search<P>`, `Atom<P>`, `Resolve`, `CompileError { path; tag?; message }`, and `compile(data: unknown, options?)`. Tag rule: "exactly one of rx / search". Search rule: "exactly one of back / forward". Reserved names `^` `$` `*`: "usable in atoms, never declarable", and not in `from`. Error paths like `tags.protocol.search[0].back[3].tag`, `""` for the root. Reuse the splicing and pattern parsing of the old `compile.ts` verbatim where it fits. Unknown keys, `as` equal to `value`/`^`/`$`/`*`, an optional outermost atom and two regex atoms in a row are errors too (spec `compile-never-throws`). Create `src/index.ts` re-exporting `conf.ts`. **Test**: T002, `node --test test/conf.test.ts`.

### Chart

- [x] T004 [P] Write `test/chart.test.ts`, named after requirements:
  - `chart-invariants`: `Chart.empty(5).toJSON()` is `{ "$": [[5,5]], "^": [[0,0]] }`; after `with` in any order, each tag's rows are sorted by start then end and unique; `toJSON` keys are in code-unit order; `Chart.from(c.toJSON())` equals `c` (compare `toJSON`), and `JSON.parse(JSON.stringify(c))` round-trips; a tag with no rows is absent.
  - `chart-is-immutable`: `with` returns a new chart, leaves the old one unchanged, ignores triples already present (`size()` unchanged when all are present), and the `spans()` list of an untouched tag is the same object (`===`) in both charts.
  - `chart-queries`: `has`, `after`, `before`, `spans`, `size`, each with a tag and with `*`; `after` is the first span with start ≥ pos, `before` the last with end ≤ pos; `all()` orders by start, end, then tag name; `spans` of an absent tag is `[]`.
  - `allen-relations`: one case per relation, 13, on proper intervals; then `rel([0,0],[0,5]) === 'meets'`, `rel([0,5],[5,5]) === 'meets'`, `rel([3,3],[3,3]) === 'equals'`.
- [x] T005 Write `src/chart.ts` per contract and `chart-internals` and `allen-relations-order` in research: `Span`, `AllenRelation`, `class Chart` over a `ReadonlyMap<string, readonly Span[]>` plus `n`, copy-on-write per tag list, `rel`. Add a `ponytail:` comment on the list scans: linear or binary search per list is enough at subject length; index by position if subjects grow. Re-export from `src/index.ts`. **Test**: T004, `node --test test/chart.test.ts`.

**Checkpoint**: commit `feat: conf, compile and chart`.

---

## Phase 3: User Story 1 - Write a conf and get its chart (Priority: P1) 🎯 MVP

**Goal**: `find(text, conf)` returns the complete chart, to a fixpoint.

**Independent Test**: every worked example of the spec passes in `test/find.test.ts`.

All tests in this phase go in `test/find.test.ts`, import from `../src/index.ts`, and share one helper, `invariants(chart, text)`, asserting `chart-invariants` (sorted, unique, `^ [0,0]`, `$ [n,n]` with `n = text.length`, every span within `[0, n]`, JSON round-trip). Every test calls it on the chart it checks.

### Root scan

- [x] T006 [US1] Tests for root rows, each the spec's worked example verbatim: `root-rows-every-match: the guard` (`12 345 x9`), `: overlap` (`a b c`), `: zero length` (`ab`), `: resolve` (`12 7 30`, with the `even` resolver); `match-on-normalised-text` (`x   12`, three spaces, gives `n [[4,6]]`, `$ [[6,6]]`); and the edge case `find` on `""` gives `{ "$": [[0,0]], "^": [[0,0]] }`.
- [x] T007 [US1] Write `src/find.ts` with the root scan only: `normalise` the text; scan every root tag per `root-scan` in research (`gd` variant cached in a `WeakMap` per `RegExp`, `lastIndex = match.index + 1` after every match, skip zero-length, word guard with `/[\p{L}\p{N}]/u` on both edges, resolver filter with `{ value }`); build the chart from `Chart.empty(L)`; map every span back through `at` once, at the end, into a chart of the original length. Export `find(text, conf: Conf<RegExp, Resolve>): Chart` and re-export it from `src/index.ts`. **Test**: T006.

### Matcher

- [x] T008 [US1] Tests for the matcher, one per rule and per atom kind, each the spec's worked example verbatim unless noted:
  - `searches-run-from-rows` (`no 42 ok`: `labelled` and `counted`, twins).
  - `atoms-meet-the-cursor: alternatives` (`ab 7 42`, `alt`).
  - `atoms-meet-the-cursor: ^ and $` (`ab cd`, `first`, `last`).
  - `atoms-meet-the-cursor: regex between atoms` (`(ab) (c`, `group`).
  - `atoms-meet-the-cursor: regex last` (`€ 5 kg`, `weight` forward and `price` back).
  - `atoms-meet-the-cursor: optional` (`k:7 k: 8`, `entry`).
  - `atoms-meet-the-cursor: nothing possessive` (`big red 7`, `named`).
  - Two regex atoms in a row, an optional outermost atom, unknown keys and `as: "value"` are compile errors (tested in `test/conf.test.ts`, spec `search-has-one-direction` and `compile-never-throws`).
  - `atoms-meet-the-cursor: regex between atoms, going back`; `chart-complete-and-neutral: packing` (a row reached by two derivations appears once) and `passes-to-a-fixpoint: rows inside rows are kept`.
  - `atoms-meet-the-cursor: empty regex slice`: `{ "from": "open", "forward": [{ "rx": "/[^()]*/u" }, { "tag": "close" }] }` on `()` gives `group [[0,2]]`.
  - `composed-rows-resolve` (`5 kg 3 g`, `weight` with `canon` and `metric`); plus: a role bound to a row whose tag has no `resolve` receives the row's text.
  - `chart-complete-and-neutral: crossing kept`, `: twins kept`, `: packing` (rows inside rows kept), all from the `x.y.z` example.
  - `compile-never-throws: a reference to a left-out tag` finds no rows of the referring search and does not throw.
- [x] T009 [US1] Add the matcher to `src/find.ts` per `matcher-is-a-depth-first-enumeration`, `pinned-regexes` and `role-values-are-transient` in research: one pass of every search against a given chart; the pending-regex device; `^`/`$` as ordinary rows; `*` over every tag; roles `{ value, ...as }` with values from the transient map; searches in code-unit order of tag name, `from` rows in span order. Put the brief's `ponytail:` comment on the matcher: "exponential in the number of optional atoms per search, quadratic chart under `*` on a self-growing search". Wire it for a single pass after the roots. **Test**: T008.

### Pass loop

- [x] T010 [US1] Tests for the loop: `passes-to-a-fixpoint` (`1 2 3`, `list [[0,3],[0,5],[2,5]]`, `size()` 10); `atoms-meet-the-cursor: any tag` (`ab 7 42`, `star [[0,4],[0,7],[3,7]]`, which needs a second pass); `passes-to-a-fixpoint: a long self-growing search` (the fixpoint success criterion: the `list` conf over the numbers 1 to 100 separated by spaces ends, with 4,950 `list` rows).
- [x] T011 [US1] Add the pass loop to `src/find.ts` per `pass-loop` in research: run every search against the previous chart only, add the pass's rows at once with `with`, stop when `size()` does not change; no pass cap. **Test**: T010, and T006 and T008 still pass.

### find, end to end

- [x] T012 [US1] Tests: `find-is-deterministic` (for every toy conf in this file, reversing the key order of `tags` gives the same `JSON.stringify(find(...))`); `chart-holds-rows-only` (the chart JSON of the `composed-rows-resolve` example has only tag keys and span arrays, no values); the quickstart example of [quickstart.md](quickstart.md) section 3, asserting its printed JSON exactly.
- [x] T013 [US1] Make `src/index.ts` export exactly what [contracts/public-api.md](contracts/public-api.md) lists for `fewrd`, and nothing else (`normalise` stays internal). **Test**: T012, and `pnpm typecheck`.
- [x] T014 [US1] Remove the "not yet run" marks from the spec's worked examples that now pass, and correct in `specs/005-chart/spec.md` any example the code proved wrong (with its offsets and charts). **Test**: every test of `test/find.test.ts` passes with the spec's examples exactly as the spec now states them.

**Checkpoint**: commit `feat: find, the finding half to a fixpoint`. User Story 1 is usable on its own.

---

## Phase 4: User Story 2 - The Italian conf proves the format (Priority: P2)

**Goal**: the Italian subjects come out tagged as expected.

**Independent Test**: `node --test test/it-pa.test.ts`.

- [x] T015 [P] [US2] Create `confs/it-pa.json` as the fenced JSON block of `italian-conf-in-new-format` in the spec, verbatim.
- [x] T016 [US2] Create `confs/it-pa.ts`: import the JSON with `with { type: 'json' }`; export `itPaResolvers: Record<string, Resolve>` with `date` (accept `d/m/yyyy` with `.` `-` `/` separators when day is 1–31 and month 1–12, return `YYYY-MM-DD`, else `null`; the old `isoDate` in `git show main:recipes/it-pa.ts`), `cig` (accept when the value has both a letter and a digit), `protocol` (return the first seven-digit run in the value), `amount` (find `\d+(?:\.\d{3})*(?:,\d{1,2})?` in the value and return it as `12450.00`); compile with them, throw at import if `errors` is non-empty, export the compiled `itPa`. Import only from `../src/index.ts`. **Test**: T017's first test.
- [x] T017 [US2] Write `test/it-pa.test.ts` reading `cases/it-pa.json`:
  - `italian-conf-in-new-format`: compiling `confs/it-pa.json` with `itPaResolvers` gives no errors.
  - `italian-cases-tagged`: the spec's table as a map from case name to `{ tag: [texts] }`; for each case, for each of `dated`, `protocol`, `cig`, `cup`, `chapter`, `cdr`, `provvedimento`, `amount`, `date`, `quotation`, `caps` (and `connector` for the five connector cases), the sorted list of `text.slice(start, end)` over `chart.spans(tag)` equals the sorted expected list (empty when the table does not list the tag). A test per case, named after the case.
  - `chart-invariants` and `find-is-deterministic` on every case (reverse the Italian conf's `tags` and compare JSON).
- [x] T018 [US2] Make T017 pass. Where the table is wrong by the rules, correct the table in `specs/005-chart/spec.md`; where the conf misses what the table rightly expects, fix the conf in both `confs/it-pa.json` and the spec's JSON block, keeping them identical and bumping nothing (the version is `it-pa@3` until release). Remove the table's "not yet run" mark. Record in the spec's Open points anything the vocabulary proved unable to express. **Test**: T017.

**Checkpoint**: commit `feat: the Italian conf in the new format`. Phase 1's end condition, the Italian subjects tagged as expected, is met.

---

## Phase 5: User Story 3 - See the chart in the playground (Priority: P3)

**Goal**: `pnpm dev` draws every Italian case brat-style, with a live conf editor.

**Independent Test**: `node --test test/playground.test.ts`, then quickstart section 4 by eye.

- [x] T019 [P] [US3] Write `test/playground.test.ts` for `lanes` (import from `../src/playground.ts`): rows that do not overlap share lane 0; two crossing rows take lanes 0 and 1; rows that touch (`[0,2]`, `[2,4]`) share a lane; three rows over one span take three lanes; order within a lane follows `all()` order. Name them `playground-draws-chart: lanes …`.
- [x] T020 [US3] Write `src/playground.ts` per contract and `playground-draws-with-ch-units` in research: `mount(el, { conf, resolvers, cases })` and `lanes`. The editor shows `JSON.stringify(conf, null, 2)`; every `input` event parses, compiles, re-finds every case (`playground-live-conf`: parse errors keep the last good charts, compile errors listed with their paths, a throw in one case shown on that case). Each case: name, text in a monospace line, one lane per level with bands at `left: start ch; width: (end - start) ch`, tag name inside the band and in `title`, one colour per tag from a hash of its name, zero-length rows not drawn (`playground-draws-chart`); then `tag(start,end)` lines in `all()` order (`playground-prints-chart`). No values, no fold, no tree (`playground-finds-only`). Styles injected once, scoped under one class, readable in light and dark. `ponytail:` comment on `ch` positioning drifting after astral characters. `PlaygroundCase` exported. **Test**: T019, then T021.
- [x] T021 [US3] Create `playground/index.html` (a single `#app` element and `main.ts` as module) and `playground/main.ts` mounting the Italian conf data (`confs/it-pa.json`), `itPaResolvers` and `cases/it-pa.json` (`dev-opens-italian`). **Test**: `pnpm dev`, then the checks of [quickstart.md](quickstart.md) section 4.

**Checkpoint**: commit `feat: the chart playground`.

---

## Phase 6: User Story 4 - Read how finding works (Priority: P4)

**Goal**: the README tells the finding half; principle II's source of truth exists.

**Independent Test**: read it; run its quick start.

- [x] T022 [US4] Rewrite `README.md` for the finding half (`readme-finding-half`), keeping the header block (logo, tagline, badges) and updating the badges (core size from `pnpm build`, test count from `pnpm test`). Sections: **Why** (what recurs, the chart keeps everything, choosing is phase 2); **Install**; **Quick start** (a small conf in JSON, `compile`, `find`, the printed chart); **The conf** (keys, patterns and `%{NAME}`, root and composed tags, searches and atoms, `^` `$` `*`, `as`, `optional`, `resolve`, `weak` and `fate` read only by the DOM half, compile errors; the longest-first advice from `root-scan`; the `as: "value"` note from Open points); **The rules** (the six rules of `root-rows-every-match` to `chart-complete-and-neutral`, one bullet each, in the old README's voice, then one sentence saying selection, the tree, the fold and the separator and connector fates come in phase 2); **The chart** (what it holds, its invariants, the query methods, `rel`, caching by `(text, conf.version)`); **Playground** (`mount` and `pnpm dev`; `fewrd-play` not yet updated); **Develop**. Use only the closed vocabulary. Do not hard-wrap. **Test**: run the quick start's code as written and compare its output with the README; `grep -niE 'recipe|book|mention|leaf|cuts|entity' README.md` finds nothing but the license line or a deliberate "formerly" note.

**Checkpoint**: commit `docs: README for the finding half`.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 Create `CHANGELOG.md` with an `## Unreleased: the rewrite, phase 1` entry (`changelog-entry`): added (conf format, `compile`, `Chart`, `rel`, `find`, the chart playground, the Italian conf `it-pa@3`); removed (`read`, `gist`, `html`, `shown`, books, recipes, `Mention`/`Leaf`/`Cuts`/`Fold`, `book.schema.json`, the old `mount` options); version unchanged until release. **Test**: none beyond review; it is prose.
- [ ] T024 Final pass over `specs/005-chart/spec.md`: no "not yet run" mark remains (the worked-examples success criterion); Open points updated with anything learned in implementation. **Test**: `grep -n "not yet run" specs/005-chart/spec.md` finds nothing.
- [ ] T025 Full gate: `pnpm typecheck`, `pnpm test`, and `pnpm build` (checks both public entries build; `dist/` stays gitignored); `package.json` `dependencies` still empty and no devDependency added (`zero-dependencies`). **Test**: the three commands pass.

**Checkpoint**: commit `chore: changelog, final gate`.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T005)** → everything else.
- **US1 (T006–T014)** depends on Foundational; strictly in order, since each step extends `src/find.ts` and its tests.
- **US2 (T015–T018)** depends on US1 (`find`). T015 can be written any time.
- **US3 (T019–T021)** depends on US1; its drawing of the Italian cases (T021) on US2's conf. T019 can be written any time after Foundational.
- **US4 (T022)** after US1–US3, since it documents what the tests proved and shows the playground.
- **Polish (T023–T025)** last.

## Parallel Opportunities

- T002 and T004 (the two foundational test files) together; then T003 and T005 are separate files and can proceed side by side.
- T015 (the conf JSON, a copy from the spec) and T019 (the `lanes` tests) alongside US1.

## Implementation Strategy

MVP is User Story 1: with `compile`, `Chart` and `find`, any conf gives its chart and every rule is proven. User Story 2 then proves the vocabulary on real text and closes phase 1's end condition; stop and review with the maintainer there if the Italian table needed more than small corrections. User Stories 3 and 4 make the result visible and documented. Phase 2 (the DOM half) is not planned here.
