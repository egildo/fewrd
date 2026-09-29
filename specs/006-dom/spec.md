# Feature Specification: The DOM (rewrite, phase 2: the DOM half)

**Feature Branch**: `rewrite`

**Created**: 2026-09-29

**Status**: Draft; every worked example and every case gist is hand-derived and **not yet run**

**Input**: User description: "Phase 2 of the fewrd rewrite: the DOM half. dom(text, chart, conf) to a tree, selection with forcing, roles and values, fates and fold with gist, the cases' expected gists reinstated, the playground's tree and fold panel, fewrd-play on the new folder shape, README complete. Per specs/rewrite-brief.md section 5."

Section 5 of the brief ([`specs/rewrite-brief.md`](../rewrite-brief.md)) is the settled outcome of the phase 2 design round. This spec turns it into requirements and does not reopen it. Where the brief is silent and a choice had to be made to make a requirement testable, the choice is stated in Assumptions; where the brief's own words leave a real gap, or two of its sentences pull apart, it is listed under Open points with what this phase does meanwhile. Phase 1 ([`specs/005-chart/spec.md`](../005-chart/spec.md)) is done: `compile`, `Chart`, `rel` and `find` exist and are not changed here except where a requirement says so.

## What phase 2 adds, in one paragraph

Phase 1 finds everything and chooses nothing: the chart keeps crossing rows, twins, rows inside rows. A reader wants one reading of the text, and a shorter one. Phase 2 takes the chart and makes the choices, once and deterministically: it selects rows that do not cross, re-derives each chosen composition inside its own span so its roles point at real nodes, resolves values bottom-up, and builds a tree whose leaves cover the text exactly, the gaps as water. Then the fold: a policy says which nodes go, the connector and separator fates tidy what is left, emptied brackets go too, and `gist` reads what remains. fewrd still returns plain objects; turning the tree into HTML is the consumer's job.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get one tree from a chart (Priority: P1)

An integrator who already runs `find` passes the text, its chart and the conf to `dom` and gets back a tree: a `doc` root over the whole text, one node per chosen row, water as `text` nodes, composed nodes with their roles bound to the nodes they were built from, values on the tags that resolve, and twins folded into one node's `also`.

**Why this priority**: The tree is what everything else in phase 2 reads: the fold, `gist`, the playground's tree view, and any consumer that renders HTML. Without selection and the tree there is nothing to fold.

**Independent Test**: For each synthetic conf in the worked examples of the selection, tree, roles and values requirements, run `find` then `dom` and compare the tree with the one written in the example; check the leaf-partition invariant on every case of both corpora.

**Acceptance Scenarios**:

1. **Given** a chart with crossing rows, **When** `dom` runs, **Then** no two nodes of the tree cross, and the row that loses under `select-order` is not a node.
2. **Given** a chart with two tags on one span, **When** `dom` runs, **Then** one node stands for both, and the other tag is in its `also`.
3. **Given** a chosen composed row, **When** `dom` runs, **Then** every row its re-run derivation took is a node, and each `as` role is bound in `attrs` to the node (tag atom) or the text (regex atom) it took.
4. **Given** any text and its chart, **When** `dom` runs, **Then** the leaves in order join to the text, character for character.
5. **Given** a resolver that refuses at `dom` time a row it accepted at `find` time, **When** `dom` runs, **Then** it throws an error naming the tag and the span.

---

### User Story 2 - Fold it and read the gist (Priority: P2)

A reader chooses what to fold away, typically by tag ("hide protocols and CIGs"). `gist(doc, fold)` returns the condensed text: the folded nodes gone, a connector gone with what it introduces, separators collapsed to the strongest one where something was cut and dropped at the edges, emptied brackets gone. `hidden(doc, fold)` returns the set of nodes the condensed view drops, so a consumer can render both views from one tree.

**Why this priority**: The gist is the point of fewrd ("the gist in a few words"). It depends on the tree (P1), and it is what the regression over the cases asserts.

**Independent Test**: Run each fold-rule worked example; then, for every case in `cases/it-pa.json` and `cases/common.json` that carries a `fold` and a `gist`, assert `gist(dom(text, find(text, conf), conf), fold) === case.gist`.

**Acceptance Scenarios**:

1. **Given** a tree and a policy that folds nothing, **When** `gist` runs, **Then** it returns the text unchanged.
2. **Given** a policy that folds a composed node, **When** `gist` runs, **Then** every leaf of that node is gone and one separator, the strongest, stands where the run was cut.
3. **Given** a connector before a folded node, **When** `gist` runs, **Then** the connector is gone; before a node that stays, it stays.
4. **Given** a bracket whose content is all folded, **When** `gist` runs, **Then** the bracket goes too, and so does the separator that would have been left at its inner edge.
5. **Given** the 21 cases of both corpora, **When** the regression runs, **Then** every gist matches the one recorded in the case.

---

### User Story 3 - See the tree and try folds in the playground (Priority: P3)

A conf author opens `pnpm dev` and, under the chart of the case on screen, sees the tree as an indented list and a fold panel with one checkbox per tag of the current conf. Ticking a box prints the new gist and greys out the hidden leaves on the character grid. A case that carries a `fold` opens with those boxes ticked.

**Why this priority**: Selection and fates are rules a conf author tunes by looking; the playground is where they see which reading won and what folding it leaves.

**Independent Test**: Run `pnpm dev`, step through the cases, tick and untick boxes, and compare the printed gist with the case's `gist` for the case's own fold.

**Acceptance Scenarios**:

1. **Given** the playground on a case, **When** it loads, **Then** the tree is listed under the chart, one line per node with tag, span, `also` and value, indented by depth.
2. **Given** the fold panel, **When** a box is ticked, **Then** the gist under it changes and the characters of every hidden leaf are greyed on the grid; unticking restores them.
3. **Given** a case with a `fold`, **When** it is shown, **Then** the panel starts with exactly those tags ticked, and the printed gist is the case's `gist`.

---

### User Story 4 - Open my own folder with fewrd-play (Priority: P4)

A consumer with a folder holding `conf.json`, `cases.json` and `resolvers.ts` runs `fewrd-play path/to/folder` and gets the same playground on their own conf and texts, served from the `fewrd` installed in their project.

**Why this priority**: The dev tool must follow the library's new shape before a release; it is not published in this phase.

**Independent Test**: Point `fewrd-play` at a scratch folder with the three files and check that the page mounts, draws the chart, lists the tree and folds.

**Acceptance Scenarios**:

