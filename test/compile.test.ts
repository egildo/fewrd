// compile() is core mechanics: toy books only, never a domain's patterns.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile, read, type Book, type CompileError } from '../src/index.ts';
import { KEYS } from '../src/compile.ts';

const lower = (p: Readonly<Record<string, string>>) => p.value.toLowerCase();

/** Compile a book of the given recipes, around one bad recipe at index 1. */
function around(bad: unknown, defs?: Record<string, unknown>) {
  return compile(
    { version: 't@1', defs, recipes: [{ entity: 'ok1', anchor: '/a/u' }, bad, { entity: 'ok2', anchor: '/b/u' }] },
    { resolvers: { lower } },
  );
}

function assertOneError(r: { book: Book; errors: CompileError[] }, path: string, message: RegExp, entity?: string) {
  const at = r.errors.filter((e) => e.path === path);
  assert.equal(at.length, 1, `expected one error at ${path}, got ${JSON.stringify(r.errors)}`);
  assert.match(at[0].message, message);
  assert.equal(at[0].recipe, 1);
  assert.equal(at[0].entity, entity);
  assert.deepEqual(r.book.recipes.map((x) => x.entity), ['ok1', 'ok2']);
}

test('a data book reads exactly like the same book written in code', () => {
  const hand: Book = {
    version: 'toy@1',
    recipes: [
      {
        entity: 'code',
        anchor: /[A-Z]{3}\d{3}/u,
        left: [{ part: 'label', rx: /code\s*:?\s*/iu }],
        right: [{ part: 'year', rx: /\s*\/\s*\d{4}/u }],
        requires: ['label'],
        resolve: lower,
      },
      { entity: 'word', anchor: /[A-Z]{4,}/u, weak: true },
    ],
  };
  const { book, errors } = compile(
    {
      version: 'toy@1',
      defs: { CODE: '[A-Z]{3}\\d{3}' },
      recipes: [
        {
          entity: 'code',
          anchor: '/%{CODE}/u',
          left: [{ part: 'label', rx: '/code\\s*:?\\s*/iu' }],
          right: [{ part: 'year', rx: '/\\s*/\\s*\\d{4}/u' }],
          requires: ['label'],
          resolve: 'lower',
        },
        { entity: 'word', anchor: '/[A-Z]{4,}/u', weak: true },
      ],
    },
    { resolvers: { lower } },
  );
  assert.deepEqual(errors, []);
  for (const text of ['Code: ABC123 / 2024 and HELLO world', 'ABC123 alone, HELLO', 'nothing here']) {
    assert.equal(JSON.stringify(read(text, book)), JSON.stringify(read(text, hand)));
  }
});

test('flags are carried through', () => {
  const { book } = compile({ version: 't@1', recipes: [{ entity: 'x', anchor: '/abc/iu' }] });
  assert.equal(book.recipes[0].anchor.flags, 'iu');
  assert.ok(book.recipes[0].anchor.test('ABC'));
});

test('fragments nest, and splice in as one unit', () => {
  const { book, errors } = compile({
    version: 't@1',
    defs: { A: 'a|b', B: 'x%{A}' },
    recipes: [{ entity: 'x', anchor: '/%{B}y/u' }],
  });
  assert.deepEqual(errors, []);
  const rx = book.recipes[0].anchor;
  assert.ok(rx.test('xay') && rx.test('xby'));
  assert.ok(!rx.test('b'), 'alternation leaked out of its fragment');
});

test('an escaped %\\{ is a literal, not a fragment', () => {
  const { book, errors } = compile({ version: 't@1', recipes: [{ entity: 'x', anchor: '/%\\{A\\}/u' }] });
  assert.deepEqual(errors, []);
  assert.ok(book.recipes[0].anchor.test('%{A}'));
});

test('an invalid regex is reported on its recipe, the rest survive in order', () => {
  assertOneError(around({ entity: 'bad', anchor: '/(/u' }), 'recipes[1].anchor', /invalid regular expression/i, 'bad');
});

test('invalid flags are reported', () => {
  assertOneError(around({ entity: 'bad', anchor: '/a/q' }), 'recipes[1].anchor', /flag/i, 'bad');
});

test('a pattern without its slashes is reported', () => {
  assertOneError(around({ entity: 'bad', anchor: 'abc' }), 'recipes[1].anchor', /\/source\/flags/, 'bad');
  assertOneError(around({ entity: 'bad', anchor: '/abc' }), 'recipes[1].anchor', /\/source\/flags/, 'bad');
});

test('an unknown fragment is reported', () => {
  assertOneError(around({ entity: 'bad', anchor: '/%{NOPE}/u' }), 'recipes[1].anchor', /unknown fragment %\{NOPE\}/, 'bad');
});

