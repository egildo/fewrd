// <fewrd-md>: a live markdown editor around a textarea, fewrd doing the reading.
//
// Model-controlled editing: the source string is the model and the editable
// DOM only renders it. Every edit arrives as a `beforeinput`, is cancelled,
// applied to the source, and the lines are rendered again with the caret put
// back by its offset. Every source character stays in the DOM; markup is
// hidden by CSS on every line but the caret's, so the caret always sits on a
// line shown in full and the source can always be read back.

import { compile, dom, find, type Node } from '../../../src/index.ts';
import data from '../step13.json' with { type: 'json' };

const { conf, errors } = compile(data);
if (errors.length) console.error('fewrd-md conf errors', errors);

/**
 * Markup, hidden away from the caret's line: each marker tag with the constructs it is
 * markup of. A `)` or a backtick is a token wherever it stands; only inside a link or
 * a code span is it markup. `*` stands for anywhere (the token is anchored already),
 * and everything inside a marker is markup too.
 */
const MARK: Record<string, string[]> = {
  hmark: ['*'], qmark: ['*'], br: ['*'], sxu: ['*'],
  at_dash: ['*'], at_star: ['*'], at_plus: ['*'], mark_dash: ['*'], mark_star: ['*'], mark_plus: ['*'],
  bo: ['bold'], bc: ['bold'], ubo: ['bold'], ubc: ['bold'],
  io: ['italic'], ic: ['italic'], uio: ['italic'], uic: ['italic'],
  tick: ['code'],
  bang: ['image'], lb: ['anchor'], mid: ['anchor', 'image'], rp: ['anchor', 'image'], dest: ['anchor', 'image'],
};
/** `tags` from the outermost down to the leaf: markup when one of them is a marker inside its construct. */
const isMark = (tags: string[]) => tags.some((t, i) => MARK[t]?.some((c) => c === '*' || tags.slice(0, i).includes(c)));
/** Bullet markers, drawn as a dot when hidden. */
const BULLET = /^(at|mark)_(dash|star|plus)$/;
/** Leading spaces become `·`, newlines `¶`, one for one, so spans stay true (the lab's stand-in for a lines switch). */
const prep = (src: string) => src.replace(/^ +/gm, (sp) => '·'.repeat(sp.length)).replace(/\n/g, '¶');

type Line = { start: number; classes: Set<string>; pieces: { text: string; classes: string[] }[] };

/** The source read by fewrd, as lines of classed pieces. */
function lines(src: string): Line[] {
  const text = prep(src);
  const tree = dom(text, find(text, conf), conf);
  const out: Line[] = [{ start: 0, classes: new Set(), pieces: [] }];
  const leaf = (n: Node, chain: string[]) => {
    const tags = [...chain, n.tag, ...(n.also ?? [])];
    const classes = tags.filter((t) => t !== 'text');
    if (isMark(tags)) classes.push('mk');
    if (tags.some((t) => BULLET.test(t))) classes.push('bullet');
    const parts = src.slice(n.start, n.end).split('\n');
    parts.forEach((part, i) => {
      if (i > 0) out.push({ start: n.start + parts.slice(0, i).join('\n').length + 1, classes: new Set(), pieces: [] });
      const line = out[out.length - 1];
      if (!part) return;
      line.pieces.push({ text: part, classes });
      // A line takes its block's look from what its pieces sit in.
      const add = (c: string, when: boolean) => when && line.classes.add(c);
      add('heading', tags.includes('heading') || (tags.includes('setext') && !tags.includes('sxu')));
      add('underline', tags.includes('sxu'));
      add('pre', tags.includes('fenced'));
      add('li', tags.some((t) => t.startsWith('line_')));
      add('quote', tags.includes('quote'));
      add('rule', tags.includes('hr') && !tags.includes('setext'));
      for (const t of tags) if (/^h[1-6]$/.test(t) && !tags.includes('sxu')) line.classes.add(t);
      if (tags.includes('hmark')) line.classes.add(`h${part.trim().length}`);
    });
  };
  const walk = (n: Node, chain: string[]) => {
    if (!n.children.length) return leaf(n, chain);
    const next = n.tag === 'doc' ? chain : [...chain, n.tag, ...(n.also ?? [])];
    // A setext heading's level is in its underline: = is a first level, - a second.
    if (n.tag === 'setext' && typeof n.attrs.underline === 'object') next.push(src[n.attrs.underline.start] === '=' ? 'h1' : 'h2');
    for (const c of n.children) walk(c, next);
  };
  walk(tree, []);
  return out;
}

