# Quickstart: Validate the Reusable Playground

Proves [spec.md](spec.md)'s three user stories end-to-end, using only
commands already defined in `package.json`.

## 1. Automated validation (fold-seeding logic)

```bash
pnpm typecheck
pnpm test
```

**Expected outcome**: both exit 0. The new `test/playground.test.ts`
exercises the pure fold-seeding helper (no DOM): given a Book, cases, and a
supplied `Fold`, it returns exactly the entities that `Fold` would fold on
those cases; given no `Fold`, it returns nothing.

## 2. The demo still looks like the demo (User Story 1 + SC-003)

```bash
pnpm dev   # playground on 5577
```

Open the playground and compare against its pre-migration behavior: every
case in `playground/cases.ts` renders with the same mentions, the same
default folded entities (protocol/cig/cup/chapter/quotation start folded),
and the dual-view toggle still works. This is `playground/main.ts` calling
`mount()` as an ordinary consumer (see
[contracts/public-api.md](contracts/public-api.md)'s "Demo migration
contract") — if this looks different from before the migration, SC-003 has
failed.

## 3. A caller's own book, mounted standalone (User Story 1, 2, 3)

```ts
import { mount } from 'fewrd/playground';
import type { Book } from 'fewrd';

const toy: Book = {
  version: 'toy@1',
  recipes: [{ entity: 'code', anchor: /[A-Z]{3}\d{3}/u }],
};

mount(document.getElementById('app')!, {
  book: toy,
  cases: [{ name: 'sample', text: 'Ref ABC123 confirmed' }],
  // no fold supplied — control starts with nothing selected
});
```

**Expected outcome**: the "sample" case renders showing the `code` mention
`ABC123`; the fold control lists one option, `code`, unselected; the
free-text trial input is present and, when typed into, reads against `toy`
live. Selecting `code` in the control folds it from the condensed view for
every case and the trial, with no dangling text/punctuation left behind
(SC-002 — the same separator/bracket cleanup guarantee from feature 001,
since this is still `gist`/`html` underneath).
