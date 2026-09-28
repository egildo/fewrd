# Phase 1 Data Model: Recipe-Based Reader

Entities as they exist in `src/types.ts`, with the validation rules implied
by [spec.md](spec.md)'s Functional Requirements. All types are plain data —
no functions, no `RegExp` — except `Recipe` itself, which is authoring-time
configuration, not part of a `Reading`.

## Recipe

One recognizable pattern, supplied by a `Book`'s author (e.g. `recipes/it-pa.ts`).

| Field | Type | Notes |
|---|---|---|
| `entity` | string | The mention kind this recipe produces (e.g. `"protocol"`). |
| `anchor` | pattern | The strict, required value. Its own part name is `value` (`lead` on a `rest` recipe). |
| `left` / `right` | ordered list of `{ part, pattern }` | Neighbours tried outward from the anchor, in declaration order. |
| `requires` | list of part names | A candidate missing any of these is discarded (FR-004). |
| `resolve` | `(parts) -> value \| null` | Computes the canonical value, or rejects the candidate by returning `null`. |
| `weak` | boolean | Fills only spans no non-weak recipe claimed (FR-006). |
| `rest` | boolean | Mention runs to the end of its level; what follows is read again inside it (FR-007). |
| `glued` | boolean | Opts out of the "may not start/end mid-word" rule (FR-002). |

**Validation rules**:
- A `Recipe` MUST NOT be both `weak` and `rest` in a way that matters — `rest`
  recipes are scanned independently of the weak/non-weak split (see `read.ts`
  `level()`).
- `resolve`, when present, is the sole authority for a candidate's final
  value; returning `null` removes the candidate entirely (FR-004, in effect
  for resolve-driven rejection too — see `cig`'s Co.Ge. disambiguation in
  `recipes/it-pa.ts`).

## Book

An ordered collection of recipes for one domain, plus a version.

| Field | Type | Notes |
|---|---|---|
| `version` | string | Changes whenever a `recipes` change could alter output (FR-010, Data Contracts). |
| `recipes` | ordered list of `Recipe` | Declaration order is priority order (FR-005). |

**Validation rules**:
- `version` MUST change whenever a semantically-relevant edit is made to
  `recipes` — reading the same text against two `Book`s with the same
  `version` but different `recipes` violates FR-010's determinism guarantee
  for callers who cache by `(text, book.version)`.

## Mention

One recognized occurrence, produced by reading — not authored.

| Field | Type | Notes |
|---|---|---|
| `entity` | string | Copied from the matching `Recipe.entity`. |
| `recipe` | index into `Book.recipes` | Which recipe produced this mention. |
| `extent` | span | Start/end covering every attached part, contiguous. |
| `parts` | ordered list of `{ part, span }` | In text order. |
| `value` | string | `resolve`'s result, or the anchor's own text. |
| `parent` | mention index, optional | The enclosing `rest` mention, if nested (FR-007). |

**Validation rules**:
- `extent` MUST be contiguous across all of `parts` (no gap between attached
  neighbours and the anchor) — this is what makes leaf-segmentation
  well-defined around it.
- A `Mention` with a `parent` is folded whenever its parent is folded
  (FR-011): folding is transitive down the `parent` chain.

## Leaf

One piece of the text partition, produced by reading — not authored.

| Field | Type | Notes |
|---|---|---|
| `start` / `end` | offsets into `text` | Half-open span. |
| `kind` | `'text' \| 'sep' \| 'open' \| 'close' \| 'part'` | What this piece is. |
| `part` | string, present when `kind === 'part'` | Which named part of its mention. |
| `mention` | mention index, optional | The innermost mention holding this leaf, if any. |

**Validation rules**:
- Leaves MUST cover `text` in order with no gap and no overlap (FR-008,
  SC-002): `leaves[0].start === 0`, `leaves[i].end === leaves[i+1].start`,
  `leaves.at(-1).end === text.length`.
- A `'part'` leaf MUST have both `part` and `mention` set; a `'text'` or
  `'sep'` leaf MAY have `mention` set (when it sits inside a `rest`
  mention's remainder) but never `part`.

## Reading (`Cuts`)

The result of reading a `text` against a `Book`.

| Field | Type | Notes |
|---|---|---|
| `text` | string | The original, unmodified input. |
| `book` | string | The `Book.version` used, for cache-keying (FR-010). |
| `mentions` | ordered list of `Mention` | Every recognized occurrence. |
| `leaves` | ordered list of `Leaf` | The full partition of `text`. |

**Validation rules**:
- Every field is plain data (no functions, no `RegExp`) so a `Cuts` value
  survives a JSON round-trip unchanged (Data Contracts, SC-002).
- `(text, book)` together determine `mentions` and `leaves` uniquely — no
  other input influences the result (FR-010, SC-003).

## Fold policy

Not a stored entity — a caller-supplied function, `(mention, index) ->
boolean`, deciding per mention whether the condensed view hides it (FR-011).
Its *effect* on rendering (which separators and brackets survive) is
specified by FR-012/FR-013 and is deterministic for a given `(Cuts, fold)`
pair, but the policy itself is not part of the persisted data model.

## Relationships

```text
Book  1 ──── * Recipe
Cuts  1 ──── * Mention  (Mention.recipe → index into the Book used)
Cuts  1 ──── * Leaf
Mention 1 ── * Leaf     (via Leaf.mention, for 'part' leaves and leaves nested in a 'rest' mention)
Mention 0..1 parent → Mention   (nesting, via rest recipes)
```

No entity in this model is created, updated, or deleted outside of a single
`read()` call — there is no mutation API and no stored state between calls.
