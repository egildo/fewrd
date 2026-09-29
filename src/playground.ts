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

/** Where each line of a text wrapped to `cols` characters starts: after the last space that fits, or hard at `cols` when there is none. */
export function wrap(text: string, cols: number): number[] {
  const starts = [0];
  for (let at = 0; text.length - at > cols; starts.push(at)) {
    const space = text.lastIndexOf(' ', at + cols - 1);
    at = space > at ? space + 1 : at + cols;
  }
  return starts;
}

/** Where a row falls on lines that start at `starts`: one piece per line it touches, columns within the line. */
export function segments([a, b]: Span, starts: readonly number[]): { line: number; from: number; to: number }[] {
  const out: { line: number; from: number; to: number }[] = [];
  starts.forEach((from, line) => {
    const end = starts[line + 1] ?? Infinity;
    if (a < end && b > from) out.push({ line, from: Math.max(a, from) - from, to: Math.min(b, end) - from });
  });
  return out;
}

/** The tree, one entry per node but `doc`, in text order: the node, its depth and a one-line description (tag, span, twins, value, the node's text). */
function walk(doc: Node, text: string): { node: Node; depth: number; line: string }[] {
  const out: { node: Node; depth: number; line: string }[] = [];
  const visit = (n: Node, depth: number) => {
    const also = n.also ? ` also=${n.also.join(',')}` : '';
    const value = n.value !== undefined ? ` value=${JSON.stringify(n.value)}` : '';
    out.push({ node: n, depth, line: `${'  '.repeat(depth)}${n.tag} (${n.start}, ${n.end})${also}${value} ${JSON.stringify(text.slice(n.start, n.end))}` });
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


const key = (tag: string, a: number, b: number) => `${tag}:${a}:${b}`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const excerpt = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s);

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// The palette, once per theme; a theme is the light block, or the dark block under the OS setting or a data-theme override.
const LIGHT = `--bg:#f6f6f2;--surface:#fff;--sunken:#efefe9;--text:#1b1c20;--muted:#5f626b;--line:#dedfd8;--hover:#e9edfb;--accent:#3455d6;--accent-fg:#fff;--ok:#17754a;--warn:#9a5b00;--err:#b3261e;--err-bg:#fdeeec;--tip-bg:#1b1c20;--tip-fg:#f5f6f8;--grey:#9b9ea6;--band-s:60%;--band-l:40%;--wash:.22;--shadow:0 8px 28px rgb(20 22 30/.18);`;
const DARK = `--bg:#111214;--surface:#191b1f;--sunken:#0c0d0f;--text:#e8e9ed;--muted:#9a9ea9;--line:#2a2d33;--hover:#232838;--accent:#93a6ff;--accent-fg:#0e1226;--ok:#63d69e;--warn:#f2b661;--err:#ff9c95;--err-bg:#2f1a19;--tip-bg:#eceef3;--tip-fg:#17181c;--grey:#5d616b;--band-s:58%;--band-l:66%;--wash:.3;--shadow:0 8px 28px rgb(0 0 0/.55);`;

const STYLE_ID = 'fewrd-pg-style';
const STYLE = `
.fewrd-pg { --mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; --ui: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 40px; --t-xs: 12px; --t-sm: 13px; --t-md: 15px; --t-lg: 18px; --t-xl: 26px;
  --r-s: 4px; --r-m: 8px; --r-l: 14px; --r-pill: 999px; --grid-size: 15px; --grid-lh: 24px; --band-h: 5px; --lane: 8px; --bar: 73px;
  ${LIGHT} color-scheme: light dark; background: var(--bg); color: var(--text); font: var(--t-md)/1.5 var(--ui); }
@media (prefers-color-scheme: dark) { .fewrd-pg:not([data-theme="light"]) { ${DARK} } }
.fewrd-pg[data-theme="dark"] { ${DARK} color-scheme: dark; }
.fewrd-pg[data-theme="light"] { color-scheme: light; }
.fewrd-pg *, .fewrd-pg ::before, .fewrd-pg ::after { box-sizing: border-box; }
.fewrd-pg [hidden] { display: none !important; }
.fewrd-pg :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.fewrd-pg h2 { margin: 0; font: 600 var(--t-md)/1.3 var(--ui); }
.fewrd-pg button, .fewrd-pg select, .fewrd-pg textarea { font: inherit; color: inherit; }
.fewrd-pg .fewrd-dim { color: var(--muted); font-size: var(--t-sm); }
.fewrd-pg .fewrd-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.fewrd-pg .fewrd-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--s3); min-height: var(--bar); padding: var(--s3) var(--s4); background: color-mix(in srgb, var(--bg) 90%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.fewrd-pg .fewrd-brand { font: 600 var(--t-md) var(--mono); }
.fewrd-pg .fewrd-nav { display: flex; align-items: center; gap: var(--s2); }
.fewrd-pg .fewrd-step { display: grid; place-items: center; width: 48px; height: 48px; padding: 0; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--surface); color: var(--accent); cursor: pointer; transition: background .12s, color .12s, border-color .12s, transform .12s; }
.fewrd-pg .fewrd-step:hover { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
.fewrd-pg .fewrd-step:active { transform: scale(.94); }
.fewrd-pg .fewrd-step svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.fewrd-pg .fewrd-count { min-width: 7ch; text-align: center; font: 600 var(--t-xl)/1 var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fewrd-pg .fewrd-pick { flex: 0 1 30rem; min-width: 0; height: 40px; padding: 0 var(--s3); border-radius: var(--r-m); border: 1px solid var(--line); background: var(--surface); text-overflow: ellipsis; }
.fewrd-pg .fewrd-theme { margin-left: auto; height: 40px; padding: 0 var(--s3); border-radius: var(--r-m); border: 1px solid var(--line); background: var(--surface); font-size: var(--t-sm); cursor: pointer; white-space: nowrap; transition: border-color .12s; }
.fewrd-pg .fewrd-theme:hover { border-color: var(--muted); }

.fewrd-pg .fewrd-layout { display: grid; gap: var(--s4); grid-template-columns: minmax(0, 1fr); grid-template-areas: "draw" "gist" "fold" "conf" "tree"; max-width: 1680px; margin: 0 auto; padding: var(--s4); align-items: start; }
.fewrd-pg .fewrd-card { min-width: 0; padding: var(--s4); border: 1px solid var(--line); border-radius: var(--r-l); background: var(--surface); }
.fewrd-pg .fewrd-drawcard { grid-area: draw; }
.fewrd-pg .fewrd-gistcard { grid-area: gist; border-left: 3px solid var(--accent); }
.fewrd-pg .fewrd-foldcard { grid-area: fold; }
.fewrd-pg .fewrd-conf { grid-area: conf; min-width: 0; }
.fewrd-pg .fewrd-treebox { grid-area: tree; }
@media (min-width: 720px) { .fewrd-pg .fewrd-layout { padding: var(--s5); gap: var(--s5); } }
@media (min-width: 1100px) {
  .fewrd-pg .fewrd-layout { grid-template-columns: minmax(0, 1fr) minmax(340px, 27rem); grid-template-areas: "draw conf" "gist conf" "fold conf" "tree conf"; grid-template-rows: auto auto auto 1fr; }
  .fewrd-pg .fewrd-conf { position: sticky; top: calc(var(--bar) + var(--s5)); max-height: calc(100vh - var(--bar) - var(--s6)); overflow: auto; }
  .fewrd-pg .fewrd-conf textarea { height: max(16rem, calc(100vh - 17rem)); }
}
@media (max-width: 719px) { .fewrd-pg { --grid-size: 14px; --grid-lh: 22px; } .fewrd-pg .fewrd-brand, .fewrd-pg .fewrd-theme .fewrd-lbl { display: none; } .fewrd-pg .fewrd-bar { gap: var(--s2); padding-inline: var(--s3); } .fewrd-pg .fewrd-count { min-width: 6ch; font-size: var(--t-lg); } }

.fewrd-pg .fewrd-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s1) var(--s3); }
.fewrd-pg .fewrd-head .fewrd-grow { margin-left: auto; }

.fewrd-pg .fewrd-draw { font: var(--grid-size)/var(--grid-lh) var(--mono); font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; letter-spacing: 0; transition: opacity .15s; }
.fewrd-pg [data-stale] .fewrd-draw { opacity: .5; }
.fewrd-pg .fewrd-probe { display: block; width: 1ch; height: 0; }
.fewrd-pg .fewrd-line { position: relative; margin-bottom: var(--s4); }
.fewrd-pg .fewrd-text { position: relative; white-space: pre; height: var(--grid-lh); }
.fewrd-pg .fewrd-wash { position: absolute; top: 0; height: var(--grid-lh); border-radius: var(--r-s); background: hsl(var(--h) 80% 55% / var(--wash)); pointer-events: none; }
.fewrd-pg .fewrd-lane { position: relative; height: var(--lane); }
.fewrd-pg .fewrd-lane:first-of-type { margin-top: 2px; }
.fewrd-pg .fewrd-band { --band: hsl(var(--h) var(--band-s) var(--band-l)); position: absolute; top: 1px; height: var(--band-h); background: var(--band); transition: opacity .15s, filter .15s; }
.fewrd-pg .fewrd-band.lost { background: repeating-linear-gradient(90deg, var(--band) 0 3px, transparent 3px 5px); }
.fewrd-pg .fewrd-band.gone { opacity: .25; }
.fewrd-pg .fewrd-band:hover, .fewrd-pg .fewrd-band:focus-visible { filter: brightness(1.2) saturate(1.2); }
.fewrd-pg .fewrd-band.open { border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.fewrd-pg .fewrd-band.close { border-top-right-radius: 2px; border-bottom-right-radius: 2px; }
.fewrd-pg .fewrd-band.open::before, .fewrd-pg .fewrd-band.close::after { content: ""; position: absolute; top: -1px; width: 2px; height: 7px; background: var(--band); filter: brightness(.85); }
.fewrd-pg .fewrd-band.open::before { left: 0; }
.fewrd-pg .fewrd-band.close::after { right: 0; }
.fewrd-pg .fewrd-band .fewrd-hit { position: absolute; inset: -1px 0; }
.fewrd-pg .fewrd-band:focus-visible { outline-offset: 3px; }
.fewrd-pg .fewrd-grey { color: var(--grey); text-decoration: line-through; }
.fewrd-pg .fewrd-hint { margin: var(--s3) 0 0; color: var(--muted); font-size: var(--t-xs); }
.fewrd-pg .fewrd-failed { margin: 0; color: var(--err); font-size: var(--t-sm); }
.fewrd-pg .fewrd-tip { position: fixed; z-index: 20; max-width: min(90vw, 44ch); padding: var(--s2) var(--s3); border-radius: var(--r-m); background: var(--tip-bg); color: var(--tip-fg); font: var(--t-xs)/1.5 var(--mono); box-shadow: var(--shadow); pointer-events: none; }
.fewrd-pg .fewrd-tip div { opacity: .75; overflow-wrap: anywhere; }

.fewrd-pg .fewrd-gist { margin: var(--s2) 0 0; font: 500 16px/1.5 var(--mono); font-variant-ligatures: none; white-space: pre-wrap; overflow-wrap: anywhere; }
.fewrd-pg .fewrd-gist.empty { color: var(--muted); font-style: italic; }
.fewrd-pg .fewrd-verdict { font-size: var(--t-xs); font-weight: 600; }
.fewrd-pg .fewrd-verdict.ok { color: var(--ok); }
.fewrd-pg .fewrd-verdict.warn { color: var(--warn); }
.fewrd-pg .fewrd-reset { padding: var(--s1) var(--s3); border-radius: var(--r-pill); border: 1px solid var(--line); background: var(--surface); font-size: var(--t-xs); cursor: pointer; }
.fewrd-pg .fewrd-reset:hover { border-color: var(--accent); color: var(--accent); }

.fewrd-pg .fewrd-chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2); margin-top: var(--s3); }
.fewrd-pg .fewrd-cap { flex-basis: 100%; margin-top: var(--s1); color: var(--muted); font-size: var(--t-xs); }
.fewrd-pg .fewrd-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px 6px 8px; border: 1px solid var(--line); border-radius: var(--r-pill); background: var(--surface); font: var(--t-sm)/1 var(--mono); cursor: pointer; user-select: none; transition: background .12s, border-color .12s; }
.fewrd-pg .fewrd-chip:hover { border-color: var(--muted); }
.fewrd-pg .fewrd-chip:has(input:checked) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--surface)); }
.fewrd-pg .fewrd-chip:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
.fewrd-pg .fewrd-chip.absent { color: var(--muted); border-style: dashed; }
.fewrd-pg .fewrd-chip input { width: 14px; height: 14px; margin: 0; accent-color: var(--accent); }
.fewrd-pg .fewrd-chip i { width: 12px; height: var(--band-h); border-radius: 2px; background: hsl(var(--h) var(--band-s) var(--band-l)); }

.fewrd-pg summary { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) 0; cursor: pointer; list-style: none; }
.fewrd-pg summary::-webkit-details-marker { display: none; }
.fewrd-pg summary::before { content: ""; width: 7px; height: 7px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(-45deg); transition: transform .12s; }
.fewrd-pg details[open] > summary::before { transform: rotate(45deg); }
.fewrd-pg .fewrd-badge { padding: 2px 8px; border-radius: var(--r-pill); background: var(--err-bg); color: var(--err); font-size: var(--t-xs); font-weight: 600; }

.fewrd-pg .fewrd-conf textarea { display: block; width: 100%; height: 22rem; margin-top: var(--s2); padding: var(--s3); border: 1px solid var(--line); border-radius: var(--r-m); background: var(--sunken); resize: vertical; font: var(--t-xs)/1.6 var(--mono); font-variant-ligatures: none; tab-size: 2; }
.fewrd-pg .fewrd-conf textarea[aria-invalid="true"] { border-color: var(--err); }
.fewrd-pg .fewrd-errors { margin-top: var(--s3); padding: var(--s3); border: 1px solid color-mix(in srgb, var(--err) 35%, transparent); border-radius: var(--r-m); background: var(--err-bg); color: var(--err); font-size: var(--t-sm); overflow-wrap: anywhere; }
.fewrd-pg .fewrd-errors ul { margin: var(--s2) 0 0; padding-left: 1.2em; font: var(--t-xs)/1.5 var(--mono); }
.fewrd-pg .fewrd-errors code { display: block; margin-top: var(--s1); font: var(--t-xs)/1.5 var(--mono); }

.fewrd-pg .fewrd-tree { margin-top: var(--s3); font: var(--t-sm)/1.75 var(--mono); font-variant-ligatures: none; }
.fewrd-pg .fewrd-node { --d: 0; display: flex; align-items: baseline; gap: var(--s2); min-width: 0; padding: 0 var(--s2) 0 calc(var(--s2) + var(--d) * 1.25rem); border-radius: var(--r-s); background-image: repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 1.25rem); background-size: calc(var(--d) * 1.25rem) 100%; background-repeat: no-repeat; background-position: var(--s2) 0; transition: background-color .12s; }
.fewrd-pg .fewrd-node:hover, .fewrd-pg .fewrd-node.on { background-color: var(--hover); }
.fewrd-pg .fewrd-node i { flex: none; width: 10px; height: var(--band-h); align-self: center; border-radius: 2px; background: hsl(var(--h) var(--band-s) var(--band-l)); }
.fewrd-pg .fewrd-node b { font-weight: 600; }
.fewrd-pg .fewrd-node .sp { flex: none; color: var(--muted); }
.fewrd-pg .fewrd-node .pill { flex: none; padding: 0 6px; border-radius: var(--r-pill); background: color-mix(in srgb, var(--muted) 16%, transparent); font-size: var(--t-xs); }
.fewrd-pg .fewrd-node .q { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
.fewrd-pg .fewrd-node.water { color: var(--muted); }
.fewrd-pg .fewrd-node.water b { font-weight: 400; }
.fewrd-pg .fewrd-node.gone b, .fewrd-pg .fewrd-node.gone .q { color: var(--grey); text-decoration: line-through; }
@media (prefers-reduced-motion: reduce) { .fewrd-pg *, .fewrd-pg ::before { transition: none !important; } }`;

type Errors = Pick<CompileError, 'path' | 'tag' | 'message'>[];
interface Domain {
  resolvers?: Readonly<Record<string, Resolve>>;
  compiled: ReturnType<typeof compile>['conf'];
  errors: Errors;
  text: string;
  /** The parser's message while the editor holds JSON that does not parse; the last good compile stays on screen. */
  invalid?: string;
}
type Piece = { line: number; from: number; to: number };

const THEMES = ['auto', 'light', 'dark'] as const;
const chevron = (path: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

/**
 * Mount the playground on `el`: `confs` are named confs (data, typically JSON
 * imports) with their resolvers, and every case says which one it uses. One case
 * shows at a time, stepped with the buttons, the jump menu or the arrow keys; the
 * editor shows the conf of the current case and recompiles it on every edit, so
 * only that domain's cases change. Injects its own scoped styles; light and dark
 * follow the OS unless the theme switch says otherwise.
 *
 * ponytail: the case is found again on every keystroke; debounce if a conf or a
 * case ever makes typing lag. A character outside the BMP takes two string
 * positions but one glyph, so bands after it drift by one `ch`; measure with
 * Range rects if real subjects need it. A newline in a text is not handled. The
 * tree is not keyboard-navigable: the bands are, and they light their tree rows.
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

  const domains = new Map<string, Domain>(
    Object.entries(options.confs).map(([name, { conf, resolvers }]) => {
      const { conf: compiled, errors } = compile(conf, { resolvers });
      return [name, { resolvers, compiled, errors: errors as Errors, text: JSON.stringify(conf, null, 2) }];
    }),
  );
  let index = 0;
  let cols = 80;
  /** The tags ticked in the fold panel, per case; seeded from the case's own `fold`, kept until the page reloads. */
  const folds = new Map<number, Set<string>>();

  // The bar: step, count, jump, theme.
  const step = (label: string, path: string) => {
    const b = h('button', 'fewrd-step');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = chevron(path);
    return b;
  };
  const prev = step('previous case', 'M15 5l-7 7 7 7');
  const next = step('next case', 'M9 5l7 7-7 7');
  const count = h('span', 'fewrd-count');
  const nav = h('div', 'fewrd-nav');
  nav.append(prev, count, next);
  const pick = h('select', 'fewrd-pick');
  pick.setAttribute('aria-label', 'jump to a case');
  const groups = new Map<string, HTMLOptGroupElement>();
  cases.forEach((c, i) => {
    let group = groups.get(c.conf);
    if (!group) {
      group = h('optgroup');
      group.label = c.conf;
      groups.set(c.conf, group);
      pick.append(group);
    }
    const option = h('option', undefined, c.name);
    option.value = String(i);
    group.append(option);
  });
  const themeButton = h('button', 'fewrd-theme');
  themeButton.type = 'button';
  const status = h('div', 'fewrd-sr');
  status.setAttribute('aria-live', 'polite');
  const bar = h('header', 'fewrd-bar');
  bar.append(h('span', 'fewrd-brand', 'fewrd'), nav, pick, themeButton, status);

  let theme: (typeof THEMES)[number] = 'auto';
  try {
    const saved = localStorage.getItem(STYLE_ID);
    if (THEMES.includes(saved as never)) theme = saved as typeof theme;
  } catch {}
  const paintTheme = () => {
    if (theme === 'auto') delete el.dataset.theme;
    else el.dataset.theme = theme;
    themeButton.replaceChildren('◐ ', h('span', 'fewrd-lbl', theme));
    themeButton.setAttribute('aria-label', `theme: ${theme}, switch`);
    try {
      localStorage.setItem(STYLE_ID, theme);
    } catch {}
  };
  themeButton.addEventListener('click', () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    paintTheme();
  });
  paintTheme();

  // The grid card: the text, its bands, one line of help.
  const probe = h('span', 'fewrd-probe');
  const lineBox = h('div');
  const drawing = h('div', 'fewrd-draw');
  drawing.append(probe, lineBox);
  const hint = h('p', 'fewrd-hint');
  const drawCard = h('section', 'fewrd-card fewrd-drawcard');
  drawCard.setAttribute('aria-label', 'the case, with its rows');
  drawCard.append(drawing, hint);

  // The gist, then the fold.
  const gistOut = h('p', 'fewrd-gist');
  gistOut.setAttribute('aria-live', 'polite');
  gistOut.setAttribute('aria-atomic', 'true');
  const saved = h('span', 'fewrd-dim');
  const verdict = h('span', 'fewrd-verdict');
  const gistCard = h('section', 'fewrd-card fewrd-gistcard');
  const gistHead = h('div', 'fewrd-head');
  gistHead.append(h('h2', undefined, 'Gist'), saved, verdict);
  gistCard.append(gistHead, gistOut);

  const chips = h('div', 'fewrd-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'tags to fold');
  const reset = h('button', 'fewrd-reset', 'Reset');
  reset.type = 'button';
  const foldCard = h('section', 'fewrd-card fewrd-foldcard');
  const foldHead = h('div', 'fewrd-head');
  foldHead.append(h('h2', undefined, 'Fold'), h('span', 'fewrd-dim', 'Tick a tag to drop it from the gist.'), reset);
  reset.classList.add('fewrd-grow');
  foldCard.append(foldHead, chips);

  // The conf: an editor, its errors outside the collapse so they stay in view.
  const confName = h('span', 'fewrd-dim');
  const badge = h('span', 'fewrd-badge');
  const editor = h('textarea');
  editor.spellcheck = false;
  editor.setAttribute('aria-label', 'conf, as JSON');
  const confSummary = h('summary');
  confSummary.append(h('h2', undefined, 'Conf'), confName, badge);
  const confDetails = h('details');
  confDetails.append(confSummary, editor);
  const errorBox = h('div', 'fewrd-errors');
  errorBox.setAttribute('aria-live', 'polite');
  const confPane = h('section', 'fewrd-card fewrd-conf');
  confPane.append(confDetails, errorBox);

  const treeMeta = h('span', 'fewrd-dim');
  const treeBody = h('div', 'fewrd-tree');
  const treeSummary = h('summary');
  treeSummary.append(h('h2', undefined, 'Tree'), treeMeta);
  const treeDetails = h('details');
  treeDetails.append(treeSummary, treeBody);
  const treeBox = h('section', 'fewrd-card fewrd-treebox');
  treeBox.append(treeDetails);

  const layout = h('div', 'fewrd-layout');
  layout.append(drawCard, gistCard, foldCard, confPane, treeBox);
  const tip = h('div', 'fewrd-tip');
  tip.hidden = true;
  el.replaceChildren(bar, layout, tip);

  // The conf and the tree open when there is room; the reader's own toggle stands until the width crosses a breakpoint.
  const wide = matchMedia('(min-width: 1100px)');
  const medium = matchMedia('(min-width: 720px)');
  const room = () => {
    confDetails.open = wide.matches;
    treeDetails.open = medium.matches;
  };
  wide.addEventListener('change', room);
  medium.addEventListener('change', room);
  room();

  // Highlights and the tooltip, shared by the bands and the tree rows.
  // `order` is the bands in reading order, one per row: the only one in the tab order is the one last focused, ↑ ↓ move along it.
  let view: { starts: number[]; lines: HTMLElement[]; order: HTMLElement[]; head: Map<HTMLElement, HTMLElement> } = { starts: [0], lines: [], order: [], head: new Map() };
  let washes: HTMLElement[] = [];
  let lit: HTMLElement[] = [];
  const light = (span: Span, hue: number) => {
    unlight();
    for (const { line, from, to } of segments(span, view.starts)) {
      const wash = h('div', 'fewrd-wash');
      wash.style.cssText = `left:${from}ch;width:${to - from}ch`;
      wash.style.setProperty('--h', String(hue));
      view.lines[line]?.prepend(wash);
      washes.push(wash);
    }
  };
  const unlight = () => {
    washes.forEach((w) => w.remove());
    washes = [];
  };
  const leave = () => {
    tip.hidden = true;
    unlight();
    lit.forEach((r) => r.classList.remove('on'));
    lit = [];
  };
  const place = (x: number, below: number, above: number) => {
    tip.hidden = false;
    tip.style.left = `${Math.max(8, Math.min(x, innerWidth - tip.offsetWidth - 8))}px`;
    tip.style.top = `${below + tip.offsetHeight > innerHeight - 8 ? above - tip.offsetHeight : below}px`;
  };

  function fail(text: string) {
    leave();
    lineBox.replaceChildren(h('p', 'fewrd-failed', text));
    hint.textContent = '';
    chips.replaceChildren();
    treeBody.replaceChildren();
    treeMeta.textContent = '';
    gistOut.textContent = '';
    saved.textContent = '';
    verdict.hidden = reset.hidden = true;
  }

  function draw(c: PlaygroundCase) {
    leave();
    const d = domains.get(c.conf);
    if (!d) return fail(`No conf named “${c.conf}”.`);
    let chart;
    try {
      chart = find(c.text, d.compiled);
    } catch (e) {
      return fail(`Could not find: ${message(e)}`);
    }
    let doc: Node | undefined;
    let treeError = '';
    try {
      doc = dom(c.text, chart, d.compiled);
    } catch (e) {
      treeError = `Could not build the tree: ${message(e)}`;
    }
    const rows = [...chart.all()].filter(([, [a, b]]) => b > a);
    const order = Object.keys(d.compiled.tags);
    // Golden-angle hues by the tag's place in the conf: thirty tags stay apart, and a tag keeps its colour from case to case.
    const hue = (tag: string) => Math.round((Math.max(0, order.indexOf(tag)) * 137.508 + 25) % 360);

    // What the tree kept: a chart row is a node, a twin of one, or not in the tree.
    const entries = doc ? walk(doc, c.text) : [];
    const nodes = new Map<string, { node: Node; twinOf?: string }>();
    for (const { node } of entries) {
      if (node.tag === 'text') continue;
      nodes.set(key(node.tag, node.start, node.end), { node });
      for (const t of node.also ?? []) nodes.set(key(t, node.start, node.end), { node, twinOf: node.tag });
    }
    const rowsByKey = new Map<string, HTMLElement>();
    const rowOf = new Map<Node, HTMLElement>();
    const bandsByKey = new Map<string, HTMLElement[]>();

    // The grid: one line per wrap, lanes under it, bands in the lanes.
    const starts = wrap(c.text, cols);
    const lines = starts.map((from, i) => {
      const line = h('div', 'fewrd-line');
      const text = h('div', 'fewrd-text', c.text.slice(from, starts[i + 1]));
      line.append(text);
      return { line, text, lanes: [] as HTMLElement[] };
    });
    view = { starts, lines: lines.map((l) => l.line), order: [], head: new Map() };
    const first: { band: HTMLElement; span: Span }[] = [];
    let lost = 0;
    const tipFor = (tag: string, span: Span) => {
      const hit = nodes.get(key(tag, ...span));
      const note = !doc ? '' : !hit ? 'not in the tree' : hit.twinOf ? `twin of ${hit.twinOf}` : hit.node.value !== undefined ? `value ${JSON.stringify(hit.node.value)}` : 'in the tree';
      tip.replaceChildren(h('b', undefined, tag), ` (${span[0]}, ${span[1]})`, h('div', undefined, JSON.stringify(excerpt(c.text.slice(...span)))));
      if (note) tip.append(h('div', undefined, note));
    };
    lanes(rows).forEach((lane, laneIndex) => {
      for (const [tag, span] of lane) {
        const k = key(tag, ...span);
        const isLost = doc !== undefined && !nodes.has(k);
        if (isLost) lost++;
        const pieces = segments(span, starts);
        let head: HTMLElement | undefined;
        pieces.forEach(({ line, from, to }, i) => {
          const l = lines[line];
          while (l.lanes.length <= laneIndex) {
            const laneEl = h('div', 'fewrd-lane');
            l.lanes.push(laneEl);
            l.line.append(laneEl);
          }
          const band = h('span', `fewrd-band${i === 0 ? ' open' : ''}${i === pieces.length - 1 ? ' close' : ''}${isLost ? ' lost' : ''}`);
          band.style.cssText = `left:${from}ch;width:${to - from}ch`;
          band.style.setProperty('--h', String(hue(tag)));
          band.tabIndex = -1;
          if (head) view.head.set(band, head);
          else first.push({ band, span });
          head ??= band;
          band.setAttribute('role', 'img');
          band.setAttribute('aria-label', `${tag}, ${span[0]} to ${span[1]}${isLost ? ', not in the tree' : ''}`);
          band.append(h('span', 'fewrd-hit'));
          const enter = () => {
            light(span, hue(tag));
            const row = rowsByKey.get(k);
            if (row) {
              row.classList.add('on');
              lit.push(row);
            }
            tipFor(tag, span);
          };
          band.addEventListener('mouseenter', enter);
          band.addEventListener('mousemove', (e) => place(e.clientX + 14, e.clientY + 18, e.clientY - 12));
          band.addEventListener('mouseleave', leave);
          band.addEventListener('focus', () => {
            view.order.forEach((b) => (b.tabIndex = -1));
            (view.head.get(band) ?? band).tabIndex = 0;
            enter();
            const r = band.getBoundingClientRect();
            place(r.left, r.bottom + 6, r.top - 6);
          });
          band.addEventListener('blur', leave);
          l.lanes[laneIndex].append(band);
          bandsByKey.set(k, [...(bandsByKey.get(k) ?? []), band]);
        });
      }
    });
    view.order = first.sort((x, y) => x.span[0] - y.span[0] || y.span[1] - x.span[1]).map((x) => x.band);
    if (view.order[0]) view.order[0].tabIndex = 0;
    lineBox.replaceChildren(...lines.map((l) => l.line));
    const laneCount = Math.max(0, ...lines.map((l) => l.lanes.length));
    hint.textContent = rows.length
      ? `${rows.length} rows in ${laneCount} lane${laneCount === 1 ? '' : 's'}. Hover a band, or Tab to the bands and use ↑ ↓, to read it.${lost ? ' Dashed bands are rows the tree did not keep.' : ''}`
      : 'Nothing found in this text with this conf.';

    // The tree: one row per node, linked both ways with the grid.
    treeMeta.textContent = doc ? `${entries.length} nodes` : '';
    treeBody.replaceChildren(
      ...(doc
        ? entries.map(({ node, depth, line }) => {
            const water = node.tag === 'text';
            const row = h('div', `fewrd-node${water ? ' water' : ''}`);
            row.style.setProperty('--d', String(depth));
            row.title = line.trim();
            if (!water) {
              const swatch = h('i');
              swatch.style.setProperty('--h', String(hue(node.tag)));
              row.append(swatch);
            }
            row.append(h('b', undefined, node.tag), h('span', 'sp', `${node.start}–${node.end}`));
            if (node.also) row.append(h('span', 'pill', `also ${node.also.join(', ')}`));
            if (node.value !== undefined) row.append(h('span', 'pill', `= ${JSON.stringify(node.value)}`));
            row.append(h('span', 'q', JSON.stringify(c.text.slice(node.start, node.end))));
            row.addEventListener('mouseenter', () => light([node.start, node.end], water ? 215 : hue(node.tag)));
            row.addEventListener('mouseleave', unlight);
            rowOf.set(node, row);
            if (!water) for (const t of [node.tag, ...(node.also ?? [])]) rowsByKey.set(key(t, node.start, node.end), row);
            return row;
          })
        : [h('p', 'fewrd-failed', treeError)]),
    );

    // The fold: a chip per tag, the tags this tree holds first.
    const tags = Object.keys(d.compiled.tags);
    const checked = folds.get(index) ?? new Set(c.fold ?? []);
    folds.set(index, checked);
    for (const t of checked) if (!tags.includes(t)) checked.delete(t);
    const present = new Set(entries.flatMap(({ node }) => (node.tag === 'text' ? [] : [node.tag, ...(node.also ?? [])])));
    const boxes = new Map<string, HTMLInputElement>();
    const chip = (tag: string) => {
      const box = h('input');
      box.type = 'checkbox';
      box.checked = checked.has(tag);
      box.addEventListener('change', () => {
        if (box.checked) checked.add(tag);
        else checked.delete(tag);
        paint();
      });
      boxes.set(tag, box);
      const swatch = h('i');
      swatch.style.setProperty('--h', String(hue(tag)));
      const label = h('label', `fewrd-chip${present.has(tag) ? '' : ' absent'}`);
      label.append(box, swatch, tag);
      return label;
    };
    const inTree = tags.filter((t) => present.has(t));
    const rest = tags.filter((t) => !present.has(t));
    chips.replaceChildren(...inTree.map(chip), ...(rest.length ? [h('span', 'fewrd-cap', 'not in this tree')] : []), ...rest.map(chip));
    reset.onclick = () => {
      checked.clear();
      (c.fold ?? []).forEach((t) => tags.includes(t) && checked.add(t));
      boxes.forEach((box, t) => (box.checked = checked.has(t)));
      paint();
    };

    /** A tick changes only the gist, the greying and what fades; nothing is rebuilt. */
    function paint() {
      const fold: Fold = (n) => checked.has(n.tag);
      const out = doc ? gist(doc, fold) : '';
      gistOut.textContent = !doc ? 'No gist: the tree could not be built.' : out || '(nothing left)';
      gistOut.classList.toggle('empty', !doc || !out);
      saved.textContent = doc ? `${c.text.length} → ${out.length} characters` : '';
      const same = (c.fold ?? []).length === checked.size && (c.fold ?? []).every((t) => checked.has(t));
      verdict.hidden = !doc || c.gist === undefined || c.fold === undefined || !same;
      const ok = out === c.gist;
      verdict.textContent = ok ? "✓ matches the case's gist" : "≠ differs from the case's gist";
      verdict.title = ok ? '' : `the case's gist: ${c.gist}`;
      verdict.className = `fewrd-verdict ${ok ? 'ok' : 'warn'}`;
      reset.hidden = same;
      if (!doc) return;
      const gone = hidden(doc, fold);
      for (const [k, { node }] of nodes) bandsByKey.get(k)?.forEach((b) => b.classList.toggle('gone', gone.has(node)));
      for (const [node, row] of rowOf) row.classList.toggle('gone', gone.has(node));
      // The hidden leaves, greyed on the grid: each line's text is cut into plain and grey pieces.
      const pieces: Piece[] = [];
      for (const span of greyed(doc, fold)) pieces.push(...segments(span, starts));
      lines.forEach(({ text }, i) => {
        const from = starts[i];
        const line = c.text.slice(from, starts[i + 1]);
        const parts: (string | HTMLElement)[] = [];
        let at = 0;
        for (const p of pieces.filter((p) => p.line === i)) {
          if (p.from > at) parts.push(line.slice(at, p.from));
          parts.push(h('span', 'fewrd-grey', line.slice(p.from, p.to)));
          at = p.to;
        }
        if (at < line.length) parts.push(line.slice(at));
        text.replaceChildren(...parts);
      });
    }
    paint();
  }

  function showErrors(d?: Domain) {
    const list = d?.errors ?? [];
    errorBox.replaceChildren();
    if (d?.invalid) errorBox.append(h('b', undefined, 'Invalid JSON.'), ' Showing the last good chart.', h('code', undefined, d.invalid));
    else if (list.length) {
      const items = h('ul');
      items.append(...list.map((e) => h('li', undefined, `${[e.path, e.tag && `(${e.tag})`].filter(Boolean).join(' ')}${e.path ? ': ' : ''}${e.message}`)));
      errorBox.append(h('b', undefined, `${list.length} error${list.length === 1 ? '' : 's'} in the conf.`), ' The tags that compiled are drawn.', items);
    }
    errorBox.hidden = !errorBox.hasChildNodes();
    editor.setAttribute('aria-invalid', String(!errorBox.hidden));
    badge.textContent = d?.invalid ? 'invalid JSON' : list.length ? `${list.length} error${list.length === 1 ? '' : 's'}` : '';
    badge.hidden = !badge.textContent;
    drawCard.toggleAttribute('data-stale', Boolean(d?.invalid));
  }

  function show() {
    const c = cases[index];
    count.textContent = `${cases.length ? index + 1 : 0} / ${cases.length}`;
    if (!c) return fail('No cases to show.');
    pick.value = String(index);
    status.textContent = `Case ${index + 1} of ${cases.length}: ${c.name}`;
    const d = domains.get(c.conf);
    confName.textContent = c.conf;
    editor.value = d?.text ?? '';
    editor.disabled = !d;
    showErrors(d);
    draw(c);
  }

  const go = (by: number) => {
    if (!cases.length) return;
    index = (index + by + cases.length) % cases.length;
    show();
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  pick.addEventListener('change', () => {
    index = Number(pick.value);
    show();
  });
  document.addEventListener('keydown', (e) => {
    if (!el.isConnected || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
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
      d.invalid = message(e);
      return showErrors(d);
    }
    d.invalid = undefined;
    const { conf, errors } = compile(parsed, { resolvers: d.resolvers });
    Object.assign(d, { compiled: conf, errors });
    showErrors(d);
    draw(c);
  });

  lineBox.addEventListener('keydown', (e) => {
    const from = e.target instanceof HTMLElement ? (view.head.get(e.target) ?? e.target) : null;
    const at = from ? view.order.indexOf(from) : -1;
    const to = e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? view.order.length - 1 : -1;
    if (at < 0 || to < 0 || to >= view.order.length) return;
    e.preventDefault();
    view.order[to].focus();
  });

  // The wrap follows the card: as many columns as its width holds, measured in the grid's own font.
  const measure = () => {
    const ch = probe.getBoundingClientRect().width;
    const fit = ch ? Math.max(20, Math.floor(drawing.clientWidth / ch)) : cols;
    const changed = fit !== cols;
    cols = fit;
    return changed;
  };
  measure();
  new ResizeObserver(() => measure() && cases[index] && draw(cases[index])).observe(drawing);
  document.fonts?.ready.then(() => measure() && cases[index] && draw(cases[index]));
  show();
}