1. **Given** a folder with `conf.json` and `cases.json`, **When** `fewrd-play` runs, **Then** the page mounts the playground with that conf, its resolvers if `resolvers.ts` (or `.js`) exists, and the cases.
2. **Given** a folder with no `conf.json`, **When** `fewrd-play` runs, **Then** it exits with an error naming the missing file and the usage.

---

### User Story 5 - Read how the DOM half works (Priority: P5)

A reader of the README learns, after the finding half, what the tree holds, how selection chooses, the rules of the fold, and how to render the tree themselves.

**Why this priority**: Principle II makes the README's rules the single source of truth for `dom`, `hidden` and `gist`; written last, from the code the tests prove.

**Independent Test**: Read the README top to bottom; every DOM-half rule in it matches a requirement below; the rendering example runs as written.

**Acceptance Scenarios**:

1. **Given** the README, **When** it is read, **Then** it has The tree, Selection, The rules of the fold and Rendering it yourself after the finding half's sections, and its Playground section describes the tree and the fold panel and fewrd-play.

### Edge Cases

- **Empty text**: the tree is `doc (0,0)` with no children; `gist` is `''`.
- **A text no row covers**: `doc` has one child, a `text` node over the whole text.
- **A chart row of a tag the conf does not declare** (a chart cached under another `version`): `dom` throws naming the tag (`dom-returns-a-tree`).
- **A root row with rows inside it** (a bracket around a CIG, a serial holding a number): it is not a leaf; its children are the rows inside it and the water between them.
- **A text that begins or ends with a separator**: with nothing hidden it survives (`separators-untouched-without-a-fold`); a cut at the edge drops it (`no-separator-at-an-edge`).
- **A self-growing search**: forcing chooses the whole derivation chain, so the partial rows on it nest inside each other; the partial rows off it cross or sit inside and drop. See Open points.
- **A character outside the Basic Multilingual Plane**: after `normalise-per-utf16-unit`, spans still land on the right offsets; the playground grid still draws it as one glyph over two positions (the phase 1 ceiling, unchanged).
- **A fold that names `sep` or `connector`**: those leaves are hidden by the policy like any other node; the fate rules then see them as hidden.

## Requirements *(mandatory)*

Every requirement has a short name, and the prose refers to requirements by that name. The identifiers follow the template and are for the tasks file only.

Every worked example below is hand-written from the rules and **not yet run**: the implementing agent runs each one as a test named after its requirement, and where the code shows an example wrong, the example is corrected here, in the spec, not fudged in the test. Every example conf has `"version": "t@1"`; only `tags` is shown, in key order, since key order matters here. Offsets are into the example's text. A tree is written one node per line, indented by depth, as `tag (start,end) "text"`, with `also`, `value` and `attrs` after it when present.

### The tree and its API

- **FR-001 · `node-type`**: A tree MUST be made of plain objects of this type, and `Fold` is the policy a caller passes:

  ```ts
  type Node = {
    tag: string;                          // a conf tag, or reserved: 'doc' (the root), 'text' (water)
    start: number; end: number;           // into the original string
    value?: string;                       // the resolver's answer, only on tags that resolve
    attrs: Record<string, Node | string>; // roles bound by `as`: a Node for a tag atom, the text for a regex atom
    also?: string[];                      // tags of twins folded into this node, in selection order
    children: Node[];                     // by containment, in text order, water included
  };
  type Fold = (node: Node) => boolean;
  ```

  A tree survives `JSON.stringify` as data (a node bound in `attrs` is also somewhere in `children`, so a consumer that serialises it gets that node twice, not a cycle). A **leaf** is a node with no children: a root row's node with nothing inside it, or a `text` node.

- **FR-002 · `dom-returns-a-tree`**: `dom(text, chart, conf)` MUST return the root: a node with tag `doc` and span `(0, n)`, `n` the original length. It reads the chart's rows, never runs `find` itself, and throws when the chart holds a row whose tag the conf does not declare (other than `^` and `$`). `^` and `$` never become nodes; they exist for the fate rules' edge test.

- **FR-003 · `hidden-and-gist`**: `hidden(doc, fold)` MUST return the set of every node the condensed view drops, with the four fate rules of `fold-hides-subtree` to `bracket-empties-out` applied: every folded node and all its descendants, every connector and separator leaf the fates drop, every emptied bracket and all its descendants. `gist(doc, fold)` MUST return the text of every leaf not in that set, joined in order. The policy is asked about every node except `doc`.

  *Worked example.* On the tree of `fold-hides-subtree`'s first example, folding `ref`: `hidden` holds the `ref` node, its three leaves and the separator leaf `" "` at `(4,5)`; `gist` is `Nota - fine`.

- **FR-004 · `reserved-doc-and-text`**: `compile` MUST report `doc` and `text` declared as tags the way it reports `^`, `$`, `*`: "is reserved and cannot be declared as a tag", the tag left out. Unlike `^`, `$`, `*`, they are not usable in atoms: an atom naming `doc` or `text` is an unknown tag, since the chart never holds them.

- **FR-005 · `fate-bracket-accepted`**: `compile` MUST accept `fate: 'bracket'` besides `'separator'` and `'connector'`, and report any other value as "must be \"separator\", \"connector\" or \"bracket\"". `find` still never reads `fate`. A bracket is an ordinary root tag, for example `"paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }`.

### Selection

These are the rules of section 5.2 of the brief, in the order they apply. Input: every row of the chart except `^` and `$`. Output: a set of chosen rows, no two crossing, plus the `also` of each. Two rows **cross** when `rel` of one to the other is `overlaps` or `overlapped-by`. A row is **inside** another when `rel` is `starts`, `during` or `finishes`: the brief's "during" is read in this containment sense (see Assumptions). Two rows are **twins** when `rel` is `equals`.

