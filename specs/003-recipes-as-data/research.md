# Research: Recipes as Data

All Technical Context unknowns are resolved below. Items marked **verified**
were checked by running the actual toolchain in a scratch project on
2026-09-28 (node 25.6.1, TypeScript 5.9, vite 7.3.6).

## R1 — How a pattern is written in data

**Decision**: one string in regex-literal form, `"/source/flags"`, e.g.
`"/C\\.?U\\.?P\\.?\\s*/iu"`. The first character must be `/`; the **last**
`/` separates source from flags, so a `/` inside the source needs no escape.
Flags are whatever `RegExp` accepts; the engine already strips `g`/`y`/`d`
and adds its own ([read.ts:30-40](../../src/read.ts)).

**Rationale**: one field per pattern (the demo has ~13 patterns, most with
`iu` or `u`), instantly readable to anyone who writes JS regexes, and
format-checkable by the JSON Schema with a plain `pattern` keyword
(`^/.*/[dgimsuvy]*$`), so a missing leading slash is flagged in the editor.
It is literally "source + flags", as the input asks.

**Alternatives considered**:
- `{ "source": "…", "flags": "iu" }` objects: explicit, but doubles the
  noise at every pattern and every neighbour.
- Source only, flags via inline modifiers `(?i:…)`: ES2025, not yet in every
  browser a consumer's playground may run in; and `u` can't be inlined.
- Source only with default flags `u`: every case-insensitive label would
  still need an escape hatch, so it collapses back into one of the above.

## R2 — Shared fragments

**Decision**: a top-level `defs` map of name → source text (no flags: a
fragment takes the flags of the pattern that uses it). Reference with
`%{NAME}`, `NAME` matching `[A-Za-z_][A-Za-z0-9_]*`. Expansion is textual,
recursive (fragments may reference fragments), and wraps each expansion in
`(?:…)` so alternation inside a fragment never leaks into the surrounding
pattern. Cycles are detected with the current expansion stack and reported
(`A → B → A`). A literal `%{` in a pattern is written `%\{`, which is valid
in every flag mode.

**Rationale**: Grok's `%{NAME}` is the best-known precedent for named regex
fragments and cannot collide with regex syntax (`%` is never special, and an
unescaped `{` after it is a syntax error in `u` mode anyway). The demo needs
nesting today: `CAPS_WORD` builds on `LABEL_WORDS`, and `DATE` is shared by
the `date` anchor and `protocol`'s `date` neighbour.

**Alternatives considered**: `{{NAME}}` (Mustache-like) — collides visually
with regex quantifiers `{2,}`; JSON `$ref`-style objects — cannot splice into
the middle of a string.

## R3 — Resolvers

**Decision**: `"resolve": "<name>"` in data; the caller passes
`resolvers: Record<string, Resolver>` to `compile`, where `Resolver` is
exactly today's `Recipe['resolve']` function type. An unknown name is a
compile error for that recipe. Resolvers are not wrapped: at runtime they
behave exactly as in a code-written book (FR-007). The playground, not the
engine, catches an error thrown while reading one case (FR-011).

**Rationale**: spaCy's registry and Presidio's recognizer classes both keep
procedural logic in code, named from config — the only reliable pattern that
avoids `eval`. Declarative pick/guard/rewrite is out of scope (spec).

## R4 — The compile step

**Decision**: `compile(data: unknown, options?: { resolvers? }) →
{ book: Book; errors: CompileError[] }`. It never throws. It validates the
structure itself, because in the playground `data` comes straight from
`JSON.parse` of whatever a person typed: this is a trust boundary. Unknown
keys are errors (a typo like `"wek": true` would otherwise be silently
ignored while someone edits live); the top-level `$schema` key is allowed and
ignored. Every problem in a recipe is collected (not just the first) and that
recipe is left out; the others keep their relative order. Structural failure
at the top level (not an object, `recipes` not a list) yields an empty book.

**Rationale**: Matches FR-005/FR-006 directly. Returning errors instead of
throwing is what lets the playground show them inline and keep rendering.

## R5 — Loading a JSON book from TypeScript — **verified**

**Decision**: `import data from './it-pa.json' with { type: 'json' };`

Verified in a scratch copy of this project's `tsconfig.json`:
- `node` (type stripping) runs it with no flag;
- `tsc` (`module: NodeNext`) typechecks it with **no tsconfig change** — no
  `resolveJsonModule` needed;
- `tsc -p tsconfig.build.json` copies the `.json` into `dist/` next to the
  emitted `.js`, and the emitted import keeps the `with` attribute; `node`
  runs the built output;
- `vite build` bundles it.

**Rationale**: zero configuration, zero dependency, and consumers on node ≥ 22
or any current bundler can import the built `recipes/it-pa.js`.

## R6 — The published format description

**Decision**: a hand-written JSON Schema (draft 2020-12) at the repo root,
`book.schema.json`, added to `package.json` `files`. A consumer's book
declares `"$schema": "./node_modules/fewrd/book.schema.json"`. Objects use
`additionalProperties: false`, so editors flag typos the same way `compile`
does. Drift between the schema and `compile` is guarded by a test that
compares the schema's declared keys with the keys `compile` accepts.

**Rationale**: VS Code and JetBrains validate and autocomplete from a
`$schema` pointing at a filesystem path, with no plugin.

**Alternatives considered**: validating the demo book against the schema in
tests with a schema validator (e.g. Ajv) — would add a devDependency for one
assertion, against the spirit of Principles I/IV; the key-set drift test plus
`compile`'s own validation covers the same ground.

## R7 — Migrating the demo book

**Decision**: `recipes/it-pa.json` holds the book (with `defs` for `DATE`,
`LABEL_WORDS`, `CAPS_WORD`); `recipes/it-pa.ts` holds the four resolvers
(`protocol`, `cig`, `amount`, `date`) plus their helpers, compiles the JSON,
and **throws at import time if there are any errors** (a broken bundled book
is a bug, not user input). It exports `itPa` (unchanged name and shape),
`itPaData` and `itPaResolvers` (for the playground's data mode). The
per-recipe exports (`protocol`, `cig`, …) are dropped: nothing in this repo
imports them, and fewrd is 0.x — noted for the release as a minor bump.
`version` stays `it-pa@1` because output does not change (Data Contracts).

**Proof of SC-001**: before the old recipes are deleted, a one-off script
(scratchpad, not committed — Principle III keeps domain fixtures out of the
repo) compares `JSON.stringify(read(text, old))` with the new book for every
case in `playground/cases.ts` plus the texts used in `test/read.test.ts`.
The existing test suite stays green as the lasting guard.

## R8 — Playground data mode

**Decision**: `MountOptions` becomes a union — today's `{ book, cases, fold? }`
or `{ data, resolvers?, cases, fold? }`. In data mode `mount` adds, above the
cases: a monospace `<textarea>` holding `JSON.stringify(data, null, 2)`, an
error list, and a reset button. On `input`: parse → on failure show the parse
error and keep the last book; otherwise compile, show its errors, swap the
book, rebuild the fold `<select>` options (keeping still-existing
selections), regenerate the per-entity colour rules, and re-render every case
and the trial. Each case render is wrapped so a throwing resolver shows its
error on that case only. No debounce: reading the demo's cases takes
milliseconds (`ponytail:` note in code if it ever needs one). The repo's
`playground/main.ts` switches to data mode, dogfooding the feature.

**Rationale**: the smallest change to the existing `mount` that meets
FR-010–FR-013 while keeping book mode byte-for-byte unchanged (FR-007/SC-006).
