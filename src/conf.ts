// A conf written as plain data → a compiled conf. Never throws: every problem
// becomes a CompileError, and only the tag it belongs to is left out.

export type Conf<P = string, R = string> = {
  version: string;
  patterns?: Record<string, string>;
  tags: Record<string, Tag<P, R>>;
};
export type Fate = 'separator' | 'connector' | 'bracket';
export type Tag<P = string, R = string> = {
  rx?: P;
  search?: Search<P>[];
  resolve?: R;
  weak?: boolean;
  fate?: Fate;
  effects?: Effect[];
  opaque?: boolean;
};
/** What a row does besides being a row: places a flag, a zero-width row, at its start or its end. */
export type Effect = { flag: string; at: 'start' | 'end' };
export type Search<P = string> = { from: string; back?: Atom<P>[]; forward?: Atom<P>[] };
export type Atom<P = string> =
  | { tag: string | string[]; as?: string; optional?: boolean; times?: number; min?: number; max?: number }
  | { rx: P; as?: string; optional?: boolean; stop?: string[] };
export type Resolve = (row: Readonly<Record<string, string>>) => string | null;
export interface CompileError {
  path: string;
  tag?: string;
  message: string;
}

/** Names usable in atoms, never declarable as tags. `as` may not take them either. */
const RESERVED = ['^', '$', '*'];
/** The tree's own tags: never declarable, and not in atoms either, since the chart never holds them. */
const TREE = ['doc', 'text'];
/** `as` names the role a resolver reads; `value` is the row's own text. */
const ROLE_RESERVED = ['value', ...RESERVED];
const KEYS = {
  conf: ['version', 'patterns', 'tags'],
  tag: ['rx', 'search', 'resolve', 'weak', 'fate', 'effects', 'opaque'],
  search: ['from', 'back', 'forward'],
  atom: ['tag', 'rx', 'skip', 'stop', 'as', 'optional', 'times', 'min', 'max'],
  effect: ['flag', 'at'],
};
/** A tag with neither `rx` nor `search`: its rows come only from other tags' effects. */
export const isFlag = (t: { rx?: unknown; search?: unknown }) => t.rx === undefined && t.search === undefined;
/** What a skip atom stands for: any gap, up to the row the next atom takes. */
const SKIP = /[\s\S]*/u;

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FRAGMENT = /%\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

type Obj = Record<string, unknown>;
type Errors = Omit<CompileError, 'tag'>[];
type Ctx = {
  patterns: ReadonlyMap<string, string>;
  resolvers: Readonly<Record<string, Resolve>>;
  declared: ReadonlySet<string>;
  flags: ReadonlySet<string>;
  roots: ReadonlySet<string>;
};

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isCount = (v: unknown, least: number): v is number => Number.isInteger(v) && (v as number) >= least;
const at = (base: string, key: string) => (base ? `${base}.${key}` : key);

function unknownKeys(o: Obj, allowed: readonly string[], base: string, errs: Errors) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) errs.push({ path: at(base, k), message: `unknown key "${k}"` });
}

/** `%{NAME}` → `(?:…)`, recursively. Throws on an unknown or circular pattern name. */
function expand(source: string, patterns: ReadonlyMap<string, string>, stack: readonly string[] = []): string {
  return source.replace(FRAGMENT, (_, name: string) => {
    const chain = [...stack, name];
    if (stack.includes(name)) throw new Error(`circular pattern ${chain.join(' → ')}`);
    const def = patterns.get(name);
    if (def === undefined) throw new Error(`unknown pattern %{${name}}`);
    return `(?:${expand(def, patterns, chain)})`;
  });
}

function pattern(v: unknown, path: string, ctx: Ctx, errs: Errors): RegExp | undefined {
  if (v === undefined) return void errs.push({ path, message: 'is required' });
  const cut = typeof v === 'string' && v[0] === '/' ? v.lastIndexOf('/') : -1;
  if (typeof v !== 'string' || cut < 1) return void errs.push({ path, message: 'must be a pattern string like /source/flags' });
  try {
    return new RegExp(expand(v.slice(1, cut), ctx.patterns), v.slice(cut + 1));
  } catch (e) {
    errs.push({ path, message: e instanceof Error ? e.message : String(e) });
  }
}

/** A tag name in an atom: a declared tag or a reserved name. A tag left out for its own errors still counts as declared. */
function tagName(v: unknown, path: string, ctx: Ctx, errs: Errors): void {
  if (!isText(v)) return void errs.push({ path, message: 'must be a non-empty string (a tag name)' });
  if (!RESERVED.includes(v) && !ctx.declared.has(v)) errs.push({ path, message: `unknown tag "${v}"` });
}

