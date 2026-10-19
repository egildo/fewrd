import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { format } from 'node:util';
import { createContext, runInContext } from 'node:vm';
import * as fewrd from '../src/index.ts';

/**
 * Every example in the documents runs, and prints what the page shows.
 *
 * On a page, the ```ts blocks run in order and share one scope, so a later
 * block uses what an earlier one made. The ```output blocks, in order, are what
 * those blocks print, in order. Imports of `fewrd` are provided; an import of a
 * `.json` file binds the last ```json block above it. A ```ts block right under
 * a `<!-- not run -->` comment is skipped (one that needs a browser, say).
 */

const root = new URL('..', import.meta.url);
const pages = [
  'README.md',
  ...readdirSync(new URL('docs', root), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`),
];

type Block = { lang: string; line: number; body: string; skip: boolean };

const blocks = (md: string): Block[] => {
  const lines = md.split('\n');
  const found: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lang = /^```(\S*)/.exec(lines[i]!)?.[1];
    if (lang === undefined) continue;
    const start = i;
    while (++i < lines.length && !lines[i]!.startsWith('```'));
    const skip = lines[start - 1]?.startsWith('<!-- not run') ?? false;
    found.push({ lang, line: start + 1, body: lines.slice(start + 1, i).join('\n').trimEnd(), skip });
  }
  return found;
};

/** What each printing ```ts block of the page printed, in order. */
const run = (page: string, md: string): string[] => {
  const printed: string[] = [];
  let out: string[] = [];
  const context = createContext({ ...fewrd, console: { log: (...a: unknown[]) => out.push(format(...a)) } });
  let json = '';
  for (const b of blocks(md)) {
    if (b.lang === 'json') json = b.body;
    if (b.lang !== 'ts' || b.skip) continue;
    const code = b.body
      .replace(/^import .* from 'fewrd';$/gm, '')
      .replace(/^import (\w+) from '.*\.json'.*;$/gm, (_, name: string) => `var ${name} = ${json};`)
      .replace(/^(?:const|let) /gm, 'var ');
    out = [];
    runInContext(stripTypeScriptTypes(code), context, { filename: `${page}:${b.line}` });
    if (out.length) printed.push(out.join('\n').trimEnd());
  }
  return printed;
};

for (const page of pages) {
  const md = readFileSync(new URL(page, root), 'utf8');
  if (!blocks(md).some((b) => b.lang === 'ts' && !b.skip)) continue;
  test(`docs: ${page} prints what it shows`, () => {
    const shown = blocks(md).filter((b) => b.lang === 'output').map((b) => b.body);
    assert.deepEqual(run(page, md), shown);
  });
}
