# The root scan advances by one

**Status:** open, the maintainer's call. The code does what this file describes; whether it should stay so is not decided.

## Context

A root tag's pattern is scanned over the whole text, and after each match the scan resumes one code point after the match's start, not after its end. That is what lets two overlapping matches of one tag both be rows: `[a-z] [a-z]` on `a b c` finds `a b` and `b c`. It also finds suffix matches: `num` on `1.5` gives `(0,3)` and `(2,3)`, and a separator pattern on ` - ` gives three rows ending at the same place. The word guard stops the suffixes that start inside a run of letters or digits, not those after a `.` or a space.

## Decision

For now the scan advances by one. Selection neutralises the suffix matches: a row inside a chosen row of the same tag is dropped ([outer-wins-same-tag](outer-wins-same-tag.md)), so the tree is unaffected.

## Consequences

- The chart is larger than it needs to be: the quick start's chart holds ten `sep` rows where the tree uses five.
- The playground draws the suffix rows as thin bands, rows the tree did not keep.
- Advancing past the match end instead would shrink the chart and lose genuinely overlapping matches of one tag. A per-tag switch would be a new conf key, and the vocabulary is closed until someone decides.
