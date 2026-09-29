# Changelog

## 1.0.0

The rewrite. fewrd keeps its name and its purpose, finding what recurs in a string and letting a reader fold it away, and replaces almost everything else. The old engine found, chose among overlaps and cut the text in one pass; the new one works in two halves with plain data between them. `find` makes a chart of every row the conf can build and chooses nothing; `dom` chooses one reading and returns a tree; `hidden` and `gist` fold the tree. `fewrd-play` moves to 0.2.0 and requires fewrd 1.0.0.

### What replaced what

| 0.3.0 | now |
|---|---|
| a book of recipes (`BookData`, `Book`, `Recipe`) | a conf of tags (`Conf`, `Tag`) |
| `defs` | `patterns` |
| `recipes[]`, in priority order, each with an `entity` | `tags`, an object keyed by tag name; key order is the priority |
| a recipe's `anchor` | a root tag's `rx` |
| `left` / `right` neighbours, each with a `part` | a composed tag's `search`: `back` or `forward` from a `from` tag, through atoms, each with an optional `as` |
| `requires` | an atom that is not `optional` |
| `rest` | a regex atom running to `$`: `{ "rx": "/.+/u", "as": "body" }, { "tag": "$" }` |
| `read(text, book)` returning `Cuts` | `find(text, conf)` returning a `Chart`, then `dom(text, chart, conf)` returning a `Node` tree |
| `Mention`, `Leaf` | `Node`; the tree's leaves partition the text as `Cuts.leaves` did |
| the six rules of the old README | the six rules of finding, and the rules of selection and of the fold |
| separator fate on built-in separators | a tag with `"fate": "separator"` |
| a book's `connectors` list (on a branch that never shipped) | a tag with `"fate": "connector"` |
| brackets found by the engine | a tag with `"fate": "bracket"` |
| `gist(cuts, fold)`, `Fold` over mentions | `gist(doc, fold)`, `Fold` over nodes |
| `shown(cuts, fold)`, one boolean per leaf | `hidden(doc, fold)`, the set of nodes the fold drops |
| `html(cuts, fold)` | your own walk of the tree, a few lines (see the README's "Rendering it yourself") |
| compile errors `{ path, recipe, entity, message }` | `{ path, tag, message }` |
| `mount(el, { data, resolvers, cases, fold, save })` or `{ book, … }` | `mount(el, { confs, cases })`, every case naming its conf |
| `fewrd-play` on `book.json`, with a save button | `fewrd-play` on `conf.json`, writing nothing |

### Upgrading from 0.3.0

- Rewrite each book as a conf. Each recipe's anchor becomes a root tag; each neighbour becomes a root tag of its own plus an atom in a search from the anchor's tag; the recipe's entity becomes the composed tag. Put separators, connectors and brackets in the conf as tags with a fate.
- Order alternatives longest-first (`protocollo|prot`): a match the word guard rejects is not retried shorter.
- Replace `read` with `find` and `dom`, and cache the chart by text and `conf.version` if you cached `Cuts`.
- Read values from `node.value` instead of `mention.value`, and parts from `node.attrs[as]`, which holds a node or a string.
- Write your fold over `node.tag` instead of `mention.entity`.
- Make resolvers pure: they are asked in `find` to filter and in `dom` for the value, and see normalised text in both. Their argument is `{ value, ...roles }`.
- Replace `html` with your own renderer over `hidden`, and `shown` with membership in `hidden`.
- Read compile errors as `{ path, tag, message }`.
- Call `mount(el, { confs, cases })`, with each case naming its conf; there is no `save`.
- For `fewrd-play`, rename `book.json` to `conf.json`; the page no longer writes it back.
- Drop `$schema` and `book.schema.json`, and `glued` (parked).

### New

- The chart: an immutable, JSON-round-tripping map from tag to sorted, unique rows, with `has`, `after`, `before`, `spans`, `all`, `size`, `edges` and `with`; `rel` for the Allen relation of two spans.
- Composition to a fixpoint: searches grow from the rows of any tag, their own included, so repetition, and composed tags grown from other composed tags, need no special construct.
- Twins: two tags on one span become one node, the other tags in `also`.
- Roles: `as` binds what an atom took, handed to resolvers and kept on the node.
- The bracket fate, and the four rules of the fold on the tree alone: a tree parsed back from JSON folds the same.
- `doc` and `text` as reserved tag names; unknown keys, reserved roles, an optional outermost atom and two regex atoms that could meet are compile errors.
- Two domain confs as data, `confs/it-pa.json` and `confs/common.json`, with twenty-one cases, each carrying the fold it is read with and the gist expected.
- A redesigned playground: one case at a time on a character grid, every row an underline in lanes, the tree linked to the grid, tag chips that light and fold, the conf as a pane or a drawer, light and dark themes.
- Documents: the vision, the principles, the architecture, the glossary, the decisions and the playground's design, under `docs/`.

## 0.3.0 (2026-09-28, tag `v0.3.0`)

`fewrd-play`, a separate dev-only package under `play/`, opens a local book folder (`book.json`, `cases.json`, an optional `cases.local.json` and `resolvers.ts`) in the playground, served on localhost from the `fewrd` installed next to it, with `.ts` served type-stripped and the book written back on save. `fewrd/playground` gained an optional `save` hook for it.

## 0.2.0 (2026-09-28, tag `v0.2.0`)

Books became data: `compile(data, { resolvers })` turned a book written as JSON into a `Book`, with patterns as `"/source/flags"`, shared `defs` spliced as `%{NAME}`, resolvers by name, and errors reported per recipe without throwing; `book.schema.json` shipped for editor validation. The playground became a public entry, `fewrd/playground`, with `mount` editing the JSON live. A generic demo book for inbox lines joined the Italian one, the package became the minified library alone, and the project took the MIT license.

## 0.1.0 (2026-09-28, tag `v0.1.0`)

The first release: `read` a string with a book of recipes, strict anchors grown greedily through the words around them, into an ordered index, `Cuts`, rendered folded or whole by `gist`, `html` and `shown`. It came with the Italian public-administration book (protocol, CIG, CUP, chapter, amount, date, capitals, quotations) and a playground.
