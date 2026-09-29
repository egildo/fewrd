# Feature Specification: The Chart (rewrite, phase 1: the finding half)

**Feature Branch**: `rewrite`

**Created**: 2026-09-29

**Status**: Implemented; every worked example and the Italian table run as tests

**Input**: User description: "Phase 1 of the fewrd rewrite: the finding half. Conf types and compile, the Chart, find(text, conf) to a fixpoint, the Italian conf in the new format, a brat-style chart playground, README for the finding half. Per specs/rewrite-brief.md."

The brief ([`specs/rewrite-brief.md`](../rewrite-brief.md)) is the settled outcome of the design round with the maintainer. This spec turns its phase 1 into requirements and does not reopen it. Where the brief is silent and a choice had to be made to make a requirement testable, the choice is stated in Assumptions; where the brief's own words leave a real gap, it is listed under Open points.

## Why a rewrite, in one paragraph

The old engine (`read`) did three jobs at once: it found what recurs, it chose among overlapping finds, and it cut the text into leaves for rendering. Choosing early meant finding had to be greedy and possessive, which is why the old rules needed `rest`, neighbour lists tried "again from the top", `requires` and `glued`. The rewrite splits the jobs. The finding half, this phase, keeps *everything*: every match of every tag, every composition the searches can build, crossing overlaps included. It returns a chart and makes no choice at all. The DOM half, phase 2, selects from the chart and builds the tree. A finding half that never chooses can be described by six short rules, cached by text and conf version, and drawn as it is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write a conf and get its chart (Priority: P1)

An integrator describes what recurs in their texts as a conf, in JSON: named patterns, root tags that match a regex, and composed tags whose searches grow outward from rows of another tag. They compile it once with their named resolvers, run `find(text, conf)` on any string, and get back a chart listing every row of every tag, with spans into their original string.

**Why this priority**: Everything else in the rewrite, the Italian conf, the playground and all of phase 2, reads the chart. Without the conf format, `compile` and `find`, there is nothing to show or select from.

**Independent Test**: Compile each synthetic conf of the worked examples below, run `find` on its text, and compare the chart with the one written in the example.

**Acceptance Scenarios**:

1. **Given** a conf whose tags reference only patterns, tags and resolvers that exist, **When** it is compiled, **Then** no errors are reported and every tag is kept.
2. **Given** a conf with one broken tag (a bad pattern, an unknown tag in an atom, both `rx` and `search`), **When** it is compiled, **Then** compile does not throw, reports an error naming the path and the tag, leaves that tag out, and keeps every other tag.
3. **Given** a compiled conf and a text, **When** `find` runs, **Then** the chart holds exactly the rows the six finding rules produce, `^` at `(0,0)`, `$` at `(n,n)`, each tag's rows sorted and unique, spans into the original string.
4. **Given** a conf with a search that grows from its own tag, **When** `find` runs on any text, **Then** it stops, and the chart holds every repetition the text allows.
5. **Given** the chart of any text, **When** it is written to JSON and read back with `Chart.from`, **Then** the result equals the original.

---

### User Story 2 - The Italian conf proves the format on real subjects (Priority: P2)

The maintainer rewrites the Italian public-administration conf in the new format and runs it over the real subjects kept in `cases/it-pa.json`. Protocols with and without a number word, CIG, CUP, chapters, amounts, dates, capitals, quotations running to the end, connectors and separators all come out as rows, and `dated`, the first composition built from another composition, joins a protocol to its date.

**Why this priority**: Phase 1 ends when the Italian subjects come out tagged as expected. It is the proof that the vocabulary is enough for a real domain, and the place where it shows it is not.

**Independent Test**: For every case in `cases/it-pa.json`, run `find` with the Italian conf and compare the rows of the asserted tags with the table in `italian-cases-tagged`.

**Acceptance Scenarios**:

1. **Given** the Italian conf, **When** it is compiled with its four resolvers, **Then** no errors are reported.
2. **Given** each Italian case, **When** `find` runs, **Then** the asserted tags have exactly the rows listed for that case, and no others.
3. **Given** the case "PEC, channel with a dash", **When** `find` runs, **Then** the chart holds both `dated` rows, one grown from the bare protocol and one from the protocol with its channel, found in successive passes.

---

### User Story 3 - See the chart in the playground (Priority: P3)

An integrator mounts the playground with named confs, their resolvers and their cases, and sees one case at a time: its text on a character grid with every row of the chart drawn as an underline, stacked in lanes where rows overlap, the tag and span shown when a band is hovered. They step through the cases with a large left/right control. They edit the conf of the case on screen in a text area and the case is found again as they type; a mistake shows as an error beside the editor while the last good chart stays on screen.

**Why this priority**: A chart that keeps everything is large; reading it as lines of numbers does not scale past a handful of rows. The playground is how a conf author sees what their searches built, and it is what `pnpm dev` opens on the Italian conf.

**Independent Test**: Run `pnpm dev`, step through the cases and check that each is drawn, hover a band and see its tooltip, change a pattern in the editor and see the bands move, break the JSON and see the error while the drawing stays.

**Acceptance Scenarios**:

1. **Given** the playground mounted with the Italian and common confs and twenty cases, **When** the page loads, **Then** case 1 of 20 is shown with one underline per non-empty row, overlapping rows on separate lanes, and no list of rows.
2. **Given** that playground, **When** the pattern of a tag in the conf on screen is edited to a valid alternative, **Then** the case is found again and redrawn, and the other domain's conf is untouched.
3. **Given** that playground, **When** the conf stops being valid JSON or has compile errors, **Then** the errors are listed next to the editor; on invalid JSON the last good charts stay on screen, on compile errors the charts are drawn with the tags that compiled.

---

### User Story 4 - Read how finding works (Priority: P4)

A new reader opens the README and learns what fewrd is for, installs it, writes a small conf, and reads the six rules of the finding half, what a chart holds, how to open the playground, and how to develop. The README says plainly that phase 2 (selection, the tree, the fold) is not there yet.

**Why this priority**: Principle II makes the README's rules the single source of truth for `find`. The rules must exist in the README before phase 1 is done, but they can be written last, from the code that the tests prove.

**Independent Test**: Read the README top to bottom; every rule in it matches a requirement below; the quick start runs as written.

**Acceptance Scenarios**:

