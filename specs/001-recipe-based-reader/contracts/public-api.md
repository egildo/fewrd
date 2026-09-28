# Contract: Public API

This is a library; its "contract" is the module surface exposed via
`package.json`'s `exports` map (`fewrd` → `src/index.ts`, `fewrd/recipes/*` →
`recipes/*.ts`) and the guarantees each function makes to a caller.

## `read(text: string, book: Book): Cuts`

**Preconditions**: `text` is any string (including empty); `book.recipes` is
a valid, non-empty-or-empty ordered list of `Recipe`s.

**Postconditions** (traceable to spec Functional Requirements):
- Returns a `Cuts` whose `leaves` partition `text` exactly — no gap, no
  overlap, concatenation reproduces `text` (FR-008, SC-002).
- `Cuts.mentions` lists every candidate that survived anchor matching,
  neighbour expansion, `requires` filtering, and overlap resolution
  (FR-001–FR-005).
- `Cuts.book === book.version`.
- Calling `read(text, book)` twice with the same arguments returns
  results that are `deepEqual` (FR-010, SC-003) — the function has no
  observable side effects and consults no state outside its two arguments.

**Failure modes**: none defined — every input string is readable; a `Book`
with no matching recipes yields a `Cuts` with an empty `mentions` list and a
single `'text'` leaf spanning the whole input.

## `gist(cuts: Cuts, fold: Fold): string`

**Preconditions**: `cuts` was produced by `read` (or is structurally
identical); `fold` is a pure function of `(mention, index)`.

**Postconditions**:
- Returns the condensed plain-text rendering: every leaf whose mention (or an
  ancestor of it) is folded is omitted, with separator and bracket cleanup
  applied per FR-012/FR-013.
- `gist(cuts, () => false) === cuts.text` (nothing folded ⇒ original text
  back) — exercised directly by `test/read.test.ts`.

## `html(cuts: Cuts, fold: Fold): string`

**Preconditions**: same as `gist`.

**Postconditions**:
- Returns one HTML string containing every leaf of `cuts`, mentions nested as
  `<span data-entity data-mention>`, parts as `<span data-part>`, with
  fold-only content additionally marked `data-fold` (FR-014).
- Text content is HTML-escaped (`&`, `<`, `>`, `"`) (FR-015).
- Applying `.condensed [data-fold] { display: none }` to the returned markup
  and reading its visible text yields the same string as `gist(cuts, fold)`
  (FR-014, SC-005) — this equivalence is the contract's key guarantee for
  front-end consumers.

## `shown(cuts: Cuts, fold: Fold): boolean[]`

**Postconditions**: returns, index-aligned with `cuts.leaves`, whether each
leaf survives in the condensed view. `gist` and `html` are both built on this
function, so it is the lowest-level way to test fold behavior without string
diffing.

## Recipe-authoring contract (for a new `Book`)

A new domain (e.g. a second country's public-administration codes) is added
by authoring a `Book` value under `recipes/` and importing only `Book` /
`Recipe` types from `fewrd`'s public exports (`src/index.ts`) — never
reaching into `src/read.ts` or `src/render.ts` internals (Constitution V,
FR-016). `recipes/it-pa.ts` is the reference example this contract is
extracted from.
