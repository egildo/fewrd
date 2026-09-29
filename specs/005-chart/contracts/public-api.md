# Contract: public API (rewrite, phase 1)

Two entries, as before: `fewrd` (`src/index.ts`) and `fewrd/playground` (`src/playground.ts`). Everything else in `src/` is internal.

## `fewrd`

```ts
// conf.ts
export type Conf<P = string, R = string> = { version: string; patterns?: Record<string, string>; tags: Record<string, Tag<P, R>> };
export type Tag<P = string, R = string> = { rx?: P; search?: Search<P>[]; resolve?: R; weak?: boolean; fate?: 'separator' | 'connector' };
export type Search<P = string> = { from: string; back?: Atom<P>[]; forward?: Atom<P>[] };
export type Atom<P = string> =
  | { tag: string | string[]; as?: string; optional?: boolean }
  | { rx: P; as?: string; optional?: boolean };
export type Resolve = (row: Readonly<Record<string, string>>) => string | null;
export interface CompileError { path: string; tag?: string; message: string }

export function compile(
  data: unknown,
  options?: { resolvers?: Readonly<Record<string, Resolve>> },
): { conf: Conf<RegExp, Resolve>; errors: CompileError[] };

// chart.ts
export type Span = readonly [start: number, end: number];
export type AllenRelation =
  | 'before' | 'meets' | 'overlaps' | 'starts' | 'during' | 'finishes' | 'equals'
  | 'after' | 'met-by' | 'overlapped-by' | 'started-by' | 'contains' | 'finished-by';

export class Chart {
  static empty(n: number): Chart;
  static from(json: Record<string, readonly Span[]>): Chart;
  toJSON(): Record<string, Span[]>;
  with(rows: Iterable<readonly [tag: string, span: Span]>): Chart;
  size(): number;
  has(tag: string, start: number, end: number): boolean;
  after(tag: string, pos: number): Span | undefined;
  before(tag: string, pos: number): Span | undefined;
  spans(tag: string): readonly Span[];
  all(): Iterable<readonly [tag: string, span: Span]>;
}
export function rel(a: Span, b: Span): AllenRelation;

// find.ts
export function find(text: string, conf: Conf<RegExp, Resolve>): Chart;
```

`index.ts` re-exports exactly these. `normalise` stays internal.

Behaviour: [spec.md](../spec.md), requirements `conf-is-plain-data` to `find-is-deterministic`.

## `fewrd/playground`

```ts
export interface PlaygroundCase { name: string; text: string }

export function mount(
  el: HTMLElement,
  options: { conf: unknown; resolvers?: Readonly<Record<string, Resolve>>; cases: readonly PlaygroundCase[] },
): void;

/** Stack rows into lanes: each row on the first lane whose last row ends at or before its start. */
export function lanes(rows: Iterable<readonly [tag: string, span: Span]>): (readonly [tag: string, span: Span])[][];
```

`conf` is the data form (typically a JSON import); `mount` shows it in the editor and compiles it with `resolvers`. `lanes` is exported for its test and for anyone drawing a chart their own way.

Behaviour: requirements `playground-mount` to `dev-opens-italian`.

## Removed

`read`, `gist`, `html`, `shown`, `compile`'s old `BookData` form, the types `Book`, `Recipe`, `Neighbour`, `Mention`, `Leaf`, `Cuts`, `Fold`, `BookData`, `RecipeData`, `NeighbourData`, and the `fewrd/book.schema.json` export. The old `mount` options `data`, `book`, `fold`, `save` are gone.
