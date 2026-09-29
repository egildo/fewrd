# Implementation Plan: The Chart (rewrite, phase 1)

**Branch**: `rewrite` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-chart/spec.md`, and the brief, [`specs/rewrite-brief.md`](../rewrite-brief.md)

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build the finding half from the clean slate: a conf format and its `compile`, an immutable `Chart`, and `find(text, conf)`, which scans every root tag over the normalised text, runs every search from every row of its `from` tag in passes until a pass adds nothing, and maps the result back to the original string. Then rewrite the Italian conf in the new format and assert its rows on the real subjects, draw charts brat-style in a new playground, and write the README and changelog for the finding half. The only file kept from the old engine is `src/normalise.ts`. Choices the brief left open are in [research.md](research.md), each under a name the tasks use.

## Technical Context

**Language/Version**: TypeScript 5.9, `strict`, target ES2024, `module: NodeNext`, `erasableSyntaxOnly`, as today.

**Primary Dependencies**: none at runtime. Dev: `typescript`, `vite`, `@types/node`, already present.

**Storage**: N/A. The playground keeps edits in memory.

**Testing**: `node --test "test/*.test.ts"` with type stripping, no build. Synthetic toy confs inline for every rule (principle III's core-mechanics exception); the Italian conf is tested only through `cases/it-pa.json`. The playground's DOM is checked by eye in `pnpm dev`; its pure part, `lanes`, gets a node test.

**Target Platform**: Node ≥ 22.13 and current browsers and bundlers (JSON import attributes).

**Project Type**: library with two entries, `fewrd` and `fewrd/playground`.

**Performance Goals**: every Italian case found and redrawn on each keystroke in the playground with no perceptible delay (the playground success criterion); subjects are a few hundred characters.

**Constraints**: zero dependencies (principle I); no `any`, no `@ts-ignore` (principle IV); no class except `Chart`; one responsibility per file (brief 3.4); output a function of `(text, conf)` only (`find-is-deterministic`); `src/normalise.ts` unchanged.

**Scale/Scope**: four source files and one entry (`conf.ts`, `chart.ts`, `find.ts`, `playground.ts`, `index.ts`), five test files, one conf with its resolvers, a two-file dev playground, README, CHANGELOG.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence | Status |
|---|---|---|---|
| I. Zero Runtime Dependencies | No new dependency, runtime or dev | Everything in `src/`; the playground is plain DOM; `fewrd-play` untouched | PASS |
| II. Deterministic, Documented Finding Rules | The six rules in README's "The rules"; no nondeterminism | `readme-finding-half` writes the rules; `find-is-deterministic` is tested by reversing tag order; canonical order in `role-values-are-transient` and `chart-internals` | PASS |
| III. Cases Are the Single Source of Test Truth | Italian behaviour tested through `cases/it-pa.json`; toy confs only for single rules | `test/it-pa.test.ts` reads `cases/it-pa.json`; `test/find.test.ts` uses the spec's toy confs, none of them domain text | PASS |
| IV. Strict Types, No Escape Hatches | Strict, build-free loop | `compile` takes `unknown` and narrows; tests run unbuilt; `pnpm build` untouched except its entries' contents | PASS |
| V. Simplicity and a Closed Vocabulary | Only the brief's vocabulary | Types are named `Conf`, `Tag`, `Search`, `Atom`, `Chart`, `Span`; the compiled conf is the same generic type, not a new name (`compiled-conf-is-the-same-shape`); `Resolve` and `CompileError` are named after `resolve` and `compile`; tag names in the Italian conf are conf data, not vocabulary | PASS |
| Data Contracts | Chart invariants | `chart-invariants` tested on every synthetic and Italian chart | PASS |
| Development Workflow | Confs under `confs/`, cases under `cases/`, core untouched by domain work | `confs/it-pa.json`, `confs/it-pa.ts`, `cases/it-pa.json` | PASS |

No violations; Complexity Tracking is empty.

**Post-Phase-1 re-check**: [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md) and [quickstart.md](quickstart.md) add no dependency, keep one class, expose only the brief's names plus `Resolve`, `CompileError`, `AllenRelation`, `PlaygroundCase` and `lanes`, and keep every domain assertion in the cases test. All gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-chart/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, each under a name
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1: how to validate
├── contracts/
│   └── public-api.md    # Phase 1: the two entries
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── normalise.ts        # kept verbatim
├── conf.ts             # NEW: Conf/Tag/Search/Atom/Resolve/CompileError, compile
├── chart.ts            # NEW: Span, Chart, rel, AllenRelation
├── find.ts             # NEW: root scan, search matcher, pass loop; find(text, conf)
├── index.ts            # NEW: re-exports of conf, chart, find
└── playground.ts       # NEW: mount, lanes (phase 1 view)

confs/
├── it-pa.json          # NEW: the Italian conf, version it-pa@3
└── it-pa.ts            # NEW: four resolvers + the compiled conf

cases/
├── it-pa.json          # from the slate: 13 subjects
└── common.json         # the common domain's cases, each naming its conf

playground/
├── index.html          # NEW: the dev page
└── main.ts             # NEW: mount(it-pa conf, resolvers, cases)

test/
├── conf.test.ts        # NEW
├── chart.test.ts       # NEW
├── find.test.ts        # NEW: the spec's worked examples, by requirement name
├── it-pa.test.ts       # NEW: italian-cases-tagged
└── playground.test.ts  # NEW: lanes

package.json            # files/exports: drop book.schema.json
tsconfig.json           # include: recipes → confs
README.md               # rewritten for the finding half
CHANGELOG.md            # NEW
```

`play/`, `vite.lib.ts`, `tsconfig.build.json`, `LICENSE`, `.github/` are not touched.

**Structure Decision**: Single library project, one responsibility per file as the brief lays out. `find.ts` holds the root scan, the matcher and the pass loop together because they share the pinned-regex cache and the normalised text and nothing else uses them; it exports only `find`. The playground's pure parts live in `playground.ts` beside `mount` rather than in a file of their own, since nothing but the playground uses them.

## Order of work

The tasks follow the brief's order, each group closed by its tests before the next begins:

1. Types and `compile` (`test/conf.test.ts`).
2. `Chart` and `rel` (`test/chart.test.ts`).
3. Root scan (`test/find.test.ts`, `root-rows-every-match`, `match-on-normalised-text`).
4. Matcher: one test per rule and per atom kind (`searches-run-from-rows`, `atoms-meet-the-cursor`, `composed-rows-resolve`, `chart-complete-and-neutral`).
5. Pass loop (`passes-to-a-fixpoint`).
6. `find` end to end (`find-is-deterministic`, round-trip).
7. The Italian conf and its case assertions (`test/it-pa.test.ts`).
8. Playground (`test/playground.test.ts`, then by eye).
9. README, then CHANGELOG, then package and config tidy-up.

After each group, correct any worked example in the spec that the code proved wrong, in the same commit.

## Complexity Tracking

> Not applicable: the Constitution Check above has no violations to justify.
