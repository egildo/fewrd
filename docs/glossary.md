# Glossary

The closed vocabulary of fewrd: one name per thing, the name the code uses. A term not here is not part of the design; adding one amends this file first (see [A closed vocabulary](principles.md#a-closed-vocabulary)). Entries follow the pipeline, from the conf to the gist.

## The conf

- **conf**: What recurs in a domain, written as JSON: `version`, `patterns`, `tags`. The data form and the compiled form share one type. `Conf` in `src/conf.ts`.
- **version**: A conf's required label, such as `it-pa@4`. It keys a cached chart, so it changes whenever a change to the conf can change a chart. `Conf.version`.
- **pattern**: A regular expression written as a string, `"/source/flags"`. A named pattern lives under `patterns` and is spliced into others as `%{NAME}`. `expand` and `pattern` in `src/conf.ts`.
- **tag**: A named kind of thing to find, one key of `tags`, with exactly one of `rx` and `search`. `Tag` in `src/conf.ts`.
- **root tag**: A tag with `rx`: its rows are the matches of its pattern. Found in pass zero, `roots` in `src/find.ts`.
- **composed tag**: A tag with `search`: its rows are built from other rows by its searches.
- **search**: One way of building a composed tag: a `from` tag, and a list of atoms walked either `back` or `forward` from each of its rows. `Search` in `src/conf.ts`.
- **anchor**: A search's `from` row, the one row it grows from. It names the principle [One anchor per search](principles.md#one-anchor-per-search).
- **self-grown**: Said of a composed tag with a search whose `from` is the tag itself, which is how repetition is written. Its partial rows stay in the chart, and selection keeps the outermost.
- **atom**: One step of a search: a tag atom (`tag`, a name or a list) takes a row, a regex atom (`rx`) takes a stretch of the text. Either may have `as` and `optional`. `Atom` in `src/conf.ts`.
- **optional**: On an atom: the search is tried with and without it. The outermost atom may not be optional.
- **the reserved names**: `^` (the start of the text, a row at `(0,0)`), `$` (its end, a row at `(n,n)`) and `*` (any tag), usable in atoms and never declared; `doc` and `text`, the tree's own tags, never declared nor used in atoms; and `value`, which no role may take. `RESERVED`, `TREE` and `ROLE_RESERVED` in `src/conf.ts`.
- **resolve, resolver**: `resolve` on a tag names a **resolver**, a function passed to `compile` that takes `{ value, ...roles }` and returns the row's value, or `null` to refuse the row. The only code a conf reaches. `Resolve` in `src/conf.ts`.
- **weak**: On a tag: its rows are walked after every other row in selection, so they fill only what is left. Not read by `find`.
- **fate**: On a tag, copied onto its nodes: `separator`, `connector` or `bracket`, the three ways the fold treats a node specially. Not read by `find`. `Fate` in `src/conf.ts`.
- **key order**: The order of the keys of `tags`, kept by `compile`. Within the library, selection's tiebreak and nothing else; the playground also orders chips and colours by it.
- **compile error**: `{ path, tag, message }`, one problem in a conf. `compile` returns them and never throws; a tag with any is left out. `CompileError` in `src/conf.ts`.

## The chart

- **word guard**: The rule that a root match may not start or end inside a run of letters or digits. `cutsWordAtStart` and `cutsWordAtEnd` in `src/find.ts`.
- **suffix match**: A root row that ends where a longer row of the same tag ends, left because the scan resumes one character after each match's start. Selection drops it inside the longer row.
- **normalised copy**: The text as the engine matches it: NFKC, dashes as `-`, straight quotes, whitespace runs as one space, with a boundary map back to the original. `normalise` in `src/normalise.ts`.
- **chart**: Every row of every tag for one text and one conf, and nothing else; complete and neutral. `Chart` in `src/chart.ts`.
- **row**: One find: a tag and a span. The same tag on the same span is one row. `Row` in `src/chart.ts`.
- **span**: `[start, end]`, offsets into the original string. `Span` in `src/chart.ts`.
- **edges**: The rows of a chart laid out by where they start and where they end, the question the matcher asks. `Chart.edges()` and `edges(rows)` in `src/chart.ts`.
- **Allen relation**: One of thirteen names for how two spans sit (`before`, `meets`, `overlaps`, `starts`, `during`, `finishes`, `equals` and the inverses), after James F. Allen's interval algebra. `rel` in `src/chart.ts`.
- **matcher**: The one function that runs a search from a row and reports every derivation, shared by `find` and `dom`. `derive` in `src/derive.ts`.
- **root scan**: Pass zero: every root tag's pattern over the whole normalised copy, under the word guard. `roots` in `src/find.ts`.
- **cursor**: The edge a search has reached: the `from` row's start going back, its end going forward, moving outward as atoms are taken. `derive` in `src/derive.ts`.
- **derivation**: One complete way a search's atoms can be taken from one row: its span, its roles and its steps. Every derivation is kept. `derive` in `src/derive.ts`.
- **pass**: One round of `find`: every search that reads a tag the round before added to, run from every row of its `from` tag. Pass zero is the root scan. The loop in `find`, `src/find.ts`.
- **fixpoint**: The first pass that adds no row, where `find` stops.
- **packing**: Two derivations that give the same tag the same span make one row. It is why the passes end.
- **twin**: A row of another tag on exactly the same span as a row.

## The tree

- **node**: One chosen row in the tree, or `doc`, or water. `Node` in `src/dom.ts`.
- **doc**: The root node, spanning the whole text and carrying it in its `text` field (a field, not the `text` tag of water).
- **water**: A `text` node: a stretch of text no chosen row covers.
- **leaf**: A node with no children. The leaves in order cover the text exactly once.
- **reading**: One consistent choice among a chart's rows. A chart holds every reading; a tree is one.
- **selection**: The walk in `dom` that takes or drops each row of the chart, in one fixed order, so that no two chosen rows cross.
- **cross, inside**: Two spans cross when one overlaps the other without containing it (`overlaps`, `overlapped-by`). A span is inside another when it `starts`, is `during` or `finishes` it.
- **forcing**: When a composed row is chosen, re-running its search inside its span and choosing every row the first usable derivation took, at once; a row of its own tag is absorbed and forced in turn. `take` and `force` in `src/dom.ts`.
- **also**: On a node: the tags of its twins, which selection folded into it instead of making nodes. `Node.also`.
- **role, as**: `as` on an atom names a **role**: what the atom took, handed to resolvers as a value and kept on the node in `attrs`, as the node it took or the text a regex atom matched. `Node.attrs`.
- **value**: A node's resolved string, on tags that resolve; and, in a resolver's argument, the row's own text. `Node.value`.

## The fold

- **fold**: The reader's policy, a function from a node to a boolean: `true` folds the node and everything under it away. `Fold` in `src/fold.ts`.
- **policy**: What a fold expresses; "the policy says so" means the fold returned `true` for that node.
- **hidden**: The set of nodes the condensed view drops, after the policy and the three fate rules. `hidden` in `src/fold.ts`.
- **condensed view**: The text as the reader sees it after a fold: every leaf `hidden` does not drop.
- **gist**: The condensed view as text: the leaves `hidden` keeps, joined. `gist` in `src/fold.ts`.
- **separator, connector, bracket**: A node whose tag has that fate. A separator is glue whose strongest survives a cut; a connector goes when the next non-separator leaf to its right goes; a bracket goes when everything inside it goes.
- **delimiter**: A bracket's first or last child when it is water exactly one character long, its `(` or `)`. Not counted when deciding whether the bracket emptied.

## Around the library

- **case**: A named text with the conf it is found with, and optionally the `fold` it opens with and the `gist` that fold should give. `cases/*.json`; `PlaygroundCase` in `src/playground.ts`.
- **playground**: The page that shows one case at a time: the chart on a character grid, the tree, the gist, the tags, a live conf editor. `mount` in `src/playground.ts`; its design in [playground.md](playground.md).
- **band**: A row drawn on the playground's grid, an underline under the characters it covers.
- **lane**: One level of bands under a line of the grid; rows that overlap take different lanes. `lanes` in `src/grid.ts`.
- **chip**: A tag's control in the playground: it lights the tag's rows, and its eye folds the tag.
- **popover**: The card a hovered or focused band opens: tag, span, value, and whether the row is a twin or was not kept.
- **fewrd-play**: The dev-only command that opens a conf folder in the playground. `play/`.
- **round**: A stretch of work in which the documents change first and the code is made to agree; recorded under `specs/`, starting with the [rewrite brief](../specs/rewrite-brief.md).
- **ceiling**: A simplification that is right at subject length, marked in the code with a `ponytail:` comment naming the upgrade. Listed in [architecture.md](architecture.md#ceilings).
