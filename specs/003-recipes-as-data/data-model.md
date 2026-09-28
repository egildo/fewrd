# Data Model: Recipes as Data

The runtime vocabulary (`Recipe`, `Book`, `Mention`, `Leaf`, `Cuts`, `Fold`)
is unchanged. This feature adds the *source* side of a book: the data it is
written in, the functions it names, and what compiling reports.

## BookData

The JSON document. Source of truth for a book written as data.

| Field | Type | Rules |
|---|---|---|
| `$schema` | string | Optional. Ignored by `compile`; lets editors find the format description. |
| `version` | string | **Required**, non-empty. Becomes `Book.version`; same cache contract as today. |
| `defs` | map name → string | Optional. Name matches `[A-Za-z_][A-Za-z0-9_]*`. Value is pattern **source** (no slashes, no flags). |
| `recipes` | RecipeData[] | **Required**. Priority order, as in `Book.recipes`. May be empty. |

No other keys.

## RecipeData

One recipe. Same fields as `Recipe`; patterns are strings, `resolve` is a name.

| Field | Type | Rules |
|---|---|---|
| `entity` | string | **Required**, non-empty. |
| `anchor` | Pattern | **Required**. |
| `left` | NeighbourData[] | Optional. |
| `right` | NeighbourData[] | Optional. |
| `requires` | string[] | Optional. |
| `resolve` | string | Optional. Must be a key of the supplied resolvers. |
| `weak` | boolean | Optional. |
| `rest` | boolean | Optional. |
| `glued` | boolean | Optional. |

No other keys.

### NeighbourData

| Field | Type | Rules |
|---|---|---|
| `part` | string | **Required**, non-empty. |
| `rx` | Pattern | **Required**. |

No other keys.

## Pattern

A string in regex-literal form: `"/source/flags"`.

- Must start with `/`; the last `/` splits source from flags.
- `%{NAME}` in the source is replaced by `(?:<expansion of defs.NAME>)`,
  recursively. `%\{` is a literal `%{`.
- After expansion, `new RegExp(source, flags)` must succeed.
- Errors: not a string / no leading slash / no closing slash; unknown
  fragment; circular fragment (reported with its chain, e.g.
  `A → B → A`); invalid regex or flags (the engine's message).

## Resolver / resolver set

- `Resolver` — alias for today's `NonNullable<Recipe['resolve']>`:
  `(parts: Readonly<Record<string, string>>) => string | null`.
- Resolver set — `Record<string, Resolver>`, supplied by the caller at
  compile time. Unused entries are fine. Resolvers are passed through
  unwrapped.

## CompileError

| Field | Type | Meaning |
|---|---|---|
| `path` | string | Where in the data: `""` (root), `version`, `defs.DATE`, `recipes[2].left[0].rx`, … |
| `recipe` | number? | Index in `data.recipes`, when the error belongs to a recipe. |
| `entity` | string? | That recipe's entity, when it has a readable one. |
| `message` | string | What went wrong, human-readable. |

## Compile result

`{ book: Book; errors: CompileError[] }`

- `book.version` = `data.version` if valid, else `""`.
- `book.recipes` = every recipe with **zero** errors, compiled, in their
  original relative order. A recipe with any error is left out.
- Root not an object, or `recipes` not a list → `recipes: []` plus the
  error.
- A `defs` entry that is not a string is reported at `defs.NAME` and treated
  as undefined (recipes using it then report an unknown fragment).
- Deterministic: same `data` and resolvers → same book and same errors, in
  data order.

## State in the playground (data mode)

| State | Starts as | Changes when |
|---|---|---|
| Editor text | `JSON.stringify(data, null, 2)` | Person types; reset restores it. |
| Current book | `compile(data, resolvers).book` | Editor text parses; replaced by the new compile result (even if it has errors). |
| Shown errors | Initial compile errors | Every edit: parse error, or the compile errors. |
| Fold selection | Seeded from `fold` against the initial book (as in 002) | Person changes the select; entities that disappear are dropped, new ones start unselected. |