- **FR-006 · `select-order`** (rule: *Order*): Candidates MUST be walked in this order: every non-`weak` row before every `weak` row (a weak row fills only what is left); within each tier, the longer span first, then the tag whose key comes earlier in `conf.tags`, then the earlier start. This is the only place key order is read.

  *Worked example.* Key order decides a tie: `{ "ab": { "rx": "/a b/u" }, "bc": { "rx": "/b c/u" } }` on `a b c`. `ab (0,3)` and `bc (2,5)` are both three long and cross; `ab` comes first in the keys, is chosen, and `bc` is dropped. Tree: `doc (0,5)` › `ab (0,3) "a b"`, `text (3,5) " c"`. With the keys swapped, `bc` wins: `text (0,2) "a "`, `bc (2,5) "b c"`.
  Weak waits: `{ "cde": { "rx": "/c d e/u", "weak": true }, "bc": { "rx": "/b c/u" } }` on `a b c d e`. `cde (4,9)` is longer and first in the keys, but weak, so `bc (2,5)` is walked first and chosen, and `cde` crosses it and is dropped. Tree: `text (0,2) "a "`, `bc (2,5)`, `text (5,9) " d e"`. Without `weak`, `cde` wins and `bc` is dropped.
  Start breaks the last tie: `{ "pair": { "rx": "/[a-z] [a-z]/u" } }` on `a b c`: `pair (0,3)` is chosen, `pair (2,5)` crosses it and is dropped.

- **FR-007 · `crossing-loser-dropped`** (rule: *Take or drop*, first clause): A candidate that crosses a chosen row MUST be dropped. It becomes no node and binds no role.

  *Worked example.* `{ "ab": { "rx": "/a b/u" }, "bcd": { "rx": "/b c d/u" } }` on `a b c d`: `bcd (2,7)` is longer, walked first, chosen; `ab (0,3)` crosses it and is dropped. Tree: `text (0,2) "a "`, `bcd (2,7) "b c d"`.

- **FR-008 · `outer-wins-same-tag`** (rule: *Take or drop*, second clause): A candidate inside a chosen row of the same tag MUST be dropped: the outer wins. This removes the same-tag suffix matches a root scan makes, and the partial rows of a self-growing search that no forced derivation took. A row inside a chosen row of another tag is not dropped by this clause; it becomes a child.

  *Worked example.* `{ "num": { "rx": "/\\d+(?:\\.\\d+)?/u" } }` on `1.5`: the chart has `num (0,3)` and `num (2,3)` (the scan resumes after `1` and finds `5`); `(2,3)` finishes `(0,3)`, same tag, so it is dropped. Tree: `num (0,3) "1.5"`, a leaf. Add `"digit": { "rx": "/\\d/u" }` after `num`: `digit (0,1)` and `digit (2,3)` are inside `num` but of another tag, so they are chosen: `num (0,3)` › `digit (0,1) "1"`, `text (1,2) "."`, `digit (2,3) "5"`.
  Separators: `{ "sep": { "rx": "/[ -]+/u" } }` on `a - b` gives `sep (1,4) " - "`, `(2,4) "- "`, `(3,4) " "`; only `(1,4)` is chosen. Tree: `text (0,1) "a"`, `sep (1,4) " - "`, `text (4,5) "b"`.

- **FR-009 · `twins-become-also`** (rule: *Take or drop*, third clause): A candidate equal to a chosen row MUST NOT become a node; its tag is appended to the chosen row's `also`, in walk order. A forced row (see `forced-derivation-chosen`) equal to a chosen row of another tag is a twin the same way. A node has `also` only when it has twins.

  *Worked example.* `{ "code": { "rx": "/[A-Z]\\d{3}/u" }, "ref": { "rx": "/[A-Z]\\d+/u" } }` on `A123`: `code (0,4)` and `ref (0,4)`. Tree: `code (0,4) "A123" also=[ref]`. With the keys swapped: `ref (0,4) also=[code]`.

- **FR-010 · `otherwise-chosen`** (rule: *Take or drop*, last clause): A candidate that is not dropped and is not a twin MUST be chosen.

  *Worked example.* In `outer-wins-same-tag`'s second example, `digit (0,1)` crosses nothing, has no same-tag row around it and no twin, so it is chosen.

- **FR-011 · `forced-derivation-chosen`** (rule: *Forcing*): When a composed row is chosen, its derivation MUST be re-run at once, and every row that derivation took, the `from` row included, is chosen immediately, ahead of the walk, without the walk's tests. The re-run is the matcher of `find` (reused, not re-implemented) restricted to the chart's rows that lie inside the composed row's span (`^` and `$` among them when they do), enumerated in `find`'s order: the tag's searches in their order, the `from` rows in position order, and for each the depth-first enumeration of `find` (an optional atom tried skipped first, then taken; candidate rows in position order). The derivation kept is the first that spans exactly the composed row and, if the tag resolves, that its resolver accepts. A forced row that is itself composed is forced the same way, recursively. `^` and `$` taken by a derivation are not chosen. A derivation always exists: `find` accepted the row against the same chart. Forced rows may make later candidates inside the span cross and drop; that is intended.

  *Worked example (recursion).* `{ "outer": { "search": [{ "from": "inner", "forward": [{ "tag": "sp" }, { "tag": "n" }] }] }, "inner": { "search": [{ "from": "w", "forward": [{ "tag": "sp" }, { "tag": "n" }] }] }, "w": { "rx": "/[a-z]+/u" }, "n": { "rx": "/\\d+/u" }, "sp": { "rx": "/ /u" } }` on `ab 1 2`. `outer (0,6)` is walked first and chosen; its derivation took `inner (0,4)`, `sp (4,5)`, `n (5,6)`, all forced; `inner` is composed, so its derivation's `w (0,2)`, `sp (2,3)`, `n (3,4)` are forced too. Tree:

  ```
  doc (0,6)
    outer (0,6) "ab 1 2"
      inner (0,4) "ab 1"
        w (0,2) "ab"
        sp (2,3) " "
        n (3,4) "1"
      sp (4,5) " "
      n (5,6) "2"
  ```

  The walk on one chart that has everything is written out under `the-walk` below.

- **FR-012 · `selection-is-deterministic`**: Selection MUST depend on the chart, the conf and the key order of `conf.tags` only. The same `(text, chart, conf)` gives a deep-equal tree every time.

#### The walk, step by step (`the-walk`)

One small chart with a crossing, a twin, a same-tag nested row, a weak row and a forced derivation.

Tags, in key order:

```json
{
  "weight": { "search": [{ "from": "num", "forward": [{ "tag": "sp" }, { "tag": "unit", "as": "unit" }] }] },
  "code":   { "rx": "/[a-z]+ \\d/u" },
  "num":    { "rx": "/\\d+(?:\\.\\d+)?/u" },
  "amount": { "rx": "/\\d+\\.\\d+/u" },
  "unit":   { "rx": "/kg|g/u" },
  "phrase": { "rx": "/[a-z]+ [a-z]+/u", "weak": true },
  "sp":     { "rx": "/ /u" }
}
```

Text `ab 1.5 kg okay` (length 14). The chart `find` gives:

