# Data model: The DOM (rewrite, phase 2)

Phase 1's `Conf`, `Tag`, `Search`, `Atom`, `Chart`, `Span` are unchanged except where noted. See [spec.md](spec.md) for the rules; this file lists shapes and invariants only.

## Tag (changed)

`fate?: 'separator' | 'connector' | 'bracket'`. `compile` accepts the third value (`fate-bracket-accepted`). Declarable names exclude `^`, `$`, `*`, `doc`, `text` (`reserved-doc-and-text`).

## Node (new)

| field | type | meaning |
|---|---|---|
| `tag` | `string` | a conf tag, `'doc'` (root) or `'text'` (water) |
| `start`, `end` | `number` | span into the original string |
| `value` | `string?` | resolver's answer; present only when the tag resolves |
| `attrs` | `Record<string, Node \| string>` | roles of the forced derivation: the node a tag atom took, the text a regex atom matched; `{}` on root nodes and water |
| `also` | `string[]?` | twin tags, in walk order; present only when there are twins |
| `children` | `Node[]` | contained nodes and water, in text order; `[]` on leaves |

Invariants (constitution Data Contracts, `leaves-partition-text`): one `doc` root over `(0, n)`; leaves partition the text; no two nodes cross; every child inside its parent; `also` only on twins; every node in `attrs` is also a descendant (same object).

## Fold (new)

`(node: Node) => boolean`. Asked about every node but `doc`. In a case: `fold: string[]`, meaning `node => fold.includes(node.tag)`.

## Case (changed)

`{ name: string; conf: string; text: string; fold?: string[]; gist?: string }`. `fold` and `gist` go together. In a fewrd-play folder, `conf` may be omitted.

## Internal (not exported)

- **Step** (from `derive`): `{ row: Row; as?: string } | { text: string; span: Span; as?: string }`, the `from` row first.
- **Derivation**: `{ steps: Step[] }` memoised per chosen composed row key.
- **Chosen**: list of rows, key set, `also` map, in copy coordinates until the tree is built.
- **Fates of a doc**: `WeakMap<Node, Record<string, Fate>>` written by `dom`, read by `hidden`.

## State in the playground

Per mounted playground: the compiled confs (phase 1), and `Map<caseIndex, Set<string>>` of checked fold tags, seeded from each case's `fold` on first show.
