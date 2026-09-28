# Feature Specification: Recipes as Data

**Feature Branch**: `003-recipes-as-data`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Recipes as data: make a recipe Book fully representable as plain JSON, with JSON as the source of truth. Regexes are stored as strings (source + flags); shared regex fragments are declared once in a `defs` map and referenced Grok-style (e.g. `%{DATE}`); `resolve` logic is referenced by name and supplied as a resolver registry from the consumer's own code at compile time (no eval). A `compile(data, { resolvers })` step turns the JSON into the existing runtime `Book`, so the engine and existing TypeScript books keep working unchanged (non-breaking). Compilation reports per-recipe errors (invalid regex, unknown fragment, unknown resolver) without throwing, so the playground can show them inline. Ship a JSON Schema for the book format so editors validate/autocomplete a consumer's book.json. The bundled `it-pa` demo book is rewritten as JSON + a small resolver registry, proving the format on a real book (dogfooding). The playground gains live recipe editing: a consumer mounts it with their book data and resolver registry, edits the JSON live and sees every case re-read immediately, with compile errors shown inline. Generalised and domain-agnostic: any consumer installing fewrd locally uses it to test their own domain-relevant recipes. Declarative resolve primitives (pick/guard/rewrite) are explicitly out of scope for this first version — named resolvers only. Prior art: Presidio YAML recognizers, Microsoft Recognizers-Text, spaCy registry functions, Logstash Grok, LanguageTool, Vale."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write my recipe book as a data file (Priority: P1)

An integrator wants to describe their domain's recipes (anchors, labels,
neighbours, flags such as weak or rest) in a plain data file rather than in
code, keep only the few genuinely procedural bits (value normalisation,
validation) as small named functions in their own code, and turn the two
into a book fewrd reads exactly like a hand-written one.

**Why this priority**: Everything else — live editing, editor validation,
sharing a book — depends on a book being expressible as data in the first
place. On its own it already lets an integrator keep recipes in one
reviewable, diffable, tool-friendly file.

**Independent Test**: Can be fully tested by writing a small data book (two
or three recipes, one shared fragment, one named resolver), compiling it with
a resolver set, and confirming reading a few texts gives the same mentions a
hand-written equivalent book gives.

**Acceptance Scenarios**:

1. **Given** a data book whose recipes reference only fragments it defines
   and resolvers the caller supplies, **When** it is compiled, **Then** the
   result is a book that reads text exactly as an equivalent hand-written
   book would, and no errors are reported.
2. **Given** a data book where one recipe has an invalid pattern, **When**
   it is compiled, **Then** compilation does not fail as a whole: it reports
   an error naming that recipe (its position and entity) and the problem,
   and the resulting book still contains every other recipe.
3. **Given** a data book that references a fragment it never defines, or a
   resolver the caller did not supply, **When** it is compiled, **Then** an
   error names the recipe and the missing name, and that recipe is left out
   of the resulting book.
4. **Given** the bundled demo book, now kept as a data file plus a small
   resolver set, **When** every demo case is read, **Then** every result is
   identical to what the previous hand-written demo book produced.

---

### User Story 2 - Edit my recipes live in the playground (Priority: P2)

An integrator who has installed fewrd in their own project wants to open the
playground on their own data book and resolvers, change a pattern or a
label, and immediately see how every one of their cases is read — iterating
on recipes in seconds instead of edit-rebuild-reload cycles.

**Why this priority**: This is the payoff the whole feature is aimed at, but
it needs User Story 1's data format and error reporting to exist first.

**Independent Test**: Can be fully tested by mounting the playground with a
data book, a resolver set and a few cases, editing one recipe's pattern in
the editor, and confirming every case re-renders with the new behaviour; then
introducing a mistake and confirming the error is shown inline while the
playground keeps working.

**Acceptance Scenarios**:

1. **Given** a playground mounted with a data book, resolvers and cases,
   **When** the page loads, **Then** the book's data is shown in an editable
   area alongside the cases, rendered exactly as a playground mounted with
   the compiled book would render them.
