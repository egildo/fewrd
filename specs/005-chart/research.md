# Research: The Chart (rewrite, phase 1)

Every decision below is either the brief's (section 3.4, cited as such) or a choice the brief left to the plan. None reopens the brief. Each has a name, used by the plan and the tasks.

## compiled-conf-is-the-same-shape

**Decision**: One set of types with two type parameters: `Conf<P = string, R = string>`, `Tag<P, R>`, `Search<P>`, `Atom<P>`. The data form is `Conf` (patterns as `"/source/flags"` strings, resolvers by name); `compile` returns `Conf<RegExp, Resolve>`, the same shape with each pattern a `RegExp` and each `resolve` a function. `find` takes `Conf<RegExp, Resolve>`.

**Rationale**: The brief names the data types and nothing else; a second set of names for the compiled form (`CompiledConf`, `Book`) would be an alias, which principle V forbids. The compiled form really is the same shape, so one generic type says so. `patterns` stays in the compiled conf as the data had it; `find` never reads it, since `compile` has already spliced every `%{NAME}`.

**Alternatives considered**: `ConfData` for the data form and `Conf` for the compiled one (a new name for an old thing); `find` taking the data form plus resolvers and compiling inside (recompiles on every call, and hides the errors).

## resolve-type

**Decision**: `type Resolve = (row: Readonly<Record<string, string>>) => string | null`. The argument is `{ value, ...roles }`.

**Rationale**: The old `Resolver` shape, renamed after the vocabulary's `resolve`. `null` means "not this tag after all"; any string is a value, used in phase 2.

## root-scan

**Decision** (brief 3.4): Each root tag's `RegExp` is re-flagged once for scanning, `gd` plus its own flags minus `y`, and cached per `RegExp` in a `WeakMap`. The scan runs `exec` from `lastIndex = 0`; after every match, accepted or not, it sets `lastIndex = match.index + 1`. A match is skipped when it is zero-length, when it cuts a word (`/[\p{L}\p{N}]/u` on both sides of its start, or of its end), or when the tag's resolver returns `null` for `{ value: match }`.

**Rationale**: `index + 1` is what makes overlapping matches of one tag appear (`root-rows-every-match`) and guarantees progress on zero-length matches. The guard is the old `cutsWordAtStart`/`cutsWordAtEnd`, verbatim.

**Consequence worth documenting**: the engine offers one match per start position, and a rejected match is not retried shorter. Conf authors order alternatives longest-first; the README says so under The conf.

## pinned-regexes

**Decision** (brief 3.4): Three more cached variants per `RegExp`, built on first use: **back** `(?:source)$` (for a last regex atom going back, run on `text.slice(0, cursor)`), **forward** sticky `y` (for a last regex atom going forward, `lastIndex = cursor`), and **whole** `^(?:source)$` (for a regex atom between two atoms, run on the exact slice). All drop `g` and `y` from the original flags before adding their own.

**Rationale**: The old `pinned()` helper, plus `whole`. One `WeakMap<RegExp, {…}>` holds all four.

**Ceiling**: the back variant rescans the prefix, O(n) per attempt; fine at subject length. `ponytail:` comment in the code.

## matcher-is-a-depth-first-enumeration

