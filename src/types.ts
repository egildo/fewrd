// The vocabulary. A reading is plain data: no RegExp, no functions, nothing a
// JSON round-trip loses — so it can be cached by (text, book version).

/** Half-open, indices into the ORIGINAL string. */
export interface Span {
  start: number;
  end: number;
}

/**
 * A neighbour a recipe may attach beside its anchor. Write `rx` plainly: the
 * engine pins it to the anchor's edge (`$` on the left, sticky on the right).
 */
export interface Neighbour {
  part: string;
  rx: RegExp;
}

/**
 * One pattern: a strict anchor, then a closed list of neighbours tried outward.
 * Each neighbour attaches at most once; after every attachment the list is
 * tried again from the top, so declaration order is priority at each step.
 */
export interface Recipe {
  entity: string;
  /** The value, strict. Its part is `value` (`lead` on a `rest` recipe). */
  anchor: RegExp;
  left?: readonly Neighbour[];
  right?: readonly Neighbour[];
  /** Parts that must attach, or the candidate is dropped. */
  requires?: readonly string[];
  /** Canonical value from the attached parts' text, or null: not this entity after all. */
  resolve?: (parts: Readonly<Record<string, string>>) => string | null;
  /** Fills only the gaps the strong recipes leave. */
  weak?: boolean;
  /**
   * The mention runs from its anchor to the end of its level, and what follows
   * the anchor is read again inside it. Neighbours are ignored.
   */
  rest?: boolean;
  /** The anchor may start or end inside a word. Default: it may not. */
  glued?: boolean;
}

/** Recipes in priority order, and the version that keys a cached reading. */
export interface Book {
  version: string;
  recipes: readonly Recipe[];
}

export interface Mention {
  entity: string;
  /** Index into the book's recipes. */
  recipe: number;
  /** Every part, contiguous: what folding removes. */
  extent: Span;
  /** In text order. */
  parts: { part: string; span: Span }[];
  /** `resolve`'s answer, or the anchor's text. */
  value: string;
  /** The `rest` mention this one sits inside. */
  parent?: number;
}

export type LeafKind = 'text' | 'sep' | 'open' | 'close' | 'part';

/**
 * One piece of the partition. `mention` is the innermost mention holding it
 * (a `text` or `sep` leaf may sit inside a `rest` mention).
 */
export interface Leaf {
  start: number;
  end: number;
  kind: LeafKind;
  part?: string;
  mention?: number;
}

/**
 * The cuts index: leaves partition `text` in order, no gap, no overlap —
 * concatenating their slices gives `text` back, character for character.
 */
export interface Cuts {
  text: string;
  book: string;
  mentions: Mention[];
  leaves: Leaf[];
}
