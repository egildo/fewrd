# Architecture

fewrd is two halves with plain data between them. The **finding half** turns a text and a conf into a chart and chooses nothing. The **DOM half** turns the text, the chart and the conf into one tree, and folds it. The chart and the tree, the two results, are plain data that survive `JSON.stringify`; the compiled conf carries `RegExp`s and resolver functions, the fold is a function, and `hidden` answers with a `Set` of nodes.

## The pipeline

```
conf.json ──compile──▶ Conf (RegExp, Resolve)          errors: { path, tag, message }[]
                         │
text ──normalise──▶ copy + boundary map (at)
                         │
                         ▼
        find:  root scan ─▶ pass ─▶ pass ─▶ … ─▶ fixpoint     (derive on the copy)
                         │   spans mapped back through at, once
                         ▼
                       Chart            JSON; cacheable by (text, conf.version)
                         │
text + Chart + Conf ─────┤
                         ▼
        dom:   normalise again ─▶ map rows into the copy ─▶ select, forcing each composed row
               as it is chosen (derive again) ─▶ values ─▶ tree by containment ─▶ roles ─▶ water
                         │
                         ▼
                   Node (doc)           JSON; carries the text and every fate
                         │
Fold ────────────────────┤
                         ▼
        hidden(doc, fold) ─▶ Set<Node>          gist(doc, fold) ─▶ string
```

## The modules

Each file in `src/` owns one job. Only `Chart` is a class.

- `conf.ts`: The conf's types (`Conf`, `Tag`, `Search`, `Atom`, `Fate`, `Resolve`, `CompileError`) and `compile`. Owns validation, `%{NAME}` splicing, the reserved names and resolver lookup by name. Never throws. The data form and the compiled form are one type with two parameters, `Conf<string, string>` and `Conf<RegExp, Resolve>`.
- `normalise.ts`: The normalised copy: NFKC, dash variants to `-`, curly quotes to straight, every whitespace run to one space; a code unit under 0x80 takes a fast path, since none of the rules changes it but whitespace. Returns the copy and its boundary map. Internal.
- `chart.ts`: `Chart`, `Span`, `Row`, `rel` and the Allen relations, and `edges`. The one owner of row lookups: the chart's queries for one row at a time, `edges` for every row at an edge, which is what the matcher needs.
- `derive.ts`: The matcher, shared by both halves, and `pinned`, the regex variants it needs (scan, back, forward, whole), cached per `RegExp`. Internal.
- `find.ts`: `find`: the root scan with its word guard, then the pass loop to the fixpoint, on a chart it grows in place as sorted lists. Keeps resolver values for the length of the call only.
- `dom.ts`: `Node` and `dom`: the coordinate mapping into the copy, selection (indexed, with a trail to undo it), forcing, values, the tree, roles and water.
- `fold.ts`: `Fold`, `hidden` and `gist`. Reads the tree alone: no conf, no chart.
- `playground.ts`: `mount` and its option types: the playground, plain DOM, its CSS injected as a string. Its design is in [playground.md](playground.md).
- `grid.ts`: The playground's pure geometry: wrapping, lanes, per-line segments, the tree as lines, the greyed spans, the band palette slots. Internal; the playground and its tests import it.
- `index.ts`: The main entry: re-exports `conf.ts`, `chart.ts`, `find.ts`, `dom.ts` and `fold.ts`.

Outside `src/`: `bench.ts`, which times `find` and `dom` apart over a `fewrd-play` conf folder and a file of texts (`node bench.ts <conf-dir> [texts]`), `confs/` holds the two domain confs as JSON with their resolvers in TypeScript (a domain is added there and in `cases/`, never by changing `src/`), `cases/` their cases, `playground/` the page `pnpm dev` serves, and `play/` the separate `fewrd-play` package (`cli.ts`, the command; `server.ts`, a localhost server for one conf folder).

## What is public

The package has two entries, and nothing else is importable:

- `fewrd` (`src/index.ts`): `compile`, `find`, `dom`, `hidden`, `gist`, `Chart`, `rel`, `edges`, and the types `Conf`, `Tag`, `Search`, `Atom`, `Fate`, `Resolve`, `CompileError`, `Span`, `Row`, `Edges`, `AllenRelation`, `Node`, `Fold`.
- `fewrd/playground` (`src/playground.ts`): `mount`, `PlaygroundCase`, `PlaygroundConf`.

`derive.ts`, `grid.ts` and `normalise.ts` are internal: bundled where they are used, never exported. The confs, cases and playground page stay in the repository and are not published.

## What crosses each boundary

| boundary | data | shape |
|---|---|---|
| author → `compile` | conf as data | JSON: `version`, `patterns`, `tags`; resolvers passed by name |
| `compile` → both halves | compiled conf | same shape, `RegExp`s and functions; tag key order kept |
| `find` → `dom`, caller, cache | `Chart` | tag → sorted, unique spans into the original text; `toJSON` and `Chart.from` |
| `dom` → fold, caller | `Node` | `doc` over the text, carrying it; nodes carry `fate`, `value`, `attrs`, `also` |
| reader → fold | `Fold` | `(node) => boolean` |
| fold → caller | `Set<Node>`, `string` | the hidden nodes, the gist |

## The shared matcher

`derive(text, edges, valueOf, search, from, emit)` runs one search from one row and calls `emit` for every derivation, with its span, the role values a resolver sees, and the steps it took (each row taken, and the text of each regex atom that has `as`). It is a depth-first enumeration over the atoms: a tag atom tries every row that meets the cursor, an optional atom is tried skipped and taken, and a regex atom stays pending until the next taken atom fixes its span, or until the end, where it is matched sticky going forward or pinned to the cursor going back.