```json
{ "$": [[14,14]], "^": [[0,0]], "amount": [[3,6]], "code": [[0,4]], "num": [[3,6],[5,6]],
  "phrase": [[7,14]], "sp": [[2,3],[6,7],[9,10]], "unit": [[7,9]], "weight": [[3,9],[5,9]] }
```

`num (5,6)` is the scan's suffix match `5`; `weight (5,9)` is built from it. `code` matches `ab 1` only (`b 1` starts inside a word). `unit` matches `kg` only (`g` starts inside `kg`). `phrase` matches `kg okay`.

Walk order (`select-order`): non-weak first, longest first, then key, then start:

| # | row | length | tier |
|---|---|---|---|
| 1 | `weight (3,9)` `1.5 kg` | 6 | non-weak |
| 2 | `weight (5,9)` `5 kg` | 4 | non-weak, key 0 |
| 3 | `code (0,4)` `ab 1` | 4 | non-weak, key 1 |
| 4 | `num (3,6)` `1.5` | 3 | key 2 |
| 5 | `amount (3,6)` `1.5` | 3 | key 3 |
| 6 | `unit (7,9)` `kg` | 2 | |
| 7 | `num (5,6)` `5` | 1 | key 2 |
| 8–10 | `sp (2,3)`, `sp (6,7)`, `sp (9,10)` | 1 | key 6, by start |
| 11 | `phrase (7,14)` `kg okay` | 7 | weak |

Steps:

1. `weight (3,9)`: nothing chosen yet; chosen. It is composed, so forcing re-runs `weight`'s search inside `(3,9)`: the `from` rows inside are `num (3,6)` and `num (5,6)`, in position order. From `num (3,6)`: `sp (6,7)` starts at 6, `unit (7,9)` starts at 7; the derivation spans `(3,9)` exactly, and `weight` does not resolve, so it is kept. Forced, ahead of the walk: `num (3,6)`, `sp (6,7)`, `unit (7,9)`. Role `unit` is bound to `unit (7,9)`.
2. `weight (5,9)`: crosses the forced `num (3,6)` (`overlapped-by`): dropped (`crossing-loser-dropped`). It is also inside `weight (3,9)` with the same tag; crossing is tested first.
3. `code (0,4)`: crosses `weight (3,9)`: dropped. Without forcing and without `weight`, `code` would have been chosen.
4. `num (3,6)`: already chosen by forcing; nothing to do.
5. `amount (3,6)`: equals the chosen `num (3,6)`: a twin, `num`'s `also` becomes `["amount"]` (`twins-become-also`).
6. `unit (7,9)`: already chosen.
7. `num (5,6)`: crosses nothing chosen, but is inside `num (3,6)`, same tag: dropped (`outer-wins-same-tag`).
8. `sp (2,3)`: chosen. 9. `sp (6,7)`: already chosen. 10. `sp (9,10)`: chosen.
11. `phrase (7,14)`: seven long, longer than `weight`, but weak, so walked last; it crosses `weight (3,9)`: dropped. Without `weak` it would have been walked first and chosen, and `weight` would have been the one to drop.

Tree (`tree-by-containment`), with roles (`roles-from-forced-derivation`):

```
doc (0,14)
  text (0,2) "ab"
  sp (2,3) " "
  weight (3,9) "1.5 kg" attrs={ unit: → unit (7,9) }
    num (3,6) "1.5" also=[amount]
    sp (6,7) " "
    unit (7,9) "kg"
  sp (9,10) " "
  text (10,14) "okay"
```

Leaves: `ab`, ` `, `1.5`, ` `, `kg`, ` `, `okay`: they join to the text (`leaves-partition-text`).

### Tree, roles, values

- **FR-013 · `tree-by-containment`** (rule: *Tree*): The chosen rows MUST be sorted by start ascending, then end descending, and nested with a stack: each row is a child of the nearest open row that contains it. Every non-empty gap between a node's children, and before the first child and after the last, becomes a `text` node (water) with no attrs and no children. A node with no chosen row inside it has no children at all (it is a leaf; its own text is not repeated as water).

  *Worked example.* See `the-walk`: `weight (3,9)` holds `num`, `sp`, `unit` with no gap between them, so no water inside it; `doc` holds water `ab` before the first `sp` and `okay` after the last.

- **FR-014 · `leaves-partition-text`**: For every text and chart, the leaves of `dom`'s tree in document order MUST partition the text: each leaf starts where the previous one ended, the first at 0, the last ends at `n`, and joining their text gives the text back. No two nodes cross; every child lies inside its parent. These are the tree invariants of the constitution's Data Contracts, tested over every case of both corpora and every worked example.

  *Worked example.* `the-walk`'s leaves: `(0,2)`, `(2,3)`, `(3,6)`, `(6,7)`, `(7,9)`, `(9,10)`, `(10,14)`.

