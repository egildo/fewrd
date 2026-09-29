# The chart is complete and neutral

**Status:** settled, in the design round of September 2026 that started the rewrite.

## Context

The old engine found, chose among overlaps and cut the text into leaves in one pass. Choosing while finding made finding greedy and possessive, and the conf language grew rules to steer those early choices (`rest`, `requires`, `glued`). What it passed over could not be shown, so a surprising reading could not be explained.

## Decision

Finding and choosing are separate. `find` keeps every row the conf can build, crossing rows, twins and rows inside rows included, and makes no choice at all: no selection, no values, no tree. Choosing happens once, later, in `dom`, by rules written down in one place.

## Consequences

- The rules of finding fit in six short statements, and the chart depends on the text and the conf only, so it is cacheable by text and conf version and many trees can be built from one chart.
- The playground can draw every row, including the ones the tree did not keep.
- The chart is bigger than any one reading: suffix matches and the partial rows of self-grown searches stay in it (see [root-scan-advances-by-one](root-scan-advances-by-one.md)).
- `dom` re-derives composed rows to bind roles, and recomputes values.
- `rest`, `requires` and `glued` have no place: a regex atom to `$` replaces `rest`, a required atom replaces `requires`, and `glued` is parked.
