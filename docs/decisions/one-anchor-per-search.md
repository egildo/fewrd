# One anchor per search

**Status:** settled, in the design round of September 2026.

## Context

The old engine's recipes had one anchor, the strict match that was the value, with neighbours on both sides. In the new model a search's anchor is its `from` row. A thing with parts on both sides, a label before a code and a date after it, invites a search with two directions, or a hook that reconciles a derivation grown back with one grown forward into a single row.

## Decision

A search has one `from` tag and exactly one of `back` and `forward`. Parts on both sides are written as a composed tag grown from another composed tag: `protocol` grows back from `serial` to its label, and `dated` grows forward from `protocol` to its date. There is no reconciliation hook. Two searches of one tag stay separate derivations; when they land on the same span they are one row by packing, and that is the only way they meet.

## Consequences

- The matcher is one outward walk from one row, and forcing can always re-run a composed row's derivation inside its span from a single `from` row.
- Trees are deeper and confs name more tags: a date after a protocol is a `dated` node holding a `protocol` node.
- No rule decides how partial derivations merge, because none do: the fixpoint lets a composed row anchor the next search.