function atom(a: unknown, path: string, ctx: Ctx, errs: Errors): Atom<RegExp> | undefined {
  if (!isObj(a)) return void errs.push({ path, message: 'must be an object (an atom)' });
  const before = errs.length;
  unknownKeys(a, KEYS.atom, path, errs);
  if (Number('tag' in a) + Number('rx' in a) + Number('skip' in a) !== 1) errs.push({ path, message: 'must have exactly one of tag, rx and skip' });
  if ('skip' in a) {
    if (a.skip !== true) errs.push({ path: `${path}.skip`, message: 'must be true' });
    for (const k of ['optional', 'times', 'min', 'max']) if (k in a) errs.push({ path: `${path}.${k}`, message: 'a skip atom takes only as and stop' });
  }
  // A stop tag must be complete before any search runs, or a later pass could undo a skip already taken.
  const stop = typeof a.stop === 'string' ? [a.stop] : a.stop;
  if ('stop' in a) {
    if (!('skip' in a)) errs.push({ path: `${path}.stop`, message: 'only a skip atom takes stop' });
    else if (!Array.isArray(stop) || !stop.length) errs.push({ path: `${path}.stop`, message: 'must be a tag name or a non-empty list of them' });
    else stop.forEach((t: unknown, i) => {
      const p = Array.isArray(a.stop) ? `${path}.stop[${i}]` : `${path}.stop`;
      if (!isText(t) || !ctx.declared.has(t)) errs.push({ path: p, message: `unknown tag "${String(t)}"` });
      else if (!ctx.roots.has(t)) errs.push({ path: p, message: `"${t}" is not a root tag: a skip stops only at rows found by rx` });
    });
  }
  const counted = 'times' in a || 'min' in a || 'max' in a;
  if (counted) {
    if (!('tag' in a)) errs.push({ path, message: 'only a tag atom can be counted' });
    if ('optional' in a) errs.push({ path, message: 'a counted atom cannot also be optional: write min 0' });
    if ('times' in a) {
      if ('min' in a || 'max' in a) errs.push({ path, message: 'must have times, or min and max, not both' });
      else if (!isCount(a.times, 1)) errs.push({ path: `${path}.times`, message: 'must be a whole number, 1 or more' });
    } else if (!isCount(a.min, 0) || !isCount(a.max, Math.max(1, Number(a.min)))) errs.push({ path, message: 'min and max must both be whole numbers, 0 ≤ min ≤ max, max ≥ 1' });
  }
  if (a.as !== undefined) {
    if (!isText(a.as)) errs.push({ path: `${path}.as`, message: 'must be a non-empty string (a role name)' });
    else if (ROLE_RESERVED.includes(a.as)) errs.push({ path: `${path}.as`, message: `"${a.as}" is reserved and cannot name a role` });
  }
  if (a.optional !== undefined && typeof a.optional !== 'boolean') errs.push({ path: `${path}.optional`, message: 'must be a boolean' });
  let rx: RegExp | undefined;
  if ('skip' in a) rx = SKIP;
  else if ('rx' in a) rx = pattern(a.rx, `${path}.rx`, ctx, errs);
  else if ('tag' in a) {
    if (Array.isArray(a.tag)) {
      if (!a.tag.length) errs.push({ path: `${path}.tag`, message: 'must not be an empty list' });
      a.tag.forEach((t: unknown, i) => tagName(t, `${path}.tag[${i}]`, ctx, errs));
    } else tagName(a.tag, `${path}.tag`, ctx, errs);
  }
  if (errs.length > before) return;
  const extra = { ...(a.as !== undefined && { as: a.as as string }), ...(a.optional === true && { optional: true }) };
  if (rx === SKIP && stop) return { rx, ...extra, stop: stop as string[] };
  return rx ? { rx, ...extra } : { tag: a.tag as string | string[], ...extra };
}

/**
 * A counted atom, unrolled into plain atoms: the optional copies first, nearest
 * the cursor, then the required ones, so the outermost copy is required.
 * ponytail: the optional copies give the same rows in up to 2^(max-min) orders; fine for small counts.
 */
function unroll(a: Obj, compiled: Atom<RegExp>): Atom<RegExp>[] {
  if ('times' in a) return Array.from({ length: a.times as number }, () => compiled);
  if (!('max' in a)) return [compiled];
  const min = a.min as number;
  const max = a.max as number;
  return [...Array.from({ length: max - min }, () => ({ ...compiled, optional: true })), ...Array.from({ length: min }, () => compiled)];
}
/** Taking it can be skipped: optional, or counted from zero. */
const skippable = (a: unknown) => isObj(a) && (a.optional === true || a.min === 0);

