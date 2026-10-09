import { readFileSync } from 'node:fs';
import { compile, find, dom, type Node } from '../../src/index.ts';

const [confPath, mdPath] = process.argv.slice(2);
const text = readFileSync(mdPath, 'utf8').replace(/\n/g, '¶'); // one code unit for one: spans stay true
const { conf, errors } = compile(JSON.parse(readFileSync(confPath, 'utf8')));
if (errors.length) console.log(errors);
const chart = find(text, conf);
console.log(`rows: ${chart.size()}`);
const show = (n: Node, d = 0): string[] => [
  `${'  '.repeat(d)}${n.tag} (${n.start},${n.end}) ${JSON.stringify(text.slice(n.start, n.end))}` +
    (n.also ? ` also=${n.also}` : '') +
    Object.entries(n.attrs).map(([k, v]) => ` ${k}=${typeof v === 'string' ? JSON.stringify(v) : `${v.tag}(${v.start},${v.end})`}`).join(''),
  ...n.children.flatMap((c) => show(c, d + 1)),
];
console.log(show(dom(text, chart, conf)).join('\n'));