2. **Given** that playground, **When** a recipe in the editor is changed to
   a valid alternative, **Then** every case and the free-text trial are
   re-read with the edited book, without a page reload.
3. **Given** that playground, **When** an edit makes one recipe invalid,
   **Then** that recipe's error is shown next to the editor, the remaining
   recipes keep applying to every case, and the playground stays usable.
4. **Given** that playground, **When** the editor's content is not valid
   data at all (e.g. a missing bracket), **Then** a parse error is shown
   and the cases keep showing the last successfully compiled book's result.
5. **Given** that playground after several edits, **When** the person asks
   to reset, **Then** the editor and every case return to the originally
   supplied book.
6. **Given** a playground mounted with an already-compiled book (as today),
   **When** it loads, **Then** it behaves exactly as it did before this
   feature, with no editor shown.

---

### User Story 3 - Get help from my editor while writing a book (Priority: P3)

An integrator writing their data book in their usual code editor wants
misspelled keys, wrong value types and missing required fields flagged as
they type, and field suggestions offered, without running anything.

**Why this priority**: A real quality-of-life gain for authoring, but the
format is usable without it: compilation already reports every error.

**Independent Test**: Can be fully tested by pointing a data book at the
published format description in a mainstream editor and confirming a typo'd
key and a wrongly-typed value are both flagged.

**Acceptance Scenarios**:

1. **Given** a data book that declares the published format description,
   **When** it is opened in an editor that understands such descriptions,
   **Then** unknown keys, wrong value types and missing required fields are
   flagged, and valid keys are suggested.
2. **Given** the bundled demo data book, **When** it is checked against the
   published format description, **Then** it passes.

---

### Edge Cases

- A fragment references another fragment (the demo's capitals pattern
  builds on its label-words pattern): nesting MUST work; a fragment that
  refers back to itself, directly or through others, is reported as an error
  rather than looping.
- A fragment containing alternatives (`a|b`) is inserted as a single unit, so
  it never changes the meaning of the pattern around it.
- A recipe is invalid in several ways at once: all of its problems are
  reported, not just the first.
- A data book has no recipes: it compiles to an empty book with no errors;
  every case renders as plain text.
- A resolver is supplied but no recipe uses it: not an error.
- An edit introduces a new entity or removes one: the playground's fold
  control reflects the edited book's entities; entities that still exist
  keep their selected state, new ones start unselected.
- A resolver throws while a case is read in the playground (e.g. an edited
  pattern now feeds it input it never expected): the error is shown on that
  case, and every other case keeps rendering. Outside the playground a
  resolver behaves exactly as it would in a code-written book.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a data format that can express every
  property a recipe book has today — its version, and for each recipe its
  entity, anchor, left and right neighbours (part name and pattern),
  required parts, weak / rest / glued flags, and a resolver — using only
  plain data (text, numbers, true/false, lists, maps).
- **FR-002**: A pattern in the data format MUST be written as its pattern
  text plus its flags, and MUST behave exactly as the same pattern written
  in code.
- **FR-003**: The data format MUST let a book declare named pattern
  fragments once and reference them by name from any pattern (anchors,
  neighbours, and other fragments), using a `%{NAME}` reference syntax. A
  referenced fragment MUST behave as a single unit within the pattern.
- **FR-004**: A recipe's resolver MUST be referenced by name in the data;
  the behaviour behind each name MUST come from a set of named functions the
  caller supplies at compile time. The system MUST NOT evaluate text from
  the data as code.
- **FR-005**: The system MUST provide a compile step that takes a data book
  and a set of named resolvers and returns (a) a book usable anywhere a
  hand-written book is used today, and (b) a list of errors.
- **FR-006**: Compilation MUST NOT fail as a whole because of a problem in
  one recipe. Each error MUST identify the recipe (position and entity, when
  known) and the problem: invalid pattern or flags, unknown fragment,
  circular fragment reference, unknown resolver, or a missing / wrongly-typed
  field. A recipe with any error MUST be left out of the resulting book; all
  other recipes MUST be kept, in their original order.
