# Phase 0 Research: Reusable Playground

Technical Context left no `NEEDS CLARIFICATION` markers, but unlike feature
001 (a brownfield baseline), this feature has real open design questions.
They're resolved here rather than left to implementation-time discretion.

## Per-entity coloring without hardcoding entity names

- **Decision**: derive each entity's color at runtime from a small string
  hash mapped to a hue (`hash(entity) % 360`), applied via an inline CSS
  custom property (`style="--h: hsl(...)"`) on the relevant elements,
  instead of the demo's current hardcoded rules
  (`[data-entity="protocol"] { --h: #dbe8ff }`, etc.).
- **Rationale**: `playground/style.css` today hardcodes a color per *demo*
  entity name. A caller's Book has entirely different entity names fewrd
  can't know in advance — the stylesheet a reusable module ships MUST work
  for any entity set. A deterministic hash needs no dependency and no
  configuration; two different entities will very likely get visibly
  different hues, which is all this needs (it's a dev tool, not a
  color-accessibility-audited product).
- **Alternatives considered**: (a) require the caller to supply a color map
  — rejected, adds required configuration for a cosmetic concern the filed
  issue never asked for; (b) cycle through a small fixed palette by the
  entity's index in the Book — rejected in favor of a hash, since a hash
  stays stable across re-renders even if `entities` is recomputed in a
  different order, while an index-based cycle wouldn't.

## Testing DOM-touching code without a DOM dependency

- **Decision**: split `src/playground.ts` so the DOM-touching `mount()`
  function is the only thing that references `document`/`Element`; the
  logic that decides which entities start selected (given a Book, cases,
  and an optional supplied fold) is a separate, pure, exported function
  with no DOM reference at all, unit-tested directly with `node --test`.
- **Rationale**: Constitution IV keeps development dependency-free; adding
  jsdom or happy-dom purely to unit-test DOM output would be the first
  devDependency added for testing in this project's history, for a feature
  whose DOM behavior the existing playground has never had automated
  coverage for either. The pure fold-seeding logic is exactly the part with
  real, non-obvious behavior worth a test (which entities a policy would
  fold) — the DOM wiring around it is comparatively mechanical.
- **Alternatives considered**: adding `jsdom` as a devDependency — rejected
  per the rationale above; it would be new ceremony for a project whose
  whole design deliberately avoids it, to test code whose sibling
  (`playground/main.ts`) was never tested this way either.

## Migrating `playground/cases.ts`'s `Case` type

- **Decision**: `playground/cases.ts` imports and re-exports `PlaygroundCase`
  from `src/playground.ts` (or aliases it as `Case` for the demo's own
  readability) instead of keeping its own separately-declared `{ name,
  text }` interface.
- **Rationale**: the two shapes are identical today; keeping one
  declaration avoids the two silently drifting apart later — a small,
  free simplification while the file is being touched anyway for FR-009's
  migration.
- **Alternatives considered**: leaving `playground/cases.ts`'s `Case`
  interface exactly as-is (structurally identical, so still type-compatible
  at the call site) — a smaller diff, but a needless duplicate declaration
  since the two are the same shape by construction now, not by accident.

## Outcome

Three concrete decisions, no unresolved unknowns. Phase 1 proceeds directly.
