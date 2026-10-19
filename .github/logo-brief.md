# fewrd: logo brief

## The ask

A logo for fewrd, a small open-source library: a symbol and a wordmark that also work apart. It should feel **happy**: light, a little witty, pleased with itself in a quiet way. It should not feel **pompous** (no crests, no gloss, no "enterprise" swoosh) or **childish** (no mascot with big eyes, no bubbly comic type).

If one sentence has to guide every choice, take this one: *tidy, and glad to be.*

## What fewrd does

People fill short texts with codes because some register or workflow asks for them. Subject lines, inbox lines and ticket titles fill up with protocol numbers, dates, reference keys and labels. Read in a list, the codes drown the words.

fewrd finds what recurs in such a line and lets a reader **fold it away**. A real example, a subject line from an Italian public office:

> PEC: Prot. n. 0018842 del 12/09/2026 - Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa

With the protocol reference folded away:

> Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa

**Nothing was thrown away.** The protocol is still there, as the value `0018842`, and the date as `2026-09-12`. The small word `del` that joined the date on went with it, and no dash was left dangling. The reader sees the gist; the codes stay at hand as data.

An inbox line works the same way:

> Re: Fwd: Invoice INV-2026-0042 for $1,250.00 due 2026-10-15
>
> Invoice for $1,250.00 due 2026-10-15

## Who it is for

- **The developer** who shows lists of such lines in a mail client, a document register or a ticket tracker.
- **The conf author**, a domain expert who knows what a protocol number looks like and should not have to write a parser. They describe what recurs in a small JSON file, the **conf**, and watch the result live.
- **The reader**, who chooses what to fold and trusts that what remains is the same text with pieces taken out, never rewritten.

## Ideas to play with

These are fewrd's own concepts, glossed plainly. None of them is the logo; each might start one.

- **The fold.** Folding hides a piece of the line without losing it, the way you fold a sheet of paper over or tuck a note behind a page. The text closes up neatly around the gap. This is the heart of fewrd.
- **The gist.** What the reader keeps: the line, readable again. A long line that becomes a short one with no visible scar.
- **The chart: every reading kept.** Before choosing anything, fewrd finds every piece every pattern can see, overlapping ones included. In the playground each piece is drawn as a coloured underline under the characters it covers. Pieces that overlap stack in lanes, like a little staircase of coloured bars beneath a line of text.
- **One reading.** From that crowd of underlines fewrd then picks one consistent reading, a tree where nothing crosses. Many possibilities first, one calm choice after.
- **Water.** The plain words that no pattern covers are called *water*: they flow between the found pieces.
- **The fates.** Three small manners the fold keeps:
  - a **separator** (a space, a dash, a comma): where a cut leaves several side by side, only the strongest survives;
  - a **connector** (a word like *del*, *per il*): it leaves with what it introduced;
  - a **bracket**: when everything inside goes, the brackets go too.

  Together they are why the result looks tidy, not chopped.
- **Character grid.** The playground sets text on a monospace grid, one character to a cell, so a position is a distance you can see.
- **Small and honest.** No dependencies, about 6.5 kB gzipped, rules short enough to read in one sitting. No statistics, no AI: every piece is there because a pattern put it there, and the same line always gives the same result.
- **Two halves.** *Find* gathers everything and chooses nothing; *fold* chooses what to hide. Abundance, then restraint.

## Tone

- Friendly, precise, unhurried. The project's own writing is plain and slightly literary; the logo can be too.
- Wit is welcome if it is quiet: a fold that also reads as a smile, a dash that bows out. One idea, done cleanly.
- Craft over effect: good spacing, honest geometry or an honest hand, nothing that needs a gradient to work.

## Please avoid

- **AI imagery**: sparkles, brains, neural nets, magic wands. fewrd is deliberately not statistical.
- **Scissors, erasers or shredders.** Nothing is cut away or lost; it is folded and kept.
- **Magnifying glasses and generic search icons.**
- **Regex soup**: piles of slashes, brackets and backslashes as decoration.
- National or bureaucratic clichés (flags, stamps, seals), even though one of its domains is Italian public administration.

## Name and type

- Always lowercase: **fewrd**, also at the start of a sentence.
- Name origin: _(to be filled in by the maintainer)_.
- The current logo is a teal wordmark, `.github/fewrd-logo.svg` and `fewrd-logo-neg.svg`. Refine it or replace it; either is fine if the new one is clearly better.
- The playground uses Inter for interface text and JetBrains Mono for the character grid. The logo need not use either, but should sit comfortably next to both.

## Colour

- The current brand teal is `#78C4B6`, used in the logo and in the README's badges.
- The playground's palette: warm paper neutrals in light mode (`oklch(.965 .008 85)` background), cool ink in dark mode (`oklch(.22 .012 265)`), and an indigo accent (`oklch(.5 .13 275)` light, `oklch(.76 .09 275)` dark). Its tag underlines use twelve hues of equal lightness.
- The teal may stay or go. Whatever the palette, the logo must also work in one colour.

## Where it appears

- The README header on GitHub, about 380 px wide, in both light and dark themes (a light and a dark variant).
- A square avatar for the npm package and the GitHub repository.
- A favicon, so the symbol has to survive at 16 px.
- The playground's top bar, next to the case counter, at small size.

## Deliverables

- Symbol, wordmark, and the two together, as SVG.
- Light and dark variants of each, and a one-colour version.
- The symbol on a square at 512, 64 and 16 px.
