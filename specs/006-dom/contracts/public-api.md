# Contract: public API (rewrite, phase 2)

Additions to phase 1's contract ([`../../005-chart/contracts/public-api.md`](../../005-chart/contracts/public-api.md)). Nothing of phase 1 is removed or renamed.

## `fewrd`

```ts
// conf.ts (changed)
export type Tag<P = string, R = string> = { rx?: P; search?: Search<P>[]; resolve?: R; weak?: boolean; fate?: 'separator' | 'connector' | 'bracket' };

// dom.ts (new)
export type Node = {
  tag: string;
  start: number;
  end: number;
  value?: string;
  attrs: Record<string, Node | string>;
  also?: string[];
  children: Node[];
};
export function dom(text: string, chart: Chart, conf: Conf<RegExp, Resolve>): Node;   // throws on a tag the conf lacks, on a resolver refusal

// fold.ts (new)
export type Fold = (node: Node) => boolean;
export function hidden(doc: Node, fold: Fold): Set<Node>;
export function gist(doc: Node, fold: Fold): string;
```

Typical use:

```ts
const chart = find(text, conf);            // cacheable by (text, conf.version)
const doc = dom(text, chart, conf);
gist(doc, (n) => n.tag === 'protocol');    // the condensed text
hidden(doc, fold).has(node);               // render both views from one tree
```

## `fewrd/playground`

```ts
export interface PlaygroundCase { name: string; conf: string; text: string; fold?: string[]; gist?: string }
export function mount(el: HTMLElement, options: { confs: Readonly<Record<string, PlaygroundConf>>; cases: readonly PlaygroundCase[] }): void;  // unchanged signature
export function treeLines(doc: Node, text: string): string[];   // new: the tree list's lines
export function greyed(doc: Node, fold: Fold): Span[];          // new: spans of hidden leaves, adjacent ones merged
```

## `fewrd-play` (folder contract)

```
conf.json          required; the conf as data
cases.json         optional; [{ name, text, conf?, fold?, gist? }]
cases.local.json   optional; more cases, appended
resolvers.ts|.mts|.js|.mjs   optional; `export const resolvers` or a default export
```

`fewrd-play [dir] [--port 4747] [--open] [--fewrd path]`. Serves on 127.0.0.1 only; serves the folder's `.json`, `.ts`, `.js`; writes nothing. Exits 1 with the usage when `conf.json` is missing.
