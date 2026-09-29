# fewrd rewrite: brief

Origin: a design round with the maintainer, September 2026, starting from GitHub issue "Connectors with a fate" and ending in a new model. This brief is the settled outcome. Everything in it is decided unless marked *open* or *parked*.

## 1. Scope

An almost total rewrite of fewrd, same package name, same purpose: find what recurs in a string, and let a reader fold it away. Two halves replace the current engine:

1. **The finding half.** `text + conf → Chart`. Every match of every tag, every composition the searches can build, all of it kept, crossing overlaps included. No selection, no values, no tree.
2. **The DOM half.** `text + Chart + conf → Node tree`. Selection to one non-crossing set, roles re-derived, values resolved, a containment tree with water as text nodes, and the fold with its two fate rules. fewrd returns a plain object; the consuming app builds real DOM or HTML.

**Kept, verbatim or as prose:** `src/normalise.ts` and its boundary map; the word-boundary guard (a match may not start or end inside a run of letters or digits); `%{NAME}` splicing and the compile-errors-never-throw style of `src/compile.ts`; the separator fate and connector fate rules as written in the README of branch `004-connectors`; the real Italian subjects in `playground/cases.ts` as the domain corpus; constitution principles I (zero dependencies), III (cases are the test truth), IV (strict types, build-free loop), the development workflow section.

**Retired:** `Book`, `Recipe`, `Neighbour`, `Mention`, `Leaf`, `Cuts`, `Fold` as types; `read.ts`, `render.ts`; the six rules of the README; `rest`, `weak`-as-search-flag, `glued` (unused by any book), left/right neighbour lists, `requires`; `book.schema.json`; `specs/001..004`. Git history keeps them.

**Untouched in phase 1:** `play/` (the `fewrd-play` package) stays on disk, unbuilt and unwired; its fate is decided after phase 2. `package.json` version stays until release.

**Vocabulary (closed, the names the code uses):** conf, patterns, tag, search, atom, chart, row, span, pass, `^` `$` `*`, `from`, `back`, `forward`, `as`, `optional`, `weak`, `fate`, `resolve`. Phase 2 adds: node, water, select, derive. No aliases in code, docs or chat.

## 2. Phases

- **Phase 1, the chart.** Conf types and compile, `Chart`, the finding half (`find`), the Italian conf rewritten in the new format, tests, a playground that shows the chart brat-style, README for the finding half, constitution rewritten. Ends when the Italian subjects come out tagged as expected and the fixpoint loop is proven to stop.
- **Phase 2, the DOM.** Selection, re-derivation, resolution, tree, fates and fold, `gist`/`shown` on the tree, playground gains the tree and fold toggles, `fewrd-play` decided, README complete, release. Not specified further here; it is planned after phase 1 is reviewed.

## 3. Model

### 3.1 The conf

```jsonc
{
  "version": "it-pa@3",                       // keys a cached chart; change when output can change
  "patterns": { "DATE": "\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{4}" },   // name → regex source, spliced as %{DATE}
  "tags": {
    "sep":       { "rx": "/%{SEP}/u", "fate": "separator" },
    "connector": { "rx": "/%{CONNECTOR}/iu", "fate": "connector" },
    "date":      { "rx": "/%{DATE}/u", "resolve": "date" },
    "serial":    { "rx": "/\\d{7}(?:\\/\\d{4})?/u" },
    "prot-word": { "rx": "/prot\\.?|protocollo/iu" },
    "caps":      { "rx": "/…/u", "weak": true },
    "protocol":  { "resolve": "protocol", "search": [
      { "from": "serial", "back": [ { "tag": "sep", "optional": true }, { "tag": "prot-word", "as": "label" } ] }
    ]},
    "dated":     { "search": [
      { "from": "protocol", "forward": [
        { "tag": "sep" }, { "tag": "connector", "optional": true }, { "tag": "sep", "optional": true },
        { "tag": "date", "as": "date" }
      ]}
    ]}
  }
}
```

Types (data form; `compile` turns pattern strings into `RegExp` and resolver names into functions, reporting errors as `{ path, tag?, message }` without throwing, a tag with any error left out):

```
Conf   = { version: string; patterns?: Record<string, string>; tags: Record<string, Tag> }
Tag    = { rx?: Pattern; search?: Search[]; resolve?: string; weak?: boolean; fate?: 'separator' | 'connector' }
         // exactly one of rx / search; weak and fate are read by the DOM half only
Search = { from: string; back?: Atom[]; forward?: Atom[] }      // exactly one of back / forward
Atom   = { tag: string | string[]; as?: string; optional?: boolean }
       | { rx: Pattern; as?: string; optional?: boolean }
Pattern = "/source/flags" with %{NAME} splicing (as today)
```