test('a circular fragment is reported with its chain', () => {
  const r = around({ entity: 'bad', anchor: '/%{A}/u' }, { A: 'x%{B}', B: 'y%{A}' });
  assertOneError(r, 'recipes[1].anchor', /A → B → A/, 'bad');
});

test('an unknown resolver is reported', () => {
  assertOneError(around({ entity: 'bad', anchor: '/c/u', resolve: 'nope' }), 'recipes[1].resolve', /unknown resolver "nope"/, 'bad');
});

test('wrongly-typed fields are reported', () => {
  assertOneError(around({ entity: 'bad', anchor: '/c/u', weak: 'yes' }), 'recipes[1].weak', /boolean/, 'bad');
  assertOneError(around({ entity: 'bad', anchor: 3 }), 'recipes[1].anchor', /\/source\/flags/, 'bad');
  assertOneError(around({ entity: 'bad', anchor: '/c/u', requires: 'label' }), 'recipes[1].requires', /array of strings/, 'bad');
});

test('unknown keys are reported, so typos never pass silently', () => {
  assertOneError(around({ entity: 'bad', anchor: '/c/u', wek: true }), 'recipes[1].wek', /unknown key/, 'bad');
});

test('missing required fields are reported', () => {
  assertOneError(around({ anchor: '/c/u' }), 'recipes[1].entity', /required/);
  assertOneError(around({ entity: 'bad' }), 'recipes[1].anchor', /required/, 'bad');
  assertOneError(around({ entity: 'bad', anchor: '/c/u', left: [{ rx: '/l/u' }] }), 'recipes[1].left[0].part', /required/, 'bad');
  assertOneError(around({ entity: 'bad', anchor: '/c/u', right: [{ part: 'p' }] }), 'recipes[1].right[0].rx', /required/, 'bad');
  assertOneError(around('not a recipe'), 'recipes[1]', /object/);
});

test('a recipe with several problems reports all of them', () => {
  const r = around({ entity: 'bad', anchor: '/(/u', resolve: 'nope' });
  assert.deepEqual(r.errors.map((e) => e.path), ['recipes[1].anchor', 'recipes[1].resolve']);
});

test('a non-string fragment is reported where it is declared', () => {
  const r = compile({ version: 't@1', defs: { N: 3 }, recipes: [] });
  assert.deepEqual(r.errors.map((e) => e.path), ['defs.N']);
});

test('an empty book compiles clean; unused resolvers and $schema are fine', () => {
  const r = compile({ $schema: './book.schema.json', version: 't@1', recipes: [] }, { resolvers: { lower } });
  assert.deepEqual(r, { book: { version: 't@1', recipes: [] }, errors: [] });
});

test('structural failures at the root give an empty book and a root error', () => {
  assert.deepEqual(compile(null).errors.map((e) => e.path), ['']);
  assert.deepEqual(compile(null).book, { version: '', recipes: [] });
  const noList = compile({ version: 't@1', recipes: 'none' });
  assert.deepEqual(noList.errors.map((e) => e.path), ['recipes']);
  assert.deepEqual(noList.book, { version: 't@1', recipes: [] });
  const noVersion = compile({ recipes: [] });
  assert.deepEqual(noVersion.errors.map((e) => e.path), ['version']);
  assert.equal(noVersion.book.version, '');
  assert.deepEqual(compile({ version: 't@1', recipes: [], extra: 1 }).errors.map((e) => e.path), ['extra']);
});

test('book.schema.json accepts and requires exactly what compile does', () => {
  interface Shape { properties: Record<string, unknown>; required: string[] }
  const schema: Shape & { $defs: Record<'recipe' | 'neighbour', Shape> } = JSON.parse(
    readFileSync(new URL('../book.schema.json', import.meta.url), 'utf8'),
  );
  const sorted = (xs: readonly string[]) => [...xs].sort();
  for (const [name, shape] of [['book', schema], ['recipe', schema.$defs.recipe], ['neighbour', schema.$defs.neighbour]] as const) {
    assert.deepEqual(sorted(Object.keys(shape.properties)), sorted(KEYS[name].all), `${name} keys`);
    assert.deepEqual(sorted(shape.required), sorted(KEYS[name].required), `${name} required`);
  }
});

test('compiling is deterministic', () => {
  const data = { version: 't@1', defs: { A: 'a' }, recipes: [{ entity: 'x', anchor: '/%{A}/u' }, { entity: 'y', anchor: '/(/u' }] };
  assert.deepEqual(compile(data), compile(data));
});