const STYLE = `
.fmd { padding: 20px 24px; outline: none; white-space: pre-wrap; word-break: break-word; min-height: 8em; font: 16px/1.6 system-ui, sans-serif; caret-color: #c2410c; }
.fmd .ln { min-height: 1.6em; }
.fmd .ln:not(.active) .mk { display: none; }
.fmd .mk { color: #a8a29e; }
.fmd .lead { font-family: ui-monospace, monospace; }
.fmd .ln.heading { font-weight: 700; }
.fmd .ln.h1 { font-size: 1.75em; line-height: 1.3; }
.fmd .ln.h2 { font-size: 1.4em; line-height: 1.35; }
.fmd .ln.h3 { font-size: 1.2em; }
.fmd .ln.underline:not(.active) { min-height: 0; height: 0; overflow: hidden; }
.fmd .bold { font-weight: 700; }
.fmd .italic { font-style: italic; }
.fmd .code:not(.mk) { font-family: ui-monospace, monospace; font-size: 0.9em; background: #f1f0ee; border-radius: 3px; padding: 0 2px; }
.fmd .anchor:not(.mk), .fmd .autolink { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }
.fmd .image:not(.mk) { color: #7c3aed; }
.fmd .ln:not(.active) .image:not(.mk)::before { content: '🖼 '; }
.fmd .esc { color: #78716c; }
.fmd .ln.pre { font-family: ui-monospace, monospace; font-size: 0.9em; background: #f6f5f3; padding: 0 8px; }
.fmd .fopen, .fmd .fclose { color: #a8a29e; }
.fmd .ln.quote { border-left: 3px solid #d6d3d1; padding-left: 12px; color: #57534e; }
.fmd .ln.rule:not(.active) { min-height: 0; height: 0; margin: 0.8em 0; border-top: 1px solid #d6d3d1; overflow: hidden; }
.fmd .ln.li:not(.active) .bullet { display: inline; font-size: 0; }
.fmd .ln.li:not(.active) .bullet::before { content: '•'; font-size: 16px; margin-right: 0.5em; color: #78716c; }
.fmd .ln.li:not(.active) .bullet + .bullet::before { content: none; }
`;

class FewrdMd extends HTMLElement {
  #area!: HTMLTextAreaElement;
  #ed!: HTMLDivElement;
  #src = '';
  #lines: HTMLDivElement[] = [];
  #undo: { src: string; sel: [number, number] }[] = [];
  #redo: { src: string; sel: [number, number] }[] = [];
  #composing = false;

