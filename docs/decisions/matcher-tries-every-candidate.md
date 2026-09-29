# The matcher tries every candidate

**Status:** settled, in the design round of September 2026.

## Context

At each step of a search several rows may meet the cursor, an optional atom may be taken or skipped, and a regex atom's extent depends on the row after it. The cheap walk is a PEG's, a parsing expression grammar's: ordered choice, take the first alternative that succeeds, never return to it. The old engine's neighbour lists worked that way, which is why their order needed hand-tuning.

## Decision

The matcher is not possessive. It is a depth-first enumeration: every candidate row that meets the cursor is tried, every optional atom is tried skipped and taken, and every combination that completes is a derivation, all of them kept. On `big red 7`, with `word` matching both `big red` and `red`, a label searched back from `7` yields both `big red 7` and `red 7`.

## Consequences

- The chart can be complete, which a first-success walk could not give: the choice a PEG makes early is exactly the one `dom` must make later, with the whole chart in view.
- The same matcher serves `dom`, which needs every derivation of a row to find one whose rows cross nothing already chosen.
- The cost is a named ceiling: exponential in the optional atoms of one search, invisible at subject length.
- Alternatives inside one regex still behave as the regex engine does: longest first stays the conf author's rule.
