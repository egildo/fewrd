# Fates ride on the node

**Status:** settled by the maintainer in the DOM round of September 2026, replacing an earlier plan.

## Context

The fold needs two things the tree did not carry: each node's fate, which lives on its tag in the conf, and the text, to read separators' strength and closing punctuation. The plan was a module-level `WeakMap` from the root to that data, keeping the [rewrite brief](../../specs/rewrite-brief.md)'s signatures `hidden(doc, fold)` and `gist(doc, fold)`. The other option was a `conf` argument to both.

## Decision

`dom` copies the tag's `fate` onto every node it builds, and the root `doc` carries the original text in `text`. `hidden` and `gist` read the tree alone.

## Consequences

- The signatures stay as the rewrite brief wrote them, with no hidden state.
- A tree that went through `JSON.stringify` and back folds with all four rules; a `WeakMap` would have lost the fates on the way.
- The tree repeats a little of the conf. A tree built with one conf and folded after the conf changed folds by the fates it was built with, which is the honest reading of that tree.
- A hand-built tree without `text` on its root cannot be folded, and `hidden` says so.
