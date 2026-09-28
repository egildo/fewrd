<!--
Sync Impact Report
- Version change: 2.0.0 → 2.1.0
- Modified principles: IV. Strict Types, No Escape Hatches — the publish-time build now
  bundles and minifies the library's public entries with vite (already a devDependency)
  and emits declarations with tsc; only src/ is published, demo recipe books stay in the
  repo. Expanded guidance, no principle removed or reversed, hence MINOR.
- Modified sections: Development Workflow — build description and demo-book location.
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
- Trigger: user request to publish only the minified library as the package (0.2.0).
-->

# fewrd Constitution

## Core Principles

### I. Zero Runtime Dependencies
Every runtime module ships with no npm dependencies; `package.json` `dependencies` stays
empty. Anything a feature needs is implemented in `src/`, or deferred, never pulled in as
a package.
Rationale: the library's whole value is being small and auditable enough to read in one
sitting — pulling in dependencies defeats that and forces every consumer to inherit an
unbounded transitive graph.

### II. Deterministic, Documented Segmentation Rules
The five rules in README's "The rules" section (strict anchors / generous neighbours, no
word-splitting, longest-extent-then-priority, `rest` recipes, separator fate) are the
single source of truth for how `read()` behaves. Any change to segmentation behavior MUST
update that section in the same change, and MUST NOT introduce nondeterminism (e.g.
locale-, time-, or ordering-dependent output for the same `(text, book)` pair).
Rationale: callers cache readings by `(text, book.version)` — undocumented or
nondeterministic behavior breaks that cache contract silently.

### III. Cases Are the Single Source of Test Truth
New or changed **domain recipe-book** behavior (e.g. changes to `recipes/it-pa.ts`, or a
future book) MUST land as a case in `playground/cases.ts` before or alongside the
implementation change; `test/*.test.ts` reads those same cases for that book's behavior.
Do not add throwaway domain fixtures elsewhere. A minimal, synthetic fixture that isolates
a single core-engine rule (e.g. overlap resolution, word-boundary rejection) using toy
patterns unrelated to any real domain MAY live inline in its own test instead — it has no
place in a domain case corpus.
Rationale: one case list means what renders in the playground is exactly what the tests
assert for that domain — no drift between the two. Core-engine mechanics are exercised
with minimal synthetic recipes precisely so `playground/cases.ts` stays a corpus of real
domain text, not a dumping ground for toy patterns.

### IV. Strict Types, No Escape Hatches
`tsc --strict` with `noEmit` MUST pass with no new `any`, no `@ts-ignore` /
`@ts-expect-error` additions. Development, typechecking, and testing MUST stay build-free:
source ships and runs as-authored TypeScript, type-stripped directly by `node --test`, with
no compile step in that loop. A separate, additive build (`pnpm build`, run automatically
at `npm publish` via `prepublishOnly`) bundles and minifies the library's public entries
from `src/` into `dist/` with `vite`, and emits their declarations with `tsc`; demo recipe
books are not published. It MUST NOT be required to develop, typecheck, or test this
project, and MUST NOT introduce a new dependency beyond those already present
(`typescript`, `vite`).
Rationale: type-checking stays the primary safety net for the loop contributors actually
run — that loop stays build-free. Shipping a small, minified library to package consumers
is a separate, publish-time-only concern; it doesn't reintroduce ceremony into
development, and needs no new tooling since both tools are already in the repo.

### V. Simplicity and a Closed Vocabulary
New concepts are added to the existing vocabulary (`Recipe`, `Book`, `Mention`, `Leaf`,
`Cuts`, `Fold`) only when that closed set cannot express the need — never preemptively.
No speculative options, flags, or abstractions for hypothetical future recipes.
Rationale: the whole design fits in one small table in the README; every addition must
earn its place there.

## Data Contracts

`Cuts`, `Mention`, and `Leaf` MUST remain plain data (no `RegExp`, no functions) so a
`Cuts` value survives a JSON round-trip unchanged. Leaves MUST cover `text` in order with
no gap and no overlap — concatenating leaf slices MUST reproduce `text` exactly. A
`Book`'s `version` MUST change whenever its `recipes` change in a way that can alter
output, since callers key their cache on `(text, book.version)`.

## Development Workflow

Changes run `pnpm typecheck` and `pnpm test` before merge; there is no build step to gate
on. `pnpm dev` (playground on port 5577) is the manual check for how a change renders,
folded and unfolded, via the single `data-fold` CSS switch described in the README.
Recipes for a new domain live under `recipes/` as their own book — data in
`<name>.json`, resolvers and the compiled `Book` in `<name>.ts` (e.g. `recipes/common`,
`recipes/it-pa`) — and do not modify the core engine in `src/`. They are demos and
starting points, not part of the published package.

Publishing a release runs `pnpm build` (via `prepublishOnly`) to build `dist/`, triggered
only by `npm publish`/`pnpm publish` — never part of the merge-time gate above. `dist/` is
never committed to git; it is rebuilt fresh at publish time and stays gitignored.

## Governance

This constitution supersedes ad hoc conventions. Amendments are proposed via a PR that
edits this file and, when principles changed materially, also updates any README section
they now contradict; the PR description states the version bump and rationale. PATCH
bumps need no discussion; MINOR/MAJOR bumps need explicit sign-off from the project
maintainer before merge. Code review MUST check new work against the five rules in
README's "The rules" section and against this constitution's principles.

**Version**: 2.1.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28
