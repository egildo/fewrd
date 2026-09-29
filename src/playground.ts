// The playground: a conf editor and one case at a time, its text on a
// character grid with every row of the chart drawn as an underline (stacked in
// lanes where rows overlap), the row's tag and span shown on hover. Under the
// chart, the tree as an indented list and a fold panel: one box per tag, the
// gist under it, and the hidden leaves greyed out on the grid.

import type { Span } from './chart.ts';
import { compile, type CompileError, type Resolve } from './index.ts';
import { dom, type Node } from './dom.ts';
import { find } from './find.ts';
import { hidden, gist, type Fold } from './fold.ts';

export interface PlaygroundCase {
  name: string;
  /** The key of the conf in `confs` this case is found with. */
  conf: string;
  text: string;
  /** The tags folded when the case is first shown, and the gist that fold should give. */
  fold?: string[];
  gist?: string;
}
export interface PlaygroundConf {
  conf: unknown;
  resolvers?: Readonly<Record<string, Resolve>>;
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

/** Where a row falls on a text wrapped every `cols` characters: one piece per line, columns within the line. */
export function segments([a, b]: Span, cols: number): { line: number; from: number; to: number }[] {
  const out = [];
  for (let line = Math.floor(a / cols); line * cols < b; line++) {
    out.push({ line, from: Math.max(a, line * cols) - line * cols, to: Math.min(b, (line + 1) * cols) - line * cols });
  }
  return out;
}

/** The tree, one entry per node but `doc`, indented two spaces per depth: tag, span, twins, value, the node's text. */
function walk(doc: Node, text: string): { node: Node; line: string }[] {
  const out: { node: Node; line: string }[] = [];
  const visit = (n: Node, depth: number) => {
    const also = n.also ? ` also=${n.also.join(',')}` : '';
    const value = n.value !== undefined ? ` value=${JSON.stringify(n.value)}` : '';
    out.push({ node: n, line: `${'  '.repeat(depth)}${n.tag} (${n.start}, ${n.end})${also}${value} ${JSON.stringify(text.slice(n.start, n.end))}` });
    for (const c of n.children) visit(c, depth + 1);
  };
  for (const c of doc.children) visit(c, 0);
  return out;
}
export const treeLines = (doc: Node, text: string): string[] => walk(doc, text).map((x) => x.line);

/** The spans of the leaves the fold hides, adjacent ones merged. */
export function greyed(doc: Node, fold: Fold): Span[] {
  const out = hidden(doc, fold);
  const spans: [number, number][] = [];
  const visit = (n: Node) => {
    if (n.children.length) return n.children.forEach(visit);
    if (!out.has(n)) return;
    const last = spans[spans.length - 1];
    if (last && last[1] === n.start) last[1] = n.end;
    else spans.push([n.start, n.end]);
  };
  doc.children.forEach(visit);
  return spans;
}

const COLS = 90;
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
.fewrd-pg { --mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; --sat: 42%; --lit: 62%; display: grid; gap: 24px; grid-template-columns: minmax(280px, 420px) minmax(0, 1fr); align-items: start; font: 14px/1.4 system-ui, sans-serif; }
@media (max-width: 900px) { .fewrd-pg { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-color-scheme: dark) { .fewrd-pg { --sat: 65%; --lit: 66%; } }
.fewrd-pg .fewrd-conf { position: sticky; top: 12px; }
.fewrd-pg h2 { margin: 0 0 6px; font-size: 13px; font-weight: 600; opacity: .75; }
.fewrd-pg textarea { display: block; width: 100%; box-sizing: border-box; min-height: 60vh; resize: vertical; font: 12px/1.45 var(--mono); font-variant-ligatures: none; tab-size: 2; }
.fewrd-pg .fewrd-errors { margin: 6px 0; padding-left: 18px; font-size: 12px; color: #b3261e; }
.fewrd-pg .fewrd-errors:empty { display: none; }
.fewrd-pg .fewrd-nav { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
.fewrd-pg .fewrd-nav button { width: 56px; height: 56px; padding: 0 0 4px; border-radius: 50%; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); background: color-mix(in srgb, currentColor 7%, transparent); color: inherit; font: 32px/1 system-ui, sans-serif; cursor: pointer; }
.fewrd-pg .fewrd-nav button:hover { background: color-mix(in srgb, currentColor 16%, transparent); }
.fewrd-pg .fewrd-count { min-width: 6ch; text-align: center; font: 600 22px var(--mono); font-variant-numeric: tabular-nums; }
.fewrd-pg .fewrd-name { margin: 0 0 18px; font-size: 15px; }
.fewrd-pg .fewrd-name small { margin-left: 8px; font-size: 12px; font-weight: 400; opacity: .6; }
.fewrd-pg .fewrd-draw { overflow-x: auto; padding: 4px 0 12px; font: 15px/1.6 var(--mono); font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; letter-spacing: 0; }
.fewrd-pg .fewrd-line { position: relative; width: ${COLS}ch; margin-bottom: 10px; }
.fewrd-pg .fewrd-text { position: relative; white-space: pre; height: 1.6em; }
.fewrd-pg .fewrd-hl { position: absolute; top: 0; height: 1.6em; border-radius: 2px; background: hsl(var(--h) 60% 50% / .28); opacity: 0; }
.fewrd-pg .fewrd-hl.on { opacity: 1; }
.fewrd-pg .fewrd-lane { position: relative; height: 5px; margin-top: 3px; }
.fewrd-pg .fewrd-band { position: absolute; top: 0; height: 5px; background: hsl(var(--h) var(--sat) var(--lit)); }
.fewrd-pg .fewrd-band.open { border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.fewrd-pg .fewrd-band.close { border-top-right-radius: 2px; border-bottom-right-radius: 2px; }
.fewrd-pg .fewrd-band.open::before, .fewrd-pg .fewrd-band.close::after { content: ""; position: absolute; top: -1px; width: 2px; height: 7px; background: inherit; filter: brightness(.85); }
.fewrd-pg .fewrd-band.open::before { left: 0; }
.fewrd-pg .fewrd-band.close::after { right: 0; }
.fewrd-pg .fewrd-band .fewrd-hit { position: absolute; inset: -2px 0; }
.fewrd-pg .fewrd-legend { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; font: 12px var(--mono); }
.fewrd-pg .fewrd-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, currentColor 8%, transparent); }
.fewrd-pg .fewrd-chip::before { content: ""; width: 12px; height: 5px; border-radius: 2px; background: hsl(var(--h) var(--sat) var(--lit)); }
.fewrd-pg .fewrd-tip { position: fixed; z-index: 10; padding: 4px 8px; border-radius: 4px; background: #1c1c20; color: #f2f2f4; font: 12px var(--mono); pointer-events: none; white-space: nowrap; box-shadow: 0 2px 8px #0006; }
.fewrd-pg .fewrd-tip[hidden] { display: none; }
.fewrd-pg .fewrd-failed { color: #b3261e; font-size: 12px; }
.fewrd-pg .fewrd-panel { margin-top: 16px; }
.fewrd-pg .fewrd-tree { margin: 0; max-height: 280px; overflow: auto; font: 12px/1.5 var(--mono); font-variant-ligatures: none; }
.fewrd-pg .fewrd-tree div { white-space: pre; }
.fewrd-pg .fewrd-tree .fewrd-water { opacity: .45; }
.fewrd-pg .fewrd-tags { display: flex; flex-wrap: wrap; gap: 4px 14px; font: 12px var(--mono); }
.fewrd-pg .fewrd-tags label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.fewrd-pg .fewrd-gist { margin: 10px 0 0; padding: 8px 10px; border-radius: 4px; background: color-mix(in srgb, currentColor 7%, transparent); font: 13px/1.5 var(--mono); white-space: pre-wrap; }
.fewrd-pg .fewrd-verdict { margin-top: 4px; font-size: 12px; opacity: .7; }
.fewrd-pg .fewrd-grey { opacity: .25; text-decoration: line-through; }
@media (prefers-color-scheme: dark) {
  .fewrd-pg .fewrd-errors, .fewrd-pg .fewrd-failed { color: #f2b8b5; }
  .fewrd-pg .fewrd-tip { background: #f2f2f4; color: #1c1c20; }
}`;

type Errors = Pick<CompileError, 'path' | 'tag' | 'message'>[];

/**
 * Mount the playground on `el`: `confs` are named confs (data, typically JSON
 * imports) with their resolvers, and every case says which one it uses. One case
 * shows at a time, stepped with the buttons or the arrow keys; the editor shows
 * the conf of the current case and recompiles it on every edit, so only that
 * domain's cases change. Injects its own scoped styles.
 *
 * ponytail: the case is found again on every keystroke; debounce if a conf or a
 * case ever makes typing lag. A character outside the BMP takes two string
 * positions but one glyph, so bands after it drift by one `ch`; measure with
 * Range rects if real subjects need it. A newline in a text is not handled.
 */
export function mount(
  el: HTMLElement,
  options: { confs: Readonly<Record<string, PlaygroundConf>>; cases: readonly PlaygroundCase[] },
): void {
  const { cases } = options;
  if (!document.getElementById(STYLE_ID)) {
    const style = h('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  el.classList.add('fewrd-pg');

  const domains = new Map(
    Object.entries(options.confs).map(([name, { conf, resolvers }]) => {
      const { conf: compiled, errors } = compile(conf, { resolvers });
      return [name, { resolvers, compiled, errors: errors as Errors, text: JSON.stringify(conf, null, 2) }];
    }),
  );
  let index = 0;
  /** The tags ticked in the fold panel, per case; seeded from the case's own `fold`, kept until the page reloads. */
  const folds = new Map<number, Set<string>>();

  const confTitle = h('h2');
  const editor = h('textarea');
  editor.spellcheck = false;
  const errorList = h('ul', 'fewrd-errors');
  const confPane = h('section', 'fewrd-conf');
  confPane.append(confTitle, editor, errorList);

  const prev = h('button', undefined, '‹');
  const next = h('button', undefined, '›');
  prev.setAttribute('aria-label', 'previous case');
  next.setAttribute('aria-label', 'next case');
  const count = h('span', 'fewrd-count');
  count.setAttribute('aria-live', 'polite');
  const nav = h('div', 'fewrd-nav');
  nav.append(prev, count, next);
  const name = h('h3', 'fewrd-name');
  const body = h('div');
  const casePane = h('section');
  casePane.append(nav, name, body);
  const tip = h('div', 'fewrd-tip');
  tip.hidden = true;
  el.replaceChildren(confPane, casePane, tip);

  const showErrors = (list: Errors) => {
    errorList.replaceChildren(
      ...list.map((e) => h('li', undefined, `${[e.path, e.tag && `(${e.tag})`].filter(Boolean).join(' ')}${e.path ? ': ' : ''}${e.message}`)),
    );
  };

  /** The tree list and the fold panel of one case; a box changes only the gist and the greying. */
  function panels(c: PlaygroundCase, compiled: { tags: Record<string, unknown> }, doc: Node, texts: HTMLElement[]): HTMLElement[] {
    const tags = Object.keys(compiled.tags);
    const checked = folds.get(index) ?? new Set(c.fold ?? []);
    folds.set(index, checked);
    for (const t of checked) if (!tags.includes(t)) checked.delete(t);

    const tree = h('div', 'fewrd-tree');
    tree.append(...walk(doc, c.text).map(({ node, line }) => h('div', node.tag === 'text' ? 'fewrd-water' : undefined, line)));
    const treePanel = h('section', 'fewrd-panel');
    treePanel.append(h('h2', undefined, 'tree'), tree);

    const out = h('pre', 'fewrd-gist');
    const verdict = h('div', 'fewrd-verdict');
    const paint = () => {
      const fold: Fold = (n) => checked.has(n.tag);
      out.textContent = gist(doc, fold);
      const same = c.fold !== undefined && c.fold.length === checked.size && c.fold.every((t) => checked.has(t));
      verdict.textContent = c.gist === undefined || !same ? '' : out.textContent === c.gist ? "matches the case's gist" : `differs from the case's gist: ${c.gist}`;
      // The hidden leaves, greyed on the grid: each line's text is cut into plain and grey pieces.
      const pieces = texts.map(() => [] as [number, number][]);
      for (const span of greyed(doc, fold)) for (const { line, from, to } of segments(span, COLS)) pieces[line]?.push([from, to]);
      texts.forEach((el, i) => {
        const line = c.text.slice(i * COLS, (i + 1) * COLS);
        const parts: (string | HTMLElement)[] = [];
        let at = 0;
        for (const [from, to] of pieces[i]) {
          if (from > at) parts.push(line.slice(at, from));
          parts.push(h('span', 'fewrd-grey', line.slice(from, to)));
          at = to;
        }
        if (at < line.length) parts.push(line.slice(at));
        el.replaceChildren(...parts);
      });
    };
    const boxes = h('div', 'fewrd-tags');
    for (const tag of tags) {
      const box = h('input');
      box.type = 'checkbox';
      box.checked = checked.has(tag);
      box.addEventListener('change', () => {
        if (box.checked) checked.add(tag);
        else checked.delete(tag);
        paint();
      });
      const label = h('label');
      label.append(box, tag);
      boxes.append(label);
    }
    const foldPanel = h('section', 'fewrd-panel');
    foldPanel.append(h('h2', undefined, 'fold'), boxes, out, verdict);
    paint();
    return [treePanel, foldPanel];
  }

  function draw(c: PlaygroundCase) {
    const d = domains.get(c.conf);
    if (!d) return body.replaceChildren(h('div', 'fewrd-failed', `no conf named "${c.conf}"`));
    try {
      const chart = find(c.text, d.compiled);
      const rows = [...chart.all()].filter(([, [a, b]]) => b > a);
      const lines = Array.from({ length: Math.max(1, Math.ceil(c.text.length / COLS)) }, (_, i) => {
        const line = h('div', 'fewrd-line');
        const text = h('div', 'fewrd-text', c.text.slice(i * COLS, (i + 1) * COLS));
        line.append(text);
        return { line, text, lanes: [] as HTMLElement[] };
      });
      lanes(rows).forEach((lane, laneIndex) => {
        for (const [tag, span] of lane) {
          const hue = String(hash(tag) % 360);
          const hls: HTMLElement[] = [];
          const pieces = segments(span, COLS);
          pieces.forEach(({ line, from, to }, k) => {
            const l = lines[line];
            while (l.lanes.length <= laneIndex) {
              const laneEl = h('div', 'fewrd-lane');
              l.lanes.push(laneEl);
              l.line.append(laneEl);
            }
            const hl = h('div', 'fewrd-hl');
            hl.style.cssText = `left:${from}ch;width:${to - from}ch`;
            hl.style.setProperty('--h', hue);
            l.text.before(hl);
            hls.push(hl);
            const band = h('span', `fewrd-band${k === 0 ? ' open' : ''}${k === pieces.length - 1 ? ' close' : ''}`);
            band.style.cssText = `left:${from}ch;width:${to - from}ch`;
            band.style.setProperty('--h', hue);
            band.append(h('span', 'fewrd-hit'));
            band.addEventListener('mouseenter', () => {
              hls.forEach((x) => x.classList.add('on'));
              tip.replaceChildren(h('b', undefined, tag), ` (${span[0]}, ${span[1]})`);
              tip.hidden = false;
            });
            band.addEventListener('mousemove', (e) => {
              tip.style.left = `${Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8)}px`;
              tip.style.top = `${e.clientY + 18}px`;
            });
            band.addEventListener('mouseleave', () => {
              hls.forEach((x) => x.classList.remove('on'));
              tip.hidden = true;
            });
            l.lanes[laneIndex].append(band);
          });
        }
      });
      const drawing = h('div', 'fewrd-draw');
      drawing.append(...lines.map((l) => l.line));
      const legend = h('div', 'fewrd-legend');
      for (const tag of new Set(rows.map(([t]) => t))) {
        const chip = h('span', 'fewrd-chip', tag);
        chip.style.setProperty('--h', String(hash(tag) % 360));
        legend.append(chip);
      }
      body.replaceChildren(drawing, legend);
      try {
        body.append(...panels(c, d.compiled, dom(c.text, chart, d.compiled), lines.map((l) => l.text)));
      } catch (e) {
        body.append(h('div', 'fewrd-failed', `could not build the tree: ${message(e)}`));
      }
    } catch (e) {
      body.replaceChildren(h('div', 'fewrd-failed', `could not find: ${message(e)}`));
    }
  }

  function show() {
    const c = cases[index];
    count.textContent = `${cases.length ? index + 1 : 0} / ${cases.length}`;
    if (!c) return name.replaceChildren('no cases');
    name.replaceChildren(c.name, h('small', undefined, c.conf));
    const d = domains.get(c.conf);
    confTitle.textContent = `conf: ${c.conf}`;
    editor.value = d?.text ?? '';
    editor.disabled = !d;
    showErrors(d?.errors ?? []);
    draw(c);
  }

  const go = (by: number) => {
    if (!cases.length) return;
    index = (index + by + cases.length) % cases.length;
    show();
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  document.addEventListener('keydown', (e) => {
    if (!el.isConnected || e.target instanceof HTMLTextAreaElement || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });

  editor.addEventListener('input', () => {
    const c = cases[index];
    const d = domains.get(c.conf)!;
    d.text = editor.value;
    let parsed: unknown;
    try {
      parsed = JSON.parse(editor.value);
    } catch (e) {
      d.errors = [{ path: '', message: `invalid JSON, still showing the last good chart: ${message(e)}` }];
      return showErrors(d.errors);
    }
    const { conf, errors } = compile(parsed, { resolvers: d.resolvers });
    Object.assign(d, { compiled: conf, errors });
    showErrors(errors);
    draw(c);
  });
  show();
}
