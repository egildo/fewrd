// Writes step12.json: step 11 with lists at any depth, by `same`, one set of
// tags per marker kind instead of one per depth and kind.
import { writeFileSync } from 'node:fs';

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

// ---- lists: one set of tags per marker kind, at any depth. A line's indentation is
// its `lead`; `same` repeats the lead in front of the row a search starts from, so a
// sibling has the same lead and a sublist the same plus one step of indentation.
const KINDS: [string, string, string][] = [
  ['dash', '- ', 'ind2'],
  ['star', '\\* ', 'ind2'],
  ['plus', '\\+ ', 'ind2'],
  ['dot', '\\d{1,9}\\. ', 'ind3'],
  ['paren', '\\d{1,9}\\) ', 'ind3'],
];
const lists = KINDS.map(([k]) => `list_${k}`);
for (const [k, , step] of KINDS) {
  const [line, entry, list, mark] = [`line_${k}`, `entry_${k}`, `list_${k}`, `mark_${k}`];
  const next = [{ tag: 'nl' }, { same: 'lead' }, { tag: [line, entry] }];
  tags[list] = { search: [{ from: line, forward: [end] }, { from: entry, forward: [end] }, ...[line, entry, list].map((from) => ({ from, forward: next }))] };
  tags[entry] = { search: [{ from: line, forward: [{ tag: 'nl' }, { same: 'lead' }, { tag: step }, { tag: lists }] }] };
  tags[line] = { search: [{ from: `at_${k}`, forward: [rest('body'), end] }] };
  // A marker counts only where a line's text starts: after its lead, or at a line start.
  tags[`at_${k}`] = { search: [{ from: mark, back: [{ tag: ['cs', '^'] }] }] };
}

tags.heading = { search: [{ from: 'hmark', forward: [rest('title'), end] }] };
tags.quote = { search: [{ from: 'qline', forward: [end] }, { from: 'quote', forward: [{ tag: 'nl' }, { tag: 'qline' }] }] };
tags.qline = { search: [{ from: 'qmark', forward: [rest('body'), end] }] };
tags.para = { search: [{ from: 'line', forward: [end] }, { from: 'para', forward: [{ tag: 'nl' }, { tag: 'line' }] }] };
tags.line = { search: fromLineStart([{ rx: '/(?!%{OPENER})[^¶]+/u', stop: 'nl' }, end]) };
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
  ...Object.fromEntries(KINDS.map(([k, rx]) => [`mark_${k}`, { rx: `/${rx}/u` }])),
  lead: { rx: '/(?<=^|¶)·+/u', effects: [{ flag: 'cs', at: 'end' }] },
  gt: { rx: '/> ?/u' },
  ind2: { rx: '/··/u' },
  ind3: { rx: '/···/u' },
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
  nl: { rx: '/¶/u', effects: [{ flag: 'eol', at: 'start' }, { flag: 'bol', at: 'end' }, { flag: 'cs', at: 'end' }] },
  blank: { rx: '/¶¶/u' },
  bol: {},
  cs: {},
  eol: {},
});

const patterns = {
  RULE: '(?:\\* *){3,}|(?:- *){3,}|(?:_ *){3,}',
  OPENER: '#{1,6}(?: |¶|$)|·*(?:[-*+]|\\d{1,9}[.)]) |```|>|(?:%{RULE})(?:¶|$)',
  I: '(?<!\\*)\\*(?!\\*)',
  U: '(?<!_)_(?!_)',
};

writeFileSync(new URL('./step12.json', import.meta.url), JSON.stringify({ version: 'md-step12', patterns, tags }, null, 2) + '\n');
console.log(`step12.json: ${Object.keys(tags).length} tags`);
