// The reading: anchors → greedy expansion → merge → segmentation ⇒ Cuts.
//
// Everything here works in the normalised copy's coordinates and maps back to
// the original once, at the end. Nothing depends on anything but the text and
// the book, so a Cuts is cacheable by (text, book.version).

import { normalise } from './normalise.ts';
import type { Book, Cuts, Leaf, LeafKind, Mention, Recipe } from './types.ts';

type Range = [number, number];

type RawMention = Omit<Mention, 'extent' | 'parts'> & { extent: Range; parts: { part: string; span: Range }[] };

interface Candidate {
  recipe: number;
  entity: string;
  extent: Range;
  parts: { part: string; span: Range }[];
  value: string;
}

const WORD = /[\p{L}\p{N}]/u;
const isWord = (ch: string | undefined) => ch !== undefined && WORD.test(ch);

/** A match may not start inside a word: its first char is a word char and so is the one before. */
const cutsWordAtStart = (s: string, start: number) => isWord(s[start]) && isWord(s[start - 1]);
/** …nor end inside one. */
const cutsWordAtEnd = (s: string, end: number) => isWord(s[end - 1]) && isWord(s[end]);

const bare = (flags: string) => flags.replace(/[gy]/g, '');
const cache = new WeakMap<RegExp, { left?: RegExp; right?: RegExp; scan?: RegExp }>();
function pinned(rx: RegExp, side: 'left' | 'right' | 'scan'): RegExp {
  let c = cache.get(rx);
  if (!c) cache.set(rx, (c = {}));
  return (c[side] ??=
    side === 'left'
      ? new RegExp(`(?:${rx.source})$`, bare(rx.flags))
      : side === 'right'
        ? new RegExp(rx.source, `${bare(rx.flags)}y`)
        : new RegExp(rx.source, `${bare(rx.flags).replace('d', '')}gd`));
}

/**
 * Grow a candidate outward from its anchor, greedily, inside [from, to).
 * ponytail: a `$`-pinned regex rescans the prefix, O(n²) worst case per
 * neighbour; fine for subjects of a few thousand chars, reverse-match if not.
 */
function expand(s: string, r: Recipe, anchor: Range, from: number, to: number): Candidate['parts'] {
  const parts: Candidate['parts'] = [{ part: 'value', span: anchor }];
  const attached = new Set<string>();

  let cursor = anchor[0];
  for (let grew = true; grew; ) {
    grew = false;
    for (const nb of r.left ?? []) {
      if (attached.has(nb.part)) continue;
      const m = pinned(nb.rx, 'left').exec(s.slice(from, cursor));
      if (!m || m[0].length === 0) continue;
      const start = from + m.index;
      if (cutsWordAtStart(s, start)) continue;
      parts.unshift({ part: nb.part, span: [start, cursor] });
      attached.add(nb.part);
      cursor = start;
      grew = true;
      break;
    }
  }

  cursor = anchor[1];
  const head = s.slice(0, to);
  for (let grew = true; grew; ) {
    grew = false;
    for (const nb of r.right ?? []) {
      if (attached.has(nb.part)) continue;
      const re = pinned(nb.rx, 'right');
      re.lastIndex = cursor;
      const m = re.exec(head);
      if (!m || m[0].length === 0) continue;
      const end = cursor + m[0].length;
      if (cutsWordAtEnd(s, end)) continue;
      parts.push({ part: nb.part, span: [cursor, end] });
      attached.add(nb.part);
      cursor = end;
      grew = true;
      break;
    }
  }
  return parts;
}

function candidates(s: string, recipes: readonly Recipe[], from: number, to: number, weak: boolean): Candidate[] {
  const out: Candidate[] = [];
  const head = s.slice(0, to);
  recipes.forEach((r, index) => {
    if (r.rest || !!r.weak !== weak) return;
    const re = pinned(r.anchor, 'scan');
    re.lastIndex = from;
    for (let m = re.exec(head); m; m = re.exec(head)) {
      const anchor: Range = [m.index, m.index + m[0].length];
      if (anchor[0] === anchor[1]) {
        re.lastIndex = m.index + 1;
        continue;
      }
      if (!r.glued && (cutsWordAtStart(s, anchor[0]) || cutsWordAtEnd(s, anchor[1]))) {
        re.lastIndex = m.index + 1; // a rejected match must not hide a later one
        continue;
      }
      const parts = expand(s, r, anchor, from, to);
      const text = Object.fromEntries(parts.map((p) => [p.part, s.slice(p.span[0], p.span[1])]));
      const value = (r.requires ?? []).every((p) => p in text) ? (r.resolve ? r.resolve(text) : text.value) : null;
      if (value === null) {
        re.lastIndex = m.index + 1;
        continue;
      }
      out.push({
        recipe: index,
        entity: r.entity,
        extent: [parts[0].span[0], parts.at(-1)!.span[1]],
        parts,
        value,
      });
    }
  });
  return out;
}

