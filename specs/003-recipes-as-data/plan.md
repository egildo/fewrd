# Implementation Plan: Recipes as Data

**Branch**: `003-recipes-as-data` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-recipes-as-data/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a JSON source format for books and a `compile(data, { resolvers })` step
that turns it into today's runtime `Book`, reporting per-recipe errors
instead of throwing. Patterns are regex-literal strings (`"/source/flags"`),
shared pieces are `defs` referenced as `%{NAME}`, and `resolve` is a name
looked up in a caller-supplied resolver set — no `eval`. The demo book moves
to `recipes/it-pa.json` plus four resolvers, reading identically. A JSON
Schema ships for editors. `mount()` gains a data mode with a live editor,
inline errors and reset; the repo's playground uses it. The engine
(`read.ts`, `render.ts`) is untouched.

## Technical Context

**Language/Version**: TypeScript 5.9, `strict: true`, target `ES2024`, `module: NodeNext` — unchanged.

**Primary Dependencies**: none. JSON loads via import attributes
(`with { type: 'json' }`), verified working in node 25, `tsc` typecheck and
build, and vite 7 with **no config change** ([research.md R5](research.md#r5--loading-a-json-book-from-typescript--verified)).
No schema-validator devDependency ([R6](research.md#r6--the-published-format-description)).

**Storage**: N/A — the playground keeps edits in memory only.

**Testing**: `node --test`. New `test/compile.test.ts` with inline synthetic
toy books (core-mechanics exception of Principle III). Existing
`test/read.test.ts` unchanged, now exercising the JSON-compiled `itPa`.
SC-001 identity proven once by a scratchpad comparison script
([R7](research.md#r7--migrating-the-demo-book)). Playground data mode
verified manually in the browser, as in feature 002 (no DOM test dependency).

**Target Platform**: node ≥ 22 and current browsers/bundlers (import
attributes for JSON).

**Project Type**: library — adds `compile` and data types to the core entry,
a root `book.schema.json` file, and a data mode to `fewrd/playground`.

**Performance Goals**: compiling and re-reading the demo's cases on every
keystroke with no perceptible delay (SC-004); both take milliseconds, so no
debounce.

**Constraints**: MUST NOT modify `src/read.ts`, `src/render.ts` or
`src/normalise.ts` (FR-007). `recipes/it-pa.ts` still imports only from
`src/index.ts` (existing import-boundary test). No new dependency, runtime or
dev (FR-014).

**Scale/Scope**: one new module (`src/compile.ts`, ~100 lines), data types in
`src/types.ts`, one new JSON book, one JSON Schema, a rewritten
`recipes/it-pa.ts` (resolvers only), a data mode in `src/playground.ts`, one
new test file, README updates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence | Status |
|---|---|---|---|
| I. Zero Runtime Dependencies | No new `dependencies` / devDependencies | JSON via import attributes (no loader); schema hand-written, no validator | PASS |
| II. Deterministic, Documented Segmentation Rules | Reading behaviour unchanged; no nondeterminism | `compile` runs before `read` and produces the same `Book` shape; engine files untouched; `compile` is a pure function of `(data, resolvers)`; README "The rules" needs no change | PASS |
| III. Cases Are the Single Source of Test Truth | Demo-book behaviour stays tested through `playground/cases.ts` | Demo output is unchanged, so no case changes; `read.test.ts` keeps reading `CASES` against `itPa`. `compile` is core mechanics → synthetic toy books inline in its own test. The SC-001 old-vs-new comparison is a one-off scratchpad script, not a committed fixture | PASS |
| IV. Strict Types, No Escape Hatches | No `any`/`@ts-ignore`; build-free dev loop | `compile` takes `unknown` and narrows with type guards; JSON import typechecks natively under NodeNext; `node --test` runs it unbuilt (verified) | PASS |
| V. Simplicity and a Closed Vocabulary | New concepts only when the closed set can't express the need | The closed set cannot express a book that survives plain data (`Recipe` holds `RegExp` and functions) — justified in the spec's Key Entities. Additions are source-side only (`BookData`, `RecipeData`, `NeighbourData`, `CompileError`, `Resolver`) and one README row; the runtime vocabulary is unchanged | PASS (justified) |
| Data Contracts | `Cuts` stays plain data; `version` changes iff output can change | `Cuts` untouched; `it-pa@1` kept because output is identical (SC-001) | PASS |
| Development Workflow | Domain books under `recipes/` without touching the engine | `recipes/it-pa.json` + `recipes/it-pa.ts`; the workflow line naming `recipes/it-pa.ts` as a `Book` still holds (it exports the compiled `Book`) | PASS |

No violations; Complexity Tracking is empty.

**Post-Phase-1 re-check**: [data-model.md](data-model.md),
[contracts/public-api.md](contracts/public-api.md) and
[quickstart.md](quickstart.md) keep all changes inside the files listed below,
add no dependency, leave the engine and `Cuts` untouched, and confine the new
vocabulary to the source side. All gates still PASS. One deliberate
breaking change: the per-recipe exports of `fewrd/recipes/it-pa` are removed
(unused in repo; 0.x → release as 0.2.0 or later minor).

## Project Structure

### Documentation (this feature)

```text
specs/003-recipes-as-data/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── public-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
book.schema.json        # NEW — JSON Schema for BookData, shipped in the package

src/
├── types.ts            # + BookData, RecipeData, NeighbourData, CompileError, Resolver
├── compile.ts          # NEW — compile(data, { resolvers }) → { book, errors }
├── index.ts            # + export compile and the new types
├── playground.ts       # + data mode: editor, error list, reset, live recompile
├── read.ts             # unchanged
├── render.ts           # unchanged
└── normalise.ts        # unchanged

recipes/
├── it-pa.json          # NEW — the demo book as data (defs DATE, LABEL_WORDS, CAPS_WORD)
└── it-pa.ts            # rewritten — four resolvers + compile; exports itPa, itPaData, itPaResolvers

playground/
└── main.ts             # mounts in data mode (itPaData + itPaResolvers)

test/
├── compile.test.ts     # NEW — compile semantics + schema/compile key drift guard
├── read.test.ts        # unchanged
└── playground.test.ts  # unchanged

package.json            # files: + "book.schema.json"
README.md               # + "Recipes as data" section, vocabulary row, Recipes section update
```

**Structure Decision**: Single project, extending the existing layout.
`compile` gets its own module because it is a separate concern from reading
and rendering, but it is exported from the core entry — books are compiled
wherever they are read, and `recipes/it-pa.ts` must keep importing only from
`src/index.ts`.

## Complexity Tracking

> Not applicable — the Constitution Check above has no violations to justify.
