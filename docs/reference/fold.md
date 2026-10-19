# The rules of the fold

A **fold** is a function from a node to a boolean, the reader's policy: `true` for a node to fold away. `hidden(doc, fold)` returns the set of nodes the condensed view drops, and `gist(doc, fold)` the text of the leaves that are not in it. The policy is never asked about `doc`. Four rules apply, in this order, each seeing what the ones before it hid. The examples use this conf:

```json
{
  "version": "note@1",
  "tags": {
    "ref": { "search": [{ "from": "num", "back": [{ "tag": "sep", "optional": true }, { "tag": "lbl", "as": "label" }] }] },
    "num": { "rx": "/#\\d+/u" },
    "lbl": { "rx": "/ref|n\\./iu" },
    "paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" },
    "conn": { "rx": "/del|sul|per\\s+il/iu", "fate": "connector" },
    "sep": { "rx": "/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u", "fate": "separator" }
  }
}
```

**A node folds when the policy says so, or when an ancestor folds.** Every leaf under it is hidden.

```
"Nota ref #12 - fine"   fold ref  →  "Nota - fine"
"Nota ref #12 - fine"   fold num  →  "Nota ref - fine"
```

**A connector follows its right.** A leaf with the connector fate is hidden when the next leaf to its right that is not a separator is hidden, and stays otherwise. Connectors are decided right to left, so a connector before a hidden connector goes too.

```
"Nota del ref #12 - fine"   fold ref  →  "Nota - fine"
"Nota del ref #12 - fine"   fold num  →  "Nota del ref - fine"
```

**A bracket empties out.** A node with the bracket fate is hidden, with all it holds, when every leaf inside it that is not a separator is hidden and at least one is. Its **delimiters**, its first and last child when each is water exactly one character long (the `(` and the `)`), do not count and go with it. Brackets are decided innermost first.

```
"Fornitura toner (ref #12) - saldo"           fold ref  →  "Fornitura toner - saldo"
"Fornitura toner (ref #12 urgente) - saldo"   fold ref  →  "Fornitura toner (urgente) - saldo"
```

**The strongest separator survives.** Take each run of separators and hidden leaves between two surviving leaves that are not separators. If nothing in the run was hidden, its separators stay untouched, at the edges of the text too. Otherwise only the strongest survives, and a separator is as strong as the strongest mark it contains: `-` over `;` over `:` over `,` over a plain space, the leftmost on a tie. Not even that one survives at an edge of the text, right after the opening delimiter of a bracket that stays, or before closing punctuation (`.` `,` `;` `:` `!` `?` `)` `]` `}`).

```
"Nota, #12 - fine"   fold num  →  "Nota - fine"          "#12 - fine"        fold num  →  "fine"
"a; #1, b"           fold num  →  "a; b"                 "Nota (#12 fine)"   fold num  →  "Nota (fine)"
```

Folding nothing gives the text back, surrounding spaces included. Why a fate rides on the node and not in the conf is in [fates-on-the-node](../decisions/fates-on-the-node.md); how connectors became tags is in [connectors-are-tags-with-a-fate](../decisions/connectors-are-tags-with-a-fate.md).