`find` runs it over the whole chart, once per search per `from` row, in each pass that can feed the search. `dom` runs it again inside one chosen row's span, over only the rows inside it, to recover a derivation to force and the roles to bind. One matcher means the two halves cannot disagree about what a search can take.

## The pass loop

Pass zero is the root scan: each root tag's pattern, in its scan variant, over the whole copy, resuming one code point after each match's start, rejecting zero-length matches, matches that cut a word, and matches the tag's resolver refuses. Each later pass runs the searches of every tag (tags in code-unit order of their names, so key order cannot matter) from every row of the `from` tag, and adds what it found once it is over, in the chart's order, so first derivations come in a fixed order and every resolver sees the same roles. A row already present is ignored, so when a pass adds nothing the loop stops. It always stops: a row is a tag and a span inside the text, so there are finitely many.

The chart grows in place: the rows, each tag's spans and the edge index are sorted lists that a pass's rows are inserted into, so nothing is rebuilt per pass. A pass runs a search only if the pass before added a row of a tag it reads: its `from`, or a tag one of its atoms names (a `*` atom reads them all); pass one counts everything the root scan found. This is the semi-naive step, per tag and not per row: deriving only from the new rows would miss a derivation that reaches a new row through an atom. Rows are keyed by number for the duplicate test and the value map. `Chart` is built once, at the end, by `with`, which sorts and drops equal neighbours.

## The normalised copy and the coordinate mapping

Matching runs on the copy, so a conf can say `-` and mean every dash, and one space and mean any run of whitespace. `normalise` returns the copy and `at`, which gives for each boundary of the copy (one per UTF-16 unit, plus the end) the boundary of the original it came from; a code point that NFKC expands into several maps every boundary inside it to its start.

`find` works on the copy throughout and maps every span back through `at` once, at the end, so the chart is in original coordinates. `dom` receives the original text and the chart, normalises again, and maps each row into the copy: a start to the first copy boundary with that original offset, an end to the last. A row that falls on no boundary means the chart belongs to another text, and `dom` throws. Selection, forcing and values work on the copy; nodes are built back in original coordinates. Resolvers therefore always see normalised text.

## Selection

`dom` walks the candidates in one fixed order and keeps a `chosen` set that never holds two rows that cross, nor two on one span (the second is a twin). Every test the walk makes is answered from an index of that set:

- **by span**: one lookup says a row is chosen already, or that it has a twin there;
- **by tag**: the same-tag test scans only that tag's chosen rows;
- **by edge**: two arrays over the copy's boundaries hold, at each one, the furthest end of the chosen rows starting there and the earliest start of those ending there; a row crosses the set when one of its inner boundaries has a chosen edge reaching outside it, so the test walks the boundaries inside the row.

Forcing chooses rows it may have to give back. Every change to the selection, the indexes included, pushes its inverse on a trail, and giving back is popping to a mark. Rows are the one object `all` holds, so derivations, values and twins are maps by row identity, and there are no string keys.

## Values

Resolvers are asked in both halves. In `find` they filter: a row whose resolver returns `null` is not a row, and the values of accepted rows live in a map for the length of the call, so a role bound to such a row gives the next resolver its value. In `dom` the values are recomputed lazily and memoised, bottom-up by recursion, and kept on the nodes. See [resolvers-filter-then-value](decisions/resolvers-filter-then-value.md).

## Ceilings

Simplifications that are right at subject length and wrong past it. Each is marked in the code with a `ponytail:` comment naming the upgrade; that list is this list.

- **Chart queries** (`chart.ts`): `has` and `before` scan a tag's sorted list and `after` binary-searches it; `*` visits every tag. Index by position if subjects grow.
- **Pinned back regexes** (`derive.ts`, `pinned`): a regex atom going back runs on the whole prefix, rescanning it on every attempt, and a lookahead in it cannot see past the cursor.
- **The matcher** (`derive.ts`, `derive`): exponential in the optional atoms of one search; a `*` atom on a search that grows from its own tag makes the chart quadratic in the text; a regex atom between two atoms scans every row on its far side.
- **Selection** (`dom.ts`): the crossing test walks the boundaries inside the row, O(its length), the same-tag test scans the chosen rows of that tag, and every derivation of a composed row is enumerated. An interval tree if subjects grow.
- **The chart in `find`** (`find.ts`): each insert into a sorted list is a splice, O(rows); rows come sorted in batches, so most inserts append. A pass reruns a search whole when any tag it reads grew, not only from the new rows.
- **The coordinate mapping** (`dom.ts`): a row edge that `find` placed inside an NFKC expansion is not recovered.
- **The playground** (`playground.ts`): the case is found again on every keystroke, with no debounce; a character outside the BMP takes two positions but one glyph, so bands after it drift by one cell; a newline in a text is not handled; the tree is not keyboard-navigable (the bands are).

## Open and parked

**Open:** whether the root scan should keep advancing by one ([root-scan-advances-by-one](decisions/root-scan-advances-by-one.md)), and a construct for optional labels ([optional-labels](decisions/optional-labels.md)).

**Parked**, decided not to do now and not to be designed around:

- `not` on `*`, any tag but some;
- name globs in tag atoms, such as `cig-*`;
- a twin-rule table, per-pair rules for twins;
- `glued`, a root match allowed to cut a word;
- HTML output from fewrd, which [the vision](vision.md) excludes today: taking it up means amending the vision first;
- publishing `fewrd-play`: it is 0.2.0 in the repository and not on npm; putting it there is its own act.
