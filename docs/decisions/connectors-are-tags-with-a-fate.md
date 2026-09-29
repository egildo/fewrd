# Connectors are tags with a fate

**Status:** settled, in the design round of September 2026. It is what the connector round became.

## Context

The round that started the rewrite was a GitHub issue, "Connectors with a fate". In an Italian subject, a code is often introduced by a small word: *del provvedimento ID 553422*, *sul Cap. SC09.3161*. Fold the code and the word is left dangling. The old engine's answer, on a branch that never shipped, was a book-level list of connectors, cut as their own leaf only where a mention began, only as a whole word, and folded when the mention to their right folded. One more special construct beside separators, brackets and neighbours.

## Decision

A connector is an ordinary root tag with `"fate": "connector"`, like a separator is one with `"fate": "separator"`. `find` treats it as any tag; the rule lives in the fold: a connector leaf is hidden when the next leaf to its right that is not a separator is hidden. Connectors are decided right to left, so a chain of them goes together.

## Consequences

- No connector list, no "only where a mention begins": the fold decides from the tree.
- Connector rows appear all through ordinary prose, and stay unless what follows them is folded.
- A composed tag can take a connector as an atom: `dated` grows from `protocol` through an optional connector to its date.
- The fate vocabulary is closed at three: separator, connector, bracket.
