# The outer row wins over its own tag

**Status:** settled, in the DOM round of September 2026.

## Context

A complete chart holds rows of one tag inside others of the same tag. The root scan resumes one character after each match's start, so `num` on `1.5` has rows `(0,3)` and `(2,3)`. A self-grown search leaves its partial rows: `list` on `a b c` has `(0,3)`, `(2,5)` and `(0,5)`. Selection has to choose among them, and nesting a `num` inside a `num` means nothing to a reader.

## Decision

In selection, a row inside a chosen row of the same tag is dropped: the outer wins. "Inside" means the Allen relations `starts`, `during` or `finishes`, which covers both purposes: the [rewrite brief](../../specs/rewrite-brief.md) said *during*, but suffix matches finish their outer row and partial rows start it. A row inside a chosen row of another tag is not dropped by this rule; it becomes a child.

## Consequences

- Suffix matches and partial rows never reach the tree, so the chart can keep them.
- A tag never nests inside itself in the tree: the Italian case with a quotation inside a quotation keeps only the outer one, and folding it hides the same text.
- Forcing needs a matching rule, since a composed row's derivation may take a row of its own tag: see [forcing-absorbs-own-tag](forcing-absorbs-own-tag.md).
- A tag that genuinely nests in itself cannot be expressed; none has been needed.
