// The playground: one case at a time, its text on a character grid with every
// row of the chart drawn as an underline (stacked in lanes where rows overlap),
// a popover with the row's tag, span and value on hover. Under the chart, the
// gist, the tags as chips (hover lights a tag's rows, a click keeps them lit,
// the eye folds the tag), the tree, and the conf editor as a left pane on wide
// screens or a drawer below.

import type { Span } from './chart.ts';
import { compile, type CompileError, type Resolve } from './index.ts';
import { dom, type Node } from './dom.ts';
import { find } from './find.ts';
import { hidden, gist, type Fold } from './fold.ts';
import { HUES, greyed, lanes, segments, slot, walk, wrap, type Row } from './grid.ts';

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

const key = (tag: string, a: number, b: number) => `${tag}:${a}:${b}`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// The palette, once per theme; a theme is the light block, or the dark block under the OS setting or a data-theme override.
// Neutrals: warm paper in light (hue 85), cool ink in dark (hue 265), surfaces close together and the text far from them; the twelve band hues share one lightness and chroma per theme.
const LIGHT = `--bg:oklch(.965 .008 85);--surface:oklch(.977 .007 85);--raised:oklch(.99 .005 85);--sunken:oklch(.948 .009 85);--text:oklch(.21 .015 265);--muted:oklch(.45 .015 85);--faint:oklch(.6 .012 85);--line:oklch(.91 .009 85);--line-strong:oklch(.84 .011 85);--hover:oklch(.935 .02 270);--accent:oklch(.5 .13 275);--accent-fg:oklch(.985 .005 85);--ok:oklch(.5 .09 155);--warn:oklch(.52 .09 70);--err:oklch(.5 .12 27);--err-bg:oklch(.962 .02 27);--grey:oklch(.7 .008 85);--band-l:.64;--band-c:.105;--wash:18%;--shadow-sm:0 1px 2px oklch(.3 .02 85/.07);--shadow-pop:0 1px 2px oklch(.3 .02 85/.08),0 10px 28px oklch(.3 .02 85/.16);`;
const DARK = `--bg:oklch(.22 .012 265);--surface:oklch(.25 .013 265);--raised:oklch(.29 .015 265);--sunken:oklch(.19 .011 265);--text:oklch(.94 .006 265);--muted:oklch(.74 .01 265);--faint:oklch(.58 .012 265);--line:oklch(.31 .013 265);--line-strong:oklch(.4 .015 265);--hover:oklch(.3 .03 270);--accent:oklch(.76 .09 275);--accent-fg:oklch(.2 .03 275);--ok:oklch(.78 .1 155);--warn:oklch(.8 .09 75);--err:oklch(.75 .11 25);--err-bg:oklch(.27 .04 25);--grey:oklch(.5 .01 265);--band-l:.74;--band-c:.1;--wash:24%;--shadow-sm:0 1px 2px oklch(0 0 0/.3);--shadow-pop:0 1px 2px oklch(0 0 0/.4),0 10px 28px oklch(0 0 0/.45);`;
const BANDS = HUES.map((hue, i) => `--band-${i}:oklch(var(--band-l) var(--band-c) ${hue});`).join('');