const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1];
const size = (c: Candidate) => c.extent[1] - c.extent[0];

/** Longest extent first, then priority; a loser never overlaps a winner. */
function merge(pool: Candidate[], taken: Candidate[]): Candidate[] {
  const kept = [...taken];
  for (const c of [...pool].sort((a, b) => size(b) - size(a) || a.recipe - b.recipe))
    if (!kept.some((k) => overlaps(k.extent, c.extent))) kept.push(c);
  return kept.sort((a, b) => a.extent[0] - b.extent[0]);
}

/**
 * The separator grammar: whitespace, `,;:` followed by space or end, and a
 * dash standing free. A hyphen inside a word is text. Brackets are their own
 * leaves so a fold can empty them.
 */
const PIECE = /(?<sep>(?:\s|[,;:](?=\s|$)|(?<=^|\s)-(?=\s|$))+)|(?<open>[(\[])|(?<close>[)\]])/gu;

function segment(s: string, from: number, to: number, mention: number | undefined, out: Leaf[]) {
  const push = (start: number, end: number, kind: LeafKind) => {
    if (end > start) out.push({ start, end, kind, ...(mention !== undefined ? { mention } : {}) });
  };
  PIECE.lastIndex = from;
  let at = from;
  for (let m = PIECE.exec(s); m && m.index < to; m = PIECE.exec(s)) {
    push(at, m.index, 'text');
    const end = Math.min(m.index + m[0].length, to);
    push(m.index, end, m.groups!.sep ? 'sep' : m.groups!.open ? 'open' : 'close');
    at = end;
  }
  push(at, to, 'text');
}

function level(
  s: string,
  recipes: readonly Recipe[],
  from: number,
  to: number,
  parent: number | undefined,
  mentions: RawMention[],
  leaves: Leaf[],
) {
  // The earliest `rest` anchor closes this level's head.
  let rest: { recipe: number; at: Range } | undefined;
  recipes.forEach((r, index) => {
    if (!r.rest) return;
    const re = pinned(r.anchor, 'scan');
    re.lastIndex = from;
    for (let m = re.exec(s); m && m.index < to; m = re.exec(s)) {
      const at: Range = [m.index, Math.min(m.index + m[0].length, to)];
      if (!r.glued && (cutsWordAtStart(s, at[0]) || cutsWordAtEnd(s, at[1]))) continue;
      if (!rest || at[0] < rest.at[0]) rest = { recipe: index, at };
      break;
    }
  });
  const limit = rest ? rest.at[0] : to;

  const kept = merge(candidates(s, recipes, from, limit, true), merge(candidates(s, recipes, from, limit, false), []));
  let at = from;
  for (const c of kept) {
    segment(s, at, c.extent[0], parent, leaves);
    const index = mentions.push({ entity: c.entity, recipe: c.recipe, extent: c.extent, parts: c.parts, value: c.value, ...(parent !== undefined ? { parent } : {}) }) - 1;
    for (const p of c.parts) leaves.push({ start: p.span[0], end: p.span[1], kind: 'part', part: p.part, mention: index });
    at = c.extent[1];
  }
  segment(s, at, limit, parent, leaves);

  if (rest) {
    const index =
      mentions.push({
        entity: recipes[rest.recipe].entity,
        recipe: rest.recipe,
        extent: [rest.at[0], to],
        parts: [{ part: 'lead', span: rest.at }],
        value: s.slice(rest.at[1], to),
        ...(parent !== undefined ? { parent } : {}),
      }) - 1;
    leaves.push({ start: rest.at[0], end: rest.at[1], kind: 'part', part: 'lead', mention: index });
    level(s, recipes, rest.at[1], to, index, mentions, leaves);
  }
}

/** Read `text` with `book`: every mention, and the partition of the text into leaves. */
export function read(text: string, book: Book): Cuts {
  const n = normalise(text);
  const raw: RawMention[] = [];
  const rawLeaves: Leaf[] = [];
  level(n.text, book.recipes, 0, n.text.length, undefined, raw, rawLeaves);

  const span = ([s, e]: Range) => ({ start: n.at[s], end: n.at[e] });
  const mentions: Mention[] = raw.map((m) => ({
    ...m,
    extent: span(m.extent),
    parts: m.parts.map((p) => ({ part: p.part, span: span(p.span) })),
  }));
  const leaves = rawLeaves
    .map((l) => ({ ...l, start: n.at[l.start], end: n.at[l.end] }))
    .filter((l) => l.end > l.start);
  // A value comes from the copy; hand back the original's own characters.
  for (const m of mentions) {
    const r = book.recipes[m.recipe];
    if (r.rest) m.value = text.slice(m.parts[0].span.end, m.extent.end);
    else if (!r.resolve) {
      const v = m.parts.find((p) => p.part === 'value')!.span;
      m.value = text.slice(v.start, v.end);
    }
  }
  return { text, book: book.version, mentions, leaves };
}