function atoms(v: unknown, path: string, ctx: Ctx, errs: Errors): Atom<RegExp>[] | undefined {
  if (!Array.isArray(v) || !v.length) return void errs.push({ path, message: 'must be a non-empty array of atoms' });
  const before = errs.length;
  // A regex atom's extent is set by the row the next taken atom lands on, so
  // two regex atoms with only optional atoms between them cannot both be pinned.
  let rxOpen = false;
  const out = v.map((a: unknown, i) => {
    const p = `${path}[${i}]`;
    const compiled = atom(a, p, ctx, errs);
    const isRx = isObj(a) && ('rx' in a || 'skip' in a);
    if (isRx && rxOpen) errs.push({ path: p, message: 'two regex or skip atoms in a row (optional atoms between do not separate them): merge them into one pattern' });
    rxOpen = isRx || (rxOpen && skippable(a));
    return compiled && unroll(a as Obj, compiled);
  });
  // Skipped, the outermost optional atom would only leave dangling glue: a separator with nothing beyond it.
  const last = v[v.length - 1];
  if (skippable(last)) errs.push({ path: `${path}[${v.length - 1}]`, message: 'the outermost atom must not be optional' });
  // A skip runs up to the row the next atom takes; outermost, there is none.
  if (isObj(last) && 'skip' in last) errs.push({ path: `${path}[${v.length - 1}]`, message: 'a skip must have an atom after it' });
  return errs.length > before ? undefined : (out as Atom<RegExp>[][]).flat();
}

function search(s: unknown, path: string, ctx: Ctx, errs: Errors): Search<RegExp> | undefined {
  if (!isObj(s)) return void errs.push({ path, message: 'must be an object (a search)' });
  const before = errs.length;
  unknownKeys(s, KEYS.search, path, errs);
  if (!isText(s.from)) errs.push({ path: `${path}.from`, message: 'must be a non-empty string (a tag name)' });
  else if (s.from === '*' || (!RESERVED.includes(s.from) && !ctx.declared.has(s.from))) errs.push({ path: `${path}.from`, message: `unknown tag "${s.from}"` });
  if ('back' in s === 'forward' in s) errs.push({ path, message: 'must have exactly one of back and forward' });
  const back = 'back' in s ? atoms(s.back, `${path}.back`, ctx, errs) : undefined;
  const forward = 'forward' in s ? atoms(s.forward, `${path}.forward`, ctx, errs) : undefined;
  if (errs.length > before) return;
  return { from: s.from as string, ...(back && { back }), ...(forward && { forward }) };
}

function tag(t: unknown, path: string, ctx: Ctx, errs: Errors): Tag<RegExp, Resolve> | undefined {
  if (!isObj(t)) return void errs.push({ path, message: 'must be an object (a tag)' });
  const before = errs.length;
  unknownKeys(t, KEYS.tag, path, errs);
  if ('rx' in t && 'search' in t) errs.push({ path, message: 'must have at most one of rx and search' });
  if (isFlag(t)) for (const k of ['resolve', 'weak', 'fate', 'effects', 'opaque']) if (k in t) errs.push({ path: `${path}.${k}`, message: 'a flag (a tag with neither rx nor search) takes none of resolve, weak, fate, effects and opaque' });
  if (t.opaque !== undefined && typeof t.opaque !== 'boolean') errs.push({ path: `${path}.opaque`, message: 'must be a boolean' });
  let effects: Effect[] | undefined;
  if ('effects' in t) {
    if (!Array.isArray(t.effects) || !t.effects.length) errs.push({ path: `${path}.effects`, message: 'must be a non-empty array of effects' });
    else effects = t.effects.map((e: unknown, i) => effect(e, `${path}.effects[${i}]`, ctx, errs)).filter((e) => e !== undefined);
  }
  const rx = 'rx' in t ? pattern(t.rx, `${path}.rx`, ctx, errs) : undefined;
  let searches: Search<RegExp>[] | undefined;
  if ('search' in t) {
    if (!Array.isArray(t.search) || !t.search.length) errs.push({ path: `${path}.search`, message: 'must be a non-empty array of searches' });
    else searches = t.search.map((s: unknown, i) => search(s, `${path}.search[${i}]`, ctx, errs)).filter((s) => s !== undefined);
  }
  let resolve: Resolve | undefined;
  if (t.resolve !== undefined) {
    if (typeof t.resolve !== 'string') errs.push({ path: `${path}.resolve`, message: 'must be a string (a resolver name)' });
    else if (!Object.hasOwn(ctx.resolvers, t.resolve)) errs.push({ path: `${path}.resolve`, message: `unknown resolver "${t.resolve}"` });
    else resolve = ctx.resolvers[t.resolve];
  }
  if (t.weak !== undefined && typeof t.weak !== 'boolean') errs.push({ path: `${path}.weak`, message: 'must be a boolean' });
  if (t.fate !== undefined && t.fate !== 'separator' && t.fate !== 'connector' && t.fate !== 'bracket') errs.push({ path: `${path}.fate`, message: 'must be "separator", "connector" or "bracket"' });
  if (errs.length > before) return;
  return {
    ...(rx && { rx }),
    ...(searches && { search: searches }),
    ...(resolve && { resolve }),
    ...(t.weak === true && { weak: true }),
    ...(t.fate !== undefined && { fate: t.fate as Fate }),
    ...(effects && { effects }),
    ...(t.opaque === true && { opaque: true }),
  };
}

