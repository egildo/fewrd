// Matching runs on a normalised copy; nothing outside the engine sees it.
// NFKC, dash variants → `-`, curly quotes → straight, every whitespace run →
// one space. `at(i)` maps a copy boundary back to an original one.

export interface Normal {
  text: string;
  /** Original boundary of each copy boundary, `text.length + 1` entries. */
  at: number[];
}

const DASHES = /[‐-―−]/g;
const QUOTES = /[‘-‟]/g;
const straight = (q: string) => ('“”„‟'.includes(q) ? '"' : "'");

export function normalise(original: string): Normal {
  let text = '';
  const at: number[] = [];
  let inSpace = false;
  let i = 0;
  for (const cp of original) {
    if (/\s/.test(cp)) {
      if (!inSpace) {
        at.push(i);
        text += ' ';
      }
      inSpace = true;
    } else {
      const piece = cp.normalize('NFKC').replace(DASHES, '-').replace(QUOTES, straight);
      // An expanded code point maps every copy boundary inside it to its start.
      for (const ch of piece) {
        at.push(i);
        text += ch;
      }
      inSpace = false;
    }
    i += cp.length;
  }
  at.push(original.length);
  return { text, at };
}