const STYLE_ID = 'fewrd-pg-style';
const STYLE = `
.fewrd-pg { --ui: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; --icon: "Material Symbols Rounded";
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 40px; --t-xs: 12px; --t-sm: 13px; --t-md: 15px; --t-lg: 18px; --t-xl: 26px; --w-reg: 400; --w-med: 500; --w-semi: 600;
  --r-s: 4px; --r-m: 8px; --r-l: 14px; --r-pill: 999px; --grid-size: 15px; --grid-lh: 24px; --band-h: 5px; --band-h-lost: 3px; --lane: 8px; --bar: 73px; --ic: 20px; --ic-s: 16px; --dur: 130ms; --dur-drawer: 200ms; --drawer-w: min(34rem, calc(100vw - var(--s6))); --pane: 38%; --scrim: color-mix(in oklch, var(--text) 30%, transparent);
  ${BANDS} ${LIGHT} color-scheme: light dark; background: var(--bg); color: var(--text); font: var(--w-reg) var(--t-md)/1.5 var(--ui);  -webkit-font-smoothing: antialiased; }
@media (prefers-color-scheme: dark) { .fewrd-pg:not([data-theme="light"]) { ${DARK} } }
.fewrd-pg[data-theme="dark"] { ${DARK} color-scheme: dark; }
.fewrd-pg[data-theme="light"] { color-scheme: light; }
.fewrd-pg *, .fewrd-pg ::before, .fewrd-pg ::after { box-sizing: border-box; }
.fewrd-pg [hidden] { display: none !important; }
.fewrd-pg :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.fewrd-pg h2 { margin: 0; font: var(--w-semi) var(--t-md)/1.3 var(--ui); letter-spacing: -.005em; }
.fewrd-pg button, .fewrd-pg select, .fewrd-pg textarea { font: inherit; color: inherit; }
.fewrd-pg .fewrd-dim { color: var(--muted); font-size: var(--t-sm); font-variant-numeric: tabular-nums; }
.fewrd-pg .fewrd-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* Icons: a ligature name inside, a text glyph in data-fb until the icon font has loaded (the root then carries data-icons). */
.fewrd-pg .fewrd-ic { display: inline-grid; place-items: center; flex: none; width: var(--ic); height: var(--ic); overflow: hidden; font-size: 0; line-height: 1; user-select: none; transition: transform var(--dur); }
.fewrd-pg .fewrd-ic::before { content: attr(data-fb); font: var(--w-med) calc(var(--ic) * .9)/1 var(--ui); }
.fewrd-pg[data-icons] .fewrd-ic { font: var(--w-reg) var(--ic)/1 var(--icon); font-variation-settings: "wght" 500; font-feature-settings: "liga"; letter-spacing: normal; text-transform: none; white-space: nowrap; direction: ltr; }
.fewrd-pg[data-icons] .fewrd-ic::before { content: none; }

.fewrd-pg .fewrd-bar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: var(--s3); min-height: var(--bar); padding: var(--s3) var(--s4); background: color-mix(in oklch, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.fewrd-pg .fewrd-brand { font: var(--w-semi) var(--t-lg)/1 var(--ui); letter-spacing: -.02em; }
.fewrd-pg .fewrd-nav { display: flex; align-items: center; gap: var(--s2); }
.fewrd-pg .fewrd-step { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--raised); color: var(--accent); box-shadow: var(--shadow-sm); cursor: pointer; transition: background var(--dur), color var(--dur), border-color var(--dur), transform var(--dur); }
.fewrd-pg .fewrd-step .fewrd-ic { --ic: 26px; }
.fewrd-pg .fewrd-step:hover { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
.fewrd-pg .fewrd-step:active { transform: scale(.94); }
.fewrd-pg .fewrd-count { min-width: 7ch; text-align: center; font: var(--w-semi) var(--t-xl)/1 var(--ui); font-variant-numeric: tabular-nums; letter-spacing: -.02em; white-space: nowrap; }
.fewrd-pg .fewrd-pick { flex: 0 1 30rem; min-width: 0; height: 40px; padding: 0 var(--s3); border-radius: var(--r-m); border: 1px solid var(--line); background: var(--raised); font-weight: var(--w-med); text-overflow: ellipsis; }
.fewrd-pg .fewrd-theme { display: inline-flex; align-items: center; gap: var(--s2); margin-left: auto; height: 40px; padding: 0 var(--s3); border-radius: var(--r-m); border: 1px solid var(--line); background: var(--raised); font-size: var(--t-sm); font-weight: var(--w-med); cursor: pointer; white-space: nowrap; transition: border-color var(--dur); }
.fewrd-pg .fewrd-theme:hover { border-color: var(--line-strong); }

.fewrd-pg .fewrd-layout { display: grid; gap: var(--s4); grid-template-columns: minmax(0, 1fr); grid-template-areas: "draw" "gist" "fold" "tree"; max-width: 1400px; margin: 0 auto; padding: var(--s4); align-items: start; }
.fewrd-pg .fewrd-card { min-width: 0; padding: var(--s4); border: 1px solid var(--line); border-radius: var(--r-l); background: var(--surface); }
.fewrd-pg .fewrd-drawcard { grid-area: draw; }
.fewrd-pg .fewrd-gistcard { grid-area: gist; min-width: 0; padding: 0 var(--s2); }
.fewrd-pg .fewrd-foldcard { grid-area: fold; }
.fewrd-pg .fewrd-treebox { grid-area: tree; }
@media (min-width: 720px) { .fewrd-pg .fewrd-layout { padding: var(--s5); gap: var(--s5); } }
@media (max-width: 719px) { .fewrd-pg { --grid-size: 14px; --grid-lh: 22px; } .fewrd-pg .fewrd-brand, .fewrd-pg .fewrd-theme .fewrd-lbl { display: none; } .fewrd-pg .fewrd-bar { gap: var(--s2); padding-inline: var(--s3); } .fewrd-pg .fewrd-count { min-width: 6ch; font-size: var(--t-lg); } .fewrd-pg .fewrd-theme { padding: 0 var(--s2); } .fewrd-pg .fewrd-step { width: 40px; height: 40px; } }

/* The conf: a drawer under the sticky bar below 1700px, the left pane from there on. */
.fewrd-pg .fewrd-scrim { position: fixed; inset: 0; z-index: 20; background: var(--scrim); opacity: 0; pointer-events: none; transition: opacity var(--dur-drawer); }
.fewrd-pg .fewrd-drawer { position: fixed; top: 0; bottom: 0; left: 0; z-index: 25; display: flex; flex-direction: column; gap: var(--s3); width: var(--drawer-w); padding: calc(var(--bar) + var(--s3)) var(--s4) var(--s4); border-right: 1px solid var(--line); background: var(--surface); box-shadow: var(--shadow-pop); transform: translateX(-100%); opacity: 0; visibility: hidden; transition: transform var(--dur-drawer) ease, opacity var(--dur-drawer) ease, visibility 0s linear var(--dur-drawer); }
.fewrd-pg[data-drawer] .fewrd-drawer { transform: none; opacity: 1; visibility: visible; transition-delay: 0s; }
.fewrd-pg[data-drawer] .fewrd-scrim { opacity: 1; pointer-events: auto; }
.fewrd-pg .fewrd-confhead { display: flex; align-items: baseline; gap: var(--s2); }
.fewrd-pg .fewrd-drawer textarea { display: block; flex: 1; min-height: 12rem; width: 100%; padding: var(--s3); border: 1px solid var(--line); border-radius: var(--r-m); background: var(--sunken); resize: none; font: var(--w-reg) var(--t-xs)/1.6 var(--mono); font-variant-ligatures: none; tab-size: 2; }
.fewrd-pg .fewrd-drawer textarea[aria-invalid="true"] { border-color: var(--err); }
.fewrd-pg .fewrd-errors { flex: none; max-height: 40%; overflow: auto; padding: var(--s3); border: 1px solid color-mix(in oklch, var(--err) 35%, transparent); border-radius: var(--r-m); background: var(--err-bg); color: var(--err); font-size: var(--t-sm); overflow-wrap: anywhere; }
.fewrd-pg .fewrd-errors ul { margin: var(--s2) 0 0; padding-left: 1.2em; font-size: var(--t-xs); }
.fewrd-pg .fewrd-errors code { display: block; margin-top: var(--s1); font: inherit; }
.fewrd-pg .fewrd-confbtn { position: relative; display: grid; place-items: center; flex: none; width: 40px; height: 40px; padding: 0; border-radius: var(--r-m); border: 1px solid var(--line); background: var(--raised); color: var(--muted); cursor: pointer; transition: border-color var(--dur), color var(--dur), background var(--dur); }
.fewrd-pg .fewrd-confbtn:hover, .fewrd-pg .fewrd-confbtn[aria-expanded="true"] { border-color: var(--accent); color: var(--accent); }
.fewrd-pg .fewrd-confbtn[aria-expanded="true"] { background: color-mix(in oklch, var(--accent) 10%, var(--raised)); }
.fewrd-pg .fewrd-confbtn .fewrd-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; padding: 1px 5px; border: 1px solid var(--bg); background: var(--err); color: var(--bg); font-size: 11px; line-height: 14px; text-align: center; }
@media (min-width: 1700px) {
  .fewrd-pg .fewrd-shell { display: grid; grid-template-columns: var(--pane) minmax(0, 1fr); align-items: start; }
  .fewrd-pg .fewrd-drawer { position: sticky; top: var(--bar); z-index: auto; width: auto; height: calc(100vh - var(--bar)); padding-top: var(--s4); box-shadow: none; transform: none; opacity: 1; visibility: visible; transition: none; }
  .fewrd-pg .fewrd-scrim, .fewrd-pg .fewrd-confbtn { display: none; }
}

.fewrd-pg .fewrd-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s1) var(--s3); }
.fewrd-pg .fewrd-head .fewrd-grow { margin-left: auto; }

/* The grid: the one place that is monospace, so every character is one 1ch cell and a span is a distance. */
.fewrd-pg .fewrd-draw { font: var(--w-reg) var(--grid-size)/var(--grid-lh) var(--mono); font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; letter-spacing: 0; transition: opacity .15s; }
.fewrd-pg [data-stale] .fewrd-draw { opacity: .5; }
.fewrd-pg .fewrd-probe { display: block; width: 1ch; height: 0; }
.fewrd-pg .fewrd-line { position: relative; margin-bottom: var(--s4); }
.fewrd-pg .fewrd-text { position: relative; white-space: pre; height: var(--grid-lh); }
.fewrd-pg .fewrd-wash { position: absolute; top: 0; height: var(--grid-lh); border-radius: var(--r-s); background: color-mix(in oklch, var(--band) var(--wash), transparent); box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--band) calc(var(--wash) * 1.6), transparent); pointer-events: none; }
.fewrd-pg .fewrd-wash.mark { background: color-mix(in oklch, var(--band) calc(var(--wash) * .7), transparent); box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--band) calc(var(--wash) * 1.1), transparent); }
.fewrd-pg .fewrd-lane { position: relative; height: var(--lane); }
.fewrd-pg .fewrd-lane:first-of-type { margin-top: 2px; }
.fewrd-pg .fewrd-band { position: absolute; top: 1px; height: var(--band-h); background: var(--band); outline: none; transition: opacity .15s, box-shadow var(--dur), filter var(--dur); }
.fewrd-pg .fewrd-band.lost { top: 2px; height: var(--band-h-lost); }
.fewrd-pg .fewrd-band.gone { opacity: .25; }
.fewrd-pg .fewrd-band.hot { z-index: 1; opacity: 1; filter: saturate(1.15) brightness(1.06); box-shadow: 0 0 0 2px color-mix(in oklch, var(--band) 30%, transparent); }
.fewrd-pg .fewrd-band.gone.hot { opacity: .6; }
/* Chip highlights: lit bands get a soft ring; while anything is lit the others recede. */
.fewrd-pg .fewrd-band.mark { z-index: 1; opacity: 1; box-shadow: 0 0 0 2px color-mix(in oklch, var(--band) 26%, transparent); filter: saturate(1.1); }
.fewrd-pg .fewrd-band.gone.mark { opacity: .6; }
.fewrd-pg .fewrd-draw[data-marking] .fewrd-band:not(.mark):not(.hot) { opacity: .45; }
.fewrd-pg .fewrd-draw[data-marking] .fewrd-band.gone:not(.mark):not(.hot) { opacity: .18; }
.fewrd-pg .fewrd-band:focus-visible { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--band); }
.fewrd-pg .fewrd-band.open { border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.fewrd-pg .fewrd-band.close { border-top-right-radius: 2px; border-bottom-right-radius: 2px; }
.fewrd-pg .fewrd-band.open::before, .fewrd-pg .fewrd-band.close::after { content: ""; position: absolute; top: -1px; width: 2px; height: 7px; background: color-mix(in oklch, var(--band) 85%, black); }
.fewrd-pg .fewrd-band.lost.open::before, .fewrd-pg .fewrd-band.lost.close::after { height: 5px; }
.fewrd-pg .fewrd-band.open::before { left: 0; }
.fewrd-pg .fewrd-band.close::after { right: 0; }
.fewrd-pg .fewrd-band .fewrd-hit { position: absolute; inset: -2px 0; }
.fewrd-pg .fewrd-grey { color: var(--grey); text-decoration: line-through; }
.fewrd-pg .fewrd-hint { margin: var(--s3) 0 0; color: var(--muted); font-size: var(--t-xs); }
.fewrd-pg .fewrd-failed { margin: 0; color: var(--err); font-size: var(--t-sm); }

/* The popover: above the text line, or below the last lane; the arrow points at the band. */
.fewrd-pg .fewrd-tip { position: fixed; z-index: 20; display: grid; gap: 2px; max-width: min(90vw, 26rem); padding: var(--s2) var(--s3); border: 1px solid var(--line-strong); border-radius: var(--r-m); background: var(--raised); color: var(--text); font: var(--w-reg) var(--t-xs)/1.45 var(--ui); box-shadow: var(--shadow-pop); pointer-events: none; animation: fewrd-pop var(--dur) ease-out; }
.fewrd-pg .fewrd-tip::after { content: ""; position: absolute; left: var(--ax, 50%); width: 10px; height: 10px; margin-left: -5px; background: var(--raised); border: 1px solid var(--line-strong); transform: rotate(45deg); }
.fewrd-pg .fewrd-tip[data-side="above"]::after { bottom: -6px; border-left: 0; border-top: 0; }
.fewrd-pg .fewrd-tip[data-side="below"]::after { top: -6px; border-right: 0; border-bottom: 0; }
.fewrd-pg .fewrd-tip-head { display: flex; align-items: center; gap: var(--s2); }
.fewrd-pg .fewrd-tip-head i { width: 12px; height: var(--band-h); border-radius: 2px; background: var(--band); }
.fewrd-pg .fewrd-tip-head b { font-weight: var(--w-semi); font-size: var(--t-sm); }
.fewrd-pg .fewrd-tip-head span { color: var(--muted); font-variant-numeric: tabular-nums; }
.fewrd-pg .fewrd-tip-value { overflow-wrap: anywhere; }
.fewrd-pg .fewrd-tip-note { color: var(--muted); }
@keyframes fewrd-pop { from { opacity: 0; } }

.fewrd-pg .fewrd-gistcard h2 { color: var(--muted); font-size: var(--t-xs); font-weight: var(--w-semi); letter-spacing: .08em; text-transform: uppercase; }
.fewrd-pg .fewrd-gist { margin: var(--s2) 0 0; font: var(--w-reg) 17px/1.6 var(--ui); white-space: pre-wrap; overflow-wrap: anywhere; }
.fewrd-pg .fewrd-gist.empty { color: var(--muted); font-style: italic; }
.fewrd-pg .fewrd-verdict { display: inline-flex; align-items: center; gap: var(--s1); font-size: var(--t-xs); font-weight: var(--w-med); }
.fewrd-pg .fewrd-verdict .fewrd-ic { --ic: 14px; }
.fewrd-pg .fewrd-verdict.ok { color: var(--ok); }
.fewrd-pg .fewrd-verdict.warn { color: var(--warn); }
.fewrd-pg .fewrd-reset { padding: var(--s1) var(--s3); border-radius: var(--r-pill); border: 1px solid var(--line); background: var(--raised); font-size: var(--t-xs); font-weight: var(--w-med); cursor: pointer; }
.fewrd-pg .fewrd-reset:hover { border-color: var(--accent); color: var(--accent); }

.fewrd-pg .fewrd-chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2); margin-top: var(--s3); }
.fewrd-pg .fewrd-cap { flex-basis: 100%; margin-top: var(--s1); color: var(--muted); font-size: var(--t-xs); }
.fewrd-pg .fewrd-chip { --band: var(--faint); display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: var(--r-pill); background: var(--raised); font: var(--w-med) var(--t-sm)/1 var(--ui); transition: background var(--dur), border-color var(--dur); }
.fewrd-pg .fewrd-chip:hover { border-color: color-mix(in oklch, var(--band) 60%, var(--line)); }
.fewrd-pg .fewrd-chip.on { border-color: color-mix(in oklch, var(--band) 55%, var(--line)); background: color-mix(in oklch, var(--band) 16%, var(--raised)); }
.fewrd-pg .fewrd-chip button { display: inline-flex; align-items: center; margin: 0; border: 0; background: none; cursor: pointer; }
.fewrd-pg .fewrd-chip-main { gap: 6px; padding: 7px 4px 7px 10px; border-radius: var(--r-pill) 0 0 var(--r-pill); font-weight: inherit; }
.fewrd-pg .fewrd-chip i, .fewrd-pg .fewrd-tag i { width: 12px; height: var(--band-h); border-radius: 2px; background: var(--band); }
.fewrd-pg .fewrd-eye { justify-content: center; width: 28px; height: 28px; margin-right: 2px; padding: 0; border-radius: var(--r-pill); color: var(--muted); transition: background var(--dur), color var(--dur); }
.fewrd-pg .fewrd-eye .fewrd-ic { --ic: var(--ic-s); }
.fewrd-pg .fewrd-eye:hover { background: color-mix(in oklch, var(--band) 16%, transparent); color: var(--text); }
.fewrd-pg .fewrd-chip.folded .fewrd-name { color: var(--muted); text-decoration: line-through; }
.fewrd-pg .fewrd-chip.folded .fewrd-eye { color: var(--faint); }
.fewrd-pg .fewrd-tag { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid transparent; border-radius: var(--r-pill); color: var(--muted); font: var(--w-reg) var(--t-sm)/1 var(--ui); cursor: default; }
.fewrd-pg .fewrd-tag i { opacity: .5; }

.fewrd-pg summary { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) 0; cursor: pointer; list-style: none; }
.fewrd-pg summary::-webkit-details-marker { display: none; }
.fewrd-pg summary .fewrd-ic { color: var(--muted); transform: rotate(-90deg); }
.fewrd-pg details[open] > summary .fewrd-ic { transform: none; }
.fewrd-pg .fewrd-badge { padding: 2px 8px; border-radius: var(--r-pill); background: var(--err-bg); color: var(--err); font-size: var(--t-xs); font-weight: var(--w-semi); }

.fewrd-pg .fewrd-tree { margin-top: var(--s3); font: var(--w-reg) var(--t-sm)/1.75 var(--ui); }
.fewrd-pg .fewrd-node { --d: 0; display: flex; align-items: baseline; gap: var(--s2); min-width: 0; padding: 0 var(--s2) 0 calc(var(--s2) + var(--d) * 1.25rem); border-radius: var(--r-s); background-image: repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 1.25rem); background-size: calc(var(--d) * 1.25rem) 100%; background-repeat: no-repeat; background-position: var(--s2) 0; transition: background-color var(--dur); }
.fewrd-pg .fewrd-node:hover, .fewrd-pg .fewrd-node.on { background-color: var(--hover); }
.fewrd-pg .fewrd-node.mark { background-color: color-mix(in oklch, var(--band) 14%, transparent); }
.fewrd-pg .fewrd-node i { flex: none; width: 10px; height: var(--band-h); align-self: center; border-radius: 2px; background: var(--band); }
.fewrd-pg .fewrd-node b { font-weight: var(--w-semi); }
.fewrd-pg .fewrd-node .sp { flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
.fewrd-pg .fewrd-node .pill { flex: none; padding: 0 6px; border-radius: var(--r-pill); background: color-mix(in oklch, var(--muted) 16%, transparent); font-size: var(--t-xs); }
.fewrd-pg .fewrd-node .q { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
.fewrd-pg .fewrd-node.water { color: var(--muted); }
.fewrd-pg .fewrd-node.water b { font-weight: var(--w-reg); }
.fewrd-pg .fewrd-node.gone b, .fewrd-pg .fewrd-node.gone .q { color: var(--grey); text-decoration: line-through; }
@media (prefers-reduced-motion: reduce) { .fewrd-pg *, .fewrd-pg ::before { transition: none !important; animation: none !important; } }`;

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
/** An icon: the ligature name of the icon font inside, a text glyph in `data-fb` for when the font is not there. */
const icon = (name: string, fallback: string): HTMLSpanElement => {
  const s = h('span', 'fewrd-ic', name);
  s.dataset.fb = fallback;
  s.setAttribute('aria-hidden', 'true');
  return s;
};
const setIcon = (ic: HTMLElement, name: string, fallback: string) => {
  ic.textContent = name;
  ic.dataset.fb = fallback;
};
const THEME_ICON = { auto: ['contrast', '◐'], light: ['light_mode', '☀'], dark: ['dark_mode', '☾'] } as const;

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
  /** The tags kept lit by a click on their chip, per case. */
  const marks = new Map<number, Set<string>>();

  // The bar: step, count, jump, theme.
  const step = (label: string, name: string, fallback: string) => {
    const b = h('button', 'fewrd-step');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.append(icon(name, fallback));
    return b;
  };
  const prev = step('previous case', 'chevron_left', '‹');
  const next = step('next case', 'chevron_right', '›');
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
  const confBtn = h('button', 'fewrd-confbtn');
  confBtn.type = 'button';
  confBtn.setAttribute('aria-controls', 'fewrd-drawer');
  const confBadge = h('span', 'fewrd-badge');
  const bar = h('header', 'fewrd-bar');
  bar.append(confBtn, h('span', 'fewrd-brand', 'fewrd'), nav, pick, themeButton, status);

  let theme: (typeof THEMES)[number] = 'auto';
  try {
    const saved = localStorage.getItem(STYLE_ID);
    if (THEMES.includes(saved as never)) theme = saved as typeof theme;
  } catch {}
  const paintTheme = () => {
    if (theme === 'auto') delete el.dataset.theme;
    else el.dataset.theme = theme;
    const [glyph, fallback] = THEME_ICON[theme];
    themeButton.replaceChildren(icon(glyph, fallback), h('span', 'fewrd-lbl', theme));
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
  // The icon font is a dev-time extra: until it has really loaded the icons are their text glyphs.
  document.fonts?.load(`20px "Material Symbols Rounded"`, 'chevron_left').then((f) => f.length && el.setAttribute('data-icons', ''), () => {});

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
  const gistCard = h('section', 'fewrd-gistcard');
  const gistHead = h('div', 'fewrd-head');
  gistHead.append(h('h2', undefined, 'Gist'), saved, verdict);
  gistCard.append(gistHead, gistOut);

  const chips = h('div', 'fewrd-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'tags');
  const reset = h('button', 'fewrd-reset', 'Reset');
  reset.type = 'button';
  const foldCard = h('section', 'fewrd-card fewrd-foldcard');
  const foldHead = h('div', 'fewrd-head');
  foldHead.append(h('h2', undefined, 'Tags'), h('span', 'fewrd-dim', 'Hover a tag to find it, click to keep it lit, the eye drops it from the gist.'), reset);
  reset.classList.add('fewrd-grow');
  foldCard.append(foldHead, chips);

  // The conf: a pane from 1700px, a drawer below; its errors stay under the editor either way.
  const confName = h('span', 'fewrd-dim');
  const badge = h('span', 'fewrd-badge');
  const editor = h('textarea');
  editor.spellcheck = false;
  editor.setAttribute('aria-label', 'conf, as JSON');
  const errorBox = h('div', 'fewrd-errors');
  errorBox.setAttribute('aria-live', 'polite');
  const confHead = h('div', 'fewrd-confhead');
  confHead.append(h('h2', undefined, 'Conf'), confName, badge);
  const drawer = h('aside', 'fewrd-drawer');
  drawer.id = 'fewrd-drawer';
  drawer.setAttribute('aria-label', 'conf editor');
  drawer.append(confHead, editor, errorBox);
  const scrim = h('div', 'fewrd-scrim');

  const treeMeta = h('span', 'fewrd-dim');
  const treeBody = h('div', 'fewrd-tree');
  const treeSummary = h('summary');
  treeSummary.append(icon('expand_more', '▾'), h('h2', undefined, 'Tree'), treeMeta);
  const treeDetails = h('details');
  treeDetails.append(treeSummary, treeBody);
  const treeBox = h('section', 'fewrd-card fewrd-treebox');
  treeBox.append(treeDetails);

  const layout = h('div', 'fewrd-layout');
  layout.append(drawCard, gistCard, foldCard, treeBox);
  const shell = h('div', 'fewrd-shell');
  shell.append(drawer, layout);
  const tip = h('div', 'fewrd-tip');
  tip.hidden = true;
  el.replaceChildren(bar, shell, scrim, tip);

  // The tree opens when there is room; the reader's own toggle stands until the width crosses the breakpoint.
  const medium = matchMedia('(min-width: 720px)');
  const room = () => (treeDetails.open = medium.matches);
  medium.addEventListener('change', room);
  room();

  // The drawer: the bar's button, Escape or the scrim close it; from 1700px the pane is docked and there is nothing to open.
  const docked = matchMedia('(min-width: 1700px)');
  let errorCount = 0;
  const paintBtn = () => {
    const open = el.hasAttribute('data-drawer');
    confBtn.setAttribute('aria-expanded', String(open));
    confBtn.setAttribute('aria-label', `conf editor${errorCount && !open ? `, ${errorCount === Infinity ? 'invalid JSON' : `${errorCount} error${errorCount === 1 ? '' : 's'}`}` : ''}`);
    confBadge.textContent = errorCount === Infinity ? '!' : String(errorCount);
    confBadge.hidden = open || !errorCount;
  };
  const drawerTo = (open: boolean) => {
    el.toggleAttribute('data-drawer', open && !docked.matches);
    paintBtn();
  };
  const ic = icon('data_object', '{}');
  confBtn.append(ic, confBadge);
  confBtn.addEventListener('click', () => {
    const open = !el.hasAttribute('data-drawer');
    drawerTo(open);
    if (open) editor.focus({ preventScroll: true });
  });
  scrim.addEventListener('click', () => drawerTo(false));
  docked.addEventListener('change', () => drawerTo(false));
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !el.hasAttribute('data-drawer')) return;
    drawerTo(false);
    confBtn.focus();
  });
  paintBtn();

  // Highlights and the tooltip, shared by the bands and the tree rows.
  // `order` is the bands in reading order, one per row: the only one in the tab order is the one last focused, ↑ ↓ move along it.
  let view: { starts: number[]; lines: HTMLElement[]; order: HTMLElement[]; head: Map<HTMLElement, HTMLElement> } = { starts: [0], lines: [], order: [], head: new Map() };
  let washes: HTMLElement[] = [];
  let lit: HTMLElement[] = [];
  /** The band whose popover is open, kept so a scroll or resize can put the popover back. */
  let active: HTMLElement | undefined;
  const light = (span: Span, color: string) => {
    unlight();
    for (const { line, from, to } of segments(span, view.starts)) {
      const wash = h('div', 'fewrd-wash');
      wash.style.cssText = `left:${from}ch;width:${to - from}ch`;
      wash.style.setProperty('--band', color);
      view.lines[line]?.prepend(wash);
      washes.push(wash);
    }
  };
  const unlight = () => {
    washes.forEach((w) => w.remove());
    washes = [];
  };
  const leave = () => {
    active = undefined;
    tip.hidden = true;
    unlight();
    lit.forEach((r) => r.classList.remove('on', 'hot'));
    lit = [];
  };
  /** Above the text line of the band, centred on it; below the last lane when there is no room above the sticky bar. The arrow points at the band. */
  const place = (band: HTMLElement) => {
    active = band;
    tip.hidden = false;
    const r = band.getBoundingClientRect();
    const line = (band.closest('.fewrd-line') ?? band).getBoundingClientRect();
    const w = tip.offsetWidth;
    const gap = 10;
    const above = line.top - gap - tip.offsetHeight >= bar.getBoundingClientRect().bottom + 4;
    const cx = r.left + r.width / 2;
    const left = Math.max(8, Math.min(cx - w / 2, innerWidth - w - 8));
    tip.dataset.side = above ? 'above' : 'below';
    tip.style.left = `${left}px`;
    tip.style.top = `${above ? line.top - gap - tip.offsetHeight : line.bottom + gap}px`;
    tip.style.setProperty('--ax', `${Math.max(14, Math.min(cx - left, w - 14))}px`);
  };
  const replace = () => active && place(active);
  addEventListener('scroll', replace, { passive: true });
  addEventListener('resize', replace);

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
    // A band colour by the tag's place in the conf: neighbours differ, and a tag keeps its colour from case to case.
    const hue = (tag: string) => `var(--band-${slot(order.indexOf(tag))})`;

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
    const bandsByTag = new Map<string, HTMLElement[]>();
    const treeRows = new Map<string, HTMLElement[]>();

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
      const swatch = h('i');
      swatch.style.setProperty('--band', hue(tag));
      const head = h('div', 'fewrd-tip-head');
      head.append(swatch, h('b', undefined, tag), h('span', undefined, `(${span[0]}, ${span[1]})`));
      tip.replaceChildren(head);
      const value = hit && !hit.twinOf ? hit.node.value : undefined;
      if (value !== undefined) tip.append(h('div', 'fewrd-tip-value', `value ${JSON.stringify(value)}`));
      const note = !doc ? '' : !hit ? 'not kept by the tree' : hit.twinOf ? `twin of ${hit.twinOf}` : '';
      if (note) tip.append(h('div', 'fewrd-tip-note', note));
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
          band.style.setProperty('--band', hue(tag));
          band.tabIndex = -1;
          if (head) view.head.set(band, head);
          else first.push({ band, span });
          head ??= band;
          band.setAttribute('role', 'img');
          band.setAttribute('aria-label', `${tag}, ${span[0]} to ${span[1]}${isLost ? ', not in the tree' : ''}`);
          band.append(h('span', 'fewrd-hit'));
          const enter = () => {
            leave();
            light(span, hue(tag));
            const row = rowsByKey.get(k);
            for (const b of bandsByKey.get(k) ?? []) b.classList.add('hot');
            lit.push(...(bandsByKey.get(k) ?? []));
            if (row) {
              row.classList.add('on');
              lit.push(row);
            }
            tipFor(tag, span);
            place(band);
          };
          band.addEventListener('mouseenter', enter);
          band.addEventListener('mouseleave', leave);
          band.addEventListener('focus', () => {
            view.order.forEach((b) => (b.tabIndex = -1));
            (view.head.get(band) ?? band).tabIndex = 0;
            enter();
          });
          band.addEventListener('blur', leave);
          l.lanes[laneIndex].append(band);
          bandsByKey.set(k, [...(bandsByKey.get(k) ?? []), band]);
          bandsByTag.set(tag, [...(bandsByTag.get(tag) ?? []), band]);
        });
      }
    });
    view.order = first.sort((x, y) => x.span[0] - y.span[0] || y.span[1] - x.span[1]).map((x) => x.band);
    if (view.order[0]) view.order[0].tabIndex = 0;
    lineBox.replaceChildren(...lines.map((l) => l.line));
    const laneCount = Math.max(0, ...lines.map((l) => l.lanes.length));
    hint.textContent = rows.length
      ? `${rows.length} rows in ${laneCount} lane${laneCount === 1 ? '' : 's'}. Hover a band, or Tab to the bands and use ↑ ↓, to read it.${lost ? ' Thin bands are rows the tree did not keep.' : ''}`
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
              swatch.style.setProperty('--band', hue(node.tag));
              row.append(swatch);
            }
            row.append(h('b', undefined, node.tag), h('span', 'sp', `${node.start}–${node.end}`));
            if (node.also) row.append(h('span', 'pill', `also ${node.also.join(', ')}`));
            if (node.value !== undefined) row.append(h('span', 'pill', `= ${JSON.stringify(node.value)}`));
            row.append(h('span', 'q', JSON.stringify(c.text.slice(node.start, node.end))));
            row.addEventListener('mouseenter', () => light([node.start, node.end], water ? 'var(--faint)' : hue(node.tag)));
            row.addEventListener('mouseleave', unlight);
            rowOf.set(node, row);
            if (!water)
              for (const t of [node.tag, ...(node.also ?? [])]) {
                rowsByKey.set(key(t, node.start, node.end), row);
                treeRows.set(t, [...(treeRows.get(t) ?? []), row]);
              }
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
    // A chip of a tag in the tree: the body lights the tag's rows (hover or focus while it lasts, a click keeps it), the eye folds it out of the gist.
    // A tag that is not in the tree gets a plain label and nothing to act on.
    const pinned = marks.get(index) ?? new Set<string>();
    marks.set(index, pinned);
    for (const t of pinned) if (!present.has(t)) pinned.delete(t);
    let over: string | undefined;
    let tinted: HTMLElement[] = [];
    /** Everything the lit tags touch, rebuilt from `pinned` and `over`: the bands, the tinted characters, the tree rows, the chips. */
    const paintMarks = () => {
      tinted.forEach((w) => w.remove());
      tinted = [];
      const on = new Set(pinned);
      if (over) on.add(over);
      drawing.toggleAttribute('data-marking', on.size > 0);
      for (const [t, bands] of bandsByTag) bands.forEach((b) => b.classList.toggle('mark', on.has(t)));
      treeRows.forEach((rs) => rs.forEach((r) => r.classList.remove('mark')));
      for (const t of on) {
        for (const [tag, span] of rows) {
          if (tag !== t) continue;
          for (const { line, from, to } of segments(span, starts)) {
            const wash = h('div', 'fewrd-wash mark');
            wash.style.cssText = `left:${from}ch;width:${to - from}ch`;
            wash.style.setProperty('--band', hue(t));
            lines[line].line.prepend(wash);
            tinted.push(wash);
          }
        }
        for (const r of treeRows.get(t) ?? []) {
          r.classList.add('mark');
          r.style.setProperty('--band', hue(t));
        }
      }
    };
    const chipOf = new Map<string, () => void>();
    const chip = (tag: string) => {
      const swatch = h('i');
      if (!present.has(tag)) {
        const plain = h('span', 'fewrd-tag');
        plain.style.setProperty('--band', hue(tag));
        plain.append(swatch, tag);
        return plain;
      }
      const main = h('button', 'fewrd-chip-main');
      main.type = 'button';
      main.title = `Highlight ${tag} in the preview`;
      main.append(swatch, h('span', 'fewrd-name', tag));
      const eye = h('button', 'fewrd-eye');
      eye.type = 'button';
      const eyeIcon = icon('visibility', '◉');
      eye.append(eyeIcon);
      const box = h('span', 'fewrd-chip');
      box.style.setProperty('--band', hue(tag));
      box.append(main, eye);
      const sync = () => {
        const folded = checked.has(tag);
        box.classList.toggle('on', pinned.has(tag));
        box.classList.toggle('folded', folded);
        main.setAttribute('aria-pressed', String(pinned.has(tag)));
        eye.setAttribute('aria-pressed', String(folded));
        eye.setAttribute('aria-label', `Fold ${tag} out of the gist`);
        eye.title = folded ? `${tag} is folded out of the gist` : `Fold ${tag} out of the gist`;
        setIcon(eyeIcon, folded ? 'visibility_off' : 'visibility', folded ? '◌' : '◉');
      };
      chipOf.set(tag, sync);
      sync();
      box.addEventListener('mouseenter', () => ((over = tag), paintMarks()));
      box.addEventListener('mouseleave', () => ((over = undefined), paintMarks()));
      box.addEventListener('focusin', (e) => e.target instanceof Element && e.target.matches(':focus-visible') && ((over = tag), paintMarks()));
      box.addEventListener('focusout', () => ((over = undefined), paintMarks()));
      main.addEventListener('click', () => {
        if (!pinned.delete(tag)) pinned.add(tag);
        sync();
        paintMarks();
      });
      eye.addEventListener('click', () => {
        if (!checked.delete(tag)) checked.add(tag);
        sync();
        paint();
      });
      return box;
    };
    const inTree = tags.filter((t) => present.has(t));
    const rest = tags.filter((t) => !present.has(t));
    chips.replaceChildren(...inTree.map(chip), ...(rest.length ? [h('span', 'fewrd-cap', 'not in this tree')] : []), ...rest.map(chip));
    reset.onclick = () => {
      checked.clear();
      (c.fold ?? []).forEach((t) => tags.includes(t) && checked.add(t));
      chipOf.forEach((sync) => sync());
      paint();
    };

    /** A fold changes only the gist, the greying and what fades; nothing is rebuilt. */
    function paint() {
      const fold: Fold = (n) => checked.has(n.tag);
      const out = doc ? gist(doc, fold) : '';
      gistOut.textContent = !doc ? 'No gist: the tree could not be built.' : out || '(nothing left)';
      gistOut.classList.toggle('empty', !doc || !out);
      saved.textContent = doc ? `${c.text.length} → ${out.length} characters` : '';
      const same = (c.fold ?? []).length === checked.size && (c.fold ?? []).every((t) => checked.has(t));
      verdict.hidden = !doc || c.gist === undefined || c.fold === undefined || !same;
      const ok = out === c.gist;
      verdict.replaceChildren(...(ok ? [icon('check', '✓')] : []), ok ? "matches the case's gist" : "differs from the case's gist");
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
    paintMarks();
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
    errorCount = d?.invalid ? Infinity : list.length;
    paintBtn();
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