function effect(e: unknown, path: string, ctx: Ctx, errs: Errors): Effect | undefined {
  if (!isObj(e)) return void errs.push({ path, message: 'must be an object (an effect)' });
  const before = errs.length;
  unknownKeys(e, KEYS.effect, path, errs);
  if (!isText(e.flag)) errs.push({ path: `${path}.flag`, message: 'must be a non-empty string (a flag name)' });
  else if (!ctx.flags.has(e.flag)) errs.push({ path: `${path}.flag`, message: ctx.declared.has(e.flag) ? `"${e.flag}" is not a flag: a flag has neither rx nor search` : `unknown tag "${e.flag}"` });
  if (e.at !== 'start' && e.at !== 'end') errs.push({ path: `${path}.at`, message: 'must be "start" or "end"' });
  if (errs.length > before) return;
  return { flag: e.flag as string, at: e.at as Effect['at'] };
}

/**
 * Compile a conf written as data (typically `JSON.parse` output). `resolve`
 * names are looked up in `options.resolvers`; nothing in `data` is ever
 * evaluated as code. A tag with any error is left out; the others keep their
 * key order.
 */
export function compile(
  data: unknown,
  options: { resolvers?: Readonly<Record<string, Resolve>> } = {},
): { conf: Conf<RegExp, Resolve>; errors: CompileError[] } {
  const errors: CompileError[] = [];
  if (!isObj(data)) return { conf: { version: '', tags: {} }, errors: [{ path: '', message: 'must be an object (a conf)' }] };
  unknownKeys(data, KEYS.conf, '', errors);
  let version = '';
  if (!isText(data.version)) errors.push({ path: 'version', message: data.version === undefined ? 'is required' : 'must be a non-empty string' });
  else version = data.version;

  const patterns = new Map<string, string>();
  if (data.patterns !== undefined && !isObj(data.patterns)) errors.push({ path: 'patterns', message: 'must be an object of name → pattern source' });
  else if (data.patterns) {
    for (const [name, source] of Object.entries(data.patterns)) {
      if (!NAME.test(name)) errors.push({ path: `patterns.${name}`, message: 'a pattern name is letters, digits and _, not starting with a digit' });
      else if (typeof source !== 'string') errors.push({ path: `patterns.${name}`, message: 'must be a string (pattern source)' });
      else patterns.set(name, source);
    }
  }
  const kept = isObj(data.patterns) ? { patterns: data.patterns as Record<string, string> } : {};

  if (!isObj(data.tags)) {
    errors.push({ path: 'tags', message: data.tags === undefined ? 'is required' : 'must be an object of tags' });
    return { conf: { version, ...kept, tags: {} }, errors };
  }
  const flags = new Set(Object.entries(data.tags).filter(([, t]) => isObj(t) && isFlag(t)).map(([name]) => name));
  const roots = new Set(Object.entries(data.tags).filter(([, t]) => isObj(t) && 'rx' in t).map(([name]) => name));
  const ctx: Ctx = { patterns, resolvers: options.resolvers ?? {}, declared: new Set(Object.keys(data.tags)), flags, roots };
  const tags: Record<string, Tag<RegExp, Resolve>> = {};
  for (const [name, t] of Object.entries(data.tags)) {
    const found: Errors = [];
    if (RESERVED.includes(name) || TREE.includes(name)) found.push({ path: `tags.${name}`, message: `"${name}" is reserved and cannot be declared as a tag` });
    const compiled = tag(t, `tags.${name}`, ctx, found);
    for (const e of found) errors.push({ ...e, tag: name });
    if (!found.length && compiled) tags[name] = compiled;
  }
  return { conf: { version, ...kept, tags }, errors };
}
