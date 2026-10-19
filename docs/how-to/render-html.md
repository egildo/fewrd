# Render the tree as HTML

fewrd stops at the tree. Both views from one tree take a few lines of yours: `hidden` says which nodes the condensed view drops, and CSS does the switch.

<details>
<summary>The quick start's tree, which the example renders</summary>

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

</details>

```ts
import { hidden, type Fold, type Node } from 'fewrd';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function html(doc: Node, fold: Fold): string {
  const gone = hidden(doc, fold);
  const text = doc.text!;
  const render = (n: Node): string => {
    const inner = n.children.length ? n.children.map(render).join('') : esc(text.slice(n.start, n.end));
    if (n.tag === 'text' && !gone.has(n)) return inner;
    return `<span data-tag="${n.tag}"${gone.has(n) ? ' data-fold' : ''}>${inner}</span>`;
  };
  return doc.children.map(render).join('');
}

console.log(html(doc, (n) => n.tag === 'sku'));
```

```css
.condensed [data-fold] { display: none }
```

With the class `condensed` on the container the reader sees `Refund approved - customer notified`; without it, the whole text.

<details>
<summary>What it prints on the quick start's tree</summary>

```output
Refund<span data-tag="sep"> </span>approved<span data-tag="sep"> - </span><span data-tag="sku" data-fold><span data-tag="sku-word" data-fold>SKU</span><span data-tag="sep" data-fold>: </span><span data-tag="sku-code" data-fold>abc-1234</span></span><span data-tag="sep" data-fold> - </span>customer<span data-tag="sep"> </span>notified
```

</details>
