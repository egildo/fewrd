import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, type Resolve } from '../src/index.ts';

const W = { rx: '/[a-z]+/u' };
const conf = (tags: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ version: 't@1', tags, ...extra });
const errorsOf = (data: unknown, resolvers?: Record<string, Resolve>) => compile(data, { resolvers }).errors;
/** The one error a broken tag `bad` yields, and that `bad` is out while `w` is kept. */
function oneError(bad: unknown, path: string, message?: RegExp, resolvers?: Record<string, Resolve>) {
  const { conf: c, errors } = compile(conf({ w: W, bad }), { resolvers });
  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.equal(errors[0].path, path);
  assert.equal(errors[0].tag, 'bad');
  if (message) assert.match(errors[0].message, message);
  assert.deepEqual(Object.keys(c.tags), ['w']);
}
const search = (o: unknown) => ({ search: [o] });

test('compile-never-throws: garbage in, errors out', () => {
  for (const junk of [null, [], 'x', 42, {}, undefined, { version: 1, tags: 3 }, { version: 't', tags: [] }]) {
    const r = compile(junk);
    assert.ok(r.errors.length > 0, JSON.stringify(junk));
  }
});

test('compile-never-throws: a clean conf has no errors and keeps every tag', () => {
  const r = compile(conf({ w: W, s: search({ from: 'w', forward: [{ tag: 'w' }] }) }));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r.conf.tags), ['w', 's']);
});

test('compile-never-throws: unknown tag in from', () => oneError(search({ from: 'nope', forward: [{ tag: 'w' }] }), 'tags.bad.search[0].from', /unknown tag "nope"/));
test('compile-never-throws: unknown tag in an atom', () => oneError(search({ from: 'w', forward: [{ tag: 'nope' }] }), 'tags.bad.search[0].forward[0].tag', /unknown tag/));
test('compile-never-throws: unknown tag inside an atom list', () =>
  oneError(search({ from: 'w', back: [{ tag: ['w', 'nope'] }] }), 'tags.bad.search[0].back[0].tag[1]', /unknown tag "nope"/));
test('compile-never-throws: both rx and search', () => oneError({ rx: '/a/u', search: [{ from: 'w', forward: [{ tag: 'w' }] }] }, 'tags.bad', /exactly one of rx and search/));
test('compile-never-throws: neither rx nor search', () => oneError({}, 'tags.bad', /exactly one of rx and search/));
test('compile-never-throws: both back and forward', () =>
  oneError(search({ from: 'w', back: [{ tag: 'w' }], forward: [{ tag: 'w' }] }), 'tags.bad.search[0]', /exactly one of back and forward/));
test('compile-never-throws: neither back nor forward', () => oneError(search({ from: 'w' }), 'tags.bad.search[0]', /exactly one of back and forward/));
test('compile-never-throws: a pattern that is not /source/flags', () => oneError({ rx: 'abc' }, 'tags.bad.rx', /\/source\/flags/));
test('compile-never-throws: a regex the engine rejects', () => oneError({ rx: '/(/u' }, 'tags.bad.rx'));
test('compile-never-throws: an unknown %{NAME}', () => oneError({ rx: '/%{NOPE}/u' }, 'tags.bad.rx', /unknown pattern %\{NOPE\}/));
test('compile-never-throws: a circular %{}', () => {
  const { errors } = compile(conf({ bad: { rx: '/%{A}/u' } }, { patterns: { A: '%{B}', B: '%{A}' } }));
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /circular pattern A → B → A/);
  assert.equal(errors[0].tag, 'bad');
});
test('compile-never-throws: an unknown resolver', () => oneError({ rx: '/a/u', resolve: 'nope' }, 'tags.bad.resolve', /unknown resolver "nope"/));
test('compile-never-throws: a reserved name declared as a tag', () => {
  for (const name of ['^', '$', '*']) {
    const { conf: c, errors } = compile(conf({ w: W, [name]: W }));
    assert.equal(errors.length, 1);
    assert.equal(errors[0].tag, name);
    assert.match(errors[0].message, /reserved/);
    assert.deepEqual(Object.keys(c.tags), ['w']);
  }
});
test('compile-never-throws: a reserved name in from is an unknown tag', () => {
  for (const name of ['^', '$', '*']) oneError(search({ from: name, forward: [{ tag: 'w' }] }), 'tags.bad.search[0].from', /unknown tag/);
});
test('compile-never-throws: reserved names are fine in atoms', () => {
  assert.deepEqual(errorsOf(conf({ w: W, a: search({ from: 'w', back: [{ tag: '^' }] }), b: search({ from: 'w', forward: [{ tag: ['$', '*'] }] }) })), []);
});
test('compile-never-throws: wrong types', () => {
  assert.equal(compile({ version: '', tags: {} }).errors[0].path, 'version');
  assert.equal(compile({ version: 5, tags: {} }).errors[0].path, 'version');
  assert.equal(compile({ tags: {} }).errors[0].path, 'version');
  assert.equal(compile({ version: 'a' }).errors[0].path, 'tags');
  oneError({ rx: '/a/u', weak: 'yes' }, 'tags.bad.weak', /boolean/);
  oneError({ rx: '/a/u', fate: 'bracket' }, 'tags.bad.fate', /separator/);
  oneError('nope', 'tags.bad', /object/);
  oneError(search('nope'), 'tags.bad.search[0]', /object/);
  oneError(search({ from: 'w', forward: ['nope'] }), 'tags.bad.search[0].forward[0]', /object/);
  oneError(search({ from: 'w', forward: [{ tag: 'w', optional: 'yes' }, { tag: 'w' }] }), 'tags.bad.search[0].forward[0].optional', /boolean/);
  oneError(search({ from: 'w', forward: [] }), 'tags.bad.search[0].forward', /non-empty/);
  oneError({ search: [] }, 'tags.bad.search', /non-empty/);
  oneError(search({ from: 'w', forward: [{ tag: 'w', rx: '/a/u' }] }), 'tags.bad.search[0].forward[0]', /exactly one of tag and rx/);
  oneError(search({ from: 'w', forward: [{}] }), 'tags.bad.search[0].forward[0]', /exactly one of tag and rx/);
});

