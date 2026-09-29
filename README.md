<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/fewrd-logo.svg">
  <img src=".github/fewrd-logo-neg.svg" alt="fewrd" width="380">
</picture>

**Finds what recurs in a string, and lets a reader fold it away.**

[![npm](https://img.shields.io/npm/v/fewrd?style=flat-square&color=78C4B6)](https://www.npmjs.com/package/fewrd)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-78C4B6?style=flat-square)
![core: 6 kB gzip](https://img.shields.io/badge/core-6%20kB%20gzip-78C4B6?style=flat-square)
![types: strict](https://img.shields.io/badge/types-strict-78C4B6?style=flat-square)
![tests: 250 passing](https://img.shields.io/badge/tests-250%20passing-78C4B6?style=flat-square)
[![license: MIT](https://img.shields.io/badge/license-MIT-78C4B6?style=flat-square)](LICENSE)

</div>

---

## Why

Your text is hiding treasure: protocol numbers under five different aliases,
dates wedged between dashes, amounts that only count with a `€` stapled on.
fewrd digs it all out, remembers exactly where each piece lives, every reading
of it, the ones that overlap included, and then lets a reader fold away what
they do not need and read the gist in a few words.

```
text + conf → Chart          find:  every reading, chosen by nobody (cacheable by text + conf.version)
text + Chart + conf → Node   dom:   one reading, as a tree
tree + fold → gist           hidden, gist: what a reader keeps
```

Two halves, and the seam between them is plain data. The **finding half**
makes no choice: `find` returns a chart of every row of every tag, crossing
ones included. The **DOM half** chooses once, deterministically: `dom` selects
rows that do not cross, binds each composition's roles, resolves values and
returns a tree whose leaves cover the text exactly; `hidden` and `gist` apply a
fold and two fate rules to it. fewrd returns plain objects; turning the tree
into HTML is yours to do.

## Install

```bash
npm install fewrd
```

```bash
pnpm add fewrd
```

ESM only, zero dependencies, types included. Runs in current Node and in any
current browser or bundler.

## Quick start

Describe what recurs as a **conf**, in JSON. Root tags match a regex; composed
tags are built by searches that grow outward from the rows of another tag:

```json
{
  "version": "shop@1",
  "patterns": {
    "SKU": "[A-Z]{3}-\\d{4}",
    "SEP": "(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+"
  },
  "tags": {
    "sku": {
      "resolve": "upper",
      "search": [
        { "from": "sku-code", "back": [{ "tag": "sep", "optional": true }, { "tag": "sku-word", "as": "label" }] }
      ]
    },
    "sku-code": { "rx": "/%{SKU}/iu" },
    "sku-word": { "rx": "/sku|code/iu" },
    "sep": { "rx": "/%{SEP}/u", "fate": "separator" }
  }
}
```

Compile it once, then find in any text with it:

```ts
import { compile, find, dom, gist } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { conf, errors } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });

const text = 'Refund approved - SKU: abc-1234 - customer notified';
const chart = find(text, conf);

chart.spans('sku');          // [[18, 31]]   text.slice(18, 31) is 'SKU: abc-1234'
chart.spans('sku-code');     // [[23, 31]]
JSON.stringify(chart);
// {"$":[[51,51]],"^":[[0,0]],"sep":[[6,7],[15,18],[16,18],[17,18],[21,23],[22,23],[31,34],[32,34],[33,34],[42,43]],
//  "sku":[[18,31]],"sku-code":[[23,31]],"sku-word":[[18,21]]}
```

The chart holds spans into your string, nothing else. The `sep` rows overlap
(`" - "`, `"- "` and `" "` all end at 18) because every match is a row. Now
choose one reading, and fold:

```ts
const doc = dom(text, chart, conf);          // a tree: doc › text, sep, text, sep, sku › …
const sku = doc.children.find((n) => n.tag === 'sku')!;
sku.value;                                   // 'SKU: ABC-1234'   the resolver's answer
sku.attrs.label;                             // the sku-word node: the role `as` named

gist(doc, (n) => n.tag === 'sku');           // 'Refund approved - customer notified'
gist(doc, () => false);                      // the text back, untouched
```

The fold hid the whole `sku`, and the dash on the far side of it went with it:
of the two separators the fold left side by side, only one survives.

## The conf

A conf is JSON, so it diffs, reviews and validates like any config.

| key | what it holds |
|---|---|
| `version` | required; keys a cached chart. Change it whenever a change to the conf can change the chart |
| `patterns` | named regex sources, spliced into others as `%{NAME}` |
| `tags` | required; a name → tag map. Its key order is the priority selection uses to break a tie; `find` never reads it |
| `tags.T.rx` | a root tag: a pattern, `"/source/flags"` |
| `tags.T.search` | a composed tag: a list of searches. A tag has exactly one of `rx` and `search` |
| `tags.T.resolve` | the name of a resolver you pass to `compile` |
| `tags.T.weak`, `tags.T.fate` | read only by the DOM half: `weak` rows fill only what is left; `fate` is `"separator"`, `"connector"` or `"bracket"` (see The rules of the fold) |
| `search.from` | the tag whose rows the search starts from |
| `search.back` / `search.forward` | exactly one: the atoms, leftward from the row's start or rightward from its end |
| atom | `{ "tag": "name" }`, `{ "tag": ["a", "b"] }` or `{ "rx": "/…/u" }`, with an optional `"as"` (a role name) and `"optional"` |

**Patterns** are regex literals in a string: `"/source/flags"`, and JSON doubles
the backslashes. `%{NAME}` splices in a named pattern as one unit (an `a|b`
inside never leaks out), and named patterns may use others. `%\{` is a literal
`%{`. Named patterns inside a `[…]` character class aren't supported.

**Reserved names.** `^` is the start of the string, `$` its end, `*` any tag.
Use them in atoms; you cannot declare a tag with one of those names, and
`from` names a declared tag. `doc` and `text` are the tree's own tags (the root
and water): you cannot declare them either, and they are not usable in atoms.
A bracket is an ordinary root tag: `"paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }`.

**Resolvers** are the only code in a conf: a function from `{ value, ...roles }`
to a string, or `null` for "not this tag after all". `value` is the row's own
text; every atom with `as` adds a role, the value of the row it took if that
row's tag has a resolver, its text otherwise. `as` may not be `value`, `^`,
`$` or `*`. Resolvers see the normalised text. Nothing in the JSON is ever
evaluated.

**Alternatives go longest-first.** The scanner offers one match per start
position, and the word guard rejects it without trying a shorter one, so write
`protocollo|prot`, never `prot|protocollo`.

**Errors** come back as `{ path, tag, message }`: an unknown tag in `from` or in
an atom, a tag with both or neither of `rx` and `search`, a search with both or
neither of `back` and `forward`, a bad pattern, an unknown or circular
`%{NAME}`, an unknown resolver, a reserved name declared, a `fate` that is none of the three, a wrong type, an
unknown key (a typo such as `optinal` is an error, not a silent no-op), an
`as` that is reserved, an `optional` outermost atom (the last of `back` or of
`forward`: skipped, it would leave the row ending in glue), and two regex atoms
in a row ("merge them into one pattern"). `compile` never throws. A tag with
any error is left out; every other tag keeps working, in order.

```ts
compile({ version: 'x@1', tags: { sku: { rx: '/%{SKU/iu', resolve: 'uper' } } });
// errors:
//   tags.sku.rx       (sku)  Invalid regular expression: /%{SKU/iu: Incomplete quantifier
//   tags.sku.resolve  (sku)  unknown resolver "uper"
```

## The rules

- **Every match of every root tag is a row.** A tag with `rx` is scanned over
  the whole normalised text. Overlapping matches of the same tag are all rows
  (the scan resumes one position after each match's start). Zero-length
  matches are skipped. A match may not start or end inside a run of letters or
  digits. A root tag with `resolve` keeps only the matches its resolver
  accepts.
- **Searches run from rows.** A search runs once per row of its `from` tag,
  outward from that row's edge: `back` leftward from its start, atoms
  nearest-first; `forward` rightward from its end. It produces a row of its
  own tag, from the leftmost to the rightmost thing it matched, the `from` row
  included.
- **Atoms meet the cursor.** A tag atom takes any row of its tag (or of any
  listed tag, or of any tag for `*`) that meets the cursor: starts there going
  forward, ends there going back. A regex atom is matched against the text
  itself: if another atom follows it, it must match exactly the slice between
  the cursor and the row that atom takes; if it is last, it matches at the
  cursor. `optional` means the sequence is tried with and without the atom.
  Every combination that completes is a derivation, and all are kept. Nothing
  about a match is possessive.
- **Composed rows are filtered like root rows.** A search's tag with `resolve`
  keeps a derivation only if the resolver accepts it, given `{ value, ...roles }`.
  Values are worked out on the way and never stored in the chart.
- **Passes run to a fixpoint.** Pass zero is the root rows. Each later pass
  runs every search against the previous chart only, and adds its rows at
  once. The same tag on the same span is one row, so a pass that adds nothing
  ends the loop. A search may grow from its own tag: that is how repetition is
  written, and it stops when the text runs out.
- **The chart is complete and neutral.** Crossing rows, twins on one span, rows
  inside rows: all kept. Choosing among them is the DOM half's job. The
  chart depends on the text and the conf only, so cache it by
  `(text, conf.version)`.

## The chart

On the chart of the quick start:

```ts
chart.spans('sep');            // [[6, 7], [15, 18], [16, 18], [17, 18], [21, 23], ...]: sorted by start, then end
chart.has('sku-code', 23, 31); // true
chart.after('sep', 22);        // [22, 23]: the first span of the tag starting at or after 22
chart.before('sep', 22);       // [17, 18]: the last span of the tag ending at or before 22
chart.after('*', 23);          // [23, 31]: '*' means any tag
[...chart.all()];              // every [tag, span], in position order
chart.size();                  // 15: total rows, `^` and `$` included
JSON.stringify(chart);         // plain data...
Chart.from(JSON.parse(json));  // ...and back
```

A chart is a map from tag to its rows, each row a span `[start, end]` into
**your original string**, not the normalised copy `find` matched on. Nothing
else: no values, no roles, no derivations. Its invariants:

- rows sorted by start, then end, one row per `(tag, start, end)`;
- `^` at `(0, 0)` and `$` at `(n, n)` always present, a tag with no rows absent;
- `Chart.from(chart.toJSON())` equals the chart, and the JSON form (tags in
  code-unit order) survives `JSON.stringify` and `JSON.parse` unchanged;
- it is immutable: `chart.with(rows)` returns a new chart and shares the tag
  lists it did not touch.

`rel(a, b)` gives the Allen relation of one span to another (`before`, `meets`,
`overlaps`, `starts`, `during`, `finishes`, `equals` and the inverses). The
text's edges meet the rows that touch them: `rel([0, 0], [0, 5])` is `meets`.

## The tree

`dom(text, chart, conf)` takes the chart `find` made and returns the root of a
tree of plain objects:

```ts
type Node = {
  tag: string;                                    // a conf tag, or 'doc' (the root) or 'text' (water)
  start: number; end: number;                     // into your original string
  value?: string;                                 // the resolver's answer, only on tags that resolve
  attrs: Record<string, Node | string>;           // roles bound by `as`
  also?: string[];                                // tags of twins folded into this node
  fate?: 'separator' | 'connector' | 'bracket';   // the tag's fate, copied from the conf
  text?: string;                                  // your original string, on `doc` only
  children: Node[];                               // by containment, in text order, water included
};
```

On the quick start's text:

```
doc (0,51)
  text (0,6) "Refund"
  sep (6,7) " "
  text (7,15) "approved"
  sep (15,18) " - "
  sku (18,31) "SKU: abc-1234" value="SKU: ABC-1234" attrs={ label: → sku-word (18,21) }
    sku-word (18,21) "SKU"
    sep (21,23) ": "
    sku-code (23,31) "abc-1234"
  sep (31,34) " - "
  text (34,42) "customer"
  sep (42,43) " "
  text (43,51) "notified"
```

- **Nodes are chosen rows.** One node per row selection kept, nested by
  containment. `^` and `$` never become nodes.
- **Water is text.** Every stretch of text no chosen row covers becomes a `text`
  node, so the **leaves** (nodes with no children) in order cover the text
  exactly once, and joining their text gives the text back. No two nodes cross.
- **Roles.** A composed node's `attrs[as]` is the node its search took for that
  atom, or the text a regex atom matched. An atom without `as` binds nothing;
  its row is still a child.
- **Values.** Only on tags that resolve, computed bottom-up with the same
  resolvers `find` used, on the same normalised text. A resolver that refuses
  what it accepted in `find` is a bug, and `dom` throws, naming the tag and the
  span.
- **Twins.** Two tags on exactly one span are one node; the tag that lost is in
  `also`.
- **Fates and text ride on the tree.** A node carries its tag's `fate` and the
  root carries `text`, so the tree is all the fold reads: one that went through
  `JSON.stringify` and back folds the same.

`dom` throws when the chart holds a row of a tag the conf does not declare (the
chart of another conf version) or a row that is not on a boundary of the text
(the chart of another text).

## Selection

The chart has every reading; the tree has one. These rules, in this order, are
the single source of truth for `dom`.

- **Order.** Rows are considered in this order: every non-`weak` row before
  every `weak` one (a weak row fills only what is left); within each, the
  longer span first, then the tag whose key comes earlier in `tags`, then the
  earlier start. Key order is read here and nowhere else.
- **Take or drop.** Walking that order, a row is dropped if it crosses a chosen
  row (`overlaps`, either way); dropped if it lies inside a chosen row of the
  same tag (the outer wins: this is what removes the suffix matches of a root
  scan and the partial rows of a self-growing search); a twin if it has exactly
  a chosen row's span, and then its tag joins that node's `also`; otherwise it
  is chosen.
- **Forcing.** When a composed row is chosen, its search is run again inside
  its own span, with the same matcher `find` used, and every row the derivation
  took, the `from` row included, is chosen at once. The derivation kept is the
  first one that spans the row exactly, that the resolver accepts, and none of
  whose rows crosses a chosen row; with none, the composed row is dropped as a
  crossing loser. A forced composed row is forced the same way, recursively.
- **The outermost row of a self-grown tag absorbs its chain.** A forced row of
  the composed row's own tag is not a node: the rows of *its* derivation are
  forced instead. A protocol grown from a protocol is one `protocol` node, its
  channel and its label children of it, never a protocol inside a protocol. A
  role bound to such a row holds its text.
- **Then the tree.** The chosen rows nest by containment and water fills the
  gaps.

Selection depends on the chart, the conf and the key order of `tags`, nothing
else.

## The rules of the fold

A **fold** is a function `(node) => boolean`, the policy: `true` for a node the
reader wants folded away. `hidden(doc, fold)` returns the set of every node the
condensed view drops; `gist(doc, fold)` is the text of the leaves that are not
in it. The policy is never asked about `doc`. Three tags carry a `fate`, and
the rules apply in this order, each seeing what the earlier ones hid:

- **A node folds when the policy says so, or when an ancestor folds.** Every
  leaf under it is hidden.
- **Connector fate.** A leaf whose tag has `fate: "connector"` (`del`, `di`,
  `with`) is hidden when the next leaf to its right that is not a separator is
  hidden; otherwise it stays. Connectors are decided right to left.
- **Emptying.** A node whose tag has `fate: "bracket"` is hidden, with all it
  holds, when every leaf inside it that is not a separator is hidden and at
  least one is. Its **delimiters**, its leading and trailing water when each
  is exactly one character (the `(` and the `)`), do not count, and go with
  it. Brackets are decided innermost first.
- **Separator fate.** A leaf whose tag has `fate: "separator"` is a separator.
  Take the run of separators and hidden leaves between two surviving
  non-separator leaves. If nothing in the run was hidden, its separators stay
  untouched, at the edges of the text too. Otherwise only the strongest
  survives (`-`, then `;`, `:`, `,`, then a plain space; the leftmost on a
  tie), and not even that one at an edge of the text, right after the opening
  delimiter of a bracket that stays, or before closing punctuation (`.` `,`
  `;` `:` `!` `?` `)` `]` `}`).

Folding nothing gives the text back.

## Rendering it yourself

fewrd stops at the tree. Rendering both views from one tree takes a few lines
of yours: `hidden` says which nodes the condensed view drops, and CSS does the
switch.

```ts
import { hidden, type Node } from 'fewrd';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function html(doc: Node, fold: (node: Node) => boolean): string {
  const gone = hidden(doc, fold);
  const text = doc.text ?? '';
  const render = (n: Node): string => {
    const inner = n.children.length ? n.children.map(render).join('') : esc(text.slice(n.start, n.end));
    if (n.tag === 'text' && !gone.has(n)) return inner;
    return `<span data-tag="${n.tag}"${gone.has(n) ? ' data-fold' : ''}>${inner}</span>`;
  };
  return doc.children.map(render).join('');
}
```

```css
.condensed [data-fold] { display: none }   /* add the class `condensed` to see the gist */
```

`html(doc, (n) => n.tag === 'sku')` on the quick start's tree marks the `sku`
node (and what is inside it) and the dash after it with `data-fold`; with
`.condensed` on the container the reader sees `Refund approved - customer notified`, without it,
the whole text.

## Playground

`pnpm dev` opens the playground on twenty-one subjects from two domains,
thirteen Italian public-administration ones and eight from a common inbox. One subject
shows at a time: step through them with the big ‹ › buttons or the arrow keys,
the counter between them says where you are, and a menu next to it jumps to any
one. The bar stays on screen while you scroll.

The subject's text sits on a character grid, a monospace font with every
character exactly one `ch` wide, wrapped at spaces to as many columns as the
page holds. Each row of the chart is an underline with a small tick at each end,
so where it starts and stops is plain; rows that overlap stack in lanes below the
line. Nothing is labelled: hover a band, or Tab to the bands and move along them
with ↑ ↓, and a tooltip gives its tag, `(start, end)`, its text and whether the
tree kept it, while the characters it covers light up and its row in the tree
lights with them. A dashed band is a row the tree did not keep. The conf of the
subject on screen sits in a panel that recompiles it as you type and finds the
subject again; a mistake in the JSON is shown at once, the editor turns red and
the drawing stays; compile errors are listed with their paths and the tags that
compiled are drawn. Each domain keeps its own edits.

Under the chart come the gist, the fold and the tree. The fold is one chip per
tag of the conf, each with its colour and a checkbox; the tags this subject's
tree holds come first. The ticked tags are the fold: the gist is printed above,
with the characters it saves, and on the grid the hidden leaves are struck out
and their bands fade; ticking a box redraws both at once. A subject that carries
a `fold` opens with those boxes ticked and says whether the gist matches the
`gist` it carries; Reset returns to that fold. The tree is the `dom` of the
subject as an indented list: one line per node, its tag, `(start, end)`, its
`also` and `value` when it has them, and its text, water dimmed; hovering a line
lights its span on the grid. Light and dark follow the system; a switch in the
bar overrides them.

Or mount it in a page of your own:

```ts
import { mount } from 'fewrd/playground';
import data from './shop.json' with { type: 'json' };

mount(document.getElementById('app')!, {
  confs: { shop: { conf: data, resolvers } },     // named confs, shown and edited as JSON
  cases: [{ name: 'refund', conf: 'shop', text: 'Refund approved - SKU: abc-1234', fold: ['sku'], gist: 'Refund approved' }],
});
```

The playground injects its own scoped styles, so it needs no stylesheet. It asks
for a monospace font by name (JetBrains Mono, then IBM Plex Mono, then the
system's); `playground/index.html` loads JetBrains Mono from Google Fonts, for
development only, and your page can load whichever it likes. `fold` and `gist`
on a case are optional.

**`fewrd-play`**, the dev-only package under `play/`, opens a folder of your
own in the same playground, served from the `fewrd` installed in your project:

```
path/to/folder/
  conf.json          the conf, as data
  cases.json         [{ "name": "refund", "text": "…", "fold": ["sku"], "gist": "…" }]
  cases.local.json   more cases, e.g. real texts kept out of git (optional)
  resolvers.ts       export const resolvers = { … } (optional)
```

```bash
npx fewrd-play path/to/folder --open
```

It listens on 127.0.0.1 only and writes nothing. It is not published yet; see
[`play/README.md`](play/README.md).

## Develop

```bash
pnpm install
pnpm typecheck   # tsc --strict, no emit
pnpm test        # node --test, TypeScript type-stripped: no build
pnpm dev         # the playground, on http://localhost:5577
```

There is no build step in that loop. `pnpm build` (run at publish) bundles the
two public entries with vite and writes their types with `tsc`. The two domain
confs, `confs/it-pa.json` and `confs/common.json`, are tested through their
subjects in `cases/*.json`: the rows each must give, and, for every case that
carries a `fold` and a `gist`, that `gist(dom(text, find(text, conf), conf),
fold)` is that gist. The core rules are tested with small synthetic confs, one
test per rule (`test/find.test.ts`, `test/dom.test.ts`, `test/fold.test.ts`).
A conf names its resolvers as strings, so a call-graph tool sees every resolver
in `confs/*.ts` as uncalled; `compile` is what checks those names, and an
unknown one is a compile error with a test of its own.
The rules of the finding half ("The rules"), of selection ("Selection") and of
the fold ("The rules of the fold") are the single source of truth for `find`,
`dom` and `hidden`/`gist`: a change to what they return changes those sections
in the same commit. The design is in [`specs/rewrite-brief.md`](specs/rewrite-brief.md),
[`specs/005-chart/`](specs/005-chart/spec.md) and
[`specs/006-dom/`](specs/006-dom/spec.md).

## License

MIT
