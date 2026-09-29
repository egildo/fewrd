// The phase 1 playground: a conf editor and, per case, the chart drawn
// brat-style (one band per row, stacked where rows overlap) and printed as
// `tag(start,end)` lines. Finds only: no values, no fold, no tree.

import type { Span } from './chart.ts';
import { compile, type CompileError, type Conf, type Resolve } from './index.ts';
import { find } from './find.ts';

export interface PlaygroundCase {
  name: string;
  text: string;
}

type Row = readonly [tag: string, span: Span];

/** Stack rows into lanes: each row on the first lane whose last row ends at or before its start. */
export function lanes(rows: Iterable<Row>): Row[][] {
  const out: Row[][] = [];
  const ends: number[] = [];
  for (const row of rows) {
    let i = ends.findIndex((end) => end <= row[1][0]);
    if (i < 0) {
      i = out.length;
      out.push([]);
      ends.push(0);
    }
    out[i].push(row);
    ends[i] = row[1][1];
  }
  return out;
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const STYLE_ID = 'fewrd-pg-style';
const STYLE = `
.fewrd-pg { display: grid; gap: 24px; grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr); align-items: start; font: 14px/1.4 system-ui, sans-serif; }
@media (max-width: 900px) { .fewrd-pg { grid-template-columns: minmax(0, 1fr); } }
.fewrd-pg .fewrd-conf { position: sticky; top: 12px; }
.fewrd-pg textarea { display: block; width: 100%; box-sizing: border-box; min-height: 60vh; resize: vertical; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2; }
.fewrd-pg .fewrd-errors { margin: 6px 0; padding-left: 18px; font-size: 12px; color: #b3261e; }
.fewrd-pg .fewrd-errors:empty { display: none; }
.fewrd-pg .fewrd-case { margin: 0 0 28px; }
.fewrd-pg h2 { margin: 0 0 6px; font-size: 14px; }
.fewrd-pg .fewrd-draw { overflow-x: auto; padding-bottom: 6px; font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
.fewrd-pg .fewrd-inner { position: relative; white-space: pre; }
.fewrd-pg .fewrd-lane { position: relative; height: 1.5em; margin-top: 2px; }
.fewrd-pg .fewrd-band { position: absolute; top: 0; height: 100%; box-sizing: border-box; overflow: hidden; padding: 0 2px; font-size: 10px; line-height: 1.5em; text-overflow: ellipsis; border-radius: 3px; background: hsl(var(--h) 65% 82%); color: hsl(var(--h) 60% 18%); box-shadow: inset 0 0 0 1px hsl(var(--h) 50% 60%); }
.fewrd-pg .fewrd-rows { margin: 8px 0 0; font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; columns: 3 220px; white-space: pre; opacity: .8; }
.fewrd-pg .fewrd-failed { color: #b3261e; font-size: 12px; }
@media (prefers-color-scheme: dark) {
  .fewrd-pg .fewrd-band { background: hsl(var(--h) 40% 28%); color: hsl(var(--h) 60% 88%); box-shadow: inset 0 0 0 1px hsl(var(--h) 40% 45%); }
  .fewrd-pg .fewrd-errors, .fewrd-pg .fewrd-failed { color: #f2b8b5; }
}`;

/**
 * Mount the playground on `el`: `conf` (data, typically a JSON import) is shown in
 * an editor and recompiled with `resolvers` on every edit; every case is found
 * again and its chart redrawn. Injects its own scoped styles.
 *
 * ponytail: finds every case on every keystroke; debounce if a conf or a case
 * list ever makes typing lag. A character outside the BMP takes two string
 * positions but one glyph, so bands after it drift by one `ch`; measure with
 * Range rects if real subjects need it.
 */
export function mount(
  el: HTMLElement,
  options: { conf: unknown; resolvers?: Readonly<Record<string, Resolve>>; cases: readonly PlaygroundCase[] },
): void {
  const { cases, resolvers } = options;
  if (!document.getElementById(STYLE_ID)) {
    const style = h('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  el.classList.add('fewrd-pg');

  const editor = h('textarea');
  editor.spellcheck = false;
  editor.value = JSON.stringify(options.conf, null, 2);
  const errorList = h('ul', 'fewrd-errors');
  const confPane = h('section', 'fewrd-conf');
  confPane.append(editor, errorList);
  const casesPane = h('div', 'fewrd-cases');
  el.replaceChildren(confPane, casesPane);

  const outs = cases.map((c) => {
    const section = h('section', 'fewrd-case');
    const body = h('div');
    section.append(h('h2', undefined, c.name), body);
    casesPane.appendChild(section);
    return body;
  });

  const showErrors = (list: Pick<CompileError, 'path' | 'tag' | 'message'>[]) => {
    errorList.replaceChildren(
      ...list.map((e) => h('li', undefined, `${[e.path, e.tag && `(${e.tag})`].filter(Boolean).join(' ')}${e.path ? ': ' : ''}${e.message}`)),
    );
  };

  function draw(body: HTMLElement, text: string, conf: Conf<RegExp, Resolve>) {
    try {
      const chart = find(text, conf);
      const rows = [...chart.all()];
      const inner = h('div', 'fewrd-inner', text);
      inner.style.width = `${text.length}ch`;
      for (const lane of lanes(rows.filter(([, [a, b]]) => b > a))) {
        const div = h('div', 'fewrd-lane');
        for (const [tag, [a, b]] of lane) {
          const band = h('span', 'fewrd-band', tag);
          band.style.left = `${a}ch`;
          band.style.width = `${b - a}ch`;
          band.style.setProperty('--h', String(hash(tag) % 360));
          band.title = `${tag}(${a},${b}) ${text.slice(a, b)}`;
          div.appendChild(band);
        }
        inner.appendChild(div);
      }
      const draw = h('div', 'fewrd-draw');
      draw.appendChild(inner);
      body.replaceChildren(draw, h('pre', 'fewrd-rows', rows.map(([tag, [a, b]]) => `${tag}(${a},${b})`).join('\n')));
    } catch (e) {
      body.replaceChildren(h('div', 'fewrd-failed', `could not find: ${message(e)}`));
    }
  }

  function edit() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(editor.value);
    } catch (e) {
      return showErrors([{ path: '', message: `invalid JSON, still showing the last good charts: ${message(e)}` }]);
    }
    const { conf, errors } = compile(parsed, { resolvers });
    showErrors(errors);
    cases.forEach((c, i) => draw(outs[i], c.text, conf));
  }
  editor.addEventListener('input', edit);
  edit();
}