1. **Given** the README, **When** it is read, **Then** it has the sections Why, Install, Quick start, The conf, The rules, The chart, Playground, Develop, and The rules states the six finding rules.
2. **Given** the quick start, **When** its code is run against the built-free source, **Then** it prints the chart the README shows.

### Edge Cases

- **Empty text**: the chart is `^ (0,0)` and `$ (0,0)` and nothing else; `find` runs no search that has no rows to start from.
- **A tag with no rows**: it does not appear in the chart at all; `spans(tag)` returns an empty list.
- **A regex that can match the empty string** (`/x*/`): root matches of zero length are skipped (`root-rows-every-match`); a regex *atom* may match an empty slice, since the rule skips only zero-length root matches.
- **A search that grows from its own tag** (`from: "list"` inside `list`): it stops when a pass adds nothing (`passes-to-a-fixpoint`).
- **A search whose `from` tag was left out by compile** for its own errors: the search finds no rows; compile does not report it a second time.
- **Characters the normaliser changes** (NFKC, dashes, curly quotes, whitespace runs): matching sees the normalised copy; every span is mapped back to the original once, at the end (`match-on-normalised-text`).
- **A root match rejected by the word-boundary guard**: that start position yields no row; the scanner does not try a shorter match at the same position (the regex engine offers one match per position). A conf must order its alternatives longest-first for this reason, as the Italian conf does.
- **A character outside the Basic Multilingual Plane** (an emoji): `normalise`'s boundary map has one entry per code point, while spans count UTF-16 units; `find` converts between the two once, when it maps spans back, so rows after such a character still land on the right offsets in the original.
- **Crossing rows, twins, rows inside rows**: all kept (`chart-complete-and-neutral`).

## Requirements *(mandatory)*

Every requirement has a short name, and the prose refers to requirements by that name. The identifiers follow the template and are for the tasks file only.

### The conf and compile

- **FR-001 · `conf-is-plain-data`**: A conf MUST be expressible as plain JSON: `{ version, patterns?, tags }`. `version` is a non-empty string that keys a cached chart; `patterns` maps a name to regex source; `tags` maps a tag name to a tag. The types, in data form, are:

  ```
  Conf    = { version: string; patterns?: Record<string, string>; tags: Record<string, Tag> }
  Tag     = { rx?: Pattern; search?: Search[]; resolve?: string; weak?: boolean; fate?: 'separator' | 'connector' }
  Search  = { from: string; back?: Atom[]; forward?: Atom[] }
  Atom    = { tag: string | string[]; as?: string; optional?: boolean }
          | { rx: Pattern; as?: string; optional?: boolean }
  Pattern = "/source/flags"
  ```

  `weak` and `fate` are carried through compile untouched; `find` never reads them. They are for the DOM half.

- **FR-002 · `patterns-splice-by-name`**: A pattern MUST be a regex literal in a string, `"/source/flags"`. `%{NAME}` in a pattern or in another named pattern splices in `patterns.NAME` as one non-capturing group, recursively; `%\{` is a literal `%{`. This is the splicing of the old `compile`, kept as it was.

- **FR-003 · `tag-is-root-or-composed`**: A tag MUST have exactly one of `rx` (a root tag) and `search` (a composed tag, one or more searches).

- **FR-004 · `search-has-one-direction`**: A search MUST name a `from` tag and exactly one of `back` and `forward`, a list of atoms. An atom is a tag atom (`tag`: one name or a list of names) or a regex atom (`rx`: a pattern); either may carry `as` (a role name for the resolver) and `optional`. Two rules keep a sequence honest. The outermost atom of a sequence, the last of `forward` or the last of `back`, MUST NOT be `optional`: skipped, it would leave the derivation ending in glue with nothing beyond it (see Assumptions). And two regex atoms MUST NOT follow each other, with nothing but optional atoms between them: a regex atom's extent is set by the row the next taken atom lands on, and a regex has no row to give.

- **FR-005 · `reserved-names`**: `^`, `$` and `*` MUST be usable as tag names in tag atoms and MUST NOT be declarable as tags. `^` is the row `(0,0)`, `$` the row `(n,n)`, `*` any tag in the chart. `from` names a declared tag; a reserved name in `from` is an unknown tag.

