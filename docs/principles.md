# Design principles

How fewrd decides things. Each principle has a name, which is how it is referred to everywhere; says what it forbids; and says the problem it came from. They are carved: a change to one is its own act, recorded in the constitution's Sync Impact Report and in the changelog, never a side effect of other work.

When a principle and the [vision](vision.md) collide, the vision decides what fewrd is and is for, and the principles decide how it is built.

## Zero dependencies

**Forbids** any entry in `dependencies`, in the library and in `fewrd-play`. What a feature needs is written in `src/` or deferred. Dev tooling ships as its own package under `play/`, never inside the library, with only a peer dependency on `fewrd`.

**From** the library's whole value being small and auditable enough to read in one sitting. A dependency makes every consumer inherit a transitive graph nobody chose.

## Documented, deterministic rules

**Forbids** a change to what `find`, `dom`, `hidden` or `gist` return that does not change the matching rules in the README (the rules of finding, selection, the rules of the fold) in the same change. Forbids nondeterminism: no locale, no clock, no dependence on object key order in `find`. The chart depends on the text and the conf only; the tree on the text, the chart and the conf, and within the library the key order of `tags` is read in one place, selection's tiebreak (the playground also uses it to order chips and colours).

**From** callers who cache a chart by text and conf version and fold one tree many ways. An undocumented or nondeterministic change breaks that silently.

## Cases are the test truth

**Forbids** domain fixtures anywhere but `cases/<conf>.json`. A change to a domain conf lands with a case, and the tests read the same cases the playground shows. A synthetic toy conf that isolates one core rule may live inline in its test; it has no place in a case file.

**From** the playground and the tests drifting apart when each kept its own examples, and a case corpus that should hold real domain text filling up with toy patterns.

## Strict types, no build in the loop

**Forbids** `any`, `@ts-ignore` and `@ts-expect-error`, and any build step in the loop contributors run: `pnpm typecheck` and `pnpm test` run the TypeScript as written, type-stripped by Node. The publish build (`pnpm build`, vite and tsc) is additive, never needed to develop, and adds no tool beyond `typescript` and `vite`.

**From** type-checking being the primary safety net, and ceremony in the dev loop being the first thing that makes people skip it.

## A closed vocabulary

**Forbids** a second name for one thing, in code, documents or conversation, and a new term that the [glossary](glossary.md) does not hold. A term is added by amending the glossary, only when the existing ones cannot say what is needed. Forbids speculative options, flags and abstractions for confs nobody has written.

**From** the old engine, whose books, recipes, mentions, neighbours and cuts each had a second life in prose. Every extra name is a second thing to explain, and the design has to fit in one README.

## A complete, neutral chart

**Forbids** `find` from choosing: no selection, no values, no water and no tree in the chart, and no reading of `weak`, `fate` or key order while finding. Every row the conf can build is kept, crossing ones and twins included. Choosing happens once, in `dom`.

**From** the old engine, which found, chose and cut in one pass, and so had to be greedy and possessive, grew rules like `rest`, `requires` and `glued` to steer its own choices, and could never show what it had passed over. See [chart-complete-and-neutral](decisions/chart-complete-and-neutral.md).

## One anchor per search

**Forbids** a search with more than one starting row or more than one direction, and any hook that reconciles derivations grown from different rows. Something with parts on both sides is written as a composed tag grown from another composed tag.

**From** the matcher and forcing staying one walk from one row, so a composed row can always be derived again inside its own span. See [one-anchor-per-search](decisions/one-anchor-per-search.md).

## Docs move first

**Forbids** code that the documents do not yet describe. A round states its purpose, amends the documents (README rules, architecture, glossary, a decision file) to describe the intended state, checks them against these principles, and only then makes the code agree, with the changelog entry in the same branch. Before it lands, the documents are read against each other and against the code.

**From** the rewrite itself, which was designed in a brief and specified before any code was written, and from rounds where a README claim outlived the code it described.