  connectedCallback() {
    if (this.#ed) return;
    if (!document.getElementById('fewrd-md-style')) {
      const style = document.createElement('style');
      style.id = 'fewrd-md-style';
      style.textContent = STYLE;
      document.head.append(style);
    }
    this.#area = this.querySelector('textarea') ?? this.appendChild(document.createElement('textarea'));
    this.#area.hidden = true;
    this.#ed = document.createElement('div');
    this.#ed.className = 'fmd';
    try {
      this.#ed.contentEditable = 'plaintext-only';
    } catch {
      this.#ed.contentEditable = 'true'; // a browser without plaintext-only: beforeinput still decides every edit
    }
    this.#ed.spellcheck = true;
    this.#ed.setAttribute('role', 'textbox');
    this.#ed.setAttribute('aria-multiline', 'true');
    this.append(this.#ed);
    this.#src = this.#area.value;
    this.#render([this.#src.length, this.#src.length], false);

    this.#ed.addEventListener('beforeinput', (e) => this.#input(e));
    this.#ed.addEventListener('compositionstart', () => (this.#composing = true));
    this.#ed.addEventListener('compositionend', () => {
      this.#composing = false;
      // The IME wrote into the DOM itself: read the source back from it.
      const sel = this.#selection();
      this.#push();
      this.#src = this.#lines.map((l) => l.textContent ?? '').join('\n');
      this.#render(sel ?? [0, 0]);
    });
    // Every edit is cancelled, so the browser's own history stays empty and never offers an undo: the keys come here.
    this.#ed.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (!(e.metaKey || e.ctrlKey) || (key !== 'z' && key !== 'y')) return;
      e.preventDefault();
      this.#history(key === 'z' && !e.shiftKey);
    });
    this.#ed.addEventListener('copy', (e) => this.#copy(e));
    this.#ed.addEventListener('cut', (e) => this.#copy(e));
    document.addEventListener('selectionchange', () => {
      const sel = this.#selection();
      if (sel) this.#activate(sel);
    });
  }

  /** The selection as source offsets, ordered; null when it is not in the editor. */
  #selection(): [number, number] | null {
    const s = document.getSelection();
    if (!s || !s.rangeCount || !this.#ed.contains(s.anchorNode)) return null;
    const a = this.#offset(s.anchorNode!, s.anchorOffset);
    const b = this.#offset(s.focusNode!, s.focusOffset);
    return a <= b ? [a, b] : [b, a];
  }

  /** A DOM point as a source offset: its line's start plus the text before it on that line, hidden text included. */
  #offset(node: globalThis.Node, off: number): number {
    if (node === this.#ed) {
      const line = this.#lines[off] ?? null;
      return line ? Number(line.dataset.start) : this.#src.length;
    }
    const el = node.nodeType === 1 ? (node as Element) : node.parentElement!;
    const line = el.closest('.ln') as HTMLDivElement;
    const r = document.createRange();
    r.setStart(line, 0);
    r.setEnd(node, off);
    return Number(line.dataset.start) + r.toString().length;
  }

  /** A source offset as a DOM point: the first text node on its line that reaches it. */
  #point(offset: number): [globalThis.Node, number] {
    let i = this.#lines.length - 1;
    while (i > 0 && Number(this.#lines[i].dataset.start) > offset) i--;
    const line = this.#lines[i];
    let rest = offset - Number(line.dataset.start);
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const len = t.textContent!.length;
      if (rest <= len) return [t, rest];
      rest -= len;
    }
    return [line, 0];
  }

  #push() {
    this.#undo.push({ src: this.#src, sel: this.#selection() ?? [0, 0] });
    if (this.#undo.length > 500) this.#undo.shift();
    this.#redo = [];
  }

  #input(e: InputEvent) {
    if (e.inputType === 'insertCompositionText' || this.#composing) return; // the IME works natively, read back at its end
    e.preventDefault();
    const sel = this.#selection();
    if (!sel) return;
    let [from, to] = sel;
    let ins = '';
    const type = e.inputType;
    if (type === 'historyUndo' || type === 'historyRedo') return this.#history(type === 'historyUndo');
    if (type === 'insertText' || type === 'insertReplacementText' || type === 'insertFromPaste' || type === 'insertFromDrop') {
      ins = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
      if (type === 'insertReplacementText') [from, to] = this.#target(e) ?? [from, to];
    } else if (type === 'insertParagraph' || type === 'insertLineBreak') {
      ins = '\n';
    } else if (type.startsWith('delete')) {
      if (from === to) {
        // One character at a time ourselves: the browser's own range could reach into hidden markup.
        if (type === 'deleteContentBackward') from = Math.max(0, from - (/[\udc00-\udfff]/.test(this.#src[from - 1] ?? '') ? 2 : 1));
        else if (type === 'deleteContentForward') to = Math.min(this.#src.length, to + (/[\ud800-\udbff]/.test(this.#src[to] ?? '') ? 2 : 1));
        else [from, to] = this.#target(e) ?? [from, to];
      }
    } else return; // formatting and the rest: nothing to do in plain markdown
    if (from === to && !ins) return;
    this.#push();
    this.#src = this.#src.slice(0, from) + ins + this.#src.slice(to);
    const at = from + ins.length;
    this.#render([at, at]);
  }

  /** The event's own target range, as source offsets. */
  #target(e: InputEvent): [number, number] | null {
    const r = e.getTargetRanges()[0];
    if (!r) return null;
    return [this.#offset(r.startContainer, r.startOffset), this.#offset(r.endContainer, r.endOffset)];
  }

  #history(back: boolean) {
    const [from, into] = back ? [this.#undo, this.#redo] : [this.#redo, this.#undo];
    const state = from.pop();
    if (!state) return;
    into.push({ src: this.#src, sel: this.#selection() ?? [0, 0] });
    this.#src = state.src;
    this.#render(state.sel);
  }

  #copy(e: ClipboardEvent) {
    const sel = this.#selection();
    if (!sel || sel[0] === sel[1]) return;
    e.preventDefault();
    e.clipboardData?.setData('text/plain', this.#src.slice(sel[0], sel[1]));
    if (e.type === 'cut') {
      this.#push();
      this.#src = this.#src.slice(0, sel[0]) + this.#src.slice(sel[1]);
      this.#render([sel[0], sel[0]]);
    }
  }

  /** Render every line again from the source, then put the selection back. */
  #render(sel: [number, number], focus = true) {
    this.#area.value = this.#src;
    this.#lines = lines(this.#src).map((l) => {
      const div = document.createElement('div');
      div.className = ['ln', ...l.classes].join(' ');
      div.dataset.start = String(l.start);
      for (const p of l.pieces) {
        const span = document.createElement('span');
        span.className = p.classes.join(' ');
        span.textContent = p.text;
        div.append(span);
      }
      if (!l.pieces.length) div.append(document.createElement('br'));
      return div;
    });
    this.#ed.replaceChildren(...this.#lines);
    this.#activate(sel);
    if (!focus) return;
    const s = document.getSelection()!;
    const [a, ao] = this.#point(sel[0]);
    const [b, bo] = this.#point(sel[1]);
    s.setBaseAndExtent(a, ao, b, bo);
  }

  /** Show the markup on the lines the selection touches, hide it elsewhere. */
  #activate([a, b]: [number, number]) {
    for (const line of this.#lines) {
      const start = Number(line.dataset.start);
      const end = start + (line.textContent ?? '').length;
      line.classList.toggle('active', start <= b && a <= end);
    }
  }
}

customElements.define('fewrd-md', FewrdMd);
