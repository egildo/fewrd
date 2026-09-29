<!--
Sync Impact Report
- Version change: 3.1.0 → 3.1.1 (PATCH, wording check at the end of phase 2, after the code and the README were done)
- Modified: Principle II names the fold rules in the order the README's "The rules of the fold" applies them (a node folds, connector fate, emptying, separator fate) and adds the own-tag rule to forcing; Data Contracts, tree invariants: the root carries the text, and a node carries its tag's fate, so the fold reads the tree alone and a tree parsed back from JSON folds the same. No principle added, removed or redefined.
- Previous: Version change: 3.0.0 → 3.1.0
- Modified principles: II. Deterministic, Documented Finding Rules → II. Deterministic, Documented Finding and Fold Rules — the principle now names both rule sets: the finding-half rules for `find` and the DOM-half rules (selection, the tree, the rules of the fold) for `dom`, `hidden` and `gist`. Key order of `tags` is named as the one thing selection reads that `find` must not. Guidance expanded to a second rule set, no principle removed or redefined, hence MINOR.
- Modified sections: Data Contracts — adds the tree invariants (the root is `doc` over the whole text; leaves partition the text; no two nodes cross; `also` only on twins). Development Workflow — the playground shows the tree and the fold too, and cases may carry `fold` and `gist`. Governance — review checks both rule sets.
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none (3.0.0's TODO, principle II gaining the DOM-half rules, is done here).
- Trigger: section 5 of the rewrite brief (`specs/rewrite-brief.md`), phase 2, the DOM half. Maintainer sign-off for the MINOR bump was given in the design round of 2026-09-29.
-->

# fewrd Constitution

## Core Principles

### I. Zero Runtime Dependencies
Every runtime module ships with no npm dependencies; `package.json` `dependencies` stays empty. Anything a feature needs is implemented in `src/`, or deferred, never pulled in as a package.
Dev tooling (e.g. `fewrd-play`, the playground server) ships as its own package under `play/`, never inside the library package, and declares no `dependencies` either: only a peer dependency on `fewrd`.
Rationale: the library's whole value is being small and auditable enough to read in one sitting — pulling in dependencies defeats that and forces every consumer to inherit an unbounded transitive graph.

### II. Deterministic, Documented Finding and Fold Rules
Two rule sets in the README are the single source of truth for what fewrd returns: the finding-half rules in "The rules" (root rows, searches run from rows, atoms, composed rows filtered like root rows, passes to a fixpoint, the chart is complete and neutral) for `find`, and the DOM-half rules in "Selection" and "The rules of the fold" (order, take or drop, forcing with its own-tag rule; the tree, roles and values; a node folds, connector fate, emptying, separator fate) for `dom`, `hidden` and `gist`. Any change to what those functions return MUST update the matching section in the same change, and MUST NOT introduce nondeterminism: the chart depends on `(text, conf)` only, with no locale, no clock and no dependence on object key order; the tree depends on `(text, chart, conf)` only, and the key order of `tags` is the one tiebreak selection reads, nowhere else.
Rationale: callers cache a chart by `(text, conf.version)` and fold the same tree many ways — undocumented or nondeterministic behavior breaks that contract silently.

### III. Cases Are the Single Source of Test Truth
New or changed **domain conf** behavior (e.g. changes to the Italian conf) MUST land as a case in that domain's `cases/<name>.json` before or alongside the change; the tests read those same cases for that conf's behavior. Do not add throwaway domain fixtures elsewhere. A minimal, synthetic fixture that isolates a single core rule (e.g. an optional atom, the word-boundary guard, the fixpoint stop) using toy patterns unrelated to any real domain MAY live inline in its own test instead — it has no place in a domain case corpus.
Rationale: one case list means what the playground draws is exactly what the tests assert for that domain — no drift between the two. Core mechanics are exercised with minimal synthetic confs precisely so `cases/` stays a corpus of real domain text, not a dumping ground for toy patterns.

### IV. Strict Types, No Escape Hatches
`tsc --strict` with `noEmit` MUST pass with no new `any`, no `@ts-ignore` / `@ts-expect-error` additions. Development, typechecking, and testing MUST stay build-free: source ships and runs as-authored TypeScript, type-stripped directly by `node --test`, with no compile step in that loop. A separate, additive build (`pnpm build`, run automatically at `npm publish` via `prepublishOnly`) bundles and minifies the library's public entries from `src/` into `dist/` with `vite`, and emits their declarations with `tsc`; demo confs are not published. It MUST NOT be required to develop, typecheck, or test this project, and MUST NOT introduce a new dependency beyond those already present (`typescript`, `vite`).
Rationale: type-checking stays the primary safety net for the loop contributors actually run — that loop stays build-free. Shipping a small, minified library to package consumers is a separate, publish-time-only concern; it doesn't reintroduce ceremony into development, and needs no new tooling since both tools are already in the repo.

### V. Simplicity and a Closed Vocabulary
The code, the documents and the conversation about them use one closed vocabulary: conf, patterns, tag, search, atom, chart, row, span, pass, `^` `$` `*`, `from`, `back`, `forward`, `as`, `optional`, `weak`, `fate`, `resolve`. Phase 2 adds node, water, select, derive. No aliases, anywhere. A new term is added only when this set cannot express the need, and only by amending this principle. No speculative options, flags, or abstractions for hypothetical future confs.
Rationale: the whole design fits in one small table in the README; every addition must earn its place there, and a second name for one thing is a second thing to explain.

## Data Contracts

A `Chart` is plain data: a map from tag to its rows, each row a span `[start, end]`. Its invariants:

- **Spans point into the original string**, not the normalised copy: every span is mapped back through `normalise`'s boundary map before the chart is returned.
- **Sorted**: each tag's rows are ordered by start, then end.
- **Unique**: one row per `(tag, start, end)` triple.
- **`^` and `$` are present**: `^` at `(0,0)` and `$` at `(n,n)`, where `n` is the length of the original string.
- **Nothing else**: no values, no roles, no derivations, no water. `Chart.from(chart.toJSON())` gives back an equal chart, and the JSON form survives `JSON.stringify`/`JSON.parse` unchanged.
- **Cacheable**: the chart depends on the text and the conf only, so a caller may cache it by `(text, conf.version)`. A conf's `version` MUST change whenever a change to it can change the chart.

A tree (`dom(text, chart, conf)`) is plain data too: nested `Node` objects, spans into the original string. Its invariants:

- **One root**: a `doc` node spanning `(0, n)` and carrying the text. `^` and `$` never become nodes.
- **Leaves partition the text**: the leaves (nodes with no children, water included), in order, cover every character of the text exactly once, so joining their text gives the text back.
- **No two nodes cross**: any two nodes are either disjoint or one contains the other.
- **`also` only on twins**: a node carries `also` only when rows of other tags had exactly its span; it names those tags.
- **The tree is all the fold reads**: a node carries its tag's `fate`, and the root the text, so `hidden` and `gist` need no conf and no hidden state, and a tree that went through `JSON.stringify` and back folds the same.

## Development Workflow

Changes run `pnpm typecheck` and `pnpm test` before merge; there is no build step to gate on. `pnpm dev` (playground on port 5577) is the manual check for how a change draws: the chart of every case, brat-style, its tree, and its gist under the fold chosen in the fold panel.
A conf for a domain lives under `confs/` as data (`<name>.json`) plus its resolvers (`<name>.ts`), with its cases in `cases/<name>.json` (a case may carry the `fold` it is read with and the `gist` expected), and does not modify the core in `src/`. Demo confs are working examples and starting points, not part of the published package.

Publishing a release runs `pnpm build` (via `prepublishOnly`) to build `dist/`, triggered only by `npm publish`/`pnpm publish` — never part of the merge-time gate above. `dist/` is never committed to git; it is rebuilt fresh at publish time and stays gitignored.
`play/` publishes separately (`npm publish` from `play/`, which compiles its TypeScript to `play/dist/` with `tsc`), since Node does not strip types inside `node_modules`.

## Governance

This constitution supersedes ad hoc conventions. Amendments are proposed via a PR that edits this file and, when principles changed materially, also updates any README section they now contradict; the PR description states the version bump and rationale. PATCH bumps need no discussion; MINOR/MAJOR bumps need explicit sign-off from the project maintainer before merge. Code review MUST check new work against the finding-half rules in README's "The rules" section, the DOM-half rules in its "Selection" and "The rules of the fold" sections, and this constitution's principles.

**Version**: 3.1.1 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-29
