# Implementation Plan: The DOM (rewrite, phase 2)

**Branch**: `rewrite` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-dom/spec.md`, and the brief, [`specs/rewrite-brief.md`](../rewrite-brief.md) section 5

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build the DOM half on top of phase 1's chart: `dom(text, chart, conf)` selects non-crossing rows (order, take or drop, forcing), re-derives each chosen composition with `find`'s own matcher moved to a shared module, builds the containment tree with water, binds roles and resolves values bottom-up; `hidden` and `gist` apply the fold and the three fates. Alongside: the `normalise` unit fix, `fate: 'bracket'` and the reserved `doc`/`text` in `compile`, the two confs gaining brackets (and common its separators), the cases gaining `fold`/`gist` with a regression over both corpora, the playground's tree and fold panel, `fewrd-play` on the new folder, README, constitution wording check, CHANGELOG. Choices the spec left to the plan are in [research.md](research.md), each under a name the tasks use.

## Technical Context

**Language/Version**: TypeScript 5.9, `strict`, target ES2024, `module: NodeNext`, `erasableSyntaxOnly`, as in phase 1.

**Primary Dependencies**: none at runtime. Dev: `typescript`, `vite`, `@types/node`, already present.

**Storage**: N/A. The playground keeps edits and fold choices in memory; `fewrd-play` writes nothing.

**Testing**: `node --test "test/*.test.ts"` with type stripping, no build. Synthetic toy confs inline, one test per requirement with a worked example, named after the requirement (principle III's core-mechanics exception); the domain confs only through `cases/*.json`. The playground's pure parts (`treeLines`, `greyed`) get node tests; its DOM is checked by eye in `pnpm dev`. `fewrd-play`'s server gets one node test over a temporary folder.

**Target Platform**: Node ≥ 22.13 and current browsers and bundlers.

**Project Type**: library with two entries, `fewrd` and `fewrd/playground`, plus the separate dev package `play/`.

**Performance Goals**: every case re-found, re-selected and re-folded on each keystroke or box tick with no perceptible delay; subjects are a few hundred characters.

**Constraints**: zero dependencies (principle I); no `any`, no `@ts-ignore` (principle IV); no class except `Chart`; one responsibility per file; the tree a function of `(text, chart, conf)` only (`selection-is-deterministic`); `find`'s behaviour unchanged (its tests stay green through the matcher move and the `normalise` fix).

**Scale/Scope**: three new source files (`derive.ts`, `dom.ts`, `fold.ts`), edits to `normalise.ts`, `conf.ts`, `find.ts`, `index.ts`, `playground.ts`; two confs and two case files; three new test files and edits to three; `play/` server, CLI and README; README, CHANGELOG.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence | Status |
|---|---|---|---|
| I. Zero Runtime Dependencies | No new dependency, in `fewrd` or `fewrd-play` | Everything in `src/`; `play/` keeps its peer dependency only | PASS |
| II. Deterministic, Documented Finding and Fold Rules | DOM-half rules in README's Selection and The rules of the fold; key order read only by selection | `readme-complete`; `selection-is-deterministic` tested by shuffling the chart JSON's tag order; `find-is-deterministic` still green | PASS |
| III. Cases Are the Single Source of Test Truth | Domain gists live in `cases/*.json`; toy confs only for single rules | `test/gist.test.ts` reads both case files; `test/dom.test.ts` and `test/fold.test.ts` use the spec's toy confs | PASS |
| IV. Strict Types, No Escape Hatches | Strict, build-free loop | `Node` is a plain type; `derive` generic over nothing new; tests run unbuilt | PASS |
| V. Simplicity and a Closed Vocabulary | Vocabulary of the brief plus node, water, select, derive | Files and functions named `derive`, `dom`, `select`; `Node`, `Fold`; no alias for any phase 1 name | PASS |
| Data Contracts | Chart invariants unchanged; tree invariants tested | `leaves-partition-text` over every case and example | PASS |
| Development Workflow | Confs change with their `version`; cases carry `fold`/`gist` | `it-pa@4`, `common@2`; `cases-carry-fold-and-gist` | PASS |

No violations; Complexity Tracking is empty.

**Post-Phase-1 re-check**: [data-model.md](data-model.md), [contracts/public-api.md](contracts/public-api.md) and [quickstart.md](quickstart.md) add no dependency and no class, expose only `dom`, `hidden`, `gist`, `Node`, `Fold` on `fewrd` and `treeLines`, `greyed` on `fewrd/playground` beyond phase 1, and keep every domain assertion in the case files. All gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/006-dom/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, each under a name
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1: how to validate
├── contracts/
│   └── public-api.md    # Phase 1: the two entries and fewrd-play's folder
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── normalise.ts        # EDIT: boundary map per UTF-16 unit
├── conf.ts             # EDIT: fate 'bracket', reserved doc/text
├── chart.ts            # unchanged
├── derive.ts           # NEW: pinned regexes, Index, derive (moved from find.ts), reporting taken rows and bindings
├── find.ts             # EDIT: imports derive; drops the code-point → unit conversion
├── dom.ts              # NEW: Node, dom(text, chart, conf): select, forcing, tree, roles, values
├── fold.ts             # NEW: Fold, hidden(doc, fold), gist(doc, fold)
├── index.ts            # EDIT: re-exports dom and fold
└── playground.ts       # EDIT: tree list, fold panel, greying; treeLines, greyed

confs/
├── it-pa.json          # EDIT: it-pa@4, paren
└── common.json         # EDIT: common@2, SEP, paren, sep

cases/
├── it-pa.json          # EDIT: fold + gist on 13 cases
└── common.json         # EDIT: fold + gist on 8 cases

test/
├── normalise.test.ts   # NEW: normalise-per-utf16-unit
├── conf.test.ts        # EDIT: reserved-doc-and-text, fate-bracket-accepted
├── dom.test.ts         # NEW: selection, forcing, the walk, tree, roles, values
├── fold.test.ts        # NEW: the four fate rules, hidden-and-gist
├── gist.test.ts        # NEW: gist-regression over both corpora
├── playground.test.ts  # EDIT: treeLines, greyed
└── play.test.ts        # NEW: fewrd-play serves the new folder

play/
├── server.ts           # EDIT: conf.json, cases with fold/gist, new mount, no save
├── cli.ts              # EDIT: requires conf.json, usage text
└── README.md           # EDIT: the new folder

README.md               # EDIT: DOM-half sections
CHANGELOG.md            # EDIT: phase 2 entry
.specify/memory/constitution.md   # check only (3.1.0 landed with the spec)
```

`chart.ts`, `vite.lib.ts`, `tsconfig*.json`, `package.json`, `playground/` are not touched (`playground/main.ts` already passes whole cases, so `fold`/`gist` flow through).

**Structure Decision**: Single library project. The matcher moves out of `find.ts` into `derive.ts` because two callers now need it (`find` and `dom`) and the brief's vocabulary names it; `find.ts` keeps the root scan and the pass loop. Selection, tree, roles and values share the chosen set and the value memo, so they live together in `dom.ts`; the fold reads only the finished tree, so it lives apart in `fold.ts`. The fates ride on the nodes and the text on `doc`, so `hidden` and `gist` read the tree alone: see `fates-on-the-node` in research.

## Order of work

1. `normalise` fix, then `find` without its conversion (`test/normalise.test.ts`, all of `test/find.test.ts` still green).
2. `compile`: `fate: 'bracket'`, reserved `doc`/`text` (`test/conf.test.ts`); the `Node` and `Fold` types.
3. Move the matcher to `derive.ts`, reporting rows (`test/find.test.ts` still green, no new behaviour).
4. Selection: order and take-or-drop, one synthetic test per rule (`test/dom.test.ts`).
5. Forcing and re-derivation (`forced-derivation-chosen`, `the-walk`).
6. Tree and the partition invariant (`tree-by-containment`, `leaves-partition-text`).
7. Roles and values.
8. Fates, `hidden`, `gist`, one test per fate rule (`test/fold.test.ts`).
9. Confs and cases: brackets, common separators, `fold`/`gist`; the regression (`test/gist.test.ts`).
10. Playground tree and fold panel (`test/playground.test.ts`, then by eye).
11. `fewrd-play` (`test/play.test.ts`).
12. README, constitution wording check, CHANGELOG.

After each group, correct in the spec any worked example or case gist the code proved wrong, in the same commit.

## Complexity Tracking

> Not applicable: the Constitution Check above has no violations to justify.
