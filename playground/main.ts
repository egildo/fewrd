import { gist, html, read, type Cuts } from '../src/index.ts';
import { itPa } from '../recipes/it-pa.ts';
import { CASES } from './cases.ts';

const book = itPa;
const entities = [...new Set(book.recipes.map((r) => r.entity))];
const folded = new Set(['protocol', 'cig', 'cup', 'chapter', 'quotation']);
const fold = (m: { entity: string }) => folded.has(m.entity);

const $ = <T extends Element>(s: string) => document.querySelector<T>(s)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function leavesTable(c: Cuts): string {
  const rows = c.leaves
    .map((l) => {
      const m = l.mention === undefined ? '' : `${l.mention} ${c.mentions[l.mention].entity}`;
      return `<tr><td>${l.start}–${l.end}</td><td>${l.kind}${l.part ? `:${l.part}` : ''}</td><td>${m}</td><td><code>${esc(JSON.stringify(c.text.slice(l.start, l.end)))}</code></td></tr>`;
    })
    .join('');
  return `<table><thead><tr><th>span</th><th>leaf</th><th>mention</th><th>text</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function render(target: Element, text: string) {
  const t0 = performance.now();
  const c = read(text, book);
  const ms = (performance.now() - t0).toFixed(2);
  target.innerHTML = `
    <p class="tagged">${html(c, fold)}</p>
    <p class="gist"><span class="k">gist</span> ${esc(gist(c, fold))}</p>
    <details><summary>${c.mentions.length} menzioni · ${c.leaves.length} foglie · ${ms} ms</summary>
      <pre>${esc(JSON.stringify(c.mentions, null, 1))}</pre>
      ${leavesTable(c)}
    </details>`;
}

function renderAll() {
  render($('#custom-case .out'), $<HTMLTextAreaElement>('#custom').value);
  $('#cases').innerHTML = CASES.map((c, i) => `<section class="case"><h2>${esc(c.name)}</h2><div class="out" data-i="${i}"></div></section>`).join('');
  document.querySelectorAll<HTMLElement>('#cases .out').forEach((el) => render(el, CASES[Number(el.dataset.i)].text));
}

$('#folds').insertAdjacentHTML(
  'beforeend',
  entities.map((e) => `<label data-entity="${e}"><input type="checkbox" value="${e}" ${folded.has(e) ? 'checked' : ''}/> ${e}</label>`).join(''),
);
$('#folds').addEventListener('change', (e) => {
  const box = e.target as HTMLInputElement;
  box.checked ? folded.add(box.value) : folded.delete(box.value);
  renderAll();
});
const condensed = $<HTMLInputElement>('#condensed');
const sync = () => document.body.classList.toggle('condensed', condensed.checked);
condensed.addEventListener('change', sync);
$('#custom').addEventListener('input', () => render($('#custom-case .out'), $<HTMLTextAreaElement>('#custom').value));

sync();
renderAll();