- **FR-006 · `compile-never-throws`**: `compile(data, { resolvers })` MUST NOT throw on any input. It returns the compiled conf and a list of errors `{ path, tag?, message }`, where `path` locates the problem (`tags.protocol.search[0].back[3].tag`, `""` for the root) and `tag` names the tag it belongs to. It reports exactly these problems: an unknown tag in `from` or in an atom; a tag with both or neither of `rx` and `search`; a search with both or neither of `back` and `forward`; a bad pattern (not a `/source/flags` string, or a regex the engine rejects); an unknown `%{NAME}`; a circular `%{}`; an unknown resolver; a reserved name declared as a tag; a value of the wrong type or shape (the conf, a tag, a search or an atom that is not an object, a `version` that is not a non-empty string, a `weak` that is not a boolean, a `fate` that is neither `separator` nor `connector`); an unknown key on the conf, a tag, a search or an atom, named by its path (a typo such as `optinal` is an error, not a silent no-op); an `as` equal to `value` (the row's own text, reserved) or to `^`, `$`, `*`; an outermost atom that is `optional`; and two regex atoms in a row ("merge them into one pattern"). The path of the last two is that of the second regex atom and of the optional atom. A tag with any error is left out; every other tag is kept, in its key order.

- **FR-007 · `resolvers-by-name`**: `resolve` MUST name a function supplied by the caller in `compile`'s `resolvers`. Nothing in the conf is evaluated as code. A resolver takes `{ value, ...roles }` (all strings) and returns a string or `null`.

- **FR-008 · `priority-is-key-order`**: The key order of `tags` MUST survive compile (JSON keeps it), since it is the DOM half's tiebreak. `find` MUST NOT read it: reordering the keys of `tags` leaves the chart unchanged (`find-is-deterministic`).

### The chart

- **FR-009 · `chart-holds-rows-only`**: A chart MUST be a map from tag to its rows, each row a span `[start, end]` into the original string, and nothing else: no values, no roles, no derivations, no water. A tag with no rows is absent.

- **FR-010 · `chart-invariants`**: Every chart MUST keep the invariants of the constitution's Data Contracts: each tag's rows sorted by start then end; one row per `(tag, start, end)`; `^` at `(0,0)` and `$` at `(n,n)` where `n` is the original length; spans into the original string; `Chart.from(c.toJSON())` equal to `c`, and the JSON form unchanged by `JSON.stringify`/`JSON.parse`. `toJSON` lists tags in code-unit order of their names, so two equal charts serialise to the same string.

- **FR-011 · `chart-is-immutable`**: `Chart.with(rows)` MUST return a new chart holding the old rows plus the new ones, ignoring triples already present, and sharing by reference every tag list it did not touch. No method changes a chart in place.

- **FR-012 · `chart-queries`**: A chart MUST answer, for a tag or for `*` (any tag): `has(tag, start, end)`; `after(tag, pos)`, the first span with start ≥ `pos`; `before(tag, pos)`, the last span with end ≤ `pos`; `spans(tag)`, the sorted list; `all()`, every `[tag, span]` in position order (start, then end, then tag name in code-unit order); `size()`, the total number of rows, `^` and `$` included. `Chart.empty(n)` holds only `^ (0,0)` and `$ (n,n)`.

- **FR-013 · `allen-relations`**: `rel(a, b)` MUST return the Allen relation of span `a` to span `b`: `before`, `meets`, `overlaps`, `starts`, `during`, `finishes`, `equals`, and the inverses `after`, `met-by`, `overlapped-by`, `started-by`, `contains`, `finished-by`. For zero-length spans the relations are tested in this order and the first that holds wins: `equals`, `before`, `after`, `meets`, `met-by`, then the rest. So `rel([0,0],[0,5])` is `meets` and `rel([0,5],[5,5])` is `meets`: the edges of the text meet the rows that touch them. `find` does not use `rel`; it ships with the chart because phase 2 will.

### The finding half: the six rules

These replace "The rules" of the old README and go there, in the same voice, as part of `readme-finding-half`. Each has a worked example with toy patterns. Every example below has been run against the real code, as a test named after its requirement; where the code proved an example wrong, the example was corrected here, in the spec, not fudged in the test. Offsets are into the example's text; charts are written as `toJSON` would write them, `^` and `$` included only where they help.

Every example conf has `"version": "t@1"`; only `tags` is shown. Three toy tags recur and are written once here:

```json
{ "w": { "rx": "/[a-z]+/u" }, "n": { "rx": "/\\d+/u" }, "sp": { "rx": "/ /u" } }
```

- **FR-014 · `root-rows-every-match`** (rule: *Root rows*): Every tag with `rx` MUST be scanned over the whole normalised text. Every match becomes a row, overlapping matches of the same tag included: after each match the scan resumes one position after the match's start. Zero-length matches are skipped. A match may not start or end inside a word: it is rejected when the character before its start and its first character are both letters or digits, or when its last character and the character after it are. A root tag with `resolve` keeps only the matches the resolver accepts, `resolve({ value: text }) !== null`.

  *Worked example.* The guard: `{ "n": … }` on `12 345 x9` gives `n: [[0,2],[3,6]]`. `45` at 4 and `5` at 5 start inside `345`; `9` at 8 starts inside `x9`.
  Overlap: `{ "pair": { "rx": "/[a-z] [a-z]/u" } }` on `a b c` gives `pair: [[0,3],[2,5]]`: the scan resumes at 1 and finds `b c`.
  Zero length: `{ "gap": { "rx": "/x*/u" } }` on `ab` gives `{ "$": [[2,2]], "^": [[0,0]] }` and nothing else.
  Resolve: `{ "even": { "rx": "/\\d+/u", "resolve": "even" } }` with `even = (p) => Number(p.value) % 2 === 0 ? p.value : null` on `12 7 30` gives `even: [[0,2],[5,7]]`.

- **FR-015 · `searches-run-from-rows`** (rule: *Searches run from rows*): A search MUST run once per row of its `from` tag, outward from that row's edge: `back` leftward from the row's start, atoms nearest-first; `forward` rightward from its end, atoms in order. Each completed derivation produces a row of the search's tag spanning from the leftmost to the rightmost thing matched, the `from` row included.

  *Worked example.* Tags `w`, `n`, `sp`, plus
  `"labelled": { "search": [{ "from": "n", "back": [{ "tag": "sp" }, { "tag": "w", "as": "label" }] }] }` and
  `"counted": { "search": [{ "from": "w", "forward": [{ "tag": "sp" }, { "tag": "n", "as": "count" }] }] }`,
  on `no 42 ok`. Roots: `w [0,2] [6,8]`, `sp [2,3] [5,6]`, `n [3,5]`. `labelled` from `n [3,5]`: `sp [2,3]` ends at 3, `w [0,2]` ends at 2, so `labelled: [[0,5]]`. `counted` from `w [0,2]`: `sp [2,3]`, `n [3,5]`, so `counted: [[0,5]]`; from `w [6,8]` nothing starts at 8. Two tags on one span: twins, both kept.

- **FR-016 · `atoms-meet-the-cursor`** (rule: *Atoms*): A tag atom MUST match any row of its tag, of any tag in its list, or of any tag for `*`, that meets the cursor: starts at it going forward, ends at it going back. A regex atom MUST be matched against the normalised text itself: if another atom follows it in the derivation, it must match exactly the slice between the cursor and the row that next atom takes; if it is the last atom taken, it matches sticky at the cursor going forward, `$`-pinned at the cursor going back. `optional` means the sequence is tried with and without that atom. Every combination that completes is a derivation, and all are kept. Nothing about a match is possessive: the matcher tries every candidate row and every combination.

  *Worked examples.*
  - **Alternatives.** Tags `w`, `n`, `sp`, `"alt": { "search": [{ "from": "n", "back": [{ "tag": "sp" }, { "tag": ["w", "n"] }] }] }` on `ab 7 42`. Roots: `w [0,2]`, `sp [2,3] [4,5]`, `n [3,4] [5,7]`. From `n [3,4]`: `sp [2,3]`, then `w [0,2]`, so `[0,4]`. From `n [5,7]`: `sp [4,5]`, then `n [3,4]`, so `[3,7]`. `alt: [[0,4],[3,7]]`.
  - **Any tag.** The same with `{ "tag": "*" }` in place of the list, as tag `star`. Pass 1 gives `[0,4]` and `[3,7]` as above. Pass 2 sees `star [0,4]`, which ends at 4 like `n [3,4]`, so from `n [5,7]` it also builds `[0,7]`. Pass 3 adds nothing. `star: [[0,4],[0,7],[3,7]]`. `*` includes the search's own tag, and `^` and `$`.
  - **Edges.** Tag `w`, `"first": { "search": [{ "from": "w", "back": [{ "tag": "^" }] }] }`, `"last": { "search": [{ "from": "w", "forward": [{ "tag": "$" }] }] }` on `ab cd`: `first: [[0,2]]`, `last: [[3,5]]`.
  - **Regex between atoms.** `"open": { "rx": "/\\(/u" }`, `"close": { "rx": "/\\)/u" }`, `"group": { "search": [{ "from": "open", "forward": [{ "rx": "/[^()]*/u", "as": "inside" }, { "tag": "close" }] }] }` on `(ab) (c`. From `open [0,1]`: the only `close` row, `[3,4]`, leaves the slice `ab`, which the regex matches exactly, so `[0,4]`. From `open [5,6]`: no `close` row starts at or after 6. `group: [[0,4]]`.
  - **Regex between atoms, going back.** `"close"`, `"open"` as above and `"group": { "search": [{ "from": "close", "back": [{ "rx": "/[^()]*/u" }, { "tag": "open" }] }] }` on `c) (ab)`. From `close [1,2]`: no `open` ends at or before 1. From `close [6,7]`: `open [3,4]` leaves the slice `ab`, so `[3,7]`. `group: [[3,7]]`.
  - **Regex last.** Tag `n`, `"weight": { "search": [{ "from": "n", "forward": [{ "rx": "/ ?kg/u", "as": "unit" }] }] }`, `"price": { "search": [{ "from": "n", "back": [{ "rx": "/€ ?/u", "as": "currency" }] }] }` on `€ 5 kg`. `n [2,3]`. `weight`: sticky at 3, ` kg`, so `[2,6]`. `price`: `$`-pinned at 2 over `€ `, so `[0,3]`.
  - **Optional.** Tags `w`, `n`, `sp`, `"co": { "rx": "/:/u" }`, `"entry": { "search": [{ "from": "n", "back": [{ "tag": "sp", "optional": true }, { "tag": "co", "as": "sign" }] }] }` on `k:7 k: 8`. Roots: `w [0,1] [4,5]`, `co [1,2] [5,6]`, `n [2,3] [7,8]`, `sp [3,4] [6,7]`. From `n [2,3]`: no `sp` ends at 2, so the optional atom is skipped and `co [1,2]` closes the derivation, `[1,3]`. From `n [7,8]`: with `sp [6,7]` taken, `co [5,6]` closes it, `[5,8]`; with `sp` skipped, no `co` ends at 7, so that branch fails. `entry: [[1,3],[5,8]]`. Each optional atom gives the sequence two tries, with it and without it, and every try that completes is kept. The last atom is required, so no derivation is the `from` row alone or ends in a stray separator.
  - **Optional atoms inside, both tried.** Tags `w`, `n`, `sp`, `"dot": { "rx": "/\\./u" }`, `"t": { "search": [{ "from": "n", "back": [{ "tag": "sp", "optional": true }, { "tag": "dot", "optional": true }, { "tag": "w" }] }] }` on `a. 1 a 2 a.3`. `n [3,4] [7,8] [11,12]`. From `[3,4]`: `sp [2,3]`, `dot [1,2]`, `w [0,1]`: `[0,4]`. From `[7,8]`: `sp [6,7]`, `dot` skipped, `w [5,6]`: `[5,8]`. From `[11,12]`: `sp` skipped, `dot [10,11]`, `w [9,10]`: `[9,12]`. `t: [[0,4],[5,8],[9,12]]`.
  - **Nothing possessive.** Tags `n`, `sp`, `"word": { "rx": "/[a-z]+(?: [a-z]+)?/u" }`, `"named": { "search": [{ "from": "n", "back": [{ "tag": "sp" }, { "tag": "word", "as": "label" }] }] }` on `big red 7`. `word [0,7]` (`big red`) and `[4,7]` (`red`; the matches at 1, 2 start inside `big`). From `n [8,9]`: `sp [7,8]`, then both `word` rows end at 7. `named: [[0,9],[4,9]]`.

  - **Empty slice.** The same `group` on `()` gives `[[0,2]]`: the regex `[^()]*` matches the empty slice between the two brackets.
  - **A regex atom binds what it matched.** With `as`, the role holds the slice the regex matched: `weight` above, given to a resolver on `5 kg`, receives `{ unit: ' kg', value: '5 kg' }`.

- **FR-017 · `composed-rows-resolve`** (rule: *Composed rows are filtered like root rows*): A search's tag with `resolve` MUST keep a derivation only if the resolver accepts it. The resolver receives `{ value: the row's own text, [as]: the bound row's value if that row's tag resolves, else its text }` for every atom with `as`. These values are computed per derivation within the pass and not stored. A resolver is asked once per row: when a row has been accepted, later derivations of the same span are not put to it again, so the first accepted derivation, in the order of `find-is-deterministic`, fixes the value.

  *Worked example.* Tags `n`, `sp`, `"unit": { "rx": "/kg|g/u", "resolve": "canon" }`, `"weight": { "resolve": "metric", "search": [{ "from": "n", "forward": [{ "tag": "sp" }, { "tag": "unit", "as": "unit" }] }] }`, with `canon = (p) => ({ kg: 'kilogram', g: 'gram' })[p.value] ?? null` and `metric = (p) => p.unit === 'kilogram' ? p.value : null`, on `5 kg 3 g`. `unit [2,4]` and `[7,8]` (the `g` at 3 starts inside `kg`). From `n [0,1]`: `metric({ value: '5 kg', unit: 'kilogram' })` accepts, `[0,4]`. From `n [5,6]`: `metric({ value: '3 g', unit: 'gram' })` refuses. `weight: [[0,4]]`.

- **FR-018 · `passes-to-a-fixpoint`** (rule: *Passes to a fixpoint*): Pass zero MUST be the root rows. Each later pass runs every search against the previous chart only, and its rows are added at once. Same tag, same span is one row, so a pass that adds nothing ends the loop. A search may grow from its own tag; that is how repetition is written, and it stops when the text runs out.

  The loop always stops: a row is a triple `(tag, start, end)` with `0 ≤ start ≤ end ≤ n`, so a conf with `T` tags has at most `T·(n+1)(n+2)/2` rows, and every pass but the last adds at least one.

  *Worked example.* Tags `n`, `sp`, `"list": { "search": [{ "from": "n", "forward": [{ "tag": "sp" }, { "tag": "n" }] }, { "from": "list", "forward": [{ "tag": "sp" }, { "tag": "n" }] }] }` on `1 2 3`. Pass 0: `n [0,1] [2,3] [4,5]`, `sp [1,2] [3,4]`. Pass 1: from `n`, `[0,3]` and `[2,5]`; the second search sees no `list` rows yet, because it reads the chart of pass 0. Pass 2: from `list [0,3]`, `[0,5]`. Pass 3: nothing new; the loop ends. `list: [[0,3],[0,5],[2,5]]`, and `size()` is 10.

- **FR-019 · `chart-complete-and-neutral`** (rule: *The chart is complete and neutral*): Crossing rows, twins on one span and rows inside rows MUST all be kept; choosing among them is the DOM half's job. The chart depends on the text and the conf only, so it is cacheable by `(text, conf.version)`.

  *Worked example.* `"xy": { "rx": "/x\\.y/u" }`, `"twin": { "rx": "/x\\.y/u" }`, `"yz": { "rx": "/y\\.z/u" }`, `"xyz": { "rx": "/x\\.y\\.z/u" }` on `x.y.z`: `xy: [[0,3]]`, `twin: [[0,3]]`, `yz: [[2,5]]`, `xyz: [[0,5]]`. `xy` and `yz` cross, `xy` and `twin` are twins, `xy` sits inside `xyz`.

  *Packing, one row from two derivations.* Tags `w`, `n`, `sp`, `"numbered": { "search": [{ "from": "n", "back": [{ "tag": "sp" }, { "tag": "w" }] }] }` and `"protocol": { "search": [{ "from": "n", "back": [{ "tag": "sp" }, { "tag": "w", "as": "label" }] }, { "from": "numbered", "back": [{ "tag": "^" }] }] }` on `ab 12`. `protocol` is built directly from `n [3,5]` (`sp [2,3]`, `w [0,2]`) and, one pass later, from `numbered [0,5]`, which starts where `^` ends. Both derivations give the span `[0,5]`; it is one row, `protocol: [[0,5]]`, and so is `numbered: [[0,5]]`. A conf with only one of the two `protocol` searches gives the same chart.

  *Rows inside rows.* Tags `w`, `n`, `sp`, `"phrase": { "search": [{ "from": "w", "forward": [{ "tag": "sp" }, { "tag": "w" }] }] }` on `aa bb cc`: `phrase: [[0,5],[3,8]]` and `w: [[0,2],[3,5],[6,8]]`. The phrases cross each other, and each holds the words it was built from, which stay rows of their own.

- **FR-020 · `match-on-normalised-text`**: `find` MUST match on the normalised copy of the text (`src/normalise.ts`, kept verbatim) and map every span back to the original through its boundary map once, at the end. Resolvers therefore see normalised text: dashes as `-`, quotes straight, whitespace runs as one space.

  *Worked example.* Tag `n` on `x   12` (three spaces, length 6). The normalised copy is `x 12`, where `n` is `[2,4]`; mapped back, `n: [[4,6]]` and `$: [[6,6]]`.

- **FR-021 · `find-is-deterministic`**: `find(text, conf)` MUST depend only on `text` and `conf`: no clock, no locale, no dependence on the key order of `tags` or `patterns`, no state kept between calls beyond caches keyed by `RegExp` identity. Reversing the key order of any conf's `tags` gives a chart whose JSON is the same string.

### The Italian conf

- **FR-022 · `italian-conf-in-new-format`**: The Italian conf MUST be the one below, kept as data in `confs/it-pa.json`, with its four resolvers (`protocol`, `cig`, `amount`, `date`) in `confs/it-pa.ts`. It covers protocol with and without a number word (and with its channel, by a search that grows from `protocol` itself), cig, cup, chapter, cdr, provvedimento, amount, date, caps (`weak`), quotation as a regex atom running to `$`, connectors (`fate: connector`), separators (`fate: separator`), and `dated` as the first composition built from another composition. Tags are keyed entities first, the words they are built from after, connectors and separators last; `find` does not read this order.

  ```json
  {
    "version": "it-pa@3",
    "patterns": {
      "DATE": "\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{4}",
      "SEP": "(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+",
      "CONNECTOR": "per\\s+(?:il|lo|la|i|gli|le)(?![\\p{L}\\p{N}])|(?:dell|all|dall|nell|sull)'|(?:de|da|ne|su|a)(?:llo|lla|lle|gli|l|i)|di|da|in|con|su|per|a",
      "LABEL_WORDS": "(?:C\\.?I\\.?G|C\\.?U\\.?P|P\\.?C\\.?F|C\\.?D\\.?R|PROT|PEC|CAP|CAPITOL[OI]|COD|CODICE|FORN|FORNITORE|IVA|EURO|ID|RIF|DEL)\\.?(?![\\p{L}])",
      "CAPS_WORD": "(?!%{LABEL_WORDS})\\p{Lu}(?:[.'&]?\\p{Lu}){2,}\\.?"
    },
    "tags": {
      "dated": { "search": [
        { "from": "protocol", "forward": [
          { "tag": "sep" }, { "tag": "connector", "optional": true }, { "tag": "sep", "optional": true },
          { "tag": "date", "as": "date" }
        ] }
      ] },
      "protocol": { "resolve": "protocol", "search": [
        { "from": "serial", "back": [
          { "tag": "sep", "optional": true }, { "tag": "num-word", "optional": true }, { "tag": "sep", "optional": true },
          { "tag": "prot-word", "as": "label" }
        ] },
        { "from": "protocol", "back": [ { "tag": "sep", "optional": true }, { "tag": "channel", "as": "channel" } ] }
      ] },
      "cig": { "search": [
        { "from": "cig-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "cig-word", "as": "label" } ] }
      ] },
      "cup": { "search": [
        { "from": "cup-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "cup-word", "as": "label" } ] }
      ] },
      "chapter": { "search": [
        { "from": "chapter-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "chapter-word", "as": "label" } ] }
      ] },
      "cdr": { "search": [
        { "from": "cdr-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "cdr-word", "as": "label" } ] }
      ] },
      "provvedimento": { "search": [
        { "from": "id-number", "back": [ { "tag": "sep", "optional": true }, { "tag": "id-word", "as": "label" } ] }
      ] },
      "amount": { "resolve": "amount", "search": [
        { "from": "number", "back": [ { "rx": "/ ?/u" }, { "tag": "euro", "as": "currency" } ] },
        { "from": "number", "forward": [ { "rx": "/ ?/u" }, { "tag": "euro", "as": "currency" } ] }
      ] },
      "date": { "rx": "/%{DATE}/u", "resolve": "date" },
      "quotation": { "search": [
        { "from": "quote-word", "forward": [ { "rx": "/.+/u", "as": "body" }, { "tag": "$" } ] }
      ] },
      "caps": { "rx": "/%{CAPS_WORD}(?: %{CAPS_WORD})+/u", "weak": true },

      "serial": { "rx": "/\\d{7}(?:\\/\\d{4})?/u" },
      "num-word": { "rx": "/numero|n[r°]?\\.?/iu" },
      "prot-word": { "rx": "/numero\\s+protocollo|protocollo|prot\\.?|rif\\.?/iu" },
      "channel": { "rx": "/pec|posta\\s+certificata|riscontro\\s+a/iu" },
      "cig-code": { "rx": "/[A-Z0-9]{10}/u", "resolve": "cig" },
      "cig-word": { "rx": "/c\\.?i\\.?g\\.?(?:\\s+(?:derivato|originario|master))?/iu" },
      "cup-code": { "rx": "/[A-Z]\\d{2}[A-Z0-9]{12}/u" },
      "cup-word": { "rx": "/c\\.?\\s?u\\.?\\s?p\\.?(?:\\s+(?:derivato|master))?/iu" },
      "chapter-code": { "rx": "/[A-Z]{2}\\d{2,3}\\.\\d{3,4}/u" },
      "chapter-word": { "rx": "/(?:capitol[oi]|cap\\.?)(?:\\s+di\\s+(?:spesa|entrata))?/iu" },
      "cdr-code": { "rx": "/\\d{2}(?:\\.\\d{2}){3}/u" },
      "cdr-word": { "rx": "/c\\.?d\\.?r\\.?/iu" },
      "id-number": { "rx": "/\\d{5,}/u" },
      "id-word": { "rx": "/(?:provvedimento\\s+)?id/iu" },
      "number": { "rx": "/\\d+(?:\\.\\d{3})*(?:,\\d{1,2})?/u" },
      "euro": { "rx": "/€|euro/iu" },
      "quote-word": { "rx": "/con\\s+oggetto\\s*:?/iu" },
      "connector": { "rx": "/%{CONNECTOR}/iu", "fate": "connector" },
      "sep": { "rx": "/%{SEP}/u", "fate": "separator" }
    }
  }
  ```

  Notes on writing it, since each one is a trap a conf author will meet:
  - The scanner offers one match per start position, and the word-boundary guard rejects it without trying a shorter one. So alternatives go longest-first: `protocollo|prot\.?`, never the reverse, or `Prot` inside `Protocollo` is found and rejected and `Protocollo` never is. The same holds for `(?:llo|lla|lle|gli|l|i)` in `CONNECTOR`, and for the lookahead after `per il`: without it, `per i` inside `per inviare` would be rejected and `per` never found.
  - `SEP` is the old engine's separator pattern: whitespace, `,` `;` `:` followed by whitespace or the end, and `-` with whitespace on both sides. Scanned with overlap, ` - ` yields three rows, ` - `, `- ` and ` `; a tag atom takes whichever one meets the cursor.
  - `amount` joins a number and its `euro` through a regex atom for at most one space, not through `sep`. `SEP` also matches ` - `, and a chapter code's tail followed by a dash and a euro sign (`SC04.0123 - €`) would otherwise be an amount: `0123 - €`. The conf, not the example, was wrong here: the first run of `italian-cases-tagged` found the extra row.
  - The resolvers: `date` accepts a real day and month (1–31, 1–12) and returns ISO `YYYY-MM-DD`; `cig` accepts a code that mixes letters and digits; `protocol` returns the seven digits found in the row's text; `amount` returns the number found in the row's text as `12450.00`. In phase 1 only their `null` matters; their values are for phase 2.

- **FR-023 · `italian-cases-tagged`**: For every case in `cases/it-pa.json`, `find` with the Italian conf MUST produce exactly these rows for the asserted tags, `dated`, `protocol`, `cig`, `cup`, `chapter`, `cdr`, `provvedimento`, `amount`, `date`, `quotation`, `caps`, and for `connector` on the five connector cases. A tag not listed for a case has no rows in it. Rows are given as the text they cover; the test turns them into spans. **Run against the real code as `test/it-pa.test.ts`; the table stands as written, and the one disagreement (an extra `amount`) was a fault of the conf, see the note on `amount` above. The other subjects have connectors too; they are not asserted.**

  | case | rows |
  |---|---|
  | PEC, channel with a dash | protocol: `Prot. n. 0023993`, `Pec - Prot. n. 0023993` · dated: `Prot. n. 0023993 del 23/09/2026`, `Pec - Prot. n. 0023993 del 23/09/2026` · date: `23/09/2026` · cup: `CUP F84D26000210006` |
  | PEC, channel with a colon | protocol: `Prot. n. 0018842`, `PEC: Prot. n. 0018842` · dated: `Prot. n. 0018842 del 12/09/2026`, `PEC: Prot. n. 0018842 del 12/09/2026` · date: `12/09/2026` |
  | Riscontro | protocol: `Prot. n. 0020117`, `Riscontro a: Prot. n. 0020117` · dated: `Prot. n. 0020117 del 15/09/2026`, `Riscontro a: Prot. n. 0020117 del 15/09/2026` · date: `15/09/2026` |
  | Gateway, two registers in capitals | protocol: `Prot.N.0004821/2026`, `RIF.0007730/2026`, `PROT. N. 0031002`, `POSTA CERTIFICATA: PROT. N. 0031002` · dated: `PROT. N. 0031002 DEL 19/09/2026`, `POSTA CERTIFICATA: PROT. N. 0031002 DEL 19/09/2026` · date: `19/09/2026` · caps: `POSTA CERTIFICATA` |
  | Ledger tail | cig: `CIG Z1234ABCDE` · chapter: `Capitolo SC04.0123` · amount: `€ 12.450,00` |
  | Brackets | cig: `CIG Z9A8B7C6D5` |
  | Integration chain, nested quotations | protocol: `Numero Protocollo 0012345`, `Protocollo 0012345` · dated: `Numero Protocollo 0012345 del 03/02/2026`, `Protocollo 0012345 del 03/02/2026` · date: `03/02/2026` · quotation: `con oggetto: Nota di Integrazione per il provvedimento con oggetto: Liquidazione LIQUIDAZIONE ATTIVA - CIG Z1234ABCDE`, `con oggetto: Liquidazione LIQUIDAZIONE ATTIVA - CIG Z1234ABCDE` · caps: `LIQUIDAZIONE ATTIVA` · cig: `CIG Z1234ABCDE` |
  | Short prose | none |
  | Connector, a provvedimento | provvedimento: `provvedimento ID 553422`, `ID 553422` · connector: `del`, `di` |
  | Connector, a chapter | chapter: `Cap. SC09.3161` · connector: `di`, `sul` |
  | Connectors, a chain | chapter: `Capitolo SC01.0001`, `Capitolo SC02.0002` · cdr: `CdR 00.01.02.03` · connector: `dal`, `al`, `a`, `sul` |
  | Connector, no mention follows | connector: `del`, `di` |
  | Connector, elided | provvedimento: `ID 551143` · connector: `dell'` |

  Beyond the table, every Italian case MUST give a chart that keeps `chart-invariants`. For orientation, "PEC, channel with a dash" reaches its fixpoint in five passes: the roots; the bare protocol; the protocol with its channel and the first `dated`; the second `dated`; and one that adds nothing.

### The playground

- **FR-024 · `playground-mount`**: `fewrd/playground` MUST export `mount(el, { confs, cases })`, where `confs` maps a name to `{ conf, resolvers }` (the conf as data and its named resolvers) and `cases` is a list of `{ name, conf, text }`, `conf` being the name of the entry in `confs` the case is found with. It injects its own scoped styles and needs no stylesheet. The font is not the playground's to load: the page that hosts it does, and the playground names a monospace stack (JetBrains Mono, IBM Plex Mono, then the system monospace).

- **FR-025 · `playground-live-conf`**: The playground MUST show, in a text area, the conf as JSON of the case on screen, and on every edit recompile it and find the case again; only cases of that conf are affected, and an edit to one conf is kept when the case on screen changes to another conf and back. Compile errors and JSON parse errors are listed next to the text area. On a parse error the last good chart stays on screen; on compile errors the chart is drawn with the tags that compiled. A failure while finding the case is shown in its place.

- **FR-026 · `playground-draws-chart`**: The playground MUST draw the text on a character grid: a monospace font with no ligatures and no letter spacing, so that every character takes exactly `1ch`, wrapped every 90 characters at a column boundary (never at a word). Each row of the chart is an underline 5px thick with a small vertical tick at each end, its position and length computed in `ch` from the row's start and end, so it sits under exactly the characters it covers; a row that crosses a wrap is one piece per line, with ticks only at its true ends. Rows that overlap are stacked in lanes below the text line, 3px apart, each row on the first lane where it fits. Each tag has one colour derived from its name, so it does not change between cases or edits, with contrast enough on the dark background and a light scheme under `prefers-color-scheme`. Zero-length rows (`^`, `$`) are not drawn. A row carries no permanent label.

- **FR-027 · `playground-reveals-on-hover`**: Hovering a band MUST show a tooltip with its tag and `(start, end)` and highlight the characters the row covers, on every line it crosses. The playground MUST NOT list the rows. A legend of chips, one per tag of the chart on screen, in that tag's colour, sits under the drawing.

- **FR-028 · `playground-one-case`**: The playground MUST show one case at a time, with large previous and next buttons and the left and right arrow keys (not while typing in the editor), a counter such as `3 / 20` between the buttons, and the case's name and conf. Stepping wraps around. `pnpm dev` shows at most twenty cases.

- **FR-029 · `dev-opens-two-domains`**: `pnpm dev` MUST open the playground on the Italian conf with `cases/it-pa.json` and the common conf with `cases/common.json`, each with its resolvers; twelve Italian cases, then the eight common ones, grouped by domain. Every case names its conf in its own `conf` field, so `cases/` stays the single source. The playground finds only: no values, no fold, no tree; those arrive with phase 2.

- **FR-029a · `common-conf`**: `confs/common.json`, with its resolvers in `confs/common.ts`, MUST compile with no errors and find, at least, links, email addresses, phone numbers, IPv4 addresses, ISO dates and datetimes (a deadline when a `due`, `until`, `by` or `eta` word leads), money (a currency and a number, either order), percentages, versions (a leading `v`, or a label such as `release`), ticket keys, `@handles`, `#hashtags`, the `Re:`/`Fwd:` chain and a quotation from `wrote:` to the end. Look-alikes (a date with month 13, an address with an octet over 255, a phone of four digits, a bare `1.2.3`) yield no row: a resolver says `null`, or the tag needs its label. Run as `test/common.test.ts`.

### Documents and package

- **FR-030 · `readme-finding-half`**: The README MUST be rewritten for the finding half with the sections Why, Install, Quick start, The conf, The rules, The chart, Playground, Develop. The rules section states the six rules of `root-rows-every-match` to `chart-complete-and-neutral` in the old README's voice, and says that selection, the tree and the fold, with the separator and connector fates, come in phase 2.

- **FR-031 · `changelog-entry`**: A `CHANGELOG.md` MUST gain an entry for the rewrite's phase 1: what is new (conf, `compile`, `Chart`, `find`, the chart playground), what is gone (`read`, `gist`, `html`, `shown`, books, recipes, `book.schema.json`), and that the version is unchanged until release.

- **FR-032 · `zero-dependencies`**: The feature MUST add no dependency, runtime or dev.

### Key Entities

- **Conf**: what recurs in a domain, as data: a version, named patterns, and tags in priority order. The only source of truth for what `find` finds.
- **Tag**: one kind of thing. A root tag matches a regex; a composed tag runs searches. `resolve`, `weak` and `fate` qualify it.
- **Search**: a way to build a row of its tag from a row of its `from` tag, going `back` or `forward` through a list of atoms.
- **Atom**: one step of a search: a row of some tag that meets the cursor, or a regex over the text itself; optionally bound to a role with `as`, optionally skipped.
- **Row**: one `(tag, start, end)` triple; its **span** is `[start, end]`.
- **Chart**: every row `find` could build for a text and a conf, and nothing else.
- **Pass**: one run of every search against the chart of the previous pass.
- **Compile error**: one problem found by `compile`: where, which tag, what.

The vocabulary is the constitution's closed set (principle V); this spec adds no term. "Derivation", "root row", "composed row", "twin" and "crossing" are the brief's words for things the rules describe, not new concepts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the worked examples in this spec have been run against the implementation and agree with it, each corrected here where it did not.
- **SC-002**: 13 of 13 Italian cases produce exactly the rows of `italian-cases-tagged` for the asserted tags.
- **SC-003**: Every Italian and synthetic case reaches its fixpoint; the self-growing example ends after the pass that adds nothing, and the same `list` conf over 100 numbers separated by spaces ends with 4,950 `list` rows (every run of two or more consecutive numbers).
- **SC-004**: Every chart of every case survives a JSON round-trip unchanged, and gives the same JSON with its conf's `tags` reversed.
- **SC-005**: Every kind of compile error in `compile-never-throws` is reported with its path and tag, and none stops the other tags from working.
- **SC-006**: In the playground, an edit to a conf redraws the case on screen with no perceptible delay.
- **SC-007**: `package.json` `dependencies` stays empty and no devDependency is added.

## Assumptions

- **Where things live.** The Italian conf is `confs/it-pa.json` plus `confs/it-pa.ts` (resolvers only); its cases are `cases/it-pa.json`. `cases/common.json` is the second domain: its conf is `confs/common.json` plus `confs/common.ts`, ported from the old `recipes/common.*`. Every case carries a `conf` field naming its conf.
- **The corpus.** `cases/it-pa.json` holds the eight subjects of `playground/cases.ts` on `main` plus the five connector subjects of branch `004-connectors`, since the conf's connectors need them.
- **Tags with no rows are absent from the chart**, and `toJSON` orders tags by name: the brief asks for no key-order dependence, and a canonical order is the simplest way to make equal charts serialise equally.
- **Resolvers see normalised text**, since the brief maps spans back once, at the end.
- **A reference to a tag compile left out** is not a second error: the reference finds no rows. This keeps one mistake from cascading into a list of errors.
- **The old conf's `channel`** becomes a search on `protocol` that grows from `protocol`; its old `date` neighbour becomes the composed tag `dated`; `rest` becomes a regex atom running to `$`; `requires` becomes a required atom.
- **The outermost atom is never optional.** Skipped, it leaves a derivation that ends in whatever came before it: with an optional label at the far end of `back`, the derivation without the label is a twin of the `from` row, and the one that took only the separator is a row that begins with a space. Both are junk the chart would keep for good, since it never chooses. So `compile` rejects an `optional` outermost atom, and every derivation ends on something the conf author asked for. Optional atoms inside a sequence are unaffected.
- **Two regex atoms in a row are one pattern.** A regex atom has no row of its own, so its extent comes from the next taken atom; two in a row leave the first without one. `compile` says so ("merge them into one pattern"), and treats regex atoms separated only by optional atoms the same way, since skipping the optionals would make them meet.
- **Unknown keys are errors, `as` has three reserved names.** As the old `compile` did for typo'd keys, an unknown key anywhere in a conf is reported with its path. `as: "value"` would shadow the row's own text in the resolver's argument, and `^`, `$`, `*` are the reserved tag names; all four are errors.
- **A resolver is asked once per accepted row.** Every pass re-derives the rows of the last one; a triple already accepted is not put to the resolver again, which changes no result and spares the calls.
- **The old `play/` package** (`fewrd-play`) stays on disk, unbuilt and unwired, as the brief says.
- **Phase 2's prose.** The separator and connector fate rules of branch `004-connectors` are carried verbatim below, so phase 2 does not have to dig them out of history.

## Open points

These are gaps in what the brief's words decide. None blocks phase 1; each says what phase 1 does meanwhile.

- **A label that may be absent, carried to phase 2.** The old conf found unlabelled CIG, CUP and chapter codes, since their labels were optional neighbours. The new vocabulary cannot say "optional label" in phase 1: an optional outermost atom is a compile error (see Assumptions), and a tag cannot be both a root and composed (`tag-is-root-or-composed`), so there is no clean "the code, with its label if there is one". Phase 2's twins may express it: a twin of the code row and a twin of the labelled row, one of which the selection keeps. The Italian conf keeps the labels of `cig`, `cup`, `chapter`, `cdr` and `provvedimento` required, since every one in the corpus is labelled; an unlabelled code is still a `cig-code`, `cup-code` or `chapter-code` row. The old Co.Ge. exclusion (an unlabelled one-letter-nine-digit code is not a CIG) becomes moot.
- **The word-boundary guard on regex atoms.** The rules apply it to root rows. A regex atom between two atoms is bounded by rows that passed it; a last regex atom's far edge is not guarded. Phase 1 follows the rules as written. The Italian conf has no last regex atom.
- **`*`, `^` and `$`.** "Any tag" is read literally: `*` matches `^` and `$` rows and rows of the search's own tag.
- **Brackets.** Phase 2 says "a bracket tag empties out by containment", but not how a conf marks a tag as a bracket. The phase 1 Italian conf declares no bracket tag; phase 2 adds it.

## Parked

Decided not to do now, and not to be designed around:

- `not` on `*` (any tag but some).
- Name globs in tag atoms (`cig-*`).
- A twin-rule table (per-pair rules for twins).
- `glued` (a root match allowed to cut a word).
- `fewrd-play`: its fate is decided after phase 2.

## Carried to phase 2

The fate rules as the README of branch `004-connectors` states them, verbatim, for phase 2 to keep. `find` does not read `fate`.

> - **Separator fate.** Separators between two surviving leaves stay untouched when no fold fell among them. Otherwise only the strongest survives (`-` > `;` > `:` > `,` > space), and none survives at an edge, after an opening bracket or before closing punctuation. Brackets a fold empties go with it.
> - **Connector fate.** A book may declare `connectors`, the function words that introduce a mention (`del`, `sul`, `per il`, `dell'`). A connector is cut as its own leaf only where a mention begins, and only as a whole word. It folds when the mention to its right folds, and otherwise stays. It is not a separator: a dropped connector cuts the separators around it like any fold, a kept one bounds them.

The quotation keeps the old words ("leaf", "mention", "book") because it is a quotation; phase 2 rewrites it in the vocabulary.
