# Feature Specification: Reusable Playground

**Feature Branch**: `002-reusable-playground`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Generalise the playground so it consumes a caller's recipes instead of the demo's: export it as a new package entry `fewrd/playground` — a plain-DOM mount function that takes a `Book`, a list of cases, and an optional caller-supplied fold policy, and mounts into a DOM element the caller provides. Keep it zero-dependency. The repo's own playground becomes the first consumer of this entry. Closes GitHub issue #1, filed against a real consumer's need (sibardoc-prototype)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my own recipes at work, not the demo's (Priority: P1)

An integrator who has written their own recipe book (their own domain's codes,
labels, and rules) wants to visually confirm it behaves as intended —
which mentions get found, at what spans, with what values — the same way
fewrd's own maintainers can for the bundled demo book, without copying or
reimplementing fewrd's playground.

**Why this priority**: This is the entire reason issue #1 was filed. Without
it, an integrator has no way to exercise their own book at all short of
forking fewrd's source.

**Independent Test**: Can be fully tested by mounting the playground with a
minimal custom book (one or two recipes) and a couple of cases, and
confirming every case renders with the expected mentions — independent of
any fold-policy or free-text feature.

**Acceptance Scenarios**:

1. **Given** a Book with at least one recipe and a list of cases, **When**
   the playground is mounted into a page element, **Then** every case in the
   list is rendered, each showing the mentions that Book's recipes recognize
   in that case's text.
2. **Given** the same Book and cases, **When** mounted a second time (e.g.
   after a page reload), **Then** the rendering is identical — nothing about
   the mount depends on hidden state left over from a previous mount.
3. **Given** a Book with zero recipes, **When** cases are mounted, **Then**
   each case still renders as plain text with no mentions, without an error.

---

### User Story 2 - Preview my own fold policy, not just per-entity toggles (Priority: P2)

An integrator whose real fold policy isn't simply "hide every mention of
entity X" (for example, folding depends on a mention's resolved value or
where it sits relative to other mentions) wants their actual policy to be
what the playground starts folded on, rather than having to manually
reconstruct it entity by entity.

**Why this priority**: Valuable and explicitly asked for in the filed issue,
but depends on User Story 1 already rendering cases correctly; it refines
*how* folding is previewed, not whether cases render at all.

**Independent Test**: Can be fully tested by supplying a fold policy that
folds based on something other than entity name alone, and confirming which
entities start folded in the playground matches what that policy would fold
on the supplied cases.

**Acceptance Scenarios**:

1. **Given** a Book and cases, **When** no fold policy is supplied, **Then**
   the playground behaves as it does today: a single fold control listing
   every entity found in the Book, starting in a sensible default state.
2. **Given** a Book, cases, and a caller-supplied fold policy, **When** the
   playground mounts, **Then** the entities that policy would fold on those
   cases start selected in the fold control — and from that point on the
   control itself, not the original policy, is the live, interactive source
   of truth for what's folded (same as Scenario 1's default behavior).

---

### User Story 3 - Try arbitrary text against my own book (Priority: P3)

An integrator wants to paste a text snippet they're currently worried about
— not one of their prepared cases — and see immediately how their book
reads it, the same free-form trial box the demo playground already offers.

**Why this priority**: A genuinely useful, low-cost carry-over of existing
behavior, but the feature is usable without it if only prepared cases matter
to a given integrator.

**Independent Test**: Can be fully tested by mounting the playground, typing
arbitrary text into the trial input, and confirming it renders exactly like
a case would, without needing to add it to the cases list first.

**Acceptance Scenarios**:

1. **Given** a mounted playground, **When** text is typed into the trial
   input, **Then** the rendering updates to reflect that text against the
   supplied Book, using the same fold behavior as the listed cases.

---

### Edge Cases

- What happens when the cases list is empty? The mounted UI still shows the
  free-text trial input; there's simply nothing under it.
