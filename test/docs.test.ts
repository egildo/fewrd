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
 * On a page, the ```ts and ```js blocks run in order and share one scope, so a
 * later block uses what an earlier one made. The ```output blocks, in order, are
 * what those blocks print, in order. A block may be indented, in a list step. Imports of `fewrd` are provided; an import of a
 * `.json` file binds the last ```json block above it. A block right under
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
    const [, pad = '', lang] = /^( *)```(\S*)/.exec(lines[i]!) ?? [];
    if (lang === undefined) continue;
    const start = i;
    while (++i < lines.length && !lines[i]!.trimStart().startsWith('```'));
    const skip = lines[start - 1]?.trimStart().startsWith('<!-- not run') ?? false;
    const body = lines.slice(start + 1, i).map((l) => (l.startsWith(pad) ? l.slice(pad.length) : l));
    found.push({ lang, line: start + 1, body: body.join('\n').trimEnd(), skip });
  }
  return found;
};

const runs = (b: Block) => (b.lang === 'ts' || b.lang === 'js') && !b.skip;

/** What each printing block of the page printed, in order. */
const run = (page: string, md: string): string[] => {
  const printed: string[] = [];
  let out: string[] = [];
  const context = createContext({ ...fewrd, console: { log: (...a: unknown[]) => out.push(format(...a)) } });
  let json = '';
  for (const b of blocks(md)) {
    if (b.lang === 'json') json = b.body;
    if (!runs(b)) continue;
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
  if (!blocks(md).some(runs)) continue;
  test(`docs: ${page} prints what it shows`, () => {
    const shown = blocks(md).filter((b) => b.lang === 'output').map((b) => b.body);
    assert.deepEqual(run(page, md), shown);
  });
}
