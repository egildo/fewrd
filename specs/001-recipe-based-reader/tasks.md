---

description: "Task list template for feature implementation"
---

# Tasks: Recipe-Based Reader

**Input**: Design documents from `/specs/001-recipe-based-reader/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: This feature documents already-implemented, already-shipping
behavior (see plan.md's Summary) — there is no application code to write.
Every task below is a **test task**: it closes a gap between what
[spec.md](spec.md) requires and what `test/read.test.ts` currently asserts,
found by reading the existing suite against the spec's Functional
Requirements and Success Criteria (see the per-task rationale). Where a
requirement is already fully covered, no task is generated for it — see the
"Already covered, no task" note in each phase instead of manufactured
busywork.

**Organization**: Tasks are grouped by user story, as usual. All tasks below
edit the single existing file `test/read.test.ts`, so — unlike a typical
build-out — **none of them are parallelizable with each other**: they share
one file and must be applied in sequence to avoid conflicting edits.

## Path Conventions

Single project. All test tasks below target `test/read.test.ts`, next to the
existing suite; fixtures needed for a new case belong inline in that file
(the project's `playground/cases.ts` fixtures are for the manual playground
and the full-corpus round-trip tests, not for a single targeted assertion).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

No tasks. The project is already scaffolded and green: `pnpm typecheck` and
`pnpm test` both pass today (confirmed while writing plan.md's Constitution
Check), zero runtime dependencies are in place, and `test/read.test.ts`
already reads its fixtures from `playground/cases.ts` (Constitution III).
There is nothing to set up.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 In `test/read.test.ts`, add a test that calls `read(text, book)` twice on the same `(text, book)` pair (e.g. reuse `CASES[0]`) and asserts the two results are `assert.deepEqual`. Closes FR-010 / SC-003: the existing `'a reading survives JSON: it is cacheable'` test only proves a *single* reading survives a JSON round-trip, not that *two separate calls* agree — the determinism guarantee every other story's caching claim depends on is currently unasserted.

**Checkpoint**: Foundation ready - user story implementation can now begin in sequence (not parallel — single shared file)

---

## Phase 3: User Story 1 - Extract structured entities from free text (Priority: P1) 🎯 MVP

**Goal**: Confirm the engine turns free text into structured, resolved mentions, and closes the gaps in how conflicting/weak candidates and word-boundary rejection are currently exercised.

**Independent Test**: `pnpm test` — the tests below, plus the existing `'a protocol grows greedily...'` and `'a bare seven-digit number is no protocol'` tests, are run without touching `gist`/`html`.

### Tests for User Story 1

- [X] T002 [US1] In `test/read.test.ts`, add a test with two recipes whose anchors match overlapping spans of the same text and assert the reading keeps only the longer-extent mention, dropping the shorter one entirely (FR-005). Not currently asserted: existing tests exercise single-recipe matches and one deliberately-rejected case, but never two candidates that actually overlap.
- [X] T003 [US1] In `test/read.test.ts`, add a test where a `weak: true` recipe's match would overlap a non-weak match and assert the weak match is dropped, then a second case where the weak recipe's match sits in a gap no non-weak recipe claims and assert it survives (FR-006). `recipes/it-pa.ts`'s `caps` recipe is `weak`; none of the current tests isolate weak-vs-strong precedence.
- [X] T004 [US1] In `test/read.test.ts`, add a test asserting a recipe's anchor match is rejected when it would start or end in the middle of a run of letters/digits (e.g. a would-be match embedded inside a longer digit run), and a paired test showing a `glued: true` recipe accepts the same shape (FR-002). The existing `'a bare seven-digit number is no protocol'` test is about a missing required `label` part (FR-004), not the word-boundary rule — that rule is implemented (`cutsWordAtStart`/`cutsWordAtEnd` in `src/read.ts`) but has no dedicated assertion.

**Checkpoint**: At this point, User Story 1's full requirement set (FR-001–FR-010) has explicit test coverage.

---

## Phase 4: User Story 2 - Produce a clean condensed summary (Priority: P2)

**Goal**: Confirm folding produces clean, natural-reading condensed text.

**Independent Test**: `pnpm test -- --test-name-pattern "folding|fold that empties|no separator|gist is the original"`

- [X] T005 [US2] No new test needed — already covered. Run `pnpm test` and confirm `'folding a middle mention keeps one separator, the strongest'` (FR-012), `'a fold that empties brackets takes them along'` (FR-013), `'no separator survives before closing punctuation'` (FR-012 edge), and `'nothing folded: the gist is the original'` (User Story 2's baseline acceptance scenario) all still pass. This task exists to make the checkpoint explicit, not to add code.

**Checkpoint**: At this point, User Story 2 is confirmed fully covered with no gaps.

---

## Phase 5: User Story 3 - Ship one HTML output that supports both views (Priority: P3)

**Goal**: Close the two gaps between the HTML contract in [contracts/public-api.md](contracts/public-api.md) and what's currently tested: escaping, and the condensed-view/gist equivalence that is the contract's key guarantee.

**Independent Test**: `pnpm test -- --test-name-pattern "html carries both views|escapes|equivalent"`

- [X] T006 [US3] In `test/read.test.ts`, add a test that reads text containing `&`, `<`, `>`, and `"` inside a recognized mention's value or its surrounding text, and asserts `html()`'s output contains the escaped forms (`&amp;`, `&lt;`, `&gt;`, `&quot;`) and not the raw characters (FR-015). Depends on: T005 (sequential, same file). Currently unasserted — `'html carries both views...'`'s fixture has no characters needing escaping.
- [X] T007 [US3] In `test/read.test.ts`, add a test that, for a reading and fold policy, strips every `data-fold`-marked span from `html(cuts, fold)` (simulating the `.condensed [data-fold] { display: none }` CSS rule) and asserts the remaining visible text equals `gist(cuts, fold)` exactly (SC-005, the contract's `html`/`gist` equivalence guarantee). Depends on: T006 (sequential, same file). The existing test checks structural markers (`data-fold` count, stripped-tags text equals the *original*) but never checks equivalence to `gist()`'s *condensed* output — the actual promise the toggle contract makes to a front-end.

**Checkpoint**: All user stories now have explicit coverage tracing to every Functional Requirement and Success Criterion in spec.md.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the whole baseline holds together, per quickstart.md

- [X] T008 Run `pnpm typecheck` and `pnpm test` (all tasks above applied) and confirm both exit 0 with no `any`/`@ts-ignore` introduced (Constitution IV); then run `pnpm dev` and manually check the CUP-folding case from quickstart.md's Step 2 in the playground, confirming the rendered condensed view matches `gist()`'s output for the same case (SC-004, SC-005). Depends on: T007.
- [X] T009 In `test/read.test.ts`, add a structural test asserting `recipes/it-pa.ts` imports only from `../src/index.ts` (the public surface), never `../src/read.ts` or `../src/render.ts` directly (FR-016). Closes a gap found by `/speckit-analyze` (finding E1): FR-016 previously had zero task or test coverage. Depends on: T008.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks.
- **Foundational (Phase 2)**: T001 — BLOCKS all user stories (determinism underlies every story's correctness claim).
- **User Stories (Phase 3-5)**: All depend on T001. Because every task edits the same file, they run **sequentially in the order below**, not in parallel, regardless of story:
  T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009.
- **Polish (Phase 6)**: T008 depends on all prior tasks; T009 depends on T008.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 (Foundational). Independently testable once T002-T004 land.
- **User Story 2 (P2)**: Depends on T001. Already independently passing — T005 only confirms it.
- **User Story 3 (P3)**: Depends on T001. Independently testable once T006-T007 land; does not depend on US1/US2 tasks functionally, only shares the file.

### Parallel Opportunities

None. Every task touches `test/read.test.ts`. If this were split across
multiple files (e.g. one test file per user story) the T002-T004, T005, and
T006-T007 groups would be parallelizable across three developers — that
split was not made here because the project's own constitution
([Principle III](../../.specify/memory/constitution.md)) keeps one case list
and, by extension, this project keeps one test file for the core engine.

---

## Implementation Strategy

This is not a greenfield build — the engine, `gist`, and `html` are already
implemented and shipping. "MVP first" here means: land T001 (determinism) and
the User Story 1 gap tests (T002-T004) first, since they cover the
requirements every other story's guarantees rest on; T005 costs nothing (a
confirmation run); T006-T007 close the HTML contract's only real gaps;
T008 is the final full-suite gate. There is no scenario where shipping stops
after User Story 1 — the code for every story already ships together, so the
ordering above is about validation priority, not deployment staging.

## Notes

- [Story] label maps task to specific user story for traceability.
- No task adds or changes application behavior — every task adds an
  assertion for behavior the code already has. If a new test fails, that is
  a real bug in `src/` or `recipes/it-pa.ts`, not a template placeholder to
  fill in — stop and fix the root cause before continuing to the next task.
- Commit after each task.
