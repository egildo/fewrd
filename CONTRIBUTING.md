# Contributing

```bash
pnpm install
pnpm typecheck   # tsc --strict, no emit
pnpm test        # node --test, TypeScript type-stripped: no build
pnpm dev         # the playground, on http://localhost:5577
pnpm bench <conf-dir> [texts]   # times find and dom apart over a fewrd-play conf folder
```

That loop has no build step. `pnpm build`, run at publish and before running `fewrd-play` from a checkout, bundles the two public entries with vite into `dist/` and writes their types with `tsc`; `dist/` is never committed. The gate for any change is `pnpm typecheck` and `pnpm test`. It is developed on Node 25 and pnpm 10; the loop needs a Node that runs TypeScript files directly. There is no CI: the gate is run locally. One file runs on its own with `node --test test/fold.test.ts`.

**Tests.** The core rules are tested with small synthetic confs, one test per rule (`test/find.test.ts`, `test/dom.test.ts`, `test/fold.test.ts`). The two domain confs are tested through their cases: `test/it-pa.test.ts` and `test/common.test.ts` check the rows the cases must give, and `test/gist.test.ts` checks, for every case, that `gist(dom(text, find(text, conf), conf), fold)` is the gist it carries.

**A domain** is a conf as data, `confs/<name>.json`; its resolvers, `confs/<name>.ts`, which compiles the conf and throws on any compile error; its cases, `cases/<name>.json`, each `{ name, conf, text, fold, gist }`; a test that reads them; and a line in `playground/main.ts`. Adding one never changes `src/`. A conf names its resolvers as strings, so a call-graph tool sees every resolver in `confs/*.ts` as never called; `compile` is what checks those names, and an unknown one is a compile error with a test of its own.

**Documents.** The rules of finding, selection and the fold in [docs/reference/](docs/reference/) are the single source of truth for `find`, `dom`, `hidden` and `gist`: a change to what those return changes those pages in the same branch. Every document follows the [writing style](docs/style.md). Work goes in rounds where the documents move first ([Docs move first](docs/principles.md#docs-move-first)); a round's spec, plan and tasks are written under `specs/` with the speckit skills in `.claude/skills/`. The badges are kept by hand: the test count from `pnpm test`, the size from `dist/index.js` gzipped after `pnpm build`. The design lives in `docs/`: the [vision](docs/vision.md), the [principles](docs/principles.md), the [architecture](docs/architecture.md), the [glossary](docs/glossary.md), the [decisions](docs/decisions/) and the [playground's design](docs/playground.md). The rounds that got here are recorded in `specs/`, starting from the [rewrite brief](specs/rewrite-brief.md).
