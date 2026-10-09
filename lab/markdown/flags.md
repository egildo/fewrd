# Flags (draft for the README)

**Flags.** A flag marks a place, not a stretch of text: a row zero characters wide, at an edge of rows that already exist. `^` and `$` are the two the engine always gives, and a conf can declare more:

```json
"bol": { "after":  ["^", "nl"] },
"eol": { "before": ["nl", "$"] }
```

`bol` is a flag at the end of every `^` and `nl` row, so at every line start; `eol` at the start of every `nl` and `$` row, so at every line end. A search takes a flag like any tag, and taking it adds nothing to the span, so a flag is a condition, not a part:

```
heading: from hash, back [bol]      on "x # y\n# z"   →  heading (6,8)      (the first # is not at a line start)
```

A flag is placed once the root tags are scanned, before any search runs, from root rows only. It has none of `rx`, `search`, `resolve`, `weak` or `fate`. Flags stay in the chart, so `dom` can run a search again, but they never become nodes.

Elsewhere in the README:

- The rules of finding: "zero-length matches are skipped" gains "flags aside".
- Reserved names: `^` and `$` are introduced as the first two flags.
