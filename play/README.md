# fewrd-play

Open a local [fewrd](https://github.com/egildo/fewrd) conf in the fewrd
playground: edit the conf live, watch every sample text found again as you
type, see the chart, the tree and the gist under a fold you tick.

A dev tool, packaged apart from `fewrd` so none of it ships with your code.
No dependencies: it serves the `fewrd` your project already has installed.

```bash
npm install -D fewrd-play
```
```bash
npx fewrd-play path/to/folder --open
```

## The folder

```
path/to/folder/
  conf.json          the conf, as data
  cases.json         sample texts: [{ "name": "refund", "text": "Refund approved - SKU: abc-1234", "fold": ["sku"], "gist": "Refund approved" }]
  cases.local.json   more texts, e.g. real ones you keep out of git (optional)
  resolvers.ts       named resolvers (optional)
```

A case's `fold` (a list of tags) and `gist` (the text expected under it) are
optional: with them, the fold panel opens with those tags ticked and says
whether the gist matches. A case may also name its `conf`; without it, it uses
the folder's one conf. The edits you make in the page are not written back:
copy the conf out of the editor when you are happy with it.

```ts
// resolvers.ts
import type { Resolve } from 'fewrd';

export const resolvers: Record<string, Resolve> = {
  upper: (p) => p.value.toUpperCase(),
};
```

A default export works too. `resolvers.ts` reaches the browser with its types
stripped (Node 22.13+), so it may import types, `fewrd` itself and other files
in the folder, but no other packages. A `resolvers.js` is served as is.

## Options

```
fewrd-play [dir] [--port 4747] [--open]

  -p, --port   port to listen on (default 4747)
  -o, --open   open the browser
      --fewrd  the fewrd dist/ to serve (default: the one installed where dir is)
```

The server listens on 127.0.0.1 only. It serves the folder's `.json`, `.ts`
and `.js` files and nothing else, and writes nothing.

## License

[MIT](LICENSE)
