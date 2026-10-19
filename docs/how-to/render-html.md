# Render the tree as HTML

fewrd stops at the tree. To show a text both whole and condensed, render the tree once, marking the nodes the fold hides, and let CSS switch between the two views.

The steps render the [quick start](../../README.md#quick-start)'s tree; replace `doc` with your own.

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

1. Write a function that walks the tree and wraps each node in a `span` with its tag, adding `data-fold` to the nodes `hidden` returns. Water that stays is written bare:

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
   ```

2. Call it with your fold:

   ```ts
   console.log(html(doc, (n) => n.tag === 'sku'));
   ```

   It prints:

   ```output
   Refund<span data-tag="sep"> </span>approved<span data-tag="sep"> - </span><span data-tag="sku" data-fold><span data-tag="sku-word" data-fold>SKU</span><span data-tag="sep" data-fold>: </span><span data-tag="sku-code" data-fold>abc-1234</span></span><span data-tag="sep" data-fold> - </span>customer<span data-tag="sep"> </span>notified
   ```

3. Add one CSS rule, which hides the marked nodes inside a container with the class `condensed`:

   ```css
   .condensed [data-fold] { display: none }
   ```

4. Put the HTML in a container. Add the class `condensed` to show the condensed view, and remove it to show the whole text.

   With the class, the reader sees `Refund approved - customer notified`; without it, `Refund approved - SKU: abc-1234 - customer notified`.
