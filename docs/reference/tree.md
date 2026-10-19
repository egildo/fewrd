# The tree

`dom(text, chart, conf)` takes the chart and returns one reading of it, a tree of plain objects:

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

The tree of the quick start, printed one node per line:

```output
doc (0,51) "Refund approved - SKU: abc-1234 - customer notified"
  text (0,6) "Refund"
  sep (6,7) " "
  text (7,15) "approved"
  sep (15,18) " - "
  sku (18,31) "SKU: abc-1234" value="SKU: ABC-1234" label=sku-word(18,21)
    sku-word (18,21) "SKU"
    sep (21,23) ": "
    sku-code (23,31) "abc-1234"
  sep (31,34) " - "
  text (34,42) "customer"
  sep (42,43) " "
  text (43,51) "notified"
```

<details>
<summary>The few lines that printed it</summary>

The quick start's conf and text, found and read:

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

```ts
import { compile, find, dom } from 'fewrd';
import data from './shop.json' with { type: 'json' };

const { conf } = compile(data, { resolvers: { upper: (p) => p.value.toUpperCase() } });
const text = 'Refund approved - SKU: abc-1234 - customer notified';
const doc = dom(text, find(text, conf), conf);
```

Then:

```ts
import type { Node } from 'fewrd';

const show = (n: Node, depth = 0): string[] => [
  `${'  '.repeat(depth)}${n.tag} (${n.start},${n.end}) ${JSON.stringify(text.slice(n.start, n.end))}` +
    (n.value !== undefined ? ` value=${JSON.stringify(n.value)}` : '') +
    (n.also ? ` also=${n.also}` : '') +
    Object.entries(n.attrs).map(([as, v]) => ` ${as}=${typeof v === 'string' ? JSON.stringify(v) : `${v.tag}(${v.start},${v.end})`}`).join(''),
  ...n.children.flatMap((c) => show(c, depth + 1)),
];
console.log(show(doc).join('\n'));
```

</details>

The `text` nodes are **water**, the stretches of text that no node of the conf's tags covers.

**Selection** turns the chart's many readings into one. It walks the rows (all but `^` and `$`) in one fixed order and takes or drops each, and it depends on the chart, the conf and the key order of `tags`, nothing else. The examples below give a conf fragment and a text, then the children of `doc`: `›` opens a node's own children, `last=w(4,5)` is a role holding a node, and `currency="€ "` one holding text.

**Order.** Every non-weak row comes before every weak one; within each, the longer span first, then the tag whose key comes earlier in `tags`, then the earlier start.

```
ab: /a b/, bcd: /b c d/            on "a b c d"     →  text "a ", bcd (2,7)            (longer wins)
ab: /a b/, bc: /b c/               on "a b c"       →  ab (0,3), text " c"             (key order breaks the tie)
cde: /c d e/ weak, bc: /b c/       on "a b c d e"   →  text "a ", bc (2,5), text " d e" (weak waits)
```

**Take or drop.** A row that **crosses** a chosen row (overlaps it without either containing the other) is dropped. A row inside a chosen row of the same tag is dropped too: the outer wins, which is what clears away the suffix matches of the scan (`num` on `1.5` has rows `(0,3)` and `(2,3)`) and the partial rows of a self-grown search. A row with exactly a chosen row's span is a twin: its tag joins that node's `also`. Any other row is chosen.

```
num: /\d+(?:\.\d+)?/, digit: /\d/          on "1.5"    →  num (0,3) › digit (0,1), text ".", digit (2,3)
code: /[A-Z]\d{3}/, ref: /[A-Z]\d+/        on "A123"   →  code (0,4) also=ref
```

**Forcing.** When a composed row is chosen, its search is run again inside its own span with the same matcher `find` used, and every row that derivation took is chosen with it, at once. The derivation kept is the first, in the order `find` enumerates them (the tag's searches in order, `from` rows by position, an optional atom tried skipped before taken), that spans the row exactly, that its resolver accepts, and none of whose rows crosses a chosen row; with none, the composed row is dropped. Forced composed rows are forced the same way, down the tree.

A forced row of the composed row's own tag is not a node: its own derivation is forced in its place, so the outermost row of a self-grown tag absorbs its chain.

```
list: from w, forward [sp, w]; from list, forward [sp, w as last]     on "a b c"
  →  list (0,5) last=w(4,5) › w "a", sp " ", w "b", sp " ", w "c"
```

**Roles and values.** A composed node's `attrs[as]` is the node its kept derivation took for that atom, or the text a regex atom matched, or the text of an absorbed row. `value` is on nodes whose tag resolves, worked out bottom-up with the same resolvers on the same normalised text. A resolver that refuses in `dom` what it accepted in `find` is a bug, and `dom` throws naming the tag and the span.

```
price: from n, back [rx /€ ?/ as currency]     on "€ 5"   →  price (0,3) currency="€ " › text "€ ", n (2,3)
```

**Water.** The chosen rows nest by containment, and every stretch of text no chosen row covers becomes water. So the **leaves** (nodes with no children) cover the text exactly once, in order, and joining them gives the text back; no two nodes cross. The root is `doc`, spanning the whole text and carrying it in `text`, and each node carries its tag's `fate`, so the tree is all the fold needs: a tree that went through `JSON.stringify` and back folds the same.

`dom` throws when the chart holds a tag the conf does not declare (a chart of another conf) or a row that does not fall on a boundary of the text (a chart of another text). The decisions behind forcing are in [forcing-absorbs-own-tag](../decisions/forcing-absorbs-own-tag.md) and [outer-wins-same-tag](../decisions/outer-wins-same-tag.md).
