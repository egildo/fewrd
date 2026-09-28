// fewrd-play's server, end to end over HTTP, against a temp book folder and a
// stand-in for fewrd's dist/ (so no build is needed).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { play } from '../play/server.ts';

let root: string;
let dir: string;
let server: Server;
let base: string;

const BOOK = '{ "version": "t@1", "recipes": [] }';

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'fewrd-play-'));
  dir = join(root, 'book');
  const lib = join(root, 'dist');
  await mkdir(dir);
  await mkdir(lib);
  await writeFile(join(dir, 'book.json'), BOOK);
  await writeFile(join(dir, 'cases.json'), JSON.stringify([{ name: 'committed', text: 'a' }]));
  await writeFile(join(dir, 'cases.local.json'), JSON.stringify([{ name: 'local', text: 'b' }]));
  await writeFile(
    join(dir, 'resolvers.ts'),
    "import { type Resolver } from 'fewrd';\nimport { upper } from './upper.ts';\nexport const resolvers: Record<string, Resolver> = { upper };\n",
  );
  await writeFile(join(dir, 'upper.ts'), 'export const upper = (p: Record<string, string>): string => p.value.toUpperCase();\n');
  await writeFile(join(dir, 'secret.txt'), 'nope');
  await writeFile(join(lib, 'playground.js'), '/* playground */');
  await writeFile(join(root, 'outside.json'), '{}');
  server = play({ dir, fewrd: lib });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((ok) => server.close(ok));
  await rm(root, { recursive: true, force: true });
});

test('the page maps fewrd onto the installed library and loads the folder resolvers', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /"fewrd\/playground": "\/@fewrd\/playground\.js"/);
  assert.match(html, /import\('\/resolvers\.ts'\)/);
  assert.match(html, /<h1>book<\/h1>/);
});

test('cases.json and cases.local.json are served as one list, committed first', async () => {
  const list = await (await fetch(`${base}/cases.json`)).json();
  assert.deepEqual(list.map((c: { name: string }) => c.name), ['committed', 'local']);
});

test('.ts files go out as JavaScript with their types stripped, relative imports intact', async () => {
  const r = await fetch(`${base}/resolvers.ts`);
  assert.match(r.headers.get('content-type') ?? '', /javascript/);
  const js = await r.text();
  assert.doesNotMatch(js, /Record<|: Resolver|type Resolver/);
  assert.match(js, /from '\.\/upper\.ts'/);
  assert.doesNotMatch(await (await fetch(`${base}/upper.ts`)).text(), /: string/);
});

test('the library is served from its own folder', async () => {
  assert.equal(await (await fetch(`${base}/@fewrd/playground.js`)).text(), '/* playground */');
});

test('nothing outside the folder, and no other file types, are served', async () => {
  for (const path of ['/secret.txt', '/..%2Foutside.json', '/@fewrd/..%2Foutside.json', '/@fewrd/..%2Fbook%2Fbook.json', '/missing.json']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  }
});

test('save writes book.json, and refuses what is not JSON', async () => {
  const bad = await fetch(`${base}/book.json`, { method: 'POST', body: '{ nope' });
  assert.equal(bad.status, 400);
  assert.equal(await readFile(join(dir, 'book.json'), 'utf8'), BOOK);

  const text = '{\n  "version": "t@2",\n  "recipes": []\n}';
  assert.equal((await fetch(`${base}/book.json`, { method: 'POST', body: text })).status, 200);
  assert.equal(await readFile(join(dir, 'book.json'), 'utf8'), `${text}\n`);
});

test('without a resolvers file the page loads none', async () => {
  const bare = join(root, 'bare');
  await mkdir(bare);
  await writeFile(join(bare, 'book.json'), BOOK);
  const s = play({ dir: bare, fewrd: join(root, 'dist') });
  await new Promise<void>((ok) => s.listen(0, '127.0.0.1', ok));
  const html = await (await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/`)).text();
  await new Promise((ok) => s.close(ok));
  assert.doesNotMatch(html, /import\('\//);
});
