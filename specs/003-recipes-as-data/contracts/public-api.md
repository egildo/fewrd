# Public API Contract: Recipes as Data

Additive only. Every existing export keeps its name, signature and behaviour,
except the per-recipe exports of `fewrd/recipes/it-pa` noted below.

## `fewrd` (core entry) — new exports

```ts
export type Resolver = NonNullable<Recipe['resolve']>;

export interface NeighbourData { part: string; rx: string }

export interface RecipeData {
  entity: string;
  anchor: string;                 // "/source/flags"
  left?: NeighbourData[];
  right?: NeighbourData[];
  requires?: string[];
  resolve?: string;               // a key of CompileOptions.resolvers
  weak?: boolean;
  rest?: boolean;
  glued?: boolean;
}

export interface BookData {
  $schema?: string;
  version: string;
  defs?: Record<string, string>;  // name → pattern source, referenced as %{name}
  recipes: RecipeData[];
}

export interface CompileError {
  path: string;
  recipe?: number;
  entity?: string;
  message: string;
}

export interface CompileOptions {
  resolvers?: Record<string, Resolver>;
}

/** Never throws. `data` is typically `JSON.parse` output, hence `unknown`. */
export function compile(data: unknown, options?: CompileOptions): {
  book: Book;
  errors: CompileError[];
};
```

Semantics: [data-model.md](../data-model.md#compile-result).

## `fewrd/playground` — `MountOptions` widened

```ts
interface CommonOptions {
  cases: PlaygroundCase[];
  fold?: Fold;
}

export type MountOptions =
  | (CommonOptions & { book: Book })                                      // unchanged: no editor
  | (CommonOptions & { data: unknown; resolvers?: Record<string, Resolver> }); // editor, live

export function mount(el: Element, options: MountOptions): void;
```

In data mode the mounted UI adds an editor (the data as indented JSON), an
error list and a reset control. `entities()` and `initialSelection()` are
unchanged.

## `fewrd/recipes/it-pa` — repo only since 0.2.0

> Amended by the maintainer: the published package holds only the minified
> library (`fewrd`, `fewrd/playground`, `fewrd/book.schema.json`). The table
> below describes `recipes/it-pa.ts` in the repository; `recipes/common.ts`
> follows the same shape (`common`, `commonData`, `commonResolvers`).

| Export | Before | After |
|---|---|---|
| `itPa` | `Book` | `Book`, compiled from `it-pa.json` — same version, same output |
| `itPaData` | — | the parsed `it-pa.json` (`BookData`) |
| `itPaResolvers` | — | `Record<string, Resolver>` used to compile it |
| `protocol`, `cig`, `cup`, `chapter`, `amount`, `date`, `caps`, `quotation` | `Recipe` | **removed** (unused in repo; 0.x minor bump) |

## `book.schema.json` (package root file)

JSON Schema (draft 2020-12) for `BookData`. Consumers reference it from their
book:

```json
{
  "$schema": "./node_modules/fewrd/book.schema.json",
  "version": "shop@1",
  "defs": { "SKU": "[A-Z]{3}-\\d{4}" },
  "recipes": [
    {
      "entity": "sku",
      "anchor": "/%{SKU}/u",
      "left": [{ "part": "label", "rx": "/(?:sku|code)\\s*:?\\s*/iu" }],
      "resolve": "upper"
    }
  ]
}
```

```ts
import { compile, read } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { book, errors } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });
```

Its object keys match exactly the keys `compile` accepts (guarded by a test).