- **FR-015 · `roles-from-forced-derivation`** (rule: *Roles*): For each composed node, `attrs[as]` MUST be taken from its forced derivation: for a tag atom, the node of the row that atom took (a child, or a deeper node when another chosen row wraps it; a twin's row binds the node that stands for it); for a regex atom, the text the regex matched. An atom without `as` binds nothing; its row is still a node. Root nodes and water have empty `attrs`.

  *Worked example.* Tag atom: in `the-walk`, `weight.attrs.unit` is the `unit (7,9)` node itself (the same object as `weight.children[2]`). Regex atom: `{ "price": { "search": [{ "from": "n", "back": [{ "rx": "/€ ?/u", "as": "currency" }] }] }, "n": { "rx": "/\\d+/u" } }` on `€ 5`: tree `price (0,3) "€ 5" attrs={ currency: "€ " }` › `text (0,2) "€ "`, `n (2,3) "5"`. The regex's text is a role, not a node; it shows as water.

- **FR-016 · `values-bottom-up`** (rule: *Values*): Values MUST be computed bottom-up, and only on nodes whose tag has `resolve`. A root tag's resolver gets `{ value: own text }`; a composed tag's gets `{ value: own text, [as]: ... }` for each role: the bound node's `value` if it has one, else that node's text, or the regex atom's text. Resolvers already accepted these rows in `find`, so no refusal is expected; if one refuses (a non-deterministic resolver), it is a bug in the resolver and `dom` throws an `Error` whose message names the tag and the span, e.g. `resolver of "weight" refused (0,4) at dom time`.

  *Worked example.* `{ "weight": { "resolve": "metric", "search": [{ "from": "n", "forward": [{ "tag": "sp" }, { "tag": "unit", "as": "unit" }] }] }, "unit": { "rx": "/kg|g/u", "resolve": "canon" }, "n": { "rx": "/\\d+/u" }, "sp": { "rx": "/ /u" } }` with `canon = (p) => ({ kg: 'kilogram', g: 'gram' })[p.value] ?? null` and `metric = (p) => p.unit === 'kilogram' ? `${parseInt(p.value) * 1000} g` : null`, on `5 kg`:

  ```
  weight (0,4) "5 kg" value="5000 g" attrs={ unit: → unit (2,4) }
    n (0,1) "5"
    sp (1,2) " "
    unit (2,4) "kg" value="kilogram"
  ```

  `unit` is valued first; `metric` receives `{ value: '5 kg', unit: 'kilogram' }`. `n` has no resolver, so no `value`. A refusal: `{ "n": { "rx": "/\\d+/u", "resolve": "once" } }` with a resolver that returns `p.value` on its first call ever and `null` after, on `7`: `find` gives `n (0,1)`; `dom` throws, naming `n` and `(0,1)`.

- **FR-017 · `resolvers-see-normalised-text`** (rule: *Text seen by resolvers*): Resolvers MUST see the normalised copy's text, as in `find`; node spans are into the original.

  *Worked example.* `{ "word": { "rx": "/[a-z]+ [a-z]+/u", "resolve": "echo" } }` with `echo = (p) => p.value`, on `ab   cd` (three spaces): `word (0,7) "ab   cd" value="ab cd"`.

### Fates and fold

The rules of section 5.4 of the brief, restated on the tree. They apply in this order: the fold (`fold-hides-subtree`), the connector fate, emptying (`bracket-empties-out`), then the separator fate; each later rule sees what the earlier ones hid, and only decides about leaves not already hidden. A **separator** is a leaf whose tag has `fate: 'separator'`; a **connector** a leaf whose tag has `fate: 'connector'`; a **bracket** a node whose tag has `fate: 'bracket'`. Water is never a separator.

The examples share one toy conf, `T`, in this key order:

```json
{
  "ref":   { "search": [{ "from": "num", "back": [{ "tag": "sep", "optional": true }, { "tag": "lbl", "as": "label" }] }] },
  "num":   { "rx": "/#\\d+/u" },
  "lbl":   { "rx": "/ref|n\\./iu" },
  "paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" },
  "conn":  { "rx": "/del|sul|per\\s+il/iu", "fate": "connector" },
  "sep":   { "rx": "/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u", "fate": "separator" }
}
```

`sep` is the Italian conf's separator pattern: whitespace, `,` `;` `:` before whitespace or the end, `-` with whitespace on both sides. A fold "by tag" below means `fold = (node) => tags.includes(node.tag)`.

- **FR-018 · `fold-hides-subtree`** (rule 1): A node MUST fold when the policy says so, or when an ancestor folds. Every leaf under a folded node is hidden.

  *Worked example, folding a composed node.* `Nota ref #12 - fine` under `T`:

  ```
  doc (0,19)
    text (0,4) "Nota"
    sep (4,5) " "
    ref (5,12) "ref #12" attrs={ label: → lbl (5,8) }
      lbl (5,8) "ref"
      sep (8,9) " "
      num (9,12) "#12"
    sep (12,15) " - "
    text (15,19) "fine"
  ```

  Fold `ref`: the node and its three leaves are hidden; the separator fate then keeps only ` - ` of the run between `Nota` and `fine`. Gist: `Nota - fine`.

  *Worked example, folding only a child inside a composed node.* Same tree, fold `num`: only `#12` is hidden; `ref` does not fold, so its label stays. The run between `ref` and `fine` is ` ` (inside `ref`), the hidden `#12`, ` - `; the strongest survives. Gist: `Nota ref - fine`. Folding nothing gives the text back.

- **FR-019 · `connector-follows-its-right`** (rule 2, *Connector fate*): A connector leaf MUST be hidden when the next leaf to its right that is not a separator is hidden. Otherwise it stays. Connectors are decided right to left, so a connector followed by a hidden connector is hidden too. A connector with no leaf to its right but separators stays.

  *Worked example.* `Nota del ref #12 - fine` under `T`. Leaves: `Nota`, ` `, `del` (conn), ` `, `ref`, ` `, `#12`, ` - `, `fine`. Fold `ref`: the next non-separator leaf after `del` is `ref`, hidden, so `del` goes: `Nota - fine`. Fold `num`: that leaf is `ref`, not hidden, so `del` stays: `Nota del ref - fine`. `Nota del giorno` under any fold: `giorno` is water and never folds by tag, so `del` stays: `Nota del giorno`.
  A kept connector is a non-separator leaf and bounds separator runs: `A - #1 - B del ref #2 - C`, fold `num`: `#1` and `#2` go, `del` stays (its right is `ref`), the single space between `B` and `del` is untouched. Gist: `A - B del ref - C`.

- **FR-020 · `separators-untouched-without-a-fold`** (rule 3, first half): Over the leaf sequence, a **run** is the leaves between two surviving non-separator leaves (or between one and an edge of the text): separators and hidden leaves only. The separators of a run with no hidden leaf in it MUST all survive untouched, at an edge too.

  *Worked example.* ` Nota, ref #12 ` under `T`, fold nothing: every run is hidden-free, so the leading and trailing spaces and `, ` survive. Gist: ` Nota, ref #12 `. In general, folding nothing gives the text back.

- **FR-021 · `strongest-separator-survives`** (rule 3, second half): In a run that has a hidden leaf, only the strongest separator MUST survive: `-` > `;` > `:` > `,` > space, read off each separator's text (the strength of the strongest of those characters it contains, space if none). On a tie the leftmost wins. The others are hidden.

  *Worked example.* `Nota, #12 - fine`, fold `num`: run `, `, `#12`, ` - `; ` - ` wins: `Nota - fine`. `a; #1, b`, fold `num`: `; ` beats `, `: `a; b`. `a #1 b`, fold `num`: two spaces tie, the left one stays: `a b`.

- **FR-022 · `no-separator-at-an-edge`** (rule 3, exceptions): In a run that has a hidden leaf, no separator MUST survive when the run is at an edge of the text (nothing surviving before it, back to `^`, or after it, up to `$`); when the surviving leaf before it ends right after the opening character of a bracket node that is not hidden (its inner edge); or when the surviving leaf after it begins with closing punctuation (`.` `,` `;` `:` `!` `?` or a closing bracket `)` `]` `}`).

  *Worked example.* Under `T`, fold `num` in each: `#12 - fine` → `fine` (edge, `^`). `Nota - #12` → `Nota` (edge, `$`). `Nota (#12 fine)`: the bracket's leaves are `(`, `#12`, ` `, `fine)`; the run ` ` after `(` is at the bracket's inner edge → `Nota (fine)`. `Nota #12.` → `Nota.` (before `.`). `Nota (fine #12)`: the bracket's leaves are `(fine`, ` `, `#12`, `)`; the run before `)` → `Nota (fine)`.

- **FR-023 · `bracket-empties-out`** (rule 4, *Emptying*): A bracket node MUST be hidden, with all its descendants, when every non-separator leaf inside it is hidden, not counting its own delimiters: its first character, when a water leaf is exactly that character, and its last character likewise (see Assumptions). Brackets are decided innermost first.

  *Worked example.* `Fornitura toner (ref #12) - saldo` under `T`. Leaves: `Fornitura`, ` `, `toner`, ` `, `(`, `ref`, ` `, `#12`, `)`, ` - `, `saldo`. Fold `ref`: inside the bracket, `ref` and `#12` are hidden and `(` and `)` are its delimiters, so the bracket is hidden; the run ` `, bracket, ` - ` keeps ` - `: `Fornitura toner - saldo`. Fold `num`: `ref` survives, so the bracket stays and its inner-edge rule drops the space before `)`: `Fornitura toner (ref) - saldo`. `Fornitura toner (ref #12 urgente) - saldo`, fold `ref`: `urgente)` is water that holds more than the delimiter, and it survives, so the bracket stays: `Fornitura toner (urgente) - saldo`.

### The cases, the corpus, the regression

- **FR-024 · `cases-carry-fold-and-gist`**: A case in `cases/*.json` MUST accept two optional fields: `fold`, a list of tag names (the fold is `node => fold.includes(node.tag)`), and `gist`, the expected condensed text. A case with one MUST have both. Every case below gets them, as listed in `reinstated-gists`.

- **FR-025 · `gist-regression`**: A test MUST assert, for every case of both corpora that has a `gist`, `gist(dom(text, find(text, conf), conf), fold) === case.gist`; and, for every case, that folding nothing gives the text back and that the leaves partition the text.

- **FR-026 · `confs-for-the-fold`**: The two domain confs MUST gain what the fold needs, and their `version` changes since their charts do:
  - `confs/it-pa.json` becomes `it-pa@4` and gains, as its last tag, `"paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }`.
  - `confs/common.json` becomes `common@2` and gains the pattern `"SEP"` (the Italian one, verbatim) and, as its last tags, `"paren"` as above and `"sep": { "rx": "/%{SEP}/u", "fate": "separator" }`. Without separators, a fold in the common conf leaves doubled spaces, and the old engine's common gists (whose separators were built in) cannot be met.

  The phase 1 assertions (`italian-cases-tagged`, `common-conf`) are unaffected: they assert other tags.

- **FR-027 · `reinstated-gists`**: Every case gets the `fold` and `gist` below. The old engine kept no gist in its case files; it kept them in two places, both reinstated here: the assertions of `test/read.test.ts` and `test/common.test.ts` on `004-connectors` that name a corpus case (source *test*), and, for every other case, the fold the old playground opened each domain with (`playground/main.ts`, the same on `main` and `004-connectors`), with the gist the old engine gives under it (source *playground*; run on `004-connectors`, the eight Italian cases of `main` being its first eight). Old fold names are translated to new tags (`fold-translation`). Each gist below is derived by hand from the rules of this spec and the real phase 1 charts, and is **not yet run** against `dom`.

  Italian (`cases/it-pa.json`). The playground fold, `P-it`, is `["dated", "protocol", "cig", "cup", "chapter", "quotation"]`.

  | case | fold | gist | source |
  |---|---|---|---|
  | PEC, channel with a dash | `P-it` | `Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - Trasmissione cronoprogramma procedurale` | playground |
  | PEC, channel with a colon | `P-it` | `Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa` | playground |
  | Riscontro | `P-it` | `Istanza di accesso agli atti ai sensi degli artt. 22 e ss. della L. 241/1990` | playground |
  | Gateway, two registers in capitals | `P-it` | `RICHIESTA DI EROGAZIONE DEL SALDO - COMUNE DI ALGHERO` | playground |
  | Ledger tail | `P-it` | `Liquidazione fattura n. 45/2026 della ditta Sardatec S.r.l. - € 12.450,00` | playground |
  | Brackets | `P-it` | `Fornitura di toner per le stampanti degli uffici - saldo` | playground |
  | Integration chain, nested quotations | `P-it` | `Integrazione del provvedimento` | playground |
  | Short prose | `P-it` | `Trasmissione prospetto quote associative 2026` | playground |
  | Connector, a provvedimento | `["provvedimento"]` | `Annullamento - Richiesta di chiarimenti` | test |
  | Connector, a chapter | `["chapter"]` | `impegno di spesa assunto - Autoscuola` | test |
  | Connectors, a chain | `["chapter", "cdr"]` | `trasferimento impegno a valere` | test |
  | Connector, no mention follows | `P-it` | `Richiesta del Comune di Ghilarza` | test (it folded every mention; there are none) |
  | Connector, elided | `["provvedimento"]` | `Integrazione - Richiesta` | test |

  Common (`cases/common.json`). The playground fold, `P-co`, is `["reply-chain", "url", "email", "phone", "ip", "ticket", "handle", "hashtag"]`.

  | case | fold | gist | source |
  |---|---|---|---|
  | Reply chain, invoice | `["reply-chain", "ticket"]` | `Invoice for $1,250.00 due 2026-10-15` | test |
  | CI alert | `P-co` | `[CI] deploy of v2.4.1 to failed, logs at.` | playground |
  | Contacts | `P-co` | `Call Dana on or email about the 15% discount` | playground, **differs** |
  | Standup | `P-co` | `Standup: blocked (waiting on), ETA 2026-10-02 14:30` | playground |
  | Prices, two formats | `P-co` | `Price drop: €89,90 → 74,90 EUR (-17%) until 2026-12-31` | playground |
  | Quoted reply, read again inside | `P-co` | `On 2026-09-30 Dana wrote: see, fixed in release 2.4.2 by` | playground |
  | Look-alikes | `P-co` | `Build 1.2.3 on 999.10.10.10, not a date 2026-13-45, not a phone +12 34` | playground |
  | Short prose | `P-co` | `Lunch is on the terrace today` | playground |

  In the JSON the fold is written out, not as `P-it`/`P-co`.

  How three of them come out, for the implementer checking the rules against the corpus:
  - *Gateway*: `dated (41,91)` is walked first and forces `protocol (41,76)` (the channel search), which forces `channel (41,58)`, `sep ": "` and the inner `protocol (60,76)`, which forces `prot-word`, `num-word`, `serial` and their separators. The weak `caps "POSTA CERTIFICATA"` equals the forced `channel`: a twin, `channel.also = ["caps"]`. The forced `serial (69,76)` gets `also = ["id-number", "number"]`. The other `dated` crosses the chosen one and drops.
  - *Integration chain*: the outer `quotation` (to the end) is chosen first; the inner one lies inside it with the same tag and drops (`outer-wins-same-tag`), so `caps` and `cig` are grandchildren of the outer quotation through no inner node. Folding `quotation` hides it all.
  - *Brackets*: `paren (49,65)` holds `(`, the `cig` node, `)`; folding `cig` empties it (`bracket-empties-out`), and the run ` `, bracket, ` - ` keeps ` - `.

- **FR-028 · `fold-translation`**: Old fold names MUST be translated to new tags as follows; every other name is the same tag in both.

  | old (entity) | new (tags) | why |
  |---|---|---|
  | `protocol` (channel, label, value, date as one mention) | `dated`, `protocol` | the date is a composition over the protocol now, and the channel a protocol grown from a protocol |
  | `reply` (one mention per `Re:`/`Fwd:`) | `reply-chain` | the chain is one composed row now |

#### Differences from the old engine

One line per case whose gist is expected to differ from what the old engine gives under the same (translated) fold, and why:

- **Contacts**: old `Call Dana on or about the 15% discount`, new `Call Dana on or email about the 15% discount`. The old `email` recipe took a left label (`email `, `mailto:`) that folded with the address; phase 1's common conf ported `email` as a root tag with no label search, so the word `email` is water and stays.

No other gist is expected to differ. Differences in the tree that leave the gist equal, for the record:

- **Integration chain**: the old engine nested the inner quotation inside the outer; selection drops it (`outer-wins-same-tag`). Folding the outer hides the same text.
- **PEC ×2, Riscontro, Gateway**: a protocol with its channel is a `protocol` node holding the bare `protocol` node (forcing), inside a `dated` node; the old engine had one flat mention with four parts.
- **Gateway**: `channel` and `caps` on `POSTA CERTIFICATA` are twins (`also`); `serial`, `id-number`, `number` on `0031002` likewise. The old engine had no twins, only the winner.
- **Reply chain**: one `reply-chain` node instead of two `reply` mentions; the fold is renamed (`fold-translation`).

### Playground and fewrd-play

- **FR-029 · `playground-tree`**: Under the chart of the case on screen, the playground MUST list the tree as an indented list: one line per node except `doc`, indented by depth, showing its tag, its `(start, end)`, its `also` when present and its `value` when present, and the node's text. Water lines are shown, dimmed. The tree is rebuilt whenever the chart is (every conf edit).

- **FR-030 · `playground-fold-panel`**: The playground MUST show a fold panel: one checkbox per tag of the current conf, in key order. The checked tags are the fold (`node => checked.has(node.tag)`). Under the panel it prints the gist; on the character grid, the characters of every hidden leaf are greyed out. A change to a box redraws the gist and the greying at once. When a case is shown, its boxes start as its `fold` (none if it has none); a box changed by hand is kept for that case until the case changes. Everything else of the phase 1 playground stays as it is.

- **FR-031 · `playground-mount`**: `mount(el, { confs, cases })` MUST keep its phase 1 signature; a case gains the optional `fold` and `gist` of `cases-carry-fold-and-gist`. `pnpm dev` still opens both domains' cases.

- **FR-032 · `fewrd-play-folder`**: `fewrd-play` MUST read the new folder shape:

  ```
  path/to/folder/
    conf.json          the conf, as data
    cases.json         [{ "name": "refund", "text": "Refund approved - SKU: abc-1234", "fold": ["sku"], "gist": "Refund approved" }]
    cases.local.json   more cases, e.g. real texts kept out of git (optional)
    resolvers.ts       export const resolvers = { … }, or a default export (optional; resolvers.js served as is)
  ```

  `fold` and `gist` are optional; a case's `conf` field is optional and, when absent, is the folder's one conf. The page calls the new `mount` with `confs: { <folder name>: { conf, resolvers } }` and the cases. `fewrd-play` without a `conf.json` exits with an error and its usage. The server still serves only the folder's `.json`, `.ts` and `.js` files and binds to 127.0.0.1; it writes nothing, since the new `mount` has no save hook (see Assumptions). Same rules as constitution principle I: no `dependencies`, a peer dependency on `fewrd`. `play/package.json` keeps its version; it is not published in this phase. Its README describes the new folder.

### Documents and package

- **FR-033 · `normalise-per-utf16-unit`**: `src/normalise.ts`'s boundary map MUST have one entry per UTF-16 unit of the normalised copy (`text.length + 1` entries, as its comment already claims), both units of a surrogate pair mapping to the original start of their code point, and `find` MUST drop its conversion from code points to units.

  *Worked example.* `normalise('😀 a')`: copy `😀 a`, length 4; `at` is `[0, 0, 2, 3, 4]`. `find` with `{ "w": { "rx": "/[a-z]/u" } }` on `😀  a` (two spaces, length 5) gives `w: [[4,5]]`, as before the fix.

- **FR-034 · `readme-complete`**: The README MUST gain, after the finding half's sections, The tree (the `Node` type, water, leaves), Selection (the rules of `select-order` to `forced-derivation-chosen` in the finding rules' voice), The rules of the fold (`fold-hides-subtree` to `bracket-empties-out`), and Rendering it yourself (walking the tree to HTML with `hidden`, in a few lines of the consumer's code); its Why, Quick start, Playground and Develop sections updated for the DOM half and fewrd-play; badges honest (test count, size).

- **FR-035 · `constitution-wording`**: The constitution (amended to 3.1.0 with this spec) MUST agree with the code when the phase is done: principle II's rule-set names match the README's section names, and the Data Contracts' tree invariants are the ones `leaves-partition-text` tests. A disagreement is fixed in the constitution with a PATCH bump.

- **FR-036 · `changelog-entry`**: `CHANGELOG.md` MUST gain an entry for phase 2: what is new (`dom`, `hidden`, `gist`, `Node`, `Fold`, `fate: 'bracket'`, the reserved `doc` and `text`, the tree and fold panel, fewrd-play on the new folder), what changed (`normalise`'s map, the two confs' versions), and that the version is unchanged until release.

- **FR-037 · `zero-dependencies`**: The feature MUST add no dependency, runtime or dev, to either package.

### Key Entities

- **Node**: one chosen row (or the root, or a stretch of water), with its span, value, roles, twins and children.
- **Water**: the text between chosen rows, as `text` nodes; never folded by tag, never a separator.
- **Leaf**: a node with no children; the leaves partition the text.
- **Fold**: a policy, a function from node to boolean; in cases, a list of tags.
- **Twin**: a row with exactly a chosen row's span; it becomes a name in that node's `also`.
- **Forced derivation**: the derivation of a chosen composed row, re-run inside its span; it chooses its rows and binds its roles.
- **Gist**: the text of the leaves that survive the fold and the fates.

The vocabulary is the constitution's closed set (principle V), with node, water, select and derive, which phase 2 adds. "Leaf", "twin", "crossing", "forced", "run" and "gist" are the brief's words for things the rules describe, not new concepts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the worked examples in this spec have been run against the implementation and agree with it, each corrected here where it did not.
- **SC-002**: 21 of 21 cases carry a `fold` and a `gist`, and the regression passes on all 21; the one listed difference is the only gist that differs from the old engine's.
- **SC-003**: On every case of both corpora and every worked example, the leaves partition the text, no two nodes cross, and folding nothing gives the text back.
- **SC-004**: `dom` on the same inputs gives a deep-equal tree every time, and the same tree whatever order the chart's JSON lists its tags in.
- **SC-005**: In the playground, ticking a fold box updates the gist and the greying with no perceptible delay.
- **SC-006**: Neither `package.json` gains a dependency.

## Assumptions

- **"During" means inside.** The brief's same-tag rule says *during*; its two stated purposes (a root scan's suffix matches, a self-growing search's partial rows) are Allen `finishes` and `starts`, not `during`. So the rule reads "inside": `starts`, `during` or `finishes`.
- **Forced rows skip the walk's tests.** "Chosen immediately, ahead of the walk" is read as: a forced row is not tested for crossing, same-tag containment or twins, except that a forced row equal to a chosen row of another tag becomes its twin (there cannot be two nodes on one span).
- **Rule order in the fold.** The brief lists the separator fate before emptying, but a run cannot be judged before brackets are decided (an emptied bracket is part of a run). The order is fold, connectors, emptying, separators, as in the old engine.
- **Runs at the edge with nothing hidden are untouched.** The brief's first clause speaks of separators "between two surviving non-separator leaves"; read strictly, a leading space with nothing folded would be dropped and folding nothing would not give the text back. The old engine kept it; so does this spec.
- **A bracket's delimiters are its first and last characters.** A bracket is a root row that includes its delimiters, and the text around its content is water, so without this reading the water `(` and `)` would never be hidden and no bracket would ever empty. When content abuts a delimiter, the water leaf holds more than the delimiter (`(see`), and then it counts: that text is visible.
- **The inner edge of a bracket** is right after its opening character; the closing side is covered by "before closing punctuation".
- **Strength and ties.** A separator's strength is that of the strongest of `-` `;` `:` `,` it contains; a tie goes to the leftmost, as in the old engine.
- **The policy is not asked about `doc`.** Folding the root would hide everything; no fold in the cases needs it.
- **fewrd-play writes nothing.** The old server wrote `book.json` back on save through the old `mount`'s `save` option; the new `mount` has none, and the brief adds none. Saving is left out until a phase decides it.
- **Where the brief says "the child Node"** for a role, the node may be deeper when another chosen row wraps the atom's row; it is the node of that row either way.
- **Cases are one fold each.** Old assertions that folded by position (`(m, i) => i === 0`) cannot be written as a list of tags and are not carried; the old assertions on texts that are not corpus cases (fragments of a case, `Liquidazione fattura, CIG Z1234ABCDE.`, the NBSP and en-dash text) are not cases and are not carried either (principle III).
- **Values are recomputed.** `find` drops values after the call (phase 1), so `dom` asks the resolvers again, bottom-up; a resolver is a pure function, which is why a refusal is a bug.

## Open points

Gaps the brief's words leave, found while specifying. Each says what this phase does meanwhile; none is decided here.

- **Forcing versus "outer wins" on a self-growing search.** The brief says the same-tag rule is "what makes a self-growing search's partial rows scaffolding". But forcing chooses "every row that derivation took, the `from` row included", and the longest row of a self-growing search is always derived from a shorter row of its own tag. So the partial rows on the derivation chain become nested nodes (the Italian `protocol` grown from `protocol` shows it: a protocol node inside a protocol node); only those off the chain are scaffolding. This phase follows forcing. The maintainer may want a forced row of the composed row's own tag to be dropped instead, with its children lifted.
- **A forced row that crosses a chosen row.** A composed row chosen late in the walk may contain rows forced earlier by an enclosing composition; its first derivation could take a row crossing one of them, breaking "no two nodes cross". The brief does not say what then. This phase, provisionally: the re-run keeps the first derivation none of whose rows crosses a chosen row; if there is none, the composed row is dropped as a crossing loser. No case of either corpus reaches this.
- **Normalised coordinates for the re-run.** The chart holds original spans, but the matcher and its regex atoms work on the normalised copy. `dom` normalises the text and maps each span back through the inverse of the boundary map; that inverse is ambiguous inside a character NFKC expands into several (all its copy boundaries map to one original offset). This phase maps an original start to the first copy boundary with that offset and an original end to the last; a row edge that `find` placed inside an expansion is not recovered. No case reaches this.
- **Optional labels** (brief 5.8, carried): a tag both root and composed. Two witnesses: Italian codes, common versions. Needs a conf construct, proposed after phase 2.
- **Root scan advancing by one** (brief 5.8, carried, maintainer's call): same-tag suffix matches fill the chart; selection neutralises them (`outer-wins-same-tag`), so the tree is unaffected, the chart's size is not.

## Parked

Decided not to do now, and not to be designed around: `not` on `*`; name globs in tag atoms; a twin-rule table; `glued`; HTML output from fewrd; publishing (`fewrd` and `fewrd-play` both keep their versions).