test('compile-never-throws: unknown keys are errors naming the path', () => {
  const { errors } = compile({ version: 't@1', tags: { w: W }, extra: 1 });
  assert.deepEqual(errors, [{ path: 'extra', message: 'unknown key "extra"' }]);
  oneError({ rx: '/a/u', wek: true }, 'tags.bad.wek', /unknown key "wek"/);
  oneError(search({ from: 'w', forward: [{ tag: 'w' }], bak: [] }), 'tags.bad.search[0].bak', /unknown key/);
  oneError(search({ from: 'w', forward: [{ tag: 'w' }, { tag: 'w', optinal: true }] }), 'tags.bad.search[0].forward[1].optinal', /unknown key "optinal"/);
});

test('compile-never-throws: as may not be value or a reserved name', () => {
  for (const as of ['value', '^', '$', '*']) {
    oneError(search({ from: 'w', forward: [{ tag: 'w', as }] }), 'tags.bad.search[0].forward[0].as', /reserved/);
  }
  oneError(search({ from: 'w', forward: [{ rx: '/a/u', as: '' }] }), 'tags.bad.search[0].forward[0].as', /non-empty/);
  assert.deepEqual(errorsOf(conf({ w: W, ok: search({ from: 'w', forward: [{ tag: 'w', as: 'label' }] }) })), []);
});

test('compile-never-throws: the outermost atom must not be optional', () => {
  oneError(search({ from: 'w', forward: [{ tag: 'w' }, { tag: 'w', optional: true }] }), 'tags.bad.search[0].forward[1]', /outermost atom must not be optional/);
  oneError(search({ from: 'w', back: [{ tag: 'w', optional: true }] }), 'tags.bad.search[0].back[0]', /outermost/);
  oneError(search({ from: 'w', back: [{ rx: '/a/u', optional: true }] }), 'tags.bad.search[0].back[0]', /outermost/);
  // Optional atoms inside are fine.
  assert.deepEqual(errorsOf(conf({ w: W, ok: search({ from: 'w', forward: [{ tag: 'w', optional: true }, { tag: 'w' }] }) })), []);
});

test('compile-never-throws: two regex atoms in a row', () => {
  oneError(search({ from: 'w', forward: [{ rx: '/a/u' }, { rx: '/b/u' }] }), 'tags.bad.search[0].forward[1]', /merge them into one pattern/);
  oneError(search({ from: 'w', back: [{ rx: '/a/u' }, { tag: 'w', optional: true }, { rx: '/b/u' }] }), 'tags.bad.search[0].back[2]', /merge them/);
  // A required tag atom between them is fine.
  assert.deepEqual(errorsOf(conf({ w: W, ok: search({ from: 'w', forward: [{ rx: '/a/u' }, { tag: 'w' }, { rx: '/b/u' }] }) })), []);
});

test('compile-never-throws: one broken tag', () => {
  const { conf: c, errors } = compile(conf({ a: W, bad: { rx: '/(/u' }, z: W }));
  assert.equal(errors.length, 1);
  assert.deepEqual(Object.keys(c.tags), ['a', 'z']);
});

test('compile-never-throws: a reference to a left-out tag', () => {
  const { conf: c, errors } = compile(conf({ a: { rx: '/(/u' }, b: search({ from: 'a', forward: [{ tag: 'a' }] }) }));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].tag, 'a');
  assert.deepEqual(Object.keys(c.tags), ['b']);
});

test('patterns-splice-by-name', () => {
  const { conf: c, errors } = compile(conf({ t: { rx: '/%{X}c/u' }, u: { rx: '/%{Y}/u' }, v: { rx: '/%\\{X\\}/u' } }, { patterns: { X: 'a|b', Y: '<%{X}>' } }));
  assert.deepEqual(errors, []);
  const t = c.tags.t.rx!;
  assert.ok(t.test('ac') && t.test('bc'));
  assert.equal(t.test('a'), false, 'X is one unit, `a|b` does not leak');
  const u = c.tags.u.rx!;
  assert.ok(u.test('<a>') && u.test('<b>'));
  assert.ok(c.tags.v.rx!.test('%{X}'), '%\\{ stays literal');
});

test('resolvers-by-name', () => {
  const up: Resolve = (p) => p.value.toUpperCase();
  const { conf: c, errors } = compile(conf({ t: { rx: '/a/u', resolve: 'up' } }), { resolvers: { up } });
  assert.deepEqual(errors, []);
  assert.equal(c.tags.t.resolve, up);
});

test('conf-is-plain-data: weak, fate and patterns pass through', () => {
  const patterns = { X: 'a' };
  const { conf: c } = compile(conf({ t: { rx: '/%{X}/u', weak: true, fate: 'separator' }, u: { rx: '/b/u', fate: 'connector' } }, { patterns }));
  assert.equal(c.tags.t.weak, true);
  assert.equal(c.tags.t.fate, 'separator');
  assert.equal(c.tags.u.fate, 'connector');
  assert.deepEqual(c.patterns, patterns);
  assert.equal(c.version, 't@1');
});

test('priority-is-key-order: compiled tags keep the data key order', () => {
  const { conf: c } = compile(conf({ z: W, a: W, m: W }));
  assert.deepEqual(Object.keys(c.tags), ['z', 'a', 'm']);
});
