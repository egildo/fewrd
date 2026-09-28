#!/usr/bin/env node
// fewrd-play <dir>: open a book folder in the fewrd playground.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { locateFewrd, play } from './server.ts';

const USAGE = `usage: fewrd-play [dir] [--port 4747] [--open]

Serves the fewrd playground for a book folder on localhost:
  book.json          the recipes (saved back when you press save)
  cases.json         sample texts: [{ "name": "…", "text": "…" }]
  cases.local.json   more texts, e.g. real ones kept out of git (optional)
  resolvers.ts|js    export const resolvers = { … }, or a default export (optional)

  -p, --port   port to listen on (default 4747)
  -o, --open   open the browser
      --fewrd  the fewrd dist/ to serve (default: the one installed where dir is)`;

function fail(message: string): never {
  console.error(`fewrd-play: ${message}`);
  process.exit(1);
}

let args;
try {
  args = parseArgs({
    allowPositionals: true,
    options: {
      port: { type: 'string', short: 'p', default: '4747' },
      open: { type: 'boolean', short: 'o', default: false },
      fewrd: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
} catch (e) {
  fail(`${e instanceof Error ? e.message : String(e)}\n\n${USAGE}`);
}
const { values, positionals } = args;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const dir = resolve(positionals[0] ?? '.');
if (!existsSync(join(dir, 'book.json'))) fail(`no book.json in ${dir}\n\n${USAGE}`);
const port = Number(values.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) fail(`not a port: ${values.port}`);

let fewrd: string;
try {
  fewrd = values.fewrd ? resolve(values.fewrd) : locateFewrd(dir);
} catch {
  fail(`fewrd isn't installed where ${dir} is: npm install fewrd`);
}

const server = play({ dir, fewrd });
server.on('error', (e: NodeJS.ErrnoException) => fail(e.code === 'EADDRINUSE' ? `port ${port} is taken; try --port` : e.message));
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  const url = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}/`;
  console.log(`fewrd-play: ${dir}\n  ${url}`);
  if (values.open) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    spawn(opener, [url], { stdio: 'ignore', detached: true }).unref();
  }
});
