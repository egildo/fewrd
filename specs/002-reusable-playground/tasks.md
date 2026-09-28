---

description: "Task list template for feature implementation"
---

# Tasks: Reusable Playground

**Input**: Design documents from `/specs/002-reusable-playground/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Only the pure, non-DOM fold-seeding logic gets automated tests
(`node --test`), per plan.md's Testing decision — the DOM-touching `mount()`
itself is verified manually in a browser, matching `playground/main.ts`'s
existing (untested) precedent, and avoiding a new devDependency (jsdom) this
project has never needed.

**Organization**: Tasks are grouped by user story. `src/playground.ts` is
touched by most tasks across Foundational, US1, and US2 — those run
sequentially. `test/playground.test.ts`, `playground/style.css`,
`playground/cases.ts`, and `playground/main.ts` are separate files and can
run in parallel with whichever `src/playground.ts` task they depend on has
already landed.

**Revision note**: T004 and the renumbering of T005–T014 were added after
`/speckit-analyze` found that no task actually made `mount()` self-contained
(FR-011) — the essential dual-view toggle CSS, and per-entity coloring, had
nowhere to live for a caller who never loads `playground/style.css` (which
isn't even part of the published package). T004 also fixes a second issue
the same pass found: toggling a class on `document.body` (today's demo
behavior) isn't safe for a reusable, possibly multi-instance widget.

## Path Conventions

Single project. New file `src/playground.ts` (compiled to `dist/src/playground.js`
via the existing `pnpm build`). New file `test/playground.test.ts`.
Existing `playground/*` files are edited, not replaced.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] In `package.json`, add a `"./playground"` entry to `exports`
  (`{ "types": "./dist/src/playground.d.ts", "default": "./dist/src/playground.js" }`),
  mirroring the existing `"./recipes/*"` entry's shape.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create `src/playground.ts`. Define `PlaygroundCase` (`{ name: string; text: string }`)
  and `MountOptions` (`{ book: Book; cases: PlaygroundCase[]; fold?: Fold }`)
  types (data-model.md), and a pure `entities(book: Book): string[]` helper
  returning the distinct entity names across `book.recipes` in
  first-appearance order. This file's module-level code MUST NOT reference
  `document`/`Element` — only code inside `mount()`'s body may (research.md's
  testing decision depends on this).

**Checkpoint**: Foundation ready — user story work can begin, sequentially (shared file).

---

## Phase 3: User Story 1 - See my own recipes at work, not the demo's (Priority: P1) 🎯 MVP

**Goal**: Mounting renders every supplied case with its recognized mentions
and dual view, and that dual view actually works standalone — no separate
stylesheet required — including the empty-Book edge case.

**Independent Test**: Mount with a minimal custom Book (1–2 recipes) and a
couple of cases; confirm every case renders with the expected mentions,
independent of any fold-policy or free-text behavior (spec's Independent
Test for this story).

### Implementation for User Story 1

- [X] T003 [US1] In `src/playground.ts`, implement `mount(el, options)`:
  for each `PlaygroundCase` in `options.cases`, `read(case.text, options.book)`,
  then render the full text (`html`) and condensed view (`gist`) plus an
  inspectable mentions/leaves detail into `el` — reuse the rendering shape
  from `playground/main.ts`'s current `render()`/`leavesTable()` (FR-003,
  FR-007, FR-008; contracts/public-api.md's postconditions).
- [X] T004 [US1] In the same `mount()`, inject one `<style>` element per
  mount (idempotent — skip if `el` already carries one) containing: (a) the
  rule the dual-view toggle depends on, `.condensed [data-fold] { display:
  none }`, scoped under a class applied to a wrapper `mount()` creates
  inside `el` — **never `document.body`**, so unrelated page content is
  never touched and two `mount()` calls on the same page don't collide
  (fixes the current demo's `document.body.classList.toggle('condensed',
  ...)` pattern, which isn't safe for a reusable widget); and (b) one
  generated rule per entity from `entities(options.book)` —
  `[data-entity="X"] { --h: hsl(hash(X) % 360, 70%, 88%) }` using a small
  string hash (research.md's coloring decision) — so any caller's book gets
  legible, distinct entity coloring with zero configuration. This closes
  FR-011 for a standalone caller who never loads `playground/style.css`
  (not part of the published package — `files: ["dist"]` excludes
  `playground/`). Depends on: T002, T003 (same file).
- [X] T005 [US1] In the same `mount()`, render the FR-004 control: one
  `<select multiple>` `<option>` per `entities(options.book)`, starting with
  nothing selected (`initialSelection` is `[]` until User Story 2 adds real
  seeding). Wire its `change` event to a `Set<string>` of currently-selected
  entities and re-render every case's condensed view using "fold this
  mention if its entity is in the set." Depends on: T003 (same file).
- [X] T006 [US1] Verify the zero-recipes edge case (spec User Story 1,
  Scenario 3): mount with a `Book` whose `recipes` is `[]` and confirm every
  case renders as plain text with zero mentions and no thrown error. `read()`
  already guarantees this generically — this is a verification task, not new
  logic; note the result rather than adding a defensive branch that isn't
  needed.

**Checkpoint**: User Story 1's acceptance scenarios all hold; the playground
is mountable, renders real content, and its dual-view toggle actually works
with nothing else loaded — independent of fold-policy or free-text behavior.

---

## Phase 4: User Story 2 - Preview my own fold policy, not just per-entity toggles (Priority: P2)

**Goal**: A supplied `fold` seeds the FR-004 control's initial selection
instead of starting empty; the control remains the sole live source of
truth for what's folded from mount onward (resolved Q1, Option A).

**Independent Test**: Supply a fold policy that folds based on something
other than entity name alone; confirm which entities start selected in the
playground matches what that policy would fold on the supplied cases (spec's
Independent Test for this story).

### Tests for User Story 2

- [X] T007 [P] [US2] In new file `test/playground.test.ts`, unit test the
  `initialSelection` helper from T008 directly — no DOM: a supplied `fold`
  seeds exactly the entities it would fold across given cases (using a small
  synthetic `Book`, consistent with feature 001's precedent for
  core-mechanics tests — see plan.md's Constitution Check, Principle III
  row); no `fold` seeds nothing (FR-005).

### Implementation for User Story 2

- [X] T008 [US2] In `src/playground.ts`, add the pure `initialSelection(book, cases, fold?)`
  helper: returns `[]` when `fold` is absent; otherwise the subset of
  `entities(book)` for which at least one mention across `cases` (each read
  via `read(case.text, book)`) satisfies `fold(mention, index)`
  (data-model.md's "Derived: entity list and initial selection"). No DOM
  reference. Depends on: T002 (same file).
- [X] T009 [US2] Wire `mount()` (from T005) to call `initialSelection` once
  at mount to set which of the FR-004 control's options start selected. After
  mount, only the control's `change` handler (T005) drives re-rendering —
  `options.fold` MUST NOT be called again after this point (contracts/public-api.md).
  Depends on: T005, T008 (same file).

**Checkpoint**: User Story 2's acceptance scenarios hold — a supplied policy
visibly seeds the right starting selection; toggling afterward behaves
exactly like the no-policy default from User Story 1.

---

## Phase 5: User Story 3 - Try arbitrary text against my own book (Priority: P3)

**Goal**: A free-text trial input reads against the supplied Book live,
rendered the same way as a listed case.

**Independent Test**: Mount the playground, type arbitrary text into the
trial input, confirm it renders exactly like a case would, without adding it
to the cases list first (spec's Independent Test for this story).

### Implementation for User Story 3

- [X] T010 [US3] In `src/playground.ts`'s `mount()`, add a free-text trial
  input to the rendered UI, wired so its `input` event re-reads its current
  value against `options.book` and re-renders using the same dual-view and
  currently-selected-entities fold as the cases (T003, T005) (FR-006). Reuse
  `playground/main.ts`'s current `#custom`/`.out` pattern as the reference
  behavior to preserve. Depends on: T003, T005 (same file).

**Checkpoint**: All three user stories are independently satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T011 [P] In `playground/style.css`, delete the now-redundant
  hardcoded per-entity hue rules (`[data-entity="protocol"] { --h: #dbe8ff }`,
  etc. — seven rules total): `mount()` (T004) now generates equivalent,
  generic coloring for any book at runtime. Keep the rest of the file
  (layout, header, `.tagged`/`.gist` styling) unchanged. Depends on: T004.
- [X] T012 [P] In `playground/cases.ts`, replace its own `Case` interface
  with an import of `PlaygroundCase` from `../src/playground.ts` (aliased as
  `Case` for the file's own readability) — research.md's third decision.
  Depends on: T002 (type must exist).
- [X] T013 [P] Rewrite `playground/main.ts` to call `mount(document.getElementById('app')!, { book: itPa, cases: CASES, fold: (m) => ['protocol','cig','cup','chapter','quotation'].includes(m.entity) })`
  instead of its own render logic — contracts/public-api.md's "Demo
  migration contract" — closing FR-009. Depends on: T003–T010 (mount must be
  feature-complete).
- [X] T014 Run `pnpm typecheck` and `pnpm test` (all tasks above applied);
  confirm `package.json`'s `dependencies`/`devDependencies` are unchanged
  from before this feature (FR-010, SC-005 — no automated check exists for
  this, so verify by inspection here); then run `pnpm dev` and manually
  compare the migrated demo playground against its pre-migration behavior
  per quickstart.md Steps 1–2 — same mentions, same default-folded entities,
  same dual-view toggle, now working via the injected CSS from T004 rather
  than `playground/style.css` alone. Confirms SC-001 through SC-005.
  Depends on: T001–T013.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — independent of everything else (different file).
- **Foundational (Phase 2)**: T002 — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: T003→T004→T005→T006 (US1) →T008→T009 (US2,
  T007 in parallel once T008 lands) →T010 (US3), all in `src/playground.ts`
  except T007. Sequential within that file; T007 can run in parallel with
  T009 once T008 is done (different files).
- **Polish (Phase 6)**: T011, T012, T013 can run in parallel with each
  other (different files) once the `src/playground.ts` work (T003–T010) they
  depend on has landed; T014 depends on all of them.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T002 (Foundational). No dependency on
  US2/US3 — independently testable per its own Independent Test. Includes
  T004, since FR-011 (a self-contained, working toggle) is foundational to
  "the mounted UI is usable" — not a later polish concern.
- **User Story 2 (P2)**: Depends on T002 and T005 (US1's control must exist
  before it can be seeded). Independently testable once T008–T009 land.
- **User Story 3 (P3)**: Depends on T002, T003, T005 (US1's render pipeline
  and control). Independently testable once T010 lands; doesn't depend on US2.

### Parallel Opportunities

- T001 (package.json) can run any time, in parallel with everything else.
- T007 (`test/playground.test.ts`) can run in parallel with T009
  (`src/playground.ts`) once T008 lands — different files, same dependency.
- T011, T012, T013 (three different files: `style.css`, `cases.ts`,
  `main.ts`) can all run in parallel with each other in Polish, once their
  respective `src/playground.ts` prerequisites are done.
- Everything else touches `src/playground.ts` and runs sequentially in the
  order listed.

---

## Parallel Example: Polish Phase

```bash
# Once T003–T010 are done, launch together:
Task: "Delete redundant per-entity hue rules from playground/style.css"
Task: "Replace Case interface in playground/cases.ts with an import of PlaygroundCase"
Task: "Rewrite playground/main.ts to call mount()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) + Phase 2 (T002).
2. Complete Phase 3 (T003–T006) — User Story 1, including the self-contained
   CSS injection (T004) that makes the dual-view toggle actually work
   without a separate stylesheet.
3. **STOP and VALIDATE**: mount a toy Book/cases with nothing else loaded on
   the page and confirm both rendering and the toggle work.
4. This alone already closes the core of issue #1: a caller can see their
   own recipes at work, self-contained.

### Incremental Delivery

1. Setup + Foundational → the module exists with the right types.
2. User Story 1 → mountable, renders real content, fully self-contained (MVP).
3. User Story 2 → fold-policy preview.
4. User Story 3 → free-text trial.
5. Polish → the demo itself migrates onto the same entry, proving the
   contract by dogfooding it (FR-009, SC-003).

## Notes

- [Story] label maps task to specific user story for traceability.
- `options.fold`, once evaluated at mount by T008/T009, is never called
  again — verify this explicitly during T009, not just by inspection.
- Commit after each task or logical group.
