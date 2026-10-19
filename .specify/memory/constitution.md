<!--
Sync Impact Report
- Version change: 3.2.0 → 3.2.1 (PATCH: where the rules live, and the links to them; no rule changed).
- Where things went: the rules of finding, selection and the fold leave the README for the reference, docs/reference/finding.md, docs/reference/tree.md and docs/reference/fold.md, and stay the single source of truth for find, dom, hidden and gist. The data contracts go with them: the chart's invariants to finding.md, the tree's to tree.md. The README becomes a landing page that links to them.
- Principles touched, in docs/principles.md: Documented, deterministic rules (names the reference instead of the README) and Docs move first (lists the reference's rules among the documents a round amends). Neither was loosened or widened.
- Not touched: "the design has to fit in one README" (A closed vocabulary) and "the rules fit in a README" (the vision) speak of size, not of place, and stay.
- Templates: .specify/templates need no change; none names the README.
- Follow-up TODOs: the move itself, in the documentation round, which creates the three reference files these lines point to.
- Trigger: the documentation refactor of October 2026, planned against Diátaxis, Google's and Microsoft's style guides and Write the Docs. Maintainer sign-off given on 2026-10-19.
-->

# fewrd Constitution

## Core Principles

Each principle is stated once, in [docs/principles.md](../../docs/principles.md), with what it forbids and the problem it came from. Here they are only named.

- **Zero dependencies**: no runtime dependencies in the library or in `fewrd-play`.
- **Documented, deterministic rules**: the rules of finding, selection and the fold in [docs/reference/](../../docs/reference/) are the single source of truth for `find`, `dom`, `hidden` and `gist`.
- **Cases are the test truth**: domain behaviour is tested through `cases/<conf>.json` and nowhere else.
- **Strict types, no build in the loop**: `tsc --strict`, no escape hatches, and TypeScript run as written.
- **A closed vocabulary**: one name per thing, held by [docs/glossary.md](../../docs/glossary.md).
- **A complete, neutral chart**: `find` chooses nothing.
- **One anchor per search**: one `from`, one direction, no reconciliation hook.
- **Docs move first**: documents describe a change before the code makes it.

When a principle and [docs/vision.md](../../docs/vision.md) collide, the vision decides what fewrd is and is for, and the principles decide how it is built.

## Governance

This constitution and the documents it points to supersede ad hoc conventions. An amendment is a change of its own, proposed in a pull request that edits `docs/principles.md` (or the vision) and this file together, bumps the version below and adds a Sync Impact Report saying what moved and why. A PATCH bump (wording, links) needs no discussion; a MINOR bump (a principle added or materially expanded) or a MAJOR one (a principle removed or redefined) needs the maintainer's explicit sign-off before merge.

Review checks new work against the rules of finding, selection and the fold in `docs/reference/`, against these principles, and against the decisions in `docs/decisions/`. A settled decision is never rewritten; a reversal is a new decision file saying what it supersedes. An open decision's status line changes when the maintainer settles it, and its text does not.

**Version**: 3.2.1 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-10-19
