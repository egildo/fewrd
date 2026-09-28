# Phase 0 Research: Recipe-Based Reader

This feature documents an already-implemented pipeline rather than proposing
new behavior, so the Technical Context in [plan.md](plan.md) contains no
`NEEDS CLARIFICATION` markers — every value was confirmed directly against
the existing codebase instead of chosen from open alternatives. This file
records that confirmation so the decision trail is auditable, in the same
Decision/Rationale/Alternatives format later features will use for genuine
open questions.

## Language and module system

- **Decision**: TypeScript 5.9, `strict: true`, compiled to nothing (`noEmit:
  true`) — source runs as-authored via type-stripping (`node --test`, and
  consumers import `.ts` directly through `allowImportingTsExtensions`).
- **Rationale**: Constitution IV requires no build step and no escape
  hatches; this is the configuration already in `tsconfig.json` and already
  exercised by `pnpm test`/`pnpm typecheck`.
- **Alternatives considered**: none — this is existing, working
  configuration, not a new choice.

## Dependency posture

- **Decision**: zero runtime dependencies; `typescript`, `vite`, and
  `@types/node` stay dev-only.
- **Rationale**: Constitution I. Confirmed: `package.json` has no
  `dependencies` key.
- **Alternatives considered**: none — this is a standing constraint, not an
  open choice for this feature.

## Test data strategy

- **Decision**: one fixture list, `playground/cases.ts`, read by both the
  manual playground and `test/read.test.ts`.
- **Rationale**: Constitution III. Confirmed by reading `test/read.test.ts`'s
  imports.
- **Alternatives considered**: none — this is the existing, working
  arrangement.

## Performance ceiling

- **Decision**: adopt the ceiling the implementation already documents:
  neighbour expansion is O(n²) worst case per neighbour (a `$`-pinned regex
  rescans its prefix on every attachment attempt), acceptable for
  subject-line-sized text (a few thousand characters).
- **Rationale**: `src/read.ts` carries this as an explicit `ponytail:`
  comment naming the ceiling and its upgrade path (reverse-match) if inputs
  grow past that size. No larger-scale requirement exists in the spec.
- **Alternatives considered**: a reverse-matching scan was named as the
  upgrade path in the source comment itself, but is out of scope here since
  no requirement currently needs it.

## Outcome

No unresolved unknowns remain. Phase 1 (data model, contracts, quickstart)
proceeds directly from this confirmed context.
