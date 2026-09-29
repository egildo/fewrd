# Optional labels

**Status:** open. No construct exists yet; this records the gap and its witnesses.

## Context

The old engine found a CIG, CUP or budget chapter code with or without its label, since labels were optional neighbours. The new vocabulary cannot say "the code, with its label if there is one". A tag is a root tag or a composed tag, never both, so `cig` cannot be the code's own pattern and also the code grown back to its label. Nor can the label atom be optional: the outermost atom of a search may not be, since skipping it would leave a row that is a twin of the code or begins with a stray separator.

Twins, once hoped to express it, do not: nothing produces a `cig` row on the code's span alone for the code row to be a twin of.

Two witnesses so far: the Italian codes (`cig`, `cup`, `chapter`, `cdr`, `provvedimento`), and the common conf's versions: `version` needs a leading `v` and `version-ref` a label, so a bare `1.2.3` is neither.

## Decision

None yet. The Italian conf keeps these labels required, since every code in its corpus is labelled; an unlabelled code is still a `cig-code`, `cup-code` or `chapter-code` row, but not a `cig`, so folding `cig` leaves it in place.

## Consequences

- A conf author folds the code tag as well when unlabelled codes matter.
- The construct, when it comes, is a conf change with its own round.
