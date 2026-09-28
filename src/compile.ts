// A book written as plain data → a Book. Never throws: every problem becomes a
// CompileError, and only the recipe it belongs to is left out.

import type { Book, CompileError, CompileOptions, Neighbour, Recipe, Resolver } from './types.ts';

/** The keys each object accepts and requires. `book.schema.json` must agree (tested). */
export const KEYS = {
  book: { all: ['$schema', 'version', 'defs', 'recipes'], required: ['version', 'recipes'] },
  recipe: {
    all: ['entity', 'anchor', 'left', 'right', 'requires', 'resolve', 'weak', 'rest', 'glued'],
    required: ['entity', 'anchor'],
  },
  neighbour: { all: ['part', 'rx'], required: ['part', 'rx'] },
};

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FRAGMENT = /%\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

type Obj = Record<string, unknown>;
type Errors = Omit<CompileError, 'recipe' | 'entity'>[];

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';
const at = (base: string, key: string) => (base ? `${base}.${key}` : key);

function unknownKeys(o: Obj, allowed: readonly string[], base: string, errs: Errors) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) errs.push({ path: at(base, k), message: `unknown key "${k}"` });
}

/** `%{NAME}` → `(?:…)`, recursively. Throws on an unknown or circular fragment. */
function expand(source: string, defs: ReadonlyMap<string, string>, stack: readonly string[] = []): string {
  return source.replace(FRAGMENT, (_, name: string) => {
    const chain = [...stack, name];
    if (stack.includes(name)) throw new Error(`circular fragment ${chain.join(' → ')}`);
    const def = defs.get(name);
    if (def === undefined) throw new Error(`unknown fragment %{${name}}`);
    return `(?:${expand(def, defs, chain)})`;
  });
}

function pattern(v: unknown, path: string, defs: ReadonlyMap<string, string>, errs: Errors): RegExp | undefined {
  if (v === undefined) return void errs.push({ path, message: 'is required' });
  const cut = typeof v === 'string' && v[0] === '/' ? v.lastIndexOf('/') : -1;
  if (typeof v !== 'string' || cut < 1) return void errs.push({ path, message: 'must be a pattern string like /source/flags' });
  try {
    return new RegExp(expand(v.slice(1, cut), defs), v.slice(cut + 1));
  } catch (e) {
    errs.push({ path, message: e instanceof Error ? e.message : String(e) });
  }
}

function text(v: unknown, path: string, errs: Errors): string | undefined {
  if (v === undefined) return void errs.push({ path, message: 'is required' });
  if (!isText(v)) return void errs.push({ path, message: 'must be a non-empty string' });
  return v;
}

function neighbours(v: unknown, path: string, defs: ReadonlyMap<string, string>, errs: Errors): Neighbour[] | undefined {
  if (v === undefined) return;
  if (!Array.isArray(v)) return void errs.push({ path, message: 'must be an array of neighbours' });
  return v.flatMap((n: unknown, j) => {
    const p = `${path}[${j}]`;
    if (!isObj(n)) {
      errs.push({ path: p, message: 'must be an object (a neighbour)' });
      return [];
    }
    unknownKeys(n, KEYS.neighbour.all, p, errs);
    const part = text(n.part, `${p}.part`, errs);
    const rx = pattern(n.rx, `${p}.rx`, defs, errs);
    return part !== undefined && rx ? [{ part, rx }] : [];
  });
}

function recipe(r: unknown, path: string, defs: ReadonlyMap<string, string>, resolvers: Readonly<Record<string, Resolver>>, errs: Errors): Recipe | undefined {
  if (!isObj(r)) return void errs.push({ path, message: 'must be an object (a recipe)' });
  unknownKeys(r, KEYS.recipe.all, path, errs);
  const entity = text(r.entity, `${path}.entity`, errs);
  const anchor = pattern(r.anchor, `${path}.anchor`, defs, errs);
  const left = neighbours(r.left, `${path}.left`, defs, errs);
  const right = neighbours(r.right, `${path}.right`, defs, errs);
  if (r.requires !== undefined && !(Array.isArray(r.requires) && r.requires.every((x) => typeof x === 'string'))) {
    errs.push({ path: `${path}.requires`, message: 'must be an array of strings' });
  }
  let resolve: Resolver | undefined;
  if (r.resolve !== undefined) {
    if (typeof r.resolve !== 'string') errs.push({ path: `${path}.resolve`, message: 'must be a string (a resolver name)' });
    else if (!Object.hasOwn(resolvers, r.resolve)) errs.push({ path: `${path}.resolve`, message: `unknown resolver "${r.resolve}"` });
    else resolve = resolvers[r.resolve];
  }
  for (const flag of ['weak', 'rest', 'glued'] as const) {
    if (r[flag] !== undefined && typeof r[flag] !== 'boolean') errs.push({ path: `${path}.${flag}`, message: 'must be a boolean' });
  }
  if (entity === undefined || !anchor) return;
  return {
    entity,
    anchor,
    ...(left && { left }),
    ...(right && { right }),
    ...(Array.isArray(r.requires) && { requires: r.requires.filter((x): x is string => typeof x === 'string') }),
    ...(resolve && { resolve }),
    ...(r.weak === true && { weak: true }),
    ...(r.rest === true && { rest: true }),
    ...(r.glued === true && { glued: true }),
  };
}

/**
 * Compile a book written as data (typically `JSON.parse` output) into a Book.
 * `resolve` names are looked up in `options.resolvers`; nothing in `data` is
 * ever evaluated as code. A recipe with any error is left out; the others
 * keep their order.
 */
export function compile(data: unknown, options: CompileOptions = {}): { book: Book; errors: CompileError[] } {
  if (!isObj(data)) return { book: { version: '', recipes: [] }, errors: [{ path: '', message: 'must be an object (a book)' }] };
  const errors: CompileError[] = [];
  unknownKeys(data, KEYS.book.all, '', errors);
  const version = text(data.version, 'version', errors) ?? '';

  const defs = new Map<string, string>();
  if (data.defs !== undefined && !isObj(data.defs)) errors.push({ path: 'defs', message: 'must be an object of name → pattern source' });
  else if (data.defs) {
    for (const [name, source] of Object.entries(data.defs)) {
      if (!NAME.test(name)) errors.push({ path: `defs.${name}`, message: 'a fragment name is letters, digits and _, not starting with a digit' });
      else if (typeof source !== 'string') errors.push({ path: `defs.${name}`, message: 'must be a string (pattern source)' });
      else defs.set(name, source);
    }
  }

  if (!Array.isArray(data.recipes)) {
    errors.push({ path: 'recipes', message: data.recipes === undefined ? 'is required' : 'must be an array of recipes' });
    return { book: { version, recipes: [] }, errors };
  }

  const recipes: Recipe[] = [];
  data.recipes.forEach((r: unknown, i) => {
    const found: Errors = [];
    const compiled = recipe(r, `recipes[${i}]`, defs, options.resolvers ?? {}, found);
    const entity = isObj(r) && isText(r.entity) ? r.entity : undefined;
    for (const e of found) errors.push({ ...e, recipe: i, ...(entity !== undefined && { entity }) });
    if (!found.length && compiled) recipes.push(compiled);
  });
  return { book: { version, recipes }, errors };
}