Reserved tag names, usable in atoms, never declarable: `^` (start of string, row `(0,0)`), `$` (end, row `(n,n)`), `*` (any tag). Compile errors: unknown tag in `from` or in an atom, a tag with both or neither of `rx`/`search`, a search with both or neither of `back`/`forward`, bad pattern, unknown `%{NAME}`, circular `%{}`, unknown resolver, reserved name declared.

Priority is the key order of `tags` (JSON preserves it). The finding half never reads it; the DOM half uses it as the tiebreak.

### 3.2 The Chart

A map from tag to its rows, each row a span `[start, end]` into the ORIGINAL string, sorted by start then end, unique per (tag, start, end). Nothing else: no values, no derivations, no water. JSON round-trips. Always contains `^` and `$`.

```ts
class Chart {
  static empty(n: number): Chart;                 // with ^ (0,0) and $ (n,n)
  static from(json: Record<string, Span[]>): Chart;
  toJSON(): Record<string, Span[]>;
  with(rows: Iterable<[tag: string, span: Span]>): Chart;   // new chart; existing triples ignored; untouched tag lists shared by reference
  size(): number;                                 // total rows: the fixpoint test
  has(tag: string, start: number, end: number): boolean;
  after(tag: string, pos: number): Span | undefined;   // first span of tag with start ≥ pos
  before(tag: string, pos: number): Span | undefined;  // last span of tag with end ≤ pos
  spans(tag: string): readonly Span[];
  all(): Iterable<[tag: string, span: Span]>;     // every tag merged in position order (DOM half)
}
function rel(a: Span, b: Span): AllenRelation;   // before | meets | overlaps | starts | during | finishes | equals, and inverses
```

`^`, `$` and `*` in `after`/`before`/`has`: `*` means any tag. Immutability by copy-on-write per tag list; at subject length a linear scan or binary search per list is enough (`ponytail:` comment naming the ceiling).

### 3.3 The finding half: rules

These replace "The rules" in the README. Write them there in the same voice.

1. **Root rows.** Every tag with `rx` is scanned over the whole normalised text. Every match becomes a row, overlapping matches of the same tag included (advance by one after each match). Zero-length matches are skipped. A match may not start or end inside a word. A root tag with `resolve` keeps only matches the resolver accepts (`resolve({ value: text }) !== null`).
2. **Searches run from rows.** A search runs once per row of its `from` tag, outward from that row's edge: `back` leftward from its start, atoms nearest-first; `forward` rightward from its end. It produces a row of the search's tag spanning from the leftmost to the rightmost thing matched, the `from` row included.
3. **Atoms.** A tag atom matches any row of that tag (or of any listed tag, or of any tag for `*`) that meets the cursor: starts there going forward, ends there going back. A regex atom is matched against the raw normalised text: if another atom follows it, it must match exactly the slice between the cursor and the row the next atom takes; if it is last, it matches sticky at the cursor (`$`-pinned going back). `optional` means the sequence is tried with and without it. Every combination that completes is a derivation; all are kept. Nothing about a match is possessive: the matcher tries every candidate.
4. **Composed rows are filtered like root rows.** A search's tag with `resolve` keeps a derivation only if the resolver accepts. The resolver receives `{ value: the row's own text, [as]: the bound row's value if that tag resolves, else its text }`, computed transiently per triple within the pass and not stored.
5. **Passes to a fixpoint.** Pass zero is the root rows. Each later pass runs every search against the previous chart only, and its rows are added at once. Same tag, same span is one row, so a pass that finds nothing new ends the loop. A search may grow from its own tag; that is how repetition is written, and it stops when the text runs out.
6. **The chart is complete and neutral.** Crossing rows, twins on one span, rows inside rows: all kept. Choosing among them is the DOM half's job. The chart depends on the text and the conf only, so it is cacheable by `(text, conf.version)`.

### 3.4 Coding patterns

