# fewrd-play

Open a conf folder of your own in the [fewrd](https://github.com/egildo/fewrd) playground: edit the conf live, and watch every sample text found again as you type, with its chart, its tree and its gist under the fold you choose.

A dev tool, packaged apart from `fewrd` so none of it ships with your code. It has no dependencies of its own: it serves the `fewrd` your project already has installed, and needs Node 22.13 or later.

**Status:** not published to npm yet. Once it is, `npm install -D fewrd-play` and `npx fewrd-play path/to/folder --open`. Publishing it will compile `cli.ts` and `server.ts` into `play/dist/` with `tsc` (`prepublishOnly`), since Node does not strip types inside `node_modules`. Until then, run it from a checkout of the fewrd repository, whose loop runs TypeScript directly:

```bash
pnpm install
pnpm build                                            # fewrd's dist/, which the page loads
node play/cli.ts path/to/folder --fewrd dist --open
```

## The folder

```
path/to/folder/
  conf.json          the conf, as data (required)
  cases.json         sample texts (optional)
  cases.local.json   more texts, such as real ones you keep out of git (optional)
  resolvers.ts       the resolvers the conf names (optional)
```

**`cases.json`** and **`cases.local.json`** are each an array of cases, and the page shows the first file's cases, then the second's:

```json
[{ "name": "refund", "text": "Refund approved - SKU: abc-1234 - customer notified", "fold": ["sku"], "gist": "Refund approved - customer notified" }]
```

`name` and `text` are required. `fold`, the tags folded when the case opens, and `gist`, the text that fold should give, are optional; with both, the playground says whether the gist matches. The folder holds one conf, named after the folder, and every case is found with it, so a case needs no `conf` field (one that names any other conf will not draw).

**The resolvers** file is the first of `resolvers.ts`, `resolvers.mts`, `resolvers.js` and `resolvers.mjs` that exists. It exports `resolvers`, or a default export, mapping each name the conf's `resolve` uses to a function:

```ts
import type { Resolve } from 'fewrd';

export const resolvers: Record<string, Resolve> = {
  upper: (p) => p.value.toUpperCase(),
};
```

A `.ts` or `.mts` file reaches the browser with its types stripped (Node's `module.stripTypeScriptTypes`, hence 22.13), so it may import types, `fewrd` itself and other files in the folder, but no other packages. A `.js` or `.mjs` file is served as it is.

## The command

```
fewrd-play [dir] [--port 4747] [--open] [--fewrd path]
```

- `dir`: The folder, default the current one. It must hold a `conf.json`.
- `-p`, `--port`: The port to listen on, default 4747; `0` picks a free one.
- `-o`, `--open`: Open the page in the browser once the server listens.
- `--fewrd`: The `dist/` of the fewrd build to serve. Default: the one Node would import from the folder, found by resolving `fewrd/playground` from there.
- `-h`, `--help`: Print the usage and exit.

It prints the folder and the URL, `http://127.0.0.1:<port>/`. It stops with a message, and the usage where it helps, when the folder has no `conf.json`, the port is not a number from 0 to 65535, fewrd cannot be found where the folder is, or the port is taken.

## What it serves

The server listens on 127.0.0.1 only, answers `GET` only, sends nothing cacheable, and writes nothing: edits made in the page stay in the page, so copy the conf out of the editor when you are happy with it.

- `/`: the page, titled with the folder's name. An import map points `fewrd` and `fewrd/playground` at the served build, and a script loads `conf.json`, the cases and the resolvers and calls `mount`.
- `/cases.json`: `cases.json` and `cases.local.json` merged; a file that is not an array is an error.
- `/@fewrd/…`: files from the fewrd build.
- Anything else: a `.json`, `.js`, `.mjs`, `.ts` or `.mts` file inside the folder, and nothing outside it.

## License

[MIT](LICENSE)
