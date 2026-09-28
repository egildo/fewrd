# Phase 1 Data Model: Reusable Playground

New shapes introduced by `src/playground.ts`. Nothing here changes
`Recipe`/`Book`/`Mention`/`Leaf`/`Cuts`/`Fold` from feature 001.

## PlaygroundCase

One named piece of sample text to render — identical in shape to the
demo's pre-existing (informal) `Case` interface.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Shown as the case's heading. |
| `text` | string | Read against the supplied `Book` and rendered. |

**Validation rules**: none beyond being a string pair — any text is valid
input to `read()`, including the empty string (FR-003's "render every case
in that list" holds trivially for an empty list too, per the spec's edge
case).

## MountOptions

What a caller passes to `mount()`.

| Field | Type | Notes |
|---|---|---|
| `book` | `Book` | Required. Every case (and the free-text trial) is read against this (FR-002). |
| `cases` | `PlaygroundCase[]` | Required, may be empty (FR-003, edge case). |
| `fold` | `Fold`, optional | When present, evaluated once per case at mount to seed which entities start selected (FR-005). Never called again after mount — the selection control takes over. |

**Validation rules**: `book.recipes` may be empty (spec edge case — every
case then renders as plain text, zero mentions, no error).

## Derived: entity list and initial selection

Not a stored entity — computed once at mount:

1. `entities`: the distinct `entity` values across `book.recipes`, in the
   order they first appear (FR-004's control lists these, one option each).
2. `initialSelection`: if `fold` was supplied, the subset of `entities` for
   which at least one mention across all supplied `cases` satisfies
   `fold(mention, index)`; otherwise **empty** — nothing starts folded. A
   generic default can't reuse today's demo-specific starter set
   (`protocol`/`cig`/`cup`/`chapter`/`quotation` are `it-pa`'s own entity
   names, meaningless for an arbitrary caller's book). The demo preserves
   its exact current starting view (SC-003) by passing that same set as
   *its own* `fold` argument when it calls `mount()` — it becomes a normal
   caller of the feature, not a special case inside it.

`initialSelection` is consumed exactly once, to set which `<option>`s in
the FR-004 control start selected. After that, only the control's own
`change` events (a plain DOM `Set<string>` of currently-selected entities)
decide what's folded for every render — the `fold` function itself is never
invoked again post-mount, matching the resolved clarification (Q1, Option A).

## Relationships

```text
MountOptions.book   → read into Cuts, once per PlaygroundCase and once per free-text trial edit
MountOptions.cases  → 1 render pass each, independent of each other
MountOptions.fold   → consulted only at mount, to compute initialSelection; irrelevant afterward
entities            → derived from MountOptions.book.recipes, drives the FR-004 control's options
```

No entity here is created, updated, or persisted outside a single `mount()`
call — same "no stored state between calls" property the core engine has.
