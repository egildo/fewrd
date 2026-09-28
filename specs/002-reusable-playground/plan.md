# Implementation Plan: Reusable Playground

**Branch**: `002-reusable-playground` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-reusable-playground/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Extract the playground's rendering logic out of `playground/main.ts` into a new
public entry, `fewrd/playground`, exposing a `mount(el, { book, cases, fold? })`
function any caller can use against their own `Book` and cases. The repo's own
demo playground becomes the first, thinnest possible consumer of that entry.
Per the resolved clarification, a supplied `fold` only seeds which entities
start selected in a single multi-select control — the control itself is the
live source of truth afterward, identical to the no-`fold` default path.

## Technical Context

**Language/Version**: TypeScript 5.9, `strict: true`, target `ES2024` — same as the rest of the project.

**Primary Dependencies**: none — plain DOM APIs only (the `DOM` lib is already in
`tsconfig.json`, added for the existing playground). No new runtime or dev
dependency.

**Storage**: N/A.

**Testing**: `node --test`, as today, but only for the parts of the new module
that don't touch the DOM (the fold-seeding logic: given a Book, cases, and an
optional supplied fold, which entities start selected). The mount function's
actual DOM rendering is verified manually in a browser, exactly as
`playground/main.ts` is today — it has no automated tests either, and adding
one would mean a new devDependency (jsdom or similar), which the project has
never needed.

**Target Platform**: browser DOM, consumed by a caller's own bundler/dev
server (their book is TypeScript; their toolchain compiles it, per the
explicit "Alternative considered" in the filed issue).

**Project Type**: library — adds a third public entry point (`fewrd/playground`)
alongside the existing `.` and `./recipes/*`.

**Performance Goals**: none beyond the existing playground's — this is a
developer-facing tool, not a production runtime path.

**Constraints**: MUST NOT modify `src/read.ts`, `src/render.ts`, or
`src/types.ts` — the new module consumes only `read`/`gist`/`html` and the
public types, the same way a recipe book does (Constitution, FR-016
precedent from feature 001). MUST introduce no new dependency, runtime or
dev.

**Scale/Scope**: one new module (`src/playground.ts`), one new
`package.json` exports entry, a rewritten (thinner) `playground/main.ts`,
and a small update to `playground/cases.ts` so its `Case` type is the same
shape the new module exports rather than a re-declared duplicate.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence | Status |
|---|---|---|---|
| I. Zero Runtime Dependencies | No new `dependencies`, no new `devDependencies` | The module uses only DOM APIs (already typed via `tsconfig.json`'s `"lib": ["ES2024","DOM"]`) and fewrd's own public exports | PASS |
| II. Deterministic Segmentation Rules | Reading/rendering behavior unchanged | The new module never modifies `src/read.ts` or `src/render.ts`; it calls `read`/`gist`/`html` exactly as a caller would | PASS |
| III. Cases Are the Single Source of Test Truth | Domain-recipe-book behavior stays in `playground/cases.ts`; core-engine-like logic may use inline synthetic fixtures | This feature adds neither — it adds *playground* logic, a third category the amended Principle III doesn't name explicitly. Judgment call: the fold-seeding helper is pure and non-domain-specific like the engine-mechanics tests from feature 001, so an inline synthetic Book in its unit test is consistent with that precedent, not a violation of it. The demo's own migration (FR-009) keeps using `playground/cases.ts`, unchanged. | PASS (reasoned) |
| IV. Strict Types, No Escape Hatches | `tsc --strict`, no new `any`/`@ts-ignore`, no build step for dev | DOM types are already available; no reason to reach for `any` | PASS |
| V. Simplicity and a Closed Vocabulary | Core vocabulary (`Recipe`/`Book`/`Mention`/`Leaf`/`Cuts`/`Fold`) stays closed | This feature adds a *separate*, smaller vocabulary (a playground case, mount options) for a distinctly different capability (a dev tool), not a change to the reading/rendering concepts README's table describes | PASS (reasoned) |

No violations; Complexity Tracking is empty.

**Post-Phase-1 re-check**: [data-model.md](data-model.md),
[contracts/public-api.md](contracts/public-api.md), and
[quickstart.md](quickstart.md) confirm the design stays within a single new
file, no new dependency, and no change to the core vocabulary or
reading/rendering behavior. All five gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-reusable-playground/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts        # unchanged — core public exports
├── types.ts         # unchanged
├── normalise.ts      # unchanged
├── read.ts            # unchanged
├── render.ts           # unchanged
└── playground.ts        # NEW — mount(el, opts), PlaygroundCase type, fold-seeding helper

recipes/
└── it-pa.ts        # unchanged

playground/
├── cases.ts         # Case now re-exports/aliases PlaygroundCase from src/playground.ts
├── main.ts           # rewritten: calls mount(el, { book: itPa, cases: CASES })
├── index.html          # unchanged (still the demo's own shell)
└── style.css           # per-entity hardcoded hues (protocol/cig/cup/…) replaced with a
                          generic, deterministic per-entity color derived at runtime

test/
└── read.test.ts       # unaffected
└── playground.test.ts  # NEW — fold-seeding helper only, no DOM
```

**Structure Decision**: Single project, extending the existing layout. The
DOM-touching `mount()` and the pure fold-seeding helper live in the same new
file (`src/playground.ts`) for simplicity — the helper is just a function
whose top-level module code never touches `document`, so importing the file
in `node --test` is safe even though `mount()` itself is DOM-only and never
called there.

## Complexity Tracking

> Not applicable — the Constitution Check above has no violations to justify.
