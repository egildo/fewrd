# Quickstart: validating the chart (rewrite, phase 1)

A run guide for checking phase 1 is done. Signatures are in [contracts/public-api.md](contracts/public-api.md); expected results are in [spec.md](spec.md).

## Prerequisites

Node 22.13 or later (25 in development), pnpm, `pnpm install` done. No build.

## 1. The gate

```bash
pnpm typecheck
pnpm test
```

Both pass. `pnpm test` runs, among others:

- `test/conf.test.ts`: every compile error kind, never a throw.
- `test/chart.test.ts`: the chart invariants, copy-on-write, queries, `rel`.
- `test/find.test.ts`: every worked example of the spec, by its requirement name.
- `test/it-pa.test.ts`: the table of `italian-cases-tagged`, round-trip and determinism for every case.
- `test/playground.test.ts`: `lanes`.

## 2. The worked examples agree with the spec

Every example in the spec's finding rules is a test named after its requirement (`root-rows-every-match: the guard`, …). When one disagrees with the code, the fix goes into the spec's example (and the "not yet run" mark comes off once all agree), never into the test's expectation alone.

## 3. A conf by hand

```ts
import { compile, find } from './src/index.ts';

const { conf, errors } = compile({
  version: 't@1',
  tags: {
    n: { rx: '/\\d+/u' },
    sp: { rx: '/ /u' },
    list: { search: [
      { from: 'n', forward: [{ tag: 'sp' }, { tag: 'n' }] },
      { from: 'list', forward: [{ tag: 'sp' }, { tag: 'n' }] },
    ] },
  },
});
console.log(errors);                                   // []
console.log(JSON.stringify(find('1 2 3', conf)));
// {"$":[[5,5]],"^":[[0,0]],"list":[[0,3],[0,5],[2,5]],"n":[[0,1],[2,3],[4,5]],"sp":[[1,2],[3,4]]}
```

Run with `node --input-type=module -e "…"` from the repo root, or paste into a scratch `.ts` file and run it with `node`.

## 4. The playground

```bash
pnpm dev     # http://localhost:5577
```

Expect: the Italian conf in the editor; 13 cases, each with its bands and its `tag(start,end)` lines. "PEC, channel with a dash" shows `protocol`, `dated`, `cup` and `date` bands stacked over the separators and connectors. Change `"prot\\.?"` to `"prat\\.?"` in `prot-word`: every protocol and dated band built on `Prot.` or `PROT.` disappears, while those built on `Protocollo` and `RIF.` stay. Delete a closing brace: an error appears beside the editor and the drawings stay.

## 5. Done when

- The gate passes.
- No "not yet run" mark is left in the spec.
- `pnpm dev` looks as described above.
- README and CHANGELOG are written.
