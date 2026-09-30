// Matching runs on a normalised copy; nothing outside the engine sees it.
// NFKC, dash variants → `-`, curly quotes → straight, every whitespace run →
// one space. `at(i)` maps a copy boundary back to an original one.

export interface Normal {
  text: string;
  /** Original boundary of each copy boundary, per UTF-16 unit: `text.length + 1` entries. */
  at: number[];
}

const DASHES = /[‐-―−]/g;
const QUOTES = /[‘-‟]/g;
const straight = (q: string) => ('“”„‟'.includes(q) ? '"' : "'");

export function normalise(original: string): Normal {
  let text = '';
  const at: number[] = [];
  let inSpace = false;
  for (let i = 0; i < original.length; ) {
    const c = original.charCodeAt(i);
    // ASCII, most of any text: NFKC and the dash and quote rules leave it alone.
    if (c < 0x80) {
      if (c === 32 || (c >= 9 && c <= 13)) {
        if (!inSpace) {
          at.push(i);
          text += ' ';
        }
        inSpace = true;
      } else {
        at.push(i);
        text += original[i];
        inSpace = false;
      }
      i++;
      continue;
    }
    const cp = String.fromCodePoint(original.codePointAt(i)!);
    if (/\s/.test(cp)) {
      if (!inSpace) {
        at.push(i);
        text += ' ';
      }
      inSpace = true;
    } else {
      const piece = cp.normalize('NFKC').replace(DASHES, '-').replace(QUOTES, straight);
      // One entry per UTF-16 unit of the copy: an expanded code point, or a
      // surrogate pair, maps every copy boundary inside it to its start.
      for (let j = 0; j < piece.length; j++) at.push(i);
      text += piece;
      inSpace = false;
    }
    i += cp.length;
  }
  at.push(original.length);
  return { text, at };
}
