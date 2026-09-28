---

description: "Task list for Recipes as Data"
---

# Tasks: Recipes as Data

**Input**: Design documents from `/specs/003-recipes-as-data/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md), [quickstart.md](quickstart.md)

**Tests**: `compile` is pure and gets automated tests first (`node --test`,
synthetic toy books inline, per Principle III's core-mechanics exception).
The demo book's behaviour stays guarded by the unchanged
`test/read.test.ts`, plus a one-off identity comparison (SC-001). The
playground's data mode is verified manually in the browser, as in feature
002 — no DOM test dependency.

**Organization**: Tasks are grouped by user story. US2 depends on US1's
`compile`. US3's schema (T014) needs only the data model and can be written
in parallel with US1.

## Path Conventions

Single project. New: `src/compile.ts`, `recipes/it-pa.json`,
`book.schema.json`, `test/compile.test.ts`. Edited: `src/types.ts`,
`src/index.ts`, `src/playground.ts`, `recipes/it-pa.ts`,
`playground/main.ts`, `package.json`, `README.md`. **Not touched**:
`src/read.ts`, `src/render.ts`, `src/normalise.ts` (FR-007).

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] In `package.json`, add `"book.schema.json"` to `files`
  (after `"dist"`), so the schema ships at the package root.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `src/types.ts`, add the source-side types exactly as in
  [contracts/public-api.md](contracts/public-api.md): `Resolver`
  (`NonNullable<Recipe['resolve']>`), `NeighbourData`, `RecipeData`,
  `BookData`, `CompileError` (`path`, `recipe?`, `entity?`, `message`),
  `CompileOptions` (`resolvers?: Record<string, Resolver>`). Doc-comment
  that patterns are `"/source/flags"` strings and `defs` are referenced as
  `%{NAME}`. Update the file's header comment: the runtime reading stays
  plain data; `BookData` is a book's plain-data *source*.

**Checkpoint**: Types exist — US1 and US3 can start.

---

## Phase 3: User Story 1 - Write my recipe book as a data file (Priority: P1) 🎯 MVP

**Goal**: A JSON book plus a resolver set compiles to a `Book` that reads
exactly like a hand-written one; errors are per recipe and never fatal; the
demo book is JSON and reads identically.

**Independent Test**: compile a small data book (2–3 recipes, one fragment,
one resolver) and confirm `read` gives the same result as the equivalent
hand-written book (spec US1 Independent Test).

### Tests for User Story 1 (write first, confirm they fail)

- [X] T003 [US1] Create `test/compile.test.ts` with synthetic toy books only
  (no `it-pa` patterns). Cover, each as its own `test(...)`:
  - equivalence: a toy data book (anchor, left+right neighbours,
    `requires`, a `resolve` name, `weak`) compiled vs the hand-written
    `Book` → `JSON.stringify(read(text, …))` equal on 3 texts;
  - flags carried through (`/abc/i` matches `ABC`; `/x/u` keeps `u`);
  - `defs`: nested reference (`B` uses `%{A}`) works; a fragment `a|b`
    inside `/x%{F}y/u` matches `xay` but **not** a bare `b` (single unit);
    `%\{` matches a literal `%{`;
  - errors, each asserting `path`, `recipe`, `entity` and that the other
    recipes survive **in order**: invalid regex (`/(/u`), invalid flags
    (`/a/q`), no leading or closing slash (`"abc"`), unknown fragment,
    circular fragment (message contains `A → B → A`), unknown resolver,
    wrong type (`weak: "yes"`, `anchor: 3`), unknown key (`wek`), missing
    `entity`/`anchor`, missing neighbour `part`/`rx`, non-string def (path
    `defs.NAME`);
  - one recipe with two problems reports both;
  - `recipes: []` → empty book, no errors; unused resolver → no error;
    top-level `$schema` accepted;
  - root not an object / `recipes` not an array / bad `version` → the
    matching root-level error, `book.recipes` empty (or `version: ""`);
  - determinism: compiling the same input twice gives deep-equal results.

### Implementation for User Story 1

- [X] T004 [US1] Create `src/compile.ts` implementing
  `compile(data: unknown, options?: CompileOptions): { book: Book; errors: CompileError[] }`
  per [data-model.md](data-model.md#compile-result). It never throws;
  narrow `unknown` with type guards (no `any`, no casts that skip checks).
  Pattern parsing: must start with `/`; last `/` splits source/flags.
  Fragment expansion: `%{NAME}` (NAME `[A-Za-z_][A-Za-z0-9_]*`, not
  preceded by `\`) → `(?:…)`, recursive, cycle detection via the current
  stack with the chain in the message. Then `new RegExp(source, flags)`,
  catching its error into a `CompileError`. Unknown keys are errors
  (root allows `$schema`). A recipe with any error is dropped; the others
  keep relative order. Export the accepted and required key lists as
  `export const KEYS = { book, recipe, neighbour }`, each
  `{ all: string[]; required: string[] }` (used by the drift test
  in T015; not re-exported from `src/index.ts`). Make T003 pass.
- [X] T005 [US1] In `src/index.ts`, export `compile` and the types from T002.
- [X] T006 [P] [US1] Create `recipes/it-pa.json` from today's
  `recipes/it-pa.ts`: `"$schema": "../book.schema.json"`, `version`
  `"it-pa@1"` (unchanged: output must not change), `defs` `DATE`,
  `LABEL_WORDS`, `CAPS_WORD` (which uses `%{LABEL_WORDS}`), then the eight
  recipes in the same order, each pattern as `"/source/flags"` with the
  exact same source and flags (JSON-escaped backslashes), and `resolve`
  names `protocol`, `cig`, `amount`, `date`.
- [X] T007 [US1] Rewrite `recipes/it-pa.ts`: keep `isoDate` and `mixed`;
  define `itPaResolvers` with the four resolve functions, verbatim;
  `import data from './it-pa.json' with { type: 'json' }`; compile it;
  **throw** at import time if `errors` is non-empty (listing them). Export
  `itPa: Book`, `itPaData: BookData`, `itPaResolvers`. Import only from
  `../src/index.ts` (existing boundary test). The per-recipe exports go
  away (contract).
- [X] T008 [US1] SC-001 identity check (one-off, scratchpad, not
  committed): load the previous book from `git show HEAD:recipes/it-pa.ts`
  (import path pointed at this repo's `src/index.ts`) and compare
  `JSON.stringify(read(text, old))` with `read(text, itPa)` for every text
  in `playground/cases.ts` and every literal text in `test/read.test.ts`.
  Expect 0 differences. Then `pnpm test` and `pnpm typecheck` green.

**Checkpoint**: US1 complete — data books compile, the demo is JSON, output unchanged.

---

## Phase 4: User Story 2 - Edit my recipes live in the playground (Priority: P2)

**Goal**: Mounting with `{ data, resolvers }` shows an editor; edits re-read
every case live; errors show inline; reset restores; book mode is unchanged.

**Independent Test**: spec US2 Independent Test / [quickstart.md §5–6](quickstart.md).

- [X] T009 [US2] In `src/playground.ts`, widen `MountOptions` to the union
  in the contract (`CommonOptions & { book }` | `CommonOptions & { data; resolvers? }`).
  Refactor so the current book is a mutable variable: move the per-entity
  colour rules into a function regenerating `style.textContent`, and the
  fold `<select>` options into a function that rebuilds them from
  `entities(currentBook)`, keeping selected entities that still exist (new
  ones unselected, gone ones dropped from the selection). Book mode's
  rendered UI must stay as in feature 002.
- [X] T010 [US2] In `src/playground.ts`, data mode only: add above the trial
  a section with a monospace `<textarea class="fewrd-book">`
  (`JSON.stringify(data, null, 2)`), an error list (`path` · entity ·
  message; the parse error when JSON fails), and a reset button. On
  `input`: `JSON.parse` → on failure show the parse error and keep the
  current book; else `compile(parsed, { resolvers })`, show its errors, swap
  the book, refresh colours and fold options, re-render all. The initial
  compile's errors are shown at mount too (analyze U1). Reset restores
  the original text and recompiles. Scoped styles for the editor and
  errors go in the injected `<style>`. No debounce (add a `ponytail:`
  comment naming the ceiling).
- [X] T011 [US2] In `src/playground.ts`, wrap each case/trial render so an
  exception while reading or rendering shows its message on that case only
  and the others still render (FR-011).
- [X] T012 [US2] In `playground/main.ts`, mount with
  `{ data: itPaData, resolvers: itPaResolvers, cases: CASES, fold }`.
- [X] T013 [US2] Browser verification (`pnpm dev`, or a fresh vite on a
  free port for this worktree): run [quickstart.md §5](quickstart.md)
  steps 1–6 and §6 (temporarily mount `{ book: itPa }`, then revert).
  Screenshot the inline-error state. Note whether typing in the editor
  feels instant on the demo (SC-004, analyze C2).

**Checkpoint**: US2 complete — live editing works on the demo.

---

## Phase 5: User Story 3 - Get help from my editor while writing a book (Priority: P3)

**Goal**: A published JSON Schema validates and autocompletes a data book.

**Independent Test**: spec US3 Independent Test / [quickstart.md §7](quickstart.md).

- [X] T014 [P] [US3] Create `book.schema.json` (draft 2020-12, `$id`-less,
  `title`, a `description` on every property for editor hover docs):
  `$defs.pattern` (string, `pattern: "^/.*/[dgimsuvy]*$"`),
  `$defs.neighbour` (`part` non-empty string, `rx` pattern; both required;
  `additionalProperties: false`), `$defs.recipe` (fields per
  [data-model.md](data-model.md#recipedata); `entity`, `anchor` required;
  `additionalProperties: false`), root (`$schema`, `version` non-empty,
  `defs` object whose keys match `^[A-Za-z_][A-Za-z0-9_]*$` and values are
  strings, `recipes` array of recipe; `version`, `recipes` required;
  `additionalProperties: false`).
- [X] T015 [US3] In `test/compile.test.ts`, add the drift guard: read
  `book.schema.json`, assert its root / recipe / neighbour `properties`
  keys equal `KEYS.book` / `KEYS.recipe` / `KEYS.neighbour` from
  `src/compile.ts` (order-insensitive), and that its required lists match
  compile's required fields.
- [ ] T016 [US3] Validate `recipes/it-pa.json` against the schema once
  (a one-off `npx` run of a draft-2020 validator, nothing added to
  `package.json` — ask before downloading), and leave the VS Code
  typo/missing-field/autocomplete check (quickstart §7) to the maintainer.
  *Open: the download was never approved. `compile` enforces a superset of
  the schema's rules, the demo books throw on load if they have any error,
  and T015 keeps the schema's keys in step with `compile`.*

**Checkpoint**: US3 complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Update `README.md`: a "Recipes as data" section (short JSON
  example with `$schema`, a `%{…}` fragment and a named resolver; the
  `compile` call and what `errors` contains; live editing via
  `mount(el, { data, resolvers, cases })`), rows for `BookData` and
  `compile` in "The pieces", the "Recipes" section pointing at
  `recipes/it-pa.json`, and the stale tests badge count. Every example is
  run before it goes in.
- [X] T018 Run [quickstart.md §1 and §3](quickstart.md): `pnpm typecheck`,
  `pnpm test`, `pnpm build`, `npm pack --dry-run` (listing includes
  `book.schema.json`, `dist/recipes/it-pa.json`, `dist/src/compile.js`; no
  `dependencies`), and the built-package `node -e` smoke test.

---

## Dependencies & Execution Order

- **Setup (T001)** and **Foundational (T002)**: no dependencies; T001 ‖ T002.
- **US1**: T003 → T004 → T005 → T007 → T008. T006 (JSON only) can run in
  parallel with T003–T005.
- **US2**: needs US1 (`compile`, `itPaData`). T009 → T010 → T011 (same
  file, sequential) → T012 → T013.
- **US3**: T014 needs only T002, so it can run in parallel with US1.
  T015 needs T004 + T014. T016 needs T006 + T014.
- **Polish**: T017 after US1–US3; T018 last.

### Parallel Opportunities

```text
T001 ‖ T002
after T002:  T003→T004→T005  ‖  T006  ‖  T014
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001–T002
2. T003–T008 → data books compile; demo is JSON; output identical
3. **Stop and validate**: `pnpm test`, identity check at 0 differences

### Incremental Delivery

1. US1 → a consumer can already keep their book as JSON
2. US2 → live editing in the playground (the payoff)
3. US3 → editor validation
4. Polish → README, release gates