- **FR-007**: The existing way of writing a book in code MUST keep working
  unchanged, and the reading engine's behaviour for any book MUST NOT change.
- **FR-008**: The bundled demo book MUST be kept as a data file plus a small
  set of named resolvers. *(Amended for 0.2.0 by the maintainer: the package
  publishes only the minified library, so demo books — `it-pa` and the new
  generic `common` — live in the repository, not under a package import.)*
- **FR-009**: The package MUST publish a machine-readable description of the
  data format that mainstream editors can use to validate and autocomplete
  a data book.
- **FR-010**: The playground MUST accept, as an alternative to a compiled
  book, a data book plus a set of named resolvers. When mounted this way it
  MUST show the data in an editable area and re-read every case and the
  free-text trial against the edited book as it changes.
- **FR-011**: The playground MUST show every compile error and data parse
  error next to the editor. On per-recipe errors it MUST keep rendering with
  the remaining recipes; on a parse error it MUST keep showing the last
  successfully compiled result. A failure while reading one case MUST be
  shown on that case without stopping the others from rendering.
- **FR-012**: The playground MUST offer a way to return the editor and all
  rendering to the originally supplied data book.
- **FR-013**: The playground's fold control MUST track the entities of the
  currently compiled book, keeping the selection of entities that still
  exist.
- **FR-014**: The feature MUST introduce no new runtime dependency.

### Key Entities

- **Book data**: The plain-data form of a book — a version, an optional map
  of named pattern fragments, and a list of recipe data in priority order.
  The source of truth for a book written this way.
- **Recipe data**: The plain-data form of one recipe — same fields as a
  recipe today, with patterns as text plus flags and the resolver as a name.
- **Pattern fragment**: A named, reusable piece of pattern text, declared
  once per book and referenced by name.
- **Resolver set**: The caller-supplied map from resolver name to function;
  the only place procedural logic lives.
- **Compile error**: One problem found while compiling — which recipe (or
  fragment), and what went wrong.

This is the first addition to the closed vocabulary (`Recipe`, `Book`,
`Mention`, `Leaf`, `Cuts`, `Fold`) since it was set: the existing set cannot
express a book that survives a round-trip through plain data, because a
`Recipe` holds live patterns and functions. The new terms describe a book's
*source*; the runtime vocabulary is unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the bundled demo cases read identically (same
  mentions, parts, values and leaves) with the data-file demo book as with
  the previous hand-written one.
- **SC-002**: The demo book's data file carries no code: every recipe
  property except resolver behaviour lives in data, and the resolver set
  holds no more than the four resolve behaviours the demo book has today.
- **SC-003**: An integrator can go from a data book and a resolver set to a
  live-editable playground of their own cases with one call, without
  modifying fewrd.
- **SC-004**: In the playground, an edit to a recipe is reflected in every
  case without a perceptible delay for a book and case list the size of the
  bundled demo.
- **SC-005**: Every kind of compile error listed in FR-006 is reported with
  the offending recipe identified, and none of them stops the rest of the
  book from working.
- **SC-006**: Existing code-written books and existing playground mounts work
  with zero changes.
- **SC-007**: The package adds no new runtime dependency.

## Assumptions

- The data format is JSON: it is plain data, needs no dependency to read,
  and is what editors' format-validation support expects. Patterns in JSON
  need doubled backslashes; that is accepted as the cost of zero
  dependencies.
- Declarative resolver building blocks (picking a capture group, guards,
  rewrites) are out of scope for this version; resolvers are named functions
  only. In the playground this means resolver *choice* is editable live,
  resolver *logic* is not.
- Edits made in the playground are not saved anywhere; the editor's content
  is what an integrator copies back into their own file. Writing back to
  disk would need a server, which the playground does not have.
- The book `version` stays the caller's responsibility, as today; the
  playground does not require it to change between live edits, since it
  keeps no cache.
- Producing data from an existing code-written book (the reverse direction)
  is out of scope: data is the source of truth, not an export target.
- Test truth for the demo book stays where the constitution puts it: the
  same demo case list, now read against the compiled data book.
