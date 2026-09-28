// fewrd-play: serve the fewrd playground for a folder holding a book —
// book.json, cases.json (+ cases.local.json), resolvers.ts|js — on localhost.
// Dev tooling only: its own package, so the fewrd library ships as it is.

import { createServer, type IncomingMessage, type Server } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';

export interface PlayOptions {
  /** The book folder. */
  dir: string;
  /** Where fewrd's built index.js and playground.js live. Default: the fewrd installed where `dir` is. */
  fewrd?: string;
}

/** The dist/ of the fewrd that code in `dir` would import, found the way Node finds it. */
export function locateFewrd(dir: string): string {
  return dirname(nodeModule.createRequire(join(resolve(dir), 'index.js')).resolve('fewrd/playground'));
}

/** Only these are ever served; `.ts` goes out with its types stripped. */
const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/javascript',
  '.mts': 'text/javascript',
  '.json': 'application/json',
};

const RESOLVERS = ['resolvers.ts', 'resolvers.mts', 'resolvers.js', 'resolvers.mjs'];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function strip(code: string): string {
  if (typeof nodeModule.stripTypeScriptTypes !== 'function') {
    throw new Error('serving .ts needs Node 22.13+ (module.stripTypeScriptTypes); or write resolvers.js');
  }
  return nodeModule.stripTypeScriptTypes(code);
}

async function readJson(file: string, missing: unknown): Promise<unknown> {
  if (!existsSync(file)) return missing;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    throw new Error(`${basename(file)}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** cases.json, then cases.local.json (real texts you keep out of git), either optional. */
async function cases(root: string): Promise<unknown[]> {
  const all: unknown[] = [];
  for (const name of ['cases.json', 'cases.local.json']) {
    const list = await readJson(join(root, name), []);
    if (!Array.isArray(list)) throw new Error(`${name}: must be an array of { "name", "text" }`);
    all.push(...list);
  }
  return all;
}

async function body(req: IncomingMessage): Promise<string> {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 5_000_000) throw new Error('too large for a book');
  }
  return text;
}

/** The page: an import map onto the installed fewrd, then mount() with the folder's book, cases and resolvers. */
export function page(title: string, resolvers?: string): string {
  const load = resolvers ? `import('/${resolvers}')` : 'null';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · fewrd play</title>
<script type="importmap">{ "imports": { "fewrd": "/@fewrd/index.js", "fewrd/playground": "/@fewrd/playground.js" } }</script>
<style>
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; color: #1d1d1f; background: #fafafa; }
  header { padding: 12px 16px; background: #fff; border-bottom: 1px solid #e5e5ea; }
  h1 { margin: 0; font-size: 18px; }
  main { max-width: 880px; margin: 0 auto; padding: 16px; }
  .fewrd-case, .fewrd-trial { background: #fff; border: 1px solid #e5e5ea; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
  h2 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #6e6e73; }
  textarea { width: 100%; box-sizing: border-box; font: inherit; padding: 8px; border: 1px solid #e5e5ea; border-radius: 6px; }
  .fewrd-gist, details { font-size: 13px; color: #6e6e73; }
  pre { max-height: 240px; overflow: auto; }
  table { border-collapse: collapse; width: 100%; }
  td, th { text-align: left; padding: 2px 6px; border-bottom: 1px solid #e5e5ea; }
</style>
</head>
<body>
<header><h1>${esc(title)}</h1></header>
<main id="app"></main>
<script type="module">
import { mount } from 'fewrd/playground';
const app = document.getElementById('app');
const json = async (path) => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
try {
  const [data, cases, mod] = await Promise.all([json('/book.json'), json('/cases.json'), ${load}]);
  const save = async (text) => {
    const r = await fetch('/book.json', { method: 'POST', body: text });
    if (!r.ok) throw new Error(await r.text());
  };
  mount(app, { data, cases, resolvers: mod?.resolvers ?? mod?.default ?? {}, save });
} catch (e) {
  app.style.color = '#b3261e';
  app.textContent = e instanceof Error ? e.message : String(e);
}
</script>
</body>
</html>
`;
}

/**
 * A server for one book folder. Bind it to localhost only: it serves the
 * folder's .ts/.js/.json files and writes book.json on save.
 */
export function play({ dir, fewrd = locateFewrd(dir) }: PlayOptions): Server {
  const root = resolve(dir);
  const lib = resolve(fewrd);
  return createServer(async (req, res) => {
    const send = (status: number, type: string, text: string) => {
      res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
      res.end(text);
    };
    try {
      const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);

      if (req.method === 'POST' && path === '/book.json') {
        const text = await body(req);
        try {
          JSON.parse(text);
        } catch (e) {
          return send(400, 'text/plain', `book.json not saved: ${e instanceof Error ? e.message : String(e)}`);
        }
        await writeFile(join(root, 'book.json'), text.endsWith('\n') ? text : `${text}\n`);
        return send(200, 'text/plain', 'saved');
      }
      if (req.method !== 'GET') return send(405, 'text/plain', 'method not allowed');

      if (path === '/') return send(200, 'text/html', page(basename(root), RESOLVERS.find((f) => existsSync(join(root, f)))));
      if (path === '/cases.json') return send(200, TYPES['.json'], JSON.stringify(await cases(root)));

      const [base, rel] = path.startsWith('/@fewrd/') ? [lib, path.slice('/@fewrd/'.length)] : [root, path.slice(1)];
      const file = resolve(base, rel);
      const type = TYPES[extname(file)];
      if (!type || !file.startsWith(base + sep) || !existsSync(file)) return send(404, 'text/plain', `not found: ${path}`);
      const text = await readFile(file, 'utf8');
      send(200, type, /\.m?ts$/.test(file) ? strip(text) : text);
    } catch (e) {
      send(500, 'text/plain', e instanceof Error ? e.message : String(e));
    }
  });
}
