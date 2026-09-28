# Feature Specification: Recipe-Based Reader

**Feature Branch**: `001-recipe-based-reader`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Derived from the existing codebase (README.md, src/, recipes/it-pa.ts) — no new feature description was supplied. This spec captures the current recipe-based reading and fold-aware rendering pipeline as the ratified baseline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract structured entities from free text (Priority: P1)

An integrating developer holds a free-text string (e.g. a document subject line)
that mixes prose with domain-specific codes — protocol numbers, reference codes,
dates, amounts — each usually next to a label, but with the labels' wording and
spacing varying case by case. They want those codes back as structured values,
without writing and maintaining a bespoke regex per field.

**Why this priority**: This is the reason the library exists — every other
capability (folding, HTML rendering) depends on a reading already having been
produced. Without it there is nothing to render.

**Independent Test**: Can be fully tested by calling the reader with a text
string and a set of recipes, and checking that the returned reading lists the
expected entities with the expected values and text positions — no rendering
involved.

**Acceptance Scenarios**:

1. **Given** a text containing a labelled value (e.g. a reference number
   preceded by its label), **When** the text is read against a book whose
   recipe recognizes that label/value pattern, **Then** the reading contains a
   mention for that entity with its canonical value and the exact span of text
   it came from.
2. **Given** a text with no matches for any recipe in the book, **When** it is
   read, **Then** the reading contains no mentions and the text is still fully
   accounted for as plain text.
