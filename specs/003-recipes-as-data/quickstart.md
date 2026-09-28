# Quickstart: validating Recipes as Data

Scenarios that prove the feature end to end. Commands run from the repo root.

## 1. Gates

```bash
pnpm typecheck
pnpm test
pnpm build && npm pack --dry-run
```

Expect: typecheck clean; all tests pass (existing `read.test.ts` unchanged
and green against the JSON-compiled `itPa`; new `compile.test.ts` green);
the pack listing includes `book.schema.json`, `dist/recipes/it-pa.json` and
`dist/src/compile.js`; `dependencies` still absent.

## 2. The demo book reads identically (SC-001)

Before deleting the old hand-written recipes, run the one-off comparison
(scratchpad script, not committed): for every text in `playground/cases.ts`
and in `test/read.test.ts`, `JSON.stringify(read(text, oldBook))` must equal
`JSON.stringify(read(text, itPa))`. Expect: 0 differences.

## 3. Built package, from a consumer's point of view

```bash
node -e "import('./dist/src/index.js').then(async ({ compile, gist, read }) => {
  const { itPa } = await import('./dist/recipes/it-pa.js');
  const { book, errors } = compile({ version: 'x@1', recipes: [{ entity: 'n', anchor: '/%{D}/u' }], defs: { D: '\\\\d+' } });
  console.log(errors.length, book.recipes.length, gist(read('Prot. n. 0023993 del 23/09/2026', itPa), (m) => m.entity === 'protocol'));
})"
```

Expect: `0 1` followed by the folded gist.

## 4. Compile errors don't stop the book (SC-005)

Covered by `test/compile.test.ts`: one test per error kind (invalid regex,
invalid flags, missing slash, unknown fragment, circular fragment, unknown
resolver, wrong type, unknown key, missing required field), each asserting
the error's `path`/`recipe`/`entity` and that the remaining recipes are still
in the book, in order.

## 5. Playground, data mode (User Story 2)

```bash
pnpm dev
```

In the browser (port 5577):

1. The editor shows `it-pa.json`; the cases render exactly as before.
2. Change `cup`'s label pattern so it no longer matches `CUP` → the CUP case
   loses its mention immediately, no reload.
3. Break `cup`'s anchor (e.g. an unclosed `(`) → an error naming
   `recipes[2]` / `cup` appears; every other entity still renders.
4. Delete a closing `}` → a parse error appears; the cases keep the previous
   rendering.
5. Rename `cup`'s entity to `cup2` → the fold control lists `cup2`
   (unselected); other selections are kept.
6. Reset → editor and cases return to the original book.

## 6. Book mode unchanged (SC-006)

Mount with `{ book: itPa, cases }` (e.g. temporarily in `playground/main.ts`):
no editor, same UI as feature 002.

## 7. Editor help (User Story 3)

Open `recipes/it-pa.json` in VS Code (it declares
`"$schema": "../book.schema.json"`). Type `"wek": true` inside a recipe →
flagged as not allowed; remove `"entity"` → flagged as missing; start a new
key → `weak`, `rest`, `glued`, … are suggested.
