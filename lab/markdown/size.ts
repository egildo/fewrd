// Bundle size of each parser, measured one way: esbuild bundles and minifies an
// entry that imports just what parsing needs, then gzip and brotli at their best.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const require = createRequire(import.meta.url);
const esbuild = createRequire(require.resolve('vite'))('esbuild');

const entries: [string, string, string][] = [
  ['fewrd (lab)', "export { compile, find, dom } from '../../src/index.ts';", 'engine only: text to tree'],
  ['fewrd 1.0.1 (main)', "export { compile, find, dom } from '../../../fewrd/src/index.ts';", 'before the lab'],
  ['commonmark', "export { Parser } from 'commonmark';", 'parser only: text to tree'],
  ['micromark', "export { micromark } from 'micromark';", 'text to HTML'],
  ['marked', "export { marked } from 'marked';", 'text to HTML'],
  ['markdown-it', "export { default } from 'markdown-it';", 'text to HTML, with its dependencies'],
];

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
const sizes = (code: Uint8Array) => [code.length, gzipSync(code, { level: 9 }).length, brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length];

console.log('| library | min | gzip | brotli | what it covers |\n|---|---|---|---|---|');
for (const [name, contents, what] of entries) {
  const out = await esbuild.build({ stdin: { contents, resolveDir: import.meta.dirname, loader: 'ts' }, bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2022', write: false });
  const [min, gz, br] = sizes(out.outputFiles[0].contents);
  console.log(`| ${name} | ${kb(min)} | ${kb(gz)} | ${kb(br)} | ${what} |`);
}
const conf = new TextEncoder().encode(JSON.stringify(JSON.parse(readFileSync(new URL('./race.json', import.meta.url), 'utf8'))));
const [min, gz, br] = sizes(conf);
console.log(`| + the markdown conf | ${kb(min)} | ${kb(gz)} | ${kb(br)} | race.json, minified JSON |`);
