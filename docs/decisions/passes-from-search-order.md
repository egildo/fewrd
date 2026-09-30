# Passes follow the searches, not a declared order

**Status:** settled, in the design round of September 2026.

## Context

Composed tags build on each other: `protocol` grows from `serial`, `dated` from `protocol`, and `protocol` from `protocol` when a channel comes first. Something decides when each search runs. A declared order, stages or priorities in the conf, would make every conf author a scheduler.

## Decision

Nothing is declared. `find` runs in passes: pass zero is the root scan, and every later pass runs every search from every row of its `from` tag in the chart of the pass before. A search therefore runs as soon as rows of its `from` tag exist, and again whenever new ones appear. (The engine skips a search when the pass before added no row of a tag it reads, since it could add nothing; the chart is the same.) The same tag on the same span is one row (packing), so the loop ends at the first pass that adds nothing. Within a pass, tags run in code-unit order of their names, so the key order of `tags` cannot change the chart.

## Consequences

- A conf is a set of tags, not a program; reordering its keys changes selection's tiebreak and nothing else.
- Repetition needs no special construct: a search that grows from its own tag repeats until the text runs out.
- The loop always stops (a chart holds finitely many rows), but a self-grown search takes one pass per step.
- A `*` atom on a self-grown search can make the chart quadratic in the text; that is a named ceiling.
