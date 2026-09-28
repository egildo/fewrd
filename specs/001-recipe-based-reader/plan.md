# Implementation Plan: Recipe-Based Reader

**Branch**: `001-recipe-based-reader` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-recipe-based-reader/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Document and validate, as a ratified baseline, the existing recipe-based reading
pipeline (`normalise → anchors → expand → merge → segment ⇒ Cuts`) and its two
fold-aware renderers (`gist`, `html`). No new capability is being built — the
spec captures already-implemented behavior; this plan records the technical
context of that implementation and confirms it against the project
constitution, so later specs can describe deltas (additions, changes) against
this baseline instead of re-describing the whole system.

## Technical Context

**Language/Version**: TypeScript 5.9, `strict: true`, target `ES2024`, module `NodeNext`

**Primary Dependencies**: none at runtime (`package.json` has no `dependencies` key).
Dev-only: `typescript` (typecheck), `vite` (playground dev server), `@types/node`.

**Storage**: N/A — pure function over an input string and an in-memory `Book`; no persistence.

**Testing**: `node --test` (Node's built-in test runner) against `test/*.test.ts`, run directly via
TypeScript type-stripping — no build/transpile step.

**Target Platform**: any runtime that can import ESM TypeScript with type-stripping
(current Node.js). The rendered output (`gist`/`html`) is consumed by a browser
in `playground/`, but the reading/rendering engine itself has no DOM or
Node-specific dependency.

**Project Type**: library (single project) — `src/` is the core engine, `recipes/`
holds domain-specific `Book`s consumed via `fewrd/recipes/*`, `playground/` is a
dev-only manual-testing harness (Vite), not shipped as part of the package surface.

**Performance Goals**: no formal SLA is declared upstream. The implementation
documents its own known ceiling (see `src/read.ts`): neighbour expansion is
O(n²) worst case per neighbour on a `$`-pinned regex scan, which the author
notes is "fine for subjects of a few thousand chars, reverse-match if not."
This plan adopts that as the working goal: correct, interactive-speed
segmentation for subject-line-sized text (up to a few thousand characters).

**Constraints**: zero runtime dependencies (Constitution I); deterministic
output for a given `(text, book.version)` pair (Constitution II); `Cuts`,
`Mention`, `Leaf` must stay plain, JSON-round-trippable data (Data Contracts);
no build step — source ships and runs as-authored TypeScript (Constitution IV).

**Scale/Scope**: bounded to the core engine (`src/index.ts`, `normalise.ts`,
`read.ts`, `render.ts` — 4 files) and its public surface (`read`, `gist`,
`html`, plus the `Recipe`/`Book`/`Mention`/`Leaf`/`Cuts`/`Fold` types). One
bundled recipe book ships today (`recipes/it-pa.ts`, 8 recipes); per the
spec's Assumptions, recipe *content* is an example consumer and out of scope
for this plan's own gates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence | Status |
|---|---|---|---|
| I. Zero Runtime Dependencies | `package.json` has no `dependencies` | Confirmed: only `devDependencies` present | PASS |
| II. Deterministic, Documented Segmentation Rules | README's "The rules" matches `src/read.ts` behavior; no non-deterministic calls (time/random/locale) in the reading path | Confirmed by reading `src/read.ts` | PASS |
| III. Cases Are the Single Source of Test Truth | `test/*.test.ts` reads its fixtures from `playground/cases.ts`, not ad hoc data | Confirmed: `test/read.test.ts` imports `CASES` from `../playground/cases.ts` | PASS |
| IV. Strict Types, No Escape Hatches | `tsc --strict`/`noEmit`; no `any`, `@ts-ignore`, `@ts-expect-error` in `src/` or `recipes/` | Confirmed via grep; `tsconfig.json` has `strict: true`, `noEmit: true` | PASS |
| V. Simplicity and a Closed Vocabulary | Public vocabulary matches README's table exactly (`Recipe`, `Book`, `Mention`, `Leaf`, `Cuts`, `Fold`) | Confirmed against `src/types.ts` and `src/render.ts` | PASS |

All gates pass without exception; nothing needs justification in Complexity
Tracking.

**Post-Phase-1 re-check**: [data-model.md](data-model.md),
[contracts/public-api.md](contracts/public-api.md), and
[quickstart.md](quickstart.md) describe only the existing entities, the
existing public exports, and existing `pnpm` scripts — no new dependency, no
new build step, no new vocabulary member was introduced during design. All
five gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-recipe-based-reader/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts       # public re-exports: read, gist, html, and the types
├── types.ts       # Recipe, Book, Mention, Leaf, Cuts vocabulary
├── normalise.ts   # text normalisation into engine coordinates
├── read.ts         # normalise → anchors → expand → merge → segment ⇒ Cuts
└── render.ts        # Fold policy → gist (plain text) | html (tagged, both views)

recipes/
└── it-pa.ts        # example Book: Italian public-administration codes

test/
└── read.test.ts    # node --test, reads playground/cases.ts

playground/
├── cases.ts         # shared fixtures (source of truth for tests + manual UI)
└── ...              # Vite dev server (pnpm dev) for manual visual checks
```

**Structure Decision**: Single project (library). This is the existing,
already-implemented layout — no restructuring is proposed by this plan. The
engine (`src/`) stays free of any dependency on `recipes/` or `playground/`;
`recipes/` depends only on `src/`'s public types; `playground/` and `test/`
both depend on `src/` and `recipes/` but never the reverse.

## Complexity Tracking

> Not applicable — the Constitution Check above has no violations to justify.