**Decision** (brief 3.4): For each search and each row of its `from` tag, a recursive function walks the atoms in order with a cursor (the row's start going back, its end going forward), the current leftmost/rightmost edge, the roles bound so far, and at most one **pending regex atom** whose extent is not yet known. At each atom:

- **Tag atom** (`tag` a name, a list, or `*`): for every candidate row of those tags in the previous chart that meets the cursor (ends at it going back, starts at it going forward), recurse with the cursor moved to the row's far edge. With a pending regex atom, the candidates are instead every row on the far side of the cursor (end ≤ cursor going back, start ≥ cursor going forward) whose gap to the cursor the pending regex matches **whole**; the regex's extent is that gap.
- **Regex atom**: if a regex atom is already pending, resolve that one as last first (see `open point: two regex atoms in a row` in the spec); then this one becomes pending.
- **`optional`**: recurse once taking the atom and once skipping it.
- **End of atoms**: a pending regex atom is matched as last (forward sticky or back pinned); a failed match ends the branch. Otherwise the derivation is complete: emit `(tag, leftmost, rightmost)` with its roles.

`^` and `$` are ordinary rows of the chart (`(0,0)`, `(L,L)` in normalised coordinates), so they need no special case in the matcher. `*` iterates every tag of the chart.

**Rationale**: Every combination is tried, nothing is possessive (`atoms-meet-the-cursor`), and the pending-regex device is the smallest way to let a regex atom's extent be set by the row the next *taken* atom lands on, whether or not optional atoms were skipped in between.

**Ceiling** (brief 3.4, marked with a `ponytail:` comment): exponential in the number of optional atoms per search; the chart grows quadratically under `*` on a self-growing search. Candidate lookup scans a tag's sorted list; binary search if subjects grow.

## role-values-are-transient

**Decision**: While `find` runs it keeps a `Map` from row triple to value for rows of tags that resolve: a root row's value is its resolver's answer; a composed row's value is the answer for the first derivation that produced it. A role bound to such a row gets that value; a role bound to a row of a tag without `resolve` gets the row's text (normalised). The map is dropped when `find` returns. Searches run in code-unit order of their tag's name, `from` rows in span order, derivations in atom order, so "first" does not depend on the key order of `tags`.

**Rationale**: `composed-rows-resolve` passes the bound row's value to the resolver but does not store it in the chart. A row's value is fixed the first time the row is accepted, so recomputing it every pass would give the same answer at more cost. Canonical order keeps `find-is-deterministic`.

## pass-loop

**Decision**: `chart = Chart.empty(L).with(rootRows)`; then repeat: run every search against `chart`, collect all emitted rows, `next = chart.with(rows)`; stop when `next.size() === chart.size()`. Map every span back through `normalise`'s `at` once at the end, into a fresh chart of the original length.

**Rationale**: `with` ignores existing triples, so `size()` is the fixpoint test the brief names. No pass cap: the loop is bounded by the row count (proof in `passes-to-a-fixpoint`).

**Consequence**: two normalised spans can map back to the same original span only if the normaliser collapsed characters between them, which it does only for whitespace runs; `with` deduplicates, so the invariants hold either way.

## chart-internals

**Decision**: `Chart` wraps a `ReadonlyMap<string, readonly Span[]>` and the text length. `with` groups incoming rows by tag, merges each group into a copy of that tag's list (sorted by start, then end, duplicates dropped) and reuses every other list by reference. `toJSON` emits tags in code-unit order of name. `all()` merges all lists by start, end, tag name. `Span` is `readonly [start: number, end: number]`.

**Rationale**: copy-on-write per tag list is what the brief asks; the name order makes equal charts serialise equally (`chart-invariants`). The only class in the codebase (brief 3.4).

**Ceiling**: `has`, `after`, `before` scan or binary-search a sorted list; linear is enough at subject length (`ponytail:` comment).

## allen-relations-order

**Decision**: `rel(a, b)` tests, in order: `equals`, `before`, `after`, `meets`, `met-by`, `overlaps`, `overlapped-by`, `starts`, `started-by`, `during`, `contains`, `finishes`, `finished-by`. The type `AllenRelation` is the union of those thirteen strings.

**Rationale**: For proper intervals the order is irrelevant (exactly one holds). For zero-length spans (`^`, `$`) several hold at once; testing `meets` before `starts`/`finishes` makes the text's edges *meet* the rows that touch them, which is what phase 2 needs.

## playground-draws-with-ch-units

**Decision**: `src/playground.ts`, plain DOM, no framework. Per case: the text in a monospace line (`white-space: pre`, horizontal scroll), under it one lane per stack level, each band an absolutely positioned element at `left: start ch; width: (end-start) ch`, coloured by tag, with the tag name inside when it fits and in `title` always. Lanes come from a pure `lanes(rows)` function: rows in `all()` order, each placed on the first lane whose last band ends at or before its start. Colour: hue from a small string hash of the tag name, fixed saturation and lightness, tuned for light and dark. Printed lines: `tag(start,end)` in `all()` order. Styles injected once, scoped under a class.

**Rationale**: brat's look (bands under text, stacked on overlap) with the least machinery; `ch` units need no measuring. `lanes` is pure, so it gets a node test (the line printer is a one-line map over `all()`); the DOM is checked by eye in `pnpm dev`, as in rounds 002 and 003.

**Ceiling**: a character outside the Basic Multilingual Plane takes two string positions but one glyph, so bands after it drift by one `ch`; `ponytail:` comment, measure with `Range` rects if real subjects need it.

## json-import

**Decision**: The Italian conf and the cases load with `import … with { type: 'json' }` in `confs/it-pa.ts`, the tests and `playground/main.ts`.

**Rationale**: Verified in round 003 for node 25, `tsc` and vite 7 with no config change.

## package-and-config

**Decision**: `package.json` drops `book.schema.json` from `files` and `exports`, keeps `.` and `./playground`, keeps the version. `tsconfig.json` `include` swaps `recipes` for `confs`. `vite.lib.ts` needs no change (its entries are `src/index.ts` and `src/playground.ts`). `pnpm dev` stays `vite playground --port 5577 --strictPort`, with a new `playground/index.html` and `playground/main.ts`.

**Rationale**: the slate commit left these pointing at deleted files where they did not break `pnpm typecheck` or `pnpm test`; the build and `npm pack` need them right before release.