- TypeScript strict, ES modules, zero runtime dependencies, `node --test` with type stripping, no build in the dev loop, `pnpm build` only for publish. As today.
- Files: `src/normalise.ts` (kept), `src/conf.ts` (types + `compile`), `src/chart.ts` (`Chart`, `rel`), `src/find.ts` (root scan, search matcher, pass loop; exports `find(text, conf): Chart`), `src/index.ts`, `src/playground.ts` (phase 1 view). Small files, one responsibility each, no classes except `Chart`.
- Coordinates: match on the normalised copy, map every span back through `normalise`'s boundary map once, at the end, as today.
- Regex pinning helper as today (`$`-wrapped for back, sticky for forward, `gd` for scan), cached per RegExp.
- The search matcher is a recursive enumeration over atoms and candidate rows (depth-first, collecting every completion). Mark its ceiling with a `ponytail:` comment: exponential in the number of optional atoms per search, quadratic chart under `*` on a self-growing search.
- Determinism: output depends only on `(text, conf)`. No key-order dependence in the finding half, no Date, no locale.
- Every non-trivial rule above gets one synthetic test with toy patterns; the Italian conf is tested through the cases file only (principle III).

### 3.5 Phase 2 model, for orientation only (not to be specified now)

`dom(text, chart, conf) → Node`. Select: longest span first, then earlier key in `tags`; a `weak` row never beats a crossing non-weak row; twins (equal spans, two tags) become one node with the later tag as attribute `also`; a crossing loser is dropped. Re-derive: the selected composed rows have their search re-run inside their own span to bind `as` roles. Resolve: bottom-up; a refusal drops the row and re-selects. Tree: containment; the gaps become `text` nodes (water). Fates: separator and connector rules as in the connector round; edges via `meets` with `^`/`$`; a bracket tag empties out by containment. `gist(node, fold)` and `shown`. HTML stays with the consumer.

## 4. Phase 1: what to do

### Documents first (Opus agent, speckit up to tasks)

1. Branch `rewrite` from `main`. Clean slate on it: delete `src/*` except `normalise.ts`, `test/*`, `recipes/*`, `playground/*`, `book.schema.json`, `specs/*`. Keep `play/` untouched. Keep the Italian subjects: copy the case texts out of `playground/cases.ts` before deleting it, into `cases/it-pa.json` (name + text only) and `cases/common.json` likewise; they are the corpus. Commit the slate.
2. Commit this brief as `specs/rewrite-brief.md`.
3. Rewrite the constitution (MAJOR bump to 3.0.0, maintainer sign-off given in the design round; say so in the Sync Impact Report): principle II becomes "the finding-half rules in the README are the single source of truth for `find`; changes update them in the same change; no nondeterminism"; principle V's closed vocabulary becomes the list in section 1 of this brief; the data-contracts section describes the Chart invariants (sorted, unique triples, JSON round-trip, `^`/`$` present, spans into the original string, cacheable by text and version). Keep I, III, IV and the workflow.
4. Run speckit on branch `rewrite` with `SPECIFY_FEATURE=rewrite` and `SPECIFY_FEATURE_DIRECTORY=specs/005-chart` exported so no new branch is created: `speckit-specify`, then `speckit-plan`, then `speckit-tasks`. Skip clarify; every open point is answered here or marked parked. Do not run `speckit-implement`.
5. The spec must contain: the rules of 3.3 as functional requirements with worked examples (write the examples by hand from the rules; mark that they are not yet run); the conf and chart types; the Italian conf in the new format as the "hardest document", covering at least protocol (with and without a number word), cig, cup, chapter, amount, date, caps, quotation as a `rx` to `$`, connectors, separators, and `dated` as the first composition; the playground scope (below); parked items: `not` on `*`, name globs, a twin-rule table, `glued`, `fewrd-play`.
6. Playground scope for phase 1: `mount(el, { conf, resolvers, cases })`; a text area for the conf (JSON, live recompile, errors inline), the case list, and per case the text with the chart drawn brat-style: one coloured band per row, stacked where rows overlap, tag name on hover or beside, and the chart printed as `tag(start,end)` lines. No values, no fold, no tree. `pnpm dev` opens it on the Italian conf and cases.
7. Tasks ordered: types + compile with tests, Chart with tests, root scan with tests, matcher with tests (one test per rule and per atom kind, including `^`, `$`, `*`, optional, alternatives, rx between atoms, rx last, self-growing search, packing, twins kept, crossing kept), pass loop, `find`, the Italian conf and its case assertions, playground, README (Why, Install, Quick start, The conf, The rules, The chart, Playground, Develop), CHANGELOG entry.

### Code (Sonnet agent, speckit-implement)

Implement the tasks on branch `rewrite`. Gate: `pnpm typecheck`, `pnpm test`. Every worked example in the spec is run against the real code before it is left in the spec; a wrong example is corrected in the spec, not fudged in the test. Commit per task group. No push.
