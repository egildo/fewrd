# fewrd-play

Open a local [fewrd](https://github.com/egildo/fewrd) book in the fewrd
playground: edit the recipes live, watch every sample text re-read as you
type, save the book back to disk.

A dev tool, packaged apart from `fewrd` so none of it ships with your code.
No dependencies: it serves the `fewrd` your project already has installed.

```bash
npm install -D fewrd-play
```
```bash
npx fewrd-play path/to/book --open
```

## The folder

```
path/to/book/
  book.json          the recipes (fewrd's BookData); the save button writes it back
  cases.json         sample texts: [{ "name": "refund", "text": "Refund approved - SKU: abc-1234" }]
  cases.local.json   more texts, e.g. real ones you keep out of git (optional)
  resolvers.ts       named resolvers (optional)
```

```ts
// resolvers.ts
import type { Resolver } from 'fewrd';

export const resolvers: Record<string, Resolver> = {
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
and `.js` files and nothing else, and writes nothing but `book.json`.

## License

[MIT](LICENSE)
