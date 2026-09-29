import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { play } from '../play/server.ts';

const root = mkdtempSync(join(tmpdir(), 'fewrd-play-'));
const dir = join(root, 'shop');
const lib = join(root, 'lib');
mkdirSync(dir);
mkdirSync(lib);
writeFileSync(join(root, 'secret.json'), '{"secret":true}');
writeFileSync(join(lib, 'playground.js'), 'export const mount = 1;');
writeFileSync(join(dir, 'conf.json'), JSON.stringify({ version: 'shop@1', tags: { sku: { rx: '/[A-Z]{3}-\\d{4}/u' } } }));
writeFileSync(join(dir, 'cases.json'), JSON.stringify([{ name: 'refund', text: 'Refund SKU: ABC-1234', fold: ['sku'], gist: 'Refund SKU:' }]));
writeFileSync(join(dir, 'cases.local.json'), JSON.stringify([{ name: 'real', text: 'kept out of git' }]));
writeFileSync(join(dir, 'resolvers.ts'), 'export const resolvers: Record<string, (p: { value: string }) => string> = { upper: (p) => p.value.toUpperCase() };');

async function get(server: Server, path: string, method = 'GET'): Promise<{ status: number; body: string }> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
async function served<T>(run: (server: Server) => Promise<T>): Promise<T> {
  const server = play({ dir, fewrd: lib });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  try {
    return await run(server);
  } finally {
    server.close();
  }
}

test('fewrd-play-folder: serves conf.json and merged cases, and a page that mounts them', () =>
  served(async (server) => {
    assert.deepEqual(JSON.parse((await get(server, '/conf.json')).body).version, 'shop@1');
    assert.deepEqual(JSON.parse((await get(server, '/cases.json')).body).map((c: { name: string }) => c.name), ['refund', 'real']);
    const page = (await get(server, '/')).body;
    assert.match(page, /confs: \{ \[name\]/);
    assert.match(page, /import\('\/resolvers\.ts'\)/);
    assert.match(page, /fewrd\/playground/);
    assert.ok(!/save/.test(page), 'the page has no save');
    assert.match((await get(server, '/resolvers.ts')).body, /export const resolvers/);
    assert.ok(!/Record</.test((await get(server, '/resolvers.ts')).body), 'types are stripped');
    assert.equal((await get(server, '/@fewrd/playground.js')).status, 200);
  }));

test('fewrd-play-folder: POST is refused', () =>
  served(async (server) => {
    assert.equal((await get(server, '/conf.json', 'POST')).status, 405);
    assert.equal((await get(server, '/cases.json', 'PUT')).status, 405);
  }));

test('fewrd-play-folder: a file outside the folder is 404', () =>
  served(async (server) => {
    assert.equal((await get(server, '/..%2Fsecret.json')).status, 404);
    assert.equal((await get(server, '/nothing.json')).status, 404);
    assert.equal((await get(server, '/conf.txt')).status, 404);
  }));

test('fewrd-play-folder: a title cannot close the script', async () => {
  const { page } = await import('../play/server.ts');
  assert.ok(!page('</script><b>').includes('</script><b>'));
});
