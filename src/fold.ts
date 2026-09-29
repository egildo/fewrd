// The fold: a policy over nodes, the connector and separator fates, emptied
// brackets, and the gist. Reads the tree alone: a node carries its tag's fate,
// the `doc` carries the text.

import type { Node } from './dom.ts';

/** True for a node the reader wants folded away. Asked about every node but `doc`. */
export type Fold = (node: Node) => boolean;

const CLOSING = /^[.,;:!?)\]}]/;

/** The leaves under `n`: nodes with no children. */
function leavesOf(n: Node): Node[] {
  return n.children.length ? n.children.flatMap(leavesOf) : [n];
}

/**
 * Every node the condensed view drops. In this order, each rule seeing what the
 * earlier ones hid: the policy (a folded node takes its whole subtree), the
 * connector fate, emptied brackets, the separator fate.
 */
export function hidden(doc: Node, fold: Fold): Set<Node> {
  const text = doc.text;
  if (text === undefined) throw new Error('the tree has no text: build it with dom, or keep `text` on the root when you parse it back');
  const out = new Set<Node>();
  const hide = (n: Node) => {
    out.add(n);
    n.children.forEach(hide);
  };
  const isSeparator = (n: Node) => n.fate === 'separator';
  const slice = (n: Node) => text.slice(n.start, n.end);

  // 1. A node folds when the policy says so, or when an ancestor folds.
  const walk = (n: Node) => {
    for (const c of n.children) fold(c) ? hide(c) : walk(c);
  };
  walk(doc);
  const leaves = doc.children.length ? leavesOf(doc) : [];

  // 2. A connector goes when the next leaf to its right that is not a separator is hidden. Right to left.
  for (let i = leaves.length - 1; i >= 0; i--) {
    if (leaves[i].fate !== 'connector' || out.has(leaves[i])) continue;
    const next = leaves.slice(i + 1).find((l) => !isSeparator(l));
    if (next && out.has(next)) out.add(leaves[i]);
  }

  // 4. A bracket goes when every leaf inside it that is not a separator is hidden, its delimiters not counted:
  // a leading and a trailing water leaf that is exactly one character. Innermost first.
  const openers = new Set<Node>();
  const brackets = (n: Node) => {
    n.children.forEach(brackets);
    if (n.fate !== 'bracket' || out.has(n) || n.children.length < 2) return;
    const kids = n.children;
    const water = (k: Node) => k.tag === 'text' && k.end - k.start === 1;
    const open = water(kids[0]) ? kids[0] : undefined;
    const close = water(kids[kids.length - 1]) ? kids[kids.length - 1] : undefined;
    const inside = leavesOf(n).filter((l) => l !== open && l !== close && !isSeparator(l));
    if (inside.some((l) => out.has(l)) && inside.every((l) => out.has(l))) hide(n);
    else if (open) openers.add(open);
  };
  brackets(doc);

  // 3. Separators, run by run: a run is what lies between two surviving non-separator leaves (or an edge):
  // separators and hidden leaves. A run with nothing hidden is left alone; otherwise only its strongest
  // separator survives, and not at an edge, right after a bracket's opening delimiter or before closing punctuation.
  const strength = (n: Node) => {
    const s = slice(n);
    return s.includes('-') ? 4 : s.includes(';') ? 3 : s.includes(':') ? 2 : s.includes(',') ? 1 : 0;
  };
  let before: Node | undefined;
  let run: Node[] = [];
  const settle = (after: Node | undefined) => {
    if (run.some((l) => out.has(l))) {
      const seps = run.filter((l) => isSeparator(l) && !out.has(l));
      let best: Node | undefined;
      for (const l of seps) if (!best || strength(l) > strength(best)) best = l;
      for (const l of seps) if (l !== best) out.add(l);
      if (best && (!before || !after || openers.has(before) || CLOSING.test(slice(after)))) out.add(best);
    }
    run = [];
  };
  for (const l of leaves) {
    if (isSeparator(l) || out.has(l)) run.push(l);
    else {
      settle(l);
      before = l;
    }
  }
  settle(undefined);
  return out;
}

/** The condensed view as text: every leaf `hidden` does not drop, in order. */
export function gist(doc: Node, fold: Fold): string {
  const out = hidden(doc, fold);
  const text = doc.text!;
  return (doc.children.length ? leavesOf(doc) : []).filter((l) => !out.has(l)).map((l) => text.slice(l.start, l.end)).join('');
}
