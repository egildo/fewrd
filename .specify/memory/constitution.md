<!--
Sync Impact Report
- Version change: 3.1.1 → 3.2.0 (MINOR: three principles added, and the principles moved out of this file).
- Where things went: each principle is now stated once, in docs/principles.md, with what it forbids and the problem it came from; this file keeps one line per principle and the governance. The data contracts (the chart's and the tree's invariants) moved to the README's "The chart" and "The tree" sections, and the development workflow to its "Develop" section and to docs/architecture.md.
- Kept, renamed to their names in docs/principles.md: I. Zero Runtime Dependencies → Zero dependencies; II. Deterministic, Documented Finding and Fold Rules → Documented, deterministic rules; III. Cases Are the Single Source of Test Truth → Cases are the test truth; IV. Strict Types, No Escape Hatches → Strict types, no build in the loop; V. Simplicity and a Closed Vocabulary → A closed vocabulary (the vocabulary itself now lives in docs/glossary.md). No rule in them was loosened.
- Added: A complete, neutral chart; One anchor per search; Docs move first. Each was already decided in the rewrite brief (specs/rewrite-brief.md) and followed by the code; they are now principles.
- Removed sections: Data Contracts and Development Workflow, moved as above. None of their content was dropped.
- Templates: .specify/templates need no change; the plan template's "Constitution Check" derives its gates from this file, which now points to docs/principles.md.
- Follow-up TODOs: none.
- Trigger: the documentation rewrite after the DOM round. Maintainer sign-off for the MINOR bump was given in the design round of 2026-09-29.
-->

# fewrd Constitution

## Core Principles

Each principle is stated once, in [docs/principles.md](../../docs/principles.md), with what it forbids and the problem it came from. Here they are only named.

- **Zero dependencies**: no runtime dependencies in the library or in `fewrd-play`.
- **Documented, deterministic rules**: the README's rules of finding, selection and the fold are the single source of truth for `find`, `dom`, `hidden` and `gist`.
- **Cases are the test truth**: domain behaviour is tested through `cases/<conf>.json` and nowhere else.
- **Strict types, no build in the loop**: `tsc --strict`, no escape hatches, and TypeScript run as written.
- **A closed vocabulary**: one name per thing, held by [docs/glossary.md](../../docs/glossary.md).
- **A complete, neutral chart**: `find` chooses nothing.
- **One anchor per search**: one `from`, one direction, no reconciliation hook.
- **Docs move first**: documents describe a change before the code makes it.

When a principle and [docs/vision.md](../../docs/vision.md) collide, the vision decides what fewrd is and is for, and the principles decide how it is built.

## Governance

This constitution and the documents it points to supersede ad hoc conventions. An amendment is a change of its own, proposed in a pull request that edits `docs/principles.md` (or the vision) and this file together, bumps the version below and adds a Sync Impact Report saying what moved and why. A PATCH bump (wording, links) needs no discussion; a MINOR bump (a principle added or materially expanded) or a MAJOR one (a principle removed or redefined) needs the maintainer's explicit sign-off before merge.

Review checks new work against the README's rules of finding, selection and the fold, against these principles, and against the decisions in `docs/decisions/`. A settled decision is never rewritten; a reversal is a new decision file saying what it supersedes. An open decision's status line changes when the maintainer settles it, and its text does not.

**Version**: 3.2.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-29
