# Contract: `fewrd/playground`

A new entry in `package.json`'s `exports` map, alongside `.` and
`./recipes/*`. This is the interface between fewrd and any caller who wants
to preview their own Book — including the repo's own demo playground, which
becomes an ordinary consumer of it (FR-009).

## `mount(el: Element, options: MountOptions): void`

**Preconditions**: `el` is an `Element` already in the document (or ready to
be); `options.book` and `options.cases` are present (`options.cases` may be
`[]`); `options.fold`, if present, is a pure `Fold` function.

**Postconditions** (traceable to spec Functional Requirements):
- Renders every case in `options.cases` inside `el`, each showing fewrd's
  existing dual view (full text + condensed, toggleable) — FR-003, FR-007.
- Renders a free-text trial input inside `el` that reads typed/pasted text
  against `options.book` the same way a case would — FR-006.
- Renders one multi-select control listing every distinct entity across
  `options.book.recipes`, in first-appearance order — FR-004.
- If `options.fold` is supplied, the control's options that correspond to
  entities `options.fold` would fold on `options.cases` start selected;
  otherwise none start selected — FR-005 (see
  [data-model.md](../data-model.md) for the exact `initialSelection` rule).
- Changing the control's selection re-renders every case's (and the trial's)
  condensed view using "fold this mention if its entity is currently
  selected" — from that point on, `options.fold` (if it was given at all)
  is never called again.
- Calling `mount()` again on the same or a different `el` produces the same
  result for the same `options` — no hidden state survives between separate
  `mount()` calls (spec User Story 1, Scenario 2).
- Requires no separate stylesheet or setup from the caller — mounting alone
  makes the fold toggle and dual-view switch work (FR-011).

**Failure modes**: none explicitly defined by the spec; `options.book` with
zero recipes is valid (every case renders as plain text, empty control) per
the spec's edge cases.

## `type PlaygroundCase = { name: string; text: string }`

Exported so a caller's own case list can be typed against it directly (and
so `playground/cases.ts` can import it instead of re-declaring the same
shape — see [research.md](../research.md)).

## Consumer example

```ts
import { mount } from 'fewrd/playground';
import { myBook } from './my-recipes';
import { myCases } from './my-cases';

mount(document.getElementById('app')!, {
  book: myBook,
  cases: myCases,
  fold: (m) => m.entity === 'internalRef', // optional — seeds the initial selection only
});
```

## Demo migration contract

`playground/main.ts` MUST become a thin call of the above:

```ts
mount(document.getElementById('app')!, {
  book: itPa,
  cases: CASES,
  fold: (m) => ['protocol', 'cig', 'cup', 'chapter', 'quotation'].includes(m.entity),
});
```

This is what makes SC-003 ("renders its existing demo cases identically to
before") a consequence of the contract above, not a separately maintained
guarantee.
