# Quickstart: Validate the Recipe-Based Reader

Proves the pipeline described in [spec.md](spec.md) works end-to-end, using
only commands already defined in `package.json`.

## Prerequisites

- Node.js (current LTS+), `pnpm` installed.
- Dependencies installed: `pnpm install` (dev-only — the library itself has
  none, see [research.md](research.md)).

## 1. Automated validation (User Stories 1 and 2)

```bash
pnpm typecheck   # tsc --strict, noEmit — validates Constitution IV
pnpm test        # node --test test/*.test.ts, reads playground/cases.ts
```

**Expected outcome**: both commands exit 0. `test/read.test.ts` exercises,
against every case in `playground/cases.ts`:
- leaves partition each case's text exactly (FR-008 / SC-002 — User Story 1's
  independent test),
- `gist` with nothing folded returns the original text (User Story 2's
  baseline case),
- folding entities produces clean condensed output.

## 2. Manual validation (User Story 3 — the HTML/CSS toggle)

```bash
pnpm dev   # playground on http://localhost:5577
```

1. Open `http://localhost:5577`.
2. Pick any case from `playground/cases.ts` and confirm the rendered HTML
   shows the full text.
3. Toggle the condensed view (the `.condensed` class switch described in
   README's "One HTML, both views").

**Expected outcome**: the condensed view matches what `gist()` would produce
for the same case and fold policy — no dangling separators, no empty
brackets (SC-004) — confirming the `data-fold` contract in
[contracts/public-api.md](contracts/public-api.md).

## 3. Ad hoc check (any new text)

```ts
import { read, gist, html } from 'fewrd';
import { itPa } from 'fewrd/recipes/it-pa';

const text = 'Liquidazione fattura n. 45/2026 della ditta Sardatec S.r.l. - CIG Z1234ABCDE - Capitolo SC04.0123 - € 12.450,00';
const cuts = read(text, itPa);
console.log(cuts.mentions.map((m) => [m.entity, m.value])); // structured entities (US1)
console.log(gist(cuts, (m) => ['cig', 'amount'].includes(m.entity))); // condensed (US2)
console.log(html(cuts, (m) => ['cig', 'amount'].includes(m.entity))); // dual-view markup (US3)
```

**Expected outcome** (verified against `playground/cases.ts`'s "Ledger tail"
case): `cuts.mentions` lists `cig → "Z1234ABCDE"`, `chapter → "SC04.0123"`,
`amount → "12450.00"`; folding `cig` and `amount` produces the clean gist
`"Liquidazione fattura n. 45/2026 della ditta Sardatec S.r.l. - Capitolo
SC04.0123"` — the dash before the removed CIG collapses with no dangling
separator (SC-004); the `html` output marks the folded `cig` span (and its
`label`/`value` parts) with `data-fold`.
