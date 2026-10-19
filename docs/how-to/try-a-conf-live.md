# Try a conf live

The playground shows what a conf does to real texts while you edit it: every row of the chart on the characters it covers, the tree, and the gist under the fold you choose. Open it on this repository's own confs, or on a folder of your own with `fewrd-play`. Either way it writes nothing: edits stay in the page, so copy the conf out of the editor when you are happy with it.

## Open the repository's playground

For the two domain confs in this repository, `confs/it-pa.json` and `confs/common.json`, and their twenty-one cases.

1. In a checkout of fewrd, install the dependencies:

   ```bash
   pnpm install
   ```

2. Start the playground:

   ```bash
   pnpm dev
   ```

3. Open `http://localhost:5577`.

   The first case shows: its text on a grid, every row underlined in its tag's colour, then the gist, the tag chips and the tree.

4. Select ‹ or › to step through the cases, or press ← or → outside the editor.

5. To fold a tag, select the eye on its chip.

   The gist changes, and the folded text is struck through on the grid.

6. To change the conf, edit it in the conf editor. From 1700 px wide it is a pane on the left; below that, select the conf button on the bar to open it.

   The case is found again as you type, and compile errors are listed with their paths.

## Open a folder of your own

For a conf of your own, with your own texts. `fewrd-play` is not on npm yet, so it runs from a checkout of fewrd.

1. Make a folder that holds your conf as `conf.json`, and optionally your cases and resolvers:

   ```
   path/to/folder/
     conf.json          the conf, as data
     cases.json         [{ "name": "refund", "text": "…", "fold": ["sku"], "gist": "…" }] (optional)
     cases.local.json   more cases, such as real texts kept out of git (optional)
     resolvers.ts       export const resolvers = { … }, or a default export (optional)
   ```

   The format of each file is in the [fewrd-play README](../../play/README.md#the-folder).

2. In the fewrd checkout, install the dependencies and build fewrd:

   ```bash
   pnpm install
   pnpm build
   ```

3. Open the folder:

   ```bash
   node play/cli.ts path/to/folder --fewrd dist --open
   ```

   The playground opens in your browser. It listens on 127.0.0.1 only.

Once `fewrd-play` is on npm, the same command is `fewrd-play path/to/folder --open`. Every option is in the [fewrd-play README](../../play/README.md#the-command).

## See also

- [`mount`](../reference/mount.md), to put the playground in a page of your own, and what each control does.
- [Write a conf](write-a-conf.md), for what to put in `conf.json`.
