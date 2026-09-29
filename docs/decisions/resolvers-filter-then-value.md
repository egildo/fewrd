# Resolvers filter in find, value in dom

**Status:** settled, in the design round of September 2026 and the DOM round that followed.

## Context

A resolver does two jobs. It filters: `null` means "not this tag after all", a date with month 13 or an IP octet over 255. And it values: it turns `1.250,00` into `1250.00`. The chart is meant to hold rows and nothing else, so a value cannot live in it, yet a composed tag's resolver needs the values of the rows its roles took.

## Decision

`find` asks resolvers to filter. A row whose resolver refuses is not a row. The values of accepted rows are kept for the length of the call, so a role hands the next resolver a value rather than raw text, and then dropped: the chart stores no value. `dom` asks the same resolvers again, on the same normalised text, bottom-up, and puts the values on the nodes. A refusal in `dom` of a row `find` accepted is a bug, and `dom` throws naming the tag and the span.

## Consequences

- The chart stays plain data and cacheable; values are a property of the tree.
- Resolvers must be pure and deterministic, since they are asked twice and must answer the same.
- Each resolver runs more than once per row; at subject length that costs nothing.
- A resolver sees normalised text in both halves: dashes as `-`, one space for any run.
