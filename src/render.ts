// The last pass, always dynamic: a fold policy decides which mentions go, the
// separator fate decides which separators go with them, and the same leaves
// render as a gist or as tagged HTML carrying both views at once.

import type { Cuts, Leaf, Mention } from './types.ts';

export type Fold = (mention: Mention, index: number) => boolean;

/** A separator's weight when a fold makes several meet: the strongest stays. */
const strength = (s: string) => (s.includes('-') ? 4 : s.includes(';') ? 3 : s.includes(':') ? 2 : s.includes(',') ? 1 : 0);
const CLOSING = /^[.,;:!?)\]]/;

/**
 * Which leaves the condensed view shows. With nothing folded, every leaf.
 *
 * - A mention folds when the policy says so, or when the mention holding it folds.
 * - A bracket pair folds when nothing between them survives.
 * - The separators between two surviving leaves survive untouched when no
 *   fold fell among them; otherwise only the strongest one survives, and none
 *   at an edge, after an opening bracket or before closing punctuation.
 */
export function shown(cuts: Cuts, fold: Fold): boolean[] {
  return fate(cuts, fold).keep;
}

function fate(cuts: Cuts, fold: Fold): { keep: boolean[]; folded: boolean[] } {
  const { text, mentions, leaves } = cuts;
  const folded = mentions.map(() => false);
  mentions.forEach((m, i) => (folded[i] = fold(m, i) || (m.parent !== undefined && folded[m.parent])));

  const keep = leaves.map((l) => l.kind !== 'sep' && !(l.mention !== undefined && folded[l.mention]));
  const content = (l: Leaf) => l.kind === 'text' || l.kind === 'part';

  // Brackets: pair by stack; a pair with no surviving content inside folds.
  const stack: number[] = [];
  leaves.forEach((l, i) => {
    if (l.kind === 'open') stack.push(i);
    else if (l.kind === 'close' && stack.length) {
      const o = stack.pop()!;
      if (!leaves.slice(o + 1, i).some((x, k) => content(x) && keep[o + 1 + k])) keep[o] = keep[i] = false;
    }
  });

  // Separators: each run between two surviving non-separator leaves.
  let prev = -1;
  for (let i = 0; i <= leaves.length; i++) {
    if (i < leaves.length && (leaves[i].kind === 'sep' || !keep[i])) continue;
    const between = [...Array(i - prev - 1).keys()].map((k) => prev + 1 + k);
    const seps = between.filter((k) => leaves[k].kind === 'sep');
    const cut = between.length !== seps.length;
    if (!cut) seps.forEach((k) => (keep[k] = true));
    else {
      const slice = (l: Leaf) => text.slice(l.start, l.end);
      const edge = prev < 0 || i === leaves.length;
      const hugs = (prev >= 0 && leaves[prev].kind === 'open') || (i < leaves.length && (leaves[i].kind === 'close' || CLOSING.test(slice(leaves[i]))));
      if (!edge && !hugs && seps.length) {
        const best = seps.reduce((a, b) => (strength(slice(leaves[b])) > strength(slice(leaves[a])) ? b : a));
        keep[best] = true;
      }
    }
    prev = i;
  }
  return { keep, folded };
}

/** The condensed view as plain text. */
export function gist(cuts: Cuts, fold: Fold): string {
  const keep = shown(cuts, fold);
  return cuts.leaves.map((l, i) => (keep[i] ? cuts.text.slice(l.start, l.end) : '')).join('');
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Tagged HTML holding both views: every leaf is there, and what the condensed
 * view drops carries `data-fold` — so `.condensed [data-fold] { display: none }`
 * is the whole switch. Mentions are `<span data-entity data-mention>`, parts
 * `<span data-part>`, separators `<span data-sep>`, nested as the mentions nest.
 */
export function html(cuts: Cuts, fold: Fold): string {
  const { keep, folded } = fate(cuts, fold);
  const { mentions } = cuts;
  const chain = (m: number | undefined): number[] => (m === undefined ? [] : [...chain(mentions[m].parent), m]);
  // Marked only where the hiding starts; whatever sits inside inherits it.
  const marked = (m: number) => folded[m] && !(mentions[m].parent !== undefined && folded[mentions[m].parent!]);
  const tag = (on: boolean) => (on ? ' data-fold' : '');

  let out = '';
  const open: number[] = [];
  cuts.leaves.forEach((l, i) => {
    const want = chain(l.mention);
    let common = 0;
    while (common < open.length && open[common] === want[common]) common++;
    for (; open.length > common; open.pop()) out += '</span>';
    for (const m of want.slice(common)) {
      out += `<span data-entity="${escape(mentions[m].entity)}" data-mention="${m}"${tag(marked(m))}>`;
      open.push(m);
    }
    const t = escape(cuts.text.slice(l.start, l.end));
    const hide = !keep[i] && !(l.mention !== undefined && folded[l.mention]);
    if (l.kind === 'part') out += `<span data-part="${escape(l.part!)}">${t}</span>`;
    else if (l.kind === 'text' && !hide) out += t;
    else out += `<span data-${l.kind}${tag(hide)}>${t}</span>`;
  });
  return out + '</span>'.repeat(open.length);
}
