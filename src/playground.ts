// A reusable playground: mount fewrd's own dual-view UI against any Book
// and cases, not just the bundled demo's. See specs/002-reusable-playground.
// Mounted with book data instead of a Book, it also edits that data live.
// See specs/003-recipes-as-data.

import { compile, gist, html, read, type Cuts, type Fold } from './index.ts';
import type { Book, CompileError, Resolver } from './types.ts';

export interface PlaygroundCase {
  name: string;
  text: string;
}

interface CommonOptions {
  cases: PlaygroundCase[];
  /** Evaluated once at mount, against `cases`, to seed the fold control's initial selection. Never called again. */
  fold?: Fold;
}

export type MountOptions =
  | (CommonOptions & { book: Book })
  /** Book data (e.g. parsed JSON) and its resolvers: the playground shows an editor and recompiles on every edit. */
  | (CommonOptions & { data: unknown; resolvers?: Readonly<Record<string, Resolver>> });

/** Distinct entities across a book's recipes, in first-appearance order. */
export function entities(book: Book): string[] {
  const seen = new Set<string>();
  for (const r of book.recipes) seen.add(r.entity);
  return [...seen];
}

/** Which entities a supplied fold would fold across the given cases, or none if no fold was supplied. */
export function initialSelection(book: Book, cases: PlaygroundCase[], fold?: Fold): string[] {
  if (!fold) return [];
  const selected = new Set<string>();
  for (const c of cases) {
    const cuts = read(c.text, book);
    cuts.mentions.forEach((m, i) => {
      if (fold(m, i)) selected.add(m.entity);
    });
  }
  return entities(book).filter((e) => selected.has(e));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** A stable, small hash so the same entity name always gets the same hue. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function leavesTable(c: Cuts): string {
  const rows = c.leaves
    .map((l) => {
      const m = l.mention === undefined ? '' : `${l.mention} ${c.mentions[l.mention].entity}`;
      return `<tr><td>${l.start}–${l.end}</td><td>${l.kind}${l.part ? `:${l.part}` : ''}</td><td>${m}</td><td><code>${esc(JSON.stringify(c.text.slice(l.start, l.end)))}</code></td></tr>`;
    })
    .join('');
  return `<table><thead><tr><th>span</th><th>leaf</th><th>mention</th><th>text</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderCase(target: Element, text: string, book: Book, fold: Fold) {
  try {
    const t0 = performance.now();
    const c = read(text, book);
    const ms = (performance.now() - t0).toFixed(2);
    target.innerHTML = `
      <p class="fewrd-tagged">${html(c, fold)}</p>
      <p class="fewrd-gist"><span class="fewrd-k">gist</span> ${esc(gist(c, fold))}</p>
      <details><summary>${c.mentions.length} mentions · ${c.leaves.length} leaves · ${ms} ms</summary>
        <pre>${esc(JSON.stringify(c.mentions, null, 1))}</pre>
        ${leavesTable(c)}
      </details>`;
  } catch (e) {
    // e.g. a resolver meeting input an edited pattern now feeds it: this case only.
    target.innerHTML = `<p class="fewrd-error">${esc(message(e))}</p>`;
  }
}

/**
 * Mount fewrd's playground UI into `el`, rendering `options.cases` against
 * `options.book` — or against `options.data` compiled with
 * `options.resolvers`, editable live. Self-contained: injects the CSS it
 * needs, scoped to this mount so multiple mounts on one page never collide
 * and unrelated page content is never touched.
 */
export function mount(el: Element, options: MountOptions): void {
  const { cases } = options;
  const resolvers = 'data' in options ? options.resolvers : undefined;
  const original = 'data' in options ? JSON.stringify(options.data, null, 2) : '';
  let book: Book;
  let errors: CompileError[] = [];
  if ('book' in options) book = options.book;
  else ({ book, errors } = compile(options.data, { resolvers }));

  const selected = new Set(initialSelection(book, cases, options.fold));
  const currentFold: Fold = (m) => selected.has(m.entity);

  const id = `fewrd-pg-${Math.random().toString(36).slice(2)}`;
  el.classList.add(id, 'condensed');

  const style = document.createElement('style');
  document.head.appendChild(style);
  function restyle() {
    style.textContent = `
      .${id}.condensed [data-fold] { display: none; }
      .${id}:not(.condensed) [data-fold] { text-decoration: line-through; text-decoration-color: rgba(0,0,0,.35); }
      .${id} [data-entity] { background: var(--h); border-radius: 3px; padding: 0 1px; }
      .${id} .fewrd-tagged [data-entity] [data-entity] { box-shadow: inset 0 -2px 0 rgba(0,0,0,.12); }
      .${id} [data-part="value"] { font-weight: 600; }
      .${id} [data-part="label"], .${id} [data-part="channel"], .${id} [data-part="lead"] { opacity: .7; }
      .${id} [data-part="date"] { font-style: italic; }
      .${id} [data-sep] { white-space: pre-wrap; }
      .${id} .fewrd-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 12px; }
      .${id} .fewrd-folds { min-width: 160px; }
      .${id} .fewrd-editor { margin-bottom: 12px; }
      .${id} .fewrd-book { display: block; width: 100%; box-sizing: border-box; min-height: 18em; resize: vertical; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; }
      .${id} .fewrd-errors { margin: 6px 0; padding-left: 18px; font-size: 12px; }
      .${id} .fewrd-errors:empty { display: none; }
      .${id} .fewrd-errors, .${id} .fewrd-error { color: #b3261e; }
      ${entities(book).map((e) => `.${id} [data-entity=${JSON.stringify(e)}] { --h: hsl(${hash(e) % 360}, 70%, 88%); }`).join('\n')}
    `;
  }

  const editor = 'data' in options
    ? `<details class="fewrd-editor" open><summary>recipes <button type="button" class="fewrd-reset">reset</button></summary>
        <textarea class="fewrd-book" spellcheck="false"></textarea>
        <ul class="fewrd-errors"></ul>
      </details>`
    : '';
  el.innerHTML = `
    <div class="fewrd-controls">
      <label><input type="checkbox" class="fewrd-condensed" checked /> condensed</label>
      <select class="fewrd-folds" multiple></select>
    </div>
    ${editor}
    <section class="fewrd-trial">
      <textarea class="fewrd-custom" rows="3" spellcheck="false"></textarea>
      <div class="fewrd-trial-out"></div>
    </section>
    <div class="fewrd-cases"></div>`;

  const condensedBox = el.querySelector<HTMLInputElement>('.fewrd-condensed')!;
  const foldsSelect = el.querySelector<HTMLSelectElement>('.fewrd-folds')!;
  const trialInput = el.querySelector<HTMLTextAreaElement>('.fewrd-custom')!;
  const trialOut = el.querySelector<Element>('.fewrd-trial-out')!;
  const casesRoot = el.querySelector<Element>('.fewrd-cases')!;

  casesRoot.innerHTML = cases
    .map((_, i) => `<section class="fewrd-case"><h2>${esc(cases[i].name)}</h2><div class="fewrd-out" data-i="${i}"></div></section>`)
    .join('');
  const outs = Array.from(casesRoot.querySelectorAll<Element>('.fewrd-out'));

  /** The fold control follows the current book: gone entities leave the selection, new ones start unselected. */
  function refillFolds() {
    const ents = entities(book);
    for (const e of Array.from(selected)) if (!ents.includes(e)) selected.delete(e);
    foldsSelect.size = Math.max(ents.length, 1);
    foldsSelect.innerHTML = ents.map((e) => `<option value="${esc(e)}"${selected.has(e) ? ' selected' : ''}>${esc(e)}</option>`).join('');
  }

  function renderAll() {
    outs.forEach((out) => renderCase(out, cases[Number(out.getAttribute('data-i'))].text, book, currentFold));
    renderCase(trialOut, trialInput.value, book, currentFold);
  }

  foldsSelect.addEventListener('change', () => {
    selected.clear();
    for (const o of Array.from(foldsSelect.selectedOptions)) selected.add(o.value);
    renderAll();
  });
  condensedBox.addEventListener('change', () => el.classList.toggle('condensed', condensedBox.checked));
  trialInput.addEventListener('input', () => renderCase(trialOut, trialInput.value, book, currentFold));

  const bookInput = el.querySelector<HTMLTextAreaElement>('.fewrd-book');
  const errorList = el.querySelector<Element>('.fewrd-errors');
  function showErrors(list: CompileError[]) {
    if (!errorList) return;
    errorList.innerHTML = list
      .map((e) => `<li>${esc([e.path, e.entity && `(${e.entity})`].filter(Boolean).join(' '))}${e.path ? ': ' : ''}${esc(e.message)}</li>`)
      .join('');
  }
  // ponytail: recompiles and re-reads everything per keystroke; debounce if a book or case list ever makes typing lag.
  function edit() {
    if (!bookInput) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(bookInput.value);
    } catch (e) {
      return showErrors([{ path: '', message: `invalid JSON, still showing the last good book: ${message(e)}` }]);
    }
    ({ book, errors } = compile(parsed, { resolvers }));
    showErrors(errors);
    restyle();
    refillFolds();
    renderAll();
  }
  if (bookInput) {
    bookInput.value = original;
    bookInput.addEventListener('input', edit);
    el.querySelector('.fewrd-reset')!.addEventListener('click', (ev) => {
      ev.preventDefault(); // the button sits in <summary>: don't also collapse the editor
      bookInput.value = original;
      edit();
    });
  }

  showErrors(errors);
  restyle();
  refillFolds();
  renderAll();
}
