import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compile, find, dom, type Node } from '../../src/index.ts';
const cm = createRequire(import.meta.url)('commonmark');

const section = (n: number) => `# Section ${n}

Intro paragraph with **bold**, *italic*, \`code\`, and a [link](https://example.com/${n}).
It wraps onto a second line.

- fruit
  - apple with *note*
  - pear
- bread
  - white
    - sliced
- milk

\`\`\`js
const x = 1 * 2;
- not a list
\`\`\`

Closing paragraph ${n}.

`;
const { conf, errors } = compile(JSON.parse(readFileSync(new URL(process.argv[3] ?? './race.json', import.meta.url), 'utf8')));
if (errors.length) throw new Error(JSON.stringify(errors));
const prep = (md: string) => md.replace(/^ +/gm, (sp) => '·'.repeat(sp.length)).replace(/\n/g, '¶');

function median(f: () => void, budgetMs = 3000): number {
  const times: number[] = [];
  const start = performance.now();
  do {
    const t = performance.now();
    f();
    times.push(performance.now() - t);
  } while (performance.now() - start < budgetMs && times.length < 50);
  return times.sort((a, b) => a - b)[times.length >> 1];
}

const count = (n: Node, out: Record<string, number> = {}) => {
  const k = /^(i[0-9]|line_.*)$/.test(n.tag) || n.also?.some((a) => /^(i[0-9]|line_.*)$/.test(a)) ? "item" : /^([le][0-9]|(list|entry)_.*)$/.test(n.tag) ? "" : n.tag;
  if (k) out[k] = (out[k] ?? 0) + 1;
  n.children.forEach((c) => count(c, out));
  return out;
};
const cmCount = (doc: any) => {
  const out: Record<string, number> = {};
  const w = doc.walker();
  for (let e; (e = w.next()); ) if (e.entering) out[e.node.type] = (out[e.node.type] ?? 0) + 1;
  return out;
};

const parser = new cm.Parser();
for (const k of (process.argv[2] ?? '1,4,16,64').split(',').map(Number)) {
  const md = Array.from({ length: k }, (_, i) => section(i + 1)).join('');
  const text = prep(md);
  let chart!: ReturnType<typeof find>;
  let tree!: Node;
  const tFind = median(() => { chart = find(text, conf); });
  const tDom = median(() => { tree = dom(text, chart, conf); });
  const tCm = median(() => parser.parse(md));
  const f = count(tree);
  const c = cmCount(parser.parse(md));
  console.log(`${k} sections, ${(md.length / 1024).toFixed(1)} KB, ${chart.size()} rows | find ${tFind.toFixed(2)} ms, dom ${tDom.toFixed(2)} ms | commonmark ${tCm.toFixed(3)} ms | ×${((tFind + tDom) / tCm).toFixed(0)}`);
  console.log(`   fewrd: heading ${f.heading} item ${f.item} anchor ${f.anchor} bold ${f.bold} italic ${f.italic} code ${f.code} fenced ${f.fenced}`);
  console.log(`   cmark: heading ${c.heading} item ${c.item} link ${c.link} strong ${c.strong} emph ${c.emph} code ${c.code} code_block ${c.code_block}`);
}
