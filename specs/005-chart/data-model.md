# Data Model: The Chart (rewrite, phase 1)

The types live in `src/conf.ts` (conf, compile) and `src/chart.ts` (span, chart, relations). Signatures are in [contracts/public-api.md](contracts/public-api.md); this file says what each holds and what must be true of it.

## Conf, in data form and compiled

| type | fields | notes |
|---|---|---|
| `Conf<P = string, R = string>` | `version: string`, `patterns?: Record<string, string>`, `tags: Record<string, Tag<P, R>>` | Data form: `Conf`. Compiled: `Conf<RegExp, Resolve>`. Key order of `tags` is priority (DOM half only). |
| `Tag<P, R>` | `rx?: P`, `search?: Search<P>[]`, `resolve?: R`, `weak?: boolean`, `fate?: 'separator' \| 'connector'` | Exactly one of `rx` (root) and `search` (composed). `weak` and `fate` pass through; `find` ignores them. |
| `Search<P>` | `from: string`, `back?: Atom<P>[]`, `forward?: Atom<P>[]` | Exactly one of `back`, `forward`. `from` names a declared tag, never `^` `$` `*`. |
| `Atom<P>` | `{ tag: string \| string[]; as?: string; optional?: boolean }` or `{ rx: P; as?: string; optional?: boolean }` | Tag names may include `^`, `$`, `*`. A regex atom bound with `as` binds the text it matched. |
| `Resolve` | `(row: Readonly<Record<string, string>>) => string \| null` | Argument `{ value, ...roles }`. |
| `CompileError` | `path: string`, `tag?: string`, `message: string` | `path` like `tags.cig.search[0].back[1].tag`; `""` is the root. |

**Validation** (`compile-never-throws`): the error kinds are exactly those listed in the spec. A tag with any error is dropped from the compiled `tags`; others keep their key order. A reference to a dropped tag is not an error. `%{NAME}` expands recursively to `(?:…)`; `%\{` is literal; unknown and circular names are errors on the pattern that uses them.

## Span and Chart

| type | shape | notes |
|---|---|---|
| `Span` | `readonly [start: number, end: number]` | Half-open, `0 ≤ start ≤ end ≤ n`, into the original string. |
| `Chart` | class over `ReadonlyMap<string, readonly Span[]>` and `n` | Immutable; one class, the only one in the codebase. |
| `AllenRelation` | union of 13 strings | See `allen-relations` in the spec and `allen-relations-order` in research. |

**Invariants** (`chart-invariants`, constitution Data Contracts): per tag, sorted by start then end, no duplicates; `^ → [[0,0]]`, `$ → [[n,n]]` always present; a tag with no rows absent; `toJSON` keys in code-unit order; `Chart.from(c.toJSON())` equals `c`.

**Lifecycle**: `Chart.empty(n)` → `with(roots)` → `with(pass 1 rows)` → … → fixpoint; then one final chart in original coordinates. Every step is a new chart; untouched tag lists are shared.

## Inside `find` (not exported)

| thing | holds | lifetime |
|---|---|---|
| normalised copy | `{ text, at }` from `normalise` | one call |
| working chart | rows in normalised coordinates, `^ (0,0)`, `$ (L,L)` | one call |
| role values | `Map<"tag start end", string>` for rows of resolving tags | one call (`role-values-are-transient`) |
| derivation (in the matcher) | cursor, leftmost, rightmost, roles bound, pending regex atom | one branch of the enumeration |

## The Italian conf

`confs/it-pa.json`: the conf of `italian-conf-in-new-format`, 30 tags, version `it-pa@3`. `confs/it-pa.ts`: exports `itPaResolvers: Record<string, Resolve>` with `protocol`, `cig`, `amount`, `date`, and the compiled `itPa` (throwing at import if `compile` reports errors, as the old `recipes/it-pa.ts` did, since a broken demo conf is a bug).

`cases/it-pa.json`, `cases/common.json`: `{ name: string; conf: string; text: string }[]`, `conf` naming the conf the case is found with.
