# Forcing absorbs a row of its own tag

**Status:** settled by the maintainer in the DOM round of September 2026, closing a gap the [rewrite brief](../../specs/rewrite-brief.md) left open.

## Context

A chosen composed row has its derivation re-run inside its span, and every row it took is chosen at once, so its roles point at real nodes. A self-grown tag breaks this: the outermost `protocol`, grown from a `protocol` by adding a channel, took the inner `protocol` row. Forcing would choose it, nesting a protocol inside a protocol, which outer-wins exists to prevent.

## Decision

A forced row of the composed row's own tag is not a node. The rows of its own derivation are forced in its place, recursively, under the same rule. The outermost row of a self-grown tag absorbs its chain: the protocol with a channel is one `protocol` node whose children are the channel, the label and the number. A role bound to an absorbed row holds that row's text, since there is no node to point at.

A second rule closes the same gap: a derivation with a forced row that crosses a chosen row is skipped for the next, and the composed row is dropped when none is left.

## Consequences

- No tag nests in itself.
- Roles are nodes except on absorbed rows, where they are text; a consumer reading `attrs` has to accept both.
- Selection saves and restores its state around each derivation it tries.
