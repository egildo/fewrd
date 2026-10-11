// Writes step11.json: the markdown conf grown toward CommonMark, the same way as
// before (regex for tokens, flags at line edges, searches with skip and stop,
// opaque for what is literal), generated because lists need one set of tags
// per depth and per kind.
import { writeFileSync } from 'node:fs';

const DEPTHS = 3;
const end = { tag: ['eol', '$'] };
const startOfLine = ['bol', '^'];
const rest = (as: string) => ({ skip: true, stop: 'nl', as });
const fromLineStart = (forward: object[]) => startOfLine.map((from) => ({ from, forward }));

const tags: Record<string, object> = {};

// ---- literal first: fenced code, then the blocks that must win over a paragraph line
tags.fenced = { opaque: true, search: [{ from: 'fopen', forward: [{ tag: 'nl' }, { skip: true, stop: 'fclose', as: 'code' }, { tag: 'fclose' }] }] };
// The underline is a row of its own that the heading takes, so a rule on the same line can only be its twin.
tags.setext = { search: [{ from: 'para', forward: [{ tag: 'nl' }, { tag: 'sxu', as: 'underline' }] }] };
tags.hr = { search: fromLineStart([{ rx: '/%{RULE}/u', stop: 'nl' }, end]) };
tags.sxu = { search: [{ from: 'bol', forward: [{ rx: '/=+|-+/u', stop: 'nl' }, end] }] };

// ---- lists: per depth, bullet and ordered, each an item, an item with a sublist, a list
for (let d = 0; d < DEPTHS; d++) {
  const deeper = d + 1 < DEPTHS;
  for (const [k, mark] of [['b', 'bmark'], ['o', 'omark']]) {
    const item = `${k}i${d}`;
    const entry = `${k}e${d}`;
    const list = `${k}l${d}`;
    const entries = deeper ? [item, entry] : [item];
    tags[list] = {
      search: [
        ...entries.map((from) => ({ from, forward: [end] })),
        ...[...entries, list].map((from) => ({ from, forward: [{ tag: 'nl' }, { tag: entries }] })),
      ],
    };
    if (deeper) tags[entry] = { search: [{ from: item, forward: [{ tag: 'nl' }, { tag: [`bl${d + 1}`, `ol${d + 1}`] }] }] };
    const body = [{ tag: mark }, rest('body'), end];
    tags[item] = { search: d === 0 ? fromLineStart(body) : [{ from: `L${d}`, forward: body }] };
  }
}

tags.heading = { search: [{ from: 'hmark', forward: [rest('title'), end] }] };
tags.quote = { search: [{ from: 'qline', forward: [end] }, { from: 'quote', forward: [{ tag: 'nl' }, { tag: 'qline' }] }] };
tags.qline = { search: [{ from: 'qmark', forward: [rest('body'), end] }] };
tags.para = { search: [{ from: 'line', forward: [end] }, { from: 'para', forward: [{ tag: 'nl' }, { tag: 'line' }] }] };
tags.line = { search: fromLineStart([{ rx: '/(?!%{OPENER})[^¶]+/u', stop: 'nl' }, end]) };
for (let d = 1; d < DEPTHS; d++) tags[`L${d}`] = { search: d === 1 ? startOfLine.map((from) => ({ from, forward: [{ tag: 'ind' }] })) : [{ from: `L${d - 1}`, forward: [{ tag: 'ind' }] }] };
tags.hmark = { search: [{ from: 'hash', back: [{ tag: startOfLine }] }] };
tags.qmark = { search: [{ from: 'gt', back: [{ tag: startOfLine }] }] };

// ---- inline: literal stretches are opaque, chosen first and closed inside
tags.esc = { rx: '/\\\\[!-\\/:-@\\[-`{-~]/u', opaque: true };
tags.autolink = { rx: '/<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\\s<>]*>/u', opaque: true };
tags.code = { opaque: true, search: [{ from: 'tick', forward: [{ skip: true, stop: ['tick', 'nl'], as: 'code' }, { tag: 'tick' }] }] };
tags.image = { opaque: true, search: [{ from: 'bang', forward: [{ skip: true, stop: ['mid', 'nl'], as: 'alt' }, { tag: 'mid' }, { tag: 'dest', as: 'src' }, { tag: 'rp' }] }] };
tags.anchor = { search: [{ from: 'lb', forward: [{ skip: true, stop: ['mid', 'nl'], as: 'label' }, { tag: 'mid' }, { tag: 'dest', as: 'href' }, { tag: 'rp' }] }] };
tags.bold = {
  search: [
    { from: 'bo', forward: [{ skip: true, stop: ['bc', 'blank'], as: 'body' }, { tag: 'bc' }] },
    { from: 'ubo', forward: [{ skip: true, stop: ['ubc', 'blank'], as: 'body' }, { tag: 'ubc' }] },
  ],
};
tags.italic = {
  search: [
    { from: 'io', forward: [{ skip: true, stop: ['ic', 'blank'], as: 'body' }, { tag: 'ic' }] },
    { from: 'uio', forward: [{ skip: true, stop: ['uic', 'blank'], as: 'body' }, { tag: 'uic' }] },
  ],
};
tags.br = { rx: '/\\\\(?=¶)/u' };

// ---- tokens
Object.assign(tags, {
  hash: { rx: '/#{1,6}(?: |(?=¶|$))/u' },
  bmark: { rx: '/[-*+] /u' },
  omark: { rx: '/\\d{1,9}[.)] /u' },
  gt: { rx: '/> ?/u' },
  ind: { rx: '/··/u' },
  fopen: { rx: '/(?<=^|¶)```\\w+/u' },
  fclose: { rx: '/(?<=^|¶)```(?=¶|$)/u' },
  dest: { rx: '/(?<=\\]\\()[^\\s()]+(?=\\))/u', opaque: true },
  tick: { rx: '/`/u' },
  bang: { rx: '/!\\[/u' },
  lb: { rx: '/\\[/u' },
  mid: { rx: '/\\]\\(/u' },
  rp: { rx: '/\\)/u' },
  bo: { rx: '/\\*\\*(?=\\S)/u' },
  bc: { rx: '/(?<=\\S)\\*\\*/u' },
  io: { rx: '/%{I}(?=\\S)/u' },
  ic: { rx: '/(?<=\\S)%{I}/u' },
  ubo: { rx: '/(?<![\\p{L}\\p{N}])__(?=\\S)/u' },
  ubc: { rx: '/(?<=\\S)__(?![\\p{L}\\p{N}])/u' },
  uio: { rx: '/(?<![\\p{L}\\p{N}_])%{U}(?=\\S)/u' },
  uic: { rx: '/(?<=\\S)%{U}(?![\\p{L}\\p{N}_])/u' },
  nl: { rx: '/¶/u', effects: [{ flag: 'eol', at: 'start' }, { flag: 'bol', at: 'end' }] },
  blank: { rx: '/¶¶/u' },
  bol: {},
  eol: {},
});

const patterns = {
  RULE: '(?:\\* *){3,}|(?:- *){3,}|(?:_ *){3,}',
  OPENER: '#{1,6}(?: |¶|$)|(?:··)*(?:[-*+]|\\d{1,9}[.)]) |```|>|(?:%{RULE})(?:¶|$)',
  I: '(?<!\\*)\\*(?!\\*)',
  U: '(?<!_)_(?!_)',
};

writeFileSync(new URL('./step11.json', import.meta.url), JSON.stringify({ version: 'md-step11', patterns, tags }, null, 2) + '\n');
console.log(`step11.json: ${Object.keys(tags).length} tags`);