- What happens when a Book has recipes but a given case's text matches none
  of them? That case renders as plain text with zero mentions — not an
  error, and not omitted from the list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The package MUST expose a mount function, importable
  separately from the core reading/rendering entry, that renders fewrd's
  playground UI into a DOM element the caller provides.
- **FR-002**: The mount function MUST accept a caller-supplied Book and use
  it — instead of any bundled demo book — as the recipes every case and the
  free-text trial are read against.
- **FR-003**: The mount function MUST accept a caller-supplied list of cases
  (each with at least a name and its text) and render every case in that
  list.
- **FR-004**: The system MUST offer a single control listing every distinct
  entity produced by the supplied Book's recipes (a multi-select, not one
  checkbox per entity), where changing which entities are selected updates
  the condensed view for every rendered case (and the free-text trial) to
  include or exclude mentions of the corresponding entity.
- **FR-005**: The mount function MUST accept an optional caller-supplied
  fold policy. When supplied, it MUST be evaluated once at mount, against
  the supplied cases, to determine which entities' options start selected
  in the control from FR-004. From that point on, the control in FR-004 is
  the sole, live, interactive source of truth for what's folded — at
  entity granularity, even when the supplied policy itself isn't reducible
  to a set of entities.
- **FR-006**: The mounted UI MUST let a person type or paste arbitrary text
  and see it read against the supplied Book and rendered the same way as a
  listed case.
- **FR-007**: For each rendered case and the free-text trial, the system
  MUST show both the full text and its condensed rendering, toggleable
  between the two, consistent with fewrd's existing dual-view behavior.
- **FR-008**: The system MUST show each rendered case's recognized mentions
  (or an equivalent inspectable detail) so a caller can confirm what was
  found without leaving the playground.
- **FR-009**: The repository's own demo playground MUST be migrated to call
  this same mount function — passing the bundled demo book and cases —
  rather than keeping separate, duplicated rendering logic.
- **FR-010**: Mounting the playground MUST introduce no new runtime
  dependency; a caller's own toolchain remains responsible for compiling
  their own Book before passing it in.
- **FR-011**: The mounted UI MUST be usable immediately after mounting,
  without the caller separately wiring up styling for the fold-toggle
  behavior to work correctly.

### Key Entities

- **Playground case**: One named piece of sample text a caller wants
  rendered — the same shape (`name`, `text`) the demo's own cases already
  use.
- **Mount configuration**: What a caller passes to the mount function — a
  Book, a list of playground cases, and an optional fold policy. Introduces
  no new vocabulary beyond what the reading/rendering feature already
  defines (Book, Mention, Cuts, Fold).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An integrator goes from "I have a Book and cases" to seeing
  them rendered in a browser using a single function call, with zero
  modifications to fewrd's own source.
- **SC-002**: Changing the fold control's selection changes the condensed
  view for every case on screen, with no dangling separators or empty
  brackets left behind, consistent with fewrd's existing fold-cleanliness
  guarantees.
- **SC-003**: After migration, the repository's own playground renders its
  existing demo cases identically to how it rendered them before this
  change.
- **SC-004**: An integrator can preview their own fold policy without
  forking or copying fewrd's playground source.
- **SC-005**: Mounting the playground adds no new runtime dependency to the
  package.

## Assumptions

- The mount function ships whatever styling it needs as part of mounting
  (e.g. injecting a stylesheet), so a caller gets a usable, legible UI
  immediately — this is what FR-011 requires, even though the filed issue
  doesn't spell out how.
- This entry targets the same environment as today's playground: a browser
  DOM, ES modules, no UI framework.
- A caller's own recipe book, being TypeScript, is compiled by the caller's
  own toolchain before it reaches the mount function; fewrd does not compile
  a caller's book itself (this is explicitly called out in the filed issue's
  "Alternative considered" section, which rejected a CLI for exactly this
  reason).
- The free-text trial input (User Story 3) is carried over from the existing
  playground by default, since removing it would be a regression from
  current behavior, even though the filed issue's proposed signature doesn't
  mention it explicitly.