3. **Given** a text where two recipes could both match overlapping spans,
   **When** it is read, **Then** the reading keeps only the longer match (or,
   if equal length, the one earlier in the book's recipe order) and drops the
   other entirely.

---

### User Story 2 - Produce a clean condensed summary (Priority: P2)

A caller has a reading of a text and wants to show end readers a shorter
version that hides certain kinds of recognized entities (for example,
internal reference codes that are not meaningful to that audience) — while
the remaining text still reads naturally, with no orphaned commas, dashes, or
empty brackets left behind where the hidden content used to be.

**Why this priority**: Turns a reading into something end readers actually
see. It is the first consumer of a reading and the one most exposed to
correctness bugs (stray punctuation) that would be visible to users.

**Independent Test**: Can be fully tested by taking a reading with known
mentions, choosing a fold policy that hides a subset of them, and checking the
condensed text against the expected clean output — independent of the HTML
renderer.

**Acceptance Scenarios**:

1. **Given** a reading with a mention flanked by a label and separators,
   **When** that mention is folded, **Then** the condensed text omits the
   mention and does not leave a dangling separator where it was.
2. **Given** a reading where a bracketed aside contains only a mention that
   gets folded, **When** the condensed text is produced, **Then** the empty
   bracket pair is also omitted.
3. **Given** a reading where nothing is folded, **When** the condensed text is
   produced, **Then** it is identical to the original text.

---

### User Story 3 - Ship one HTML output that supports both views (Priority: P3)

A front-end developer wants to render a reading once and let the end reader
toggle between the full text and the condensed summary instantly (e.g. a
"show details" switch), without re-fetching or re-parsing anything.

**Why this priority**: Valuable but depends on Stories 1 and 2 already
working; it packages their result for a UI rather than adding new reading
behavior.

**Independent Test**: Can be fully tested by rendering a reading to HTML with
a fold policy and checking that (a) all original text content is present in
the markup, (b) content the policy folds is marked as such, and (c) applying
a single CSS rule that hides marked content reproduces the same result as the
plain-text condensed rendering.

**Acceptance Scenarios**:

1. **Given** a reading and a fold policy, **When** it is rendered to HTML,
   **Then** every character of the original text appears somewhere in the
   markup, whether shown by default or marked as fold-only.
2. **Given** the HTML rendering, **When** the condensed-view style rule is
   applied, **Then** the visible text matches the plain-text condensed
   rendering of the same reading and fold policy exactly.
3. **Given** text containing characters with special meaning in HTML,
   **When** it is rendered, **Then** those characters appear escaped and the
   markup remains valid.

---

### Edge Cases

- What happens when a candidate match would start or end in the middle of a
  run of letters or digits (e.g. digits embedded inside a longer alphanumeric
  code)? The candidate is rejected unless its recipe explicitly allows
  matches glued to a word.
- How does the system handle a recipe whose match requires a labelled part
  that is not present in the text? The candidate is discarded entirely, not
  partially kept.
- What happens when a "runs to the end" recipe (e.g. a heading that
  introduces free-form text) matches, and the remaining text itself contains
  further recognizable entities? Reading continues inside that remainder as
  its own nested level, and folding the outer mention folds everything nested
  inside it.
- What happens when several separators of different kinds (e.g. a dash and a
  comma) sit in the stretch of text left behind after folding removed the
  content between them? Only the single strongest separator survives; none
  survives at the very start or end of the output, right after an opening
  bracket, or right before closing punctuation.
- What happens when a "weak" recipe's match would overlap a stronger,
  non-weak match? The weak match is dropped; weak recipes only fill gaps left
  after stronger recipes have claimed their spans.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scan input text against an ordered list of
  recipes and identify every substring whose anchor pattern matches as a
  candidate mention.
- **FR-002**: A candidate's anchor MUST NOT start or end in the middle of a
  run of letters or digits, unless its recipe explicitly allows that.
- **FR-003**: For each candidate, the system MUST grow the match outward
  through its recipe's declared neighbouring patterns, attaching each
  neighbour at most once, re-trying the full neighbour list from the start
  after every attachment, until no further neighbour attaches.
- **FR-004**: A candidate MUST be discarded if it is missing any part its
  recipe declares as required.
- **FR-005**: When candidate matches overlap, the system MUST keep only the
  one with the longest matched span; on equal length, the one declared
  earlier in the recipe list wins, and every losing candidate MUST be
  dropped in full.
- **FR-006**: A recipe marked as filling gaps only MUST NOT displace a match
  from a recipe not so marked; it may only claim spans left unclaimed.
- **FR-007**: A recipe marked as "runs to the end" MUST produce a mention
  spanning from its anchor to the end of the current scan, and the system
  MUST re-scan that remainder as a nested level using the same recipe list.
- **FR-008**: The system MUST partition the full input text into an ordered,
  gapless, non-overlapping sequence of pieces (plain text, separators,
  brackets, and matched parts) such that concatenating them in order
  reproduces the original text exactly.
- **FR-009**: The system MUST attach a resolved value to every recognized
  mention, computed by the recipe's own resolution rule when it declares one,
  or taken verbatim from the matched text otherwise.
- **FR-010**: Reading the same text against the same recipe book MUST always
  produce the same result, with nothing else influencing the outcome.
- **FR-011**: The system MUST let a caller produce a condensed rendering that
  omits any mention selected by a caller-supplied policy, along with every
  mention nested inside it.
- **FR-012**: In the condensed rendering, the system MUST resolve leftover
  separators around omitted content: a separator run flanked by two
  surviving pieces with nothing omitted between them stays as-is; otherwise
  only the single strongest separator in that run survives, and none
  survives at an output edge, immediately after an opening bracket, or
  immediately before closing punctuation.
- **FR-013**: A bracketed pair with no surviving content between its
  brackets MUST also be omitted from the condensed rendering.
- **FR-014**: The system MUST offer both a plain-text condensed rendering and
  a single combined rendering that carries the full content with the
  condensed-only parts marked, so a single display rule can switch between
  the two views.
- **FR-015**: The combined rendering MUST escape text so it is safe to embed
  directly in a document.
- **FR-016**: The system MUST allow a recipe book for a new domain to be
  defined and used without modifying the reading or rendering logic itself.

### Key Entities

- **Recipe**: One recognizable pattern — a strict anchor value, an ordered
  list of optional neighbouring parts tried outward from it, and the rules
  that decide whether a match counts and what its resolved value is.
- **Book**: An ordered collection of recipes for one domain, together with a
  version identifier that changes whenever a change to the recipes could
  change the reading's outcome.
- **Mention**: One recognized occurrence — which recipe matched, the full
  span of text it covers, its parts in text order, its resolved value, and
  the enclosing mention it is nested inside, if any.
- **Reading** (internally, "Cuts"): The result of reading a text against a
  book — every mention found, plus the ordered partition of the whole text
  into pieces that, concatenated, reproduce it exactly.
- **Fold policy**: The caller-supplied rule that decides, per mention,
  whether the condensed view should hide it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For text containing labelled domain values the recipe set is
  designed to recognize, the reading correctly identifies and resolves those
  values in at least 95% of the project's own documented sample cases.
- **SC-002**: For 100% of inputs, reconstructing the text from the reading's
  ordered pieces reproduces the original input exactly, with no gap and no
  overlap.
- **SC-003**: Reading the same text against the same book twice always
  produces an identical result, so callers can treat a reading as safely
  cacheable.
- **SC-004**: A condensed rendering never shows a leading, trailing, or
  doubled-up separator, nor an empty bracket pair, where folded content used
  to be.
- **SC-005**: A front-end can switch an already-rendered result between its
  full and condensed view using one display rule, with no further processing
  of the underlying data and no mismatch against the plain-text condensed
  rendering of the same input.

## Assumptions

- This spec documents the reading and rendering pipeline as it already exists
  in the codebase (see README.md's "The pieces" and "The rules") at the time
  of writing, rather than proposing new behavior. It establishes a ratified
  baseline so future specs can describe deltas against it.
- "User" refers, depending on the story, to the developer integrating the
  reader (Stories 1 and 3) or the end reader viewing rendered output (Story
  2).
- Bundled domain content, such as the Italian public-administration recipe
  book, is an example consumer of the engine and is out of scope for this
  spec's own requirements.
- No [NEEDS CLARIFICATION] markers were needed: every requirement above was
  derived directly from documented, already-implemented behavior rather than
  from an ambiguous description.
