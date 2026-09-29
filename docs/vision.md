# Vision

fewrd finds what recurs in a short string and lets a reader fold it away.

## What it is for

A subject line, an inbox line, a ticket title: short texts that people fill with codes, numbers, dates and labels because some register or workflow asked for them. Read in a list, the codes drown the words. fewrd lets someone who knows the domain describe what recurs in a **conf**, a JSON file of named patterns, and then does two things with any text: it finds every piece the conf describes, with its canonical value, and it folds the pieces the reader does not want, leaving the gist readable and the punctuation around the cuts tidy.

## Who it serves

- **The developer** who shows lists of such texts, in a document register, a mail client or a ticket tracker, and wants the gist on screen and the codes as data. They get plain objects and render them however their app renders.
- **The conf author**, a domain expert who knows what a CIG code or a protocol number looks like and should not have to write a parser. They edit JSON and watch the result in the playground as they type.
- **The reader**, who chooses what to fold and trusts that what remains is the same text with pieces taken out, never rewritten.

## What it deliberately is not

Each exclusion is a choice, and each has a price if it is ever added back.

**Not a parser for documents.** fewrd works at subject length, a line or two. Its matcher enumerates every derivation and its selection scans lists; both have ceilings that are fine at a hundred characters and wrong at a hundred pages. *Adding it back* means indexes by position, pruning in the matcher, and giving up "every reading is kept".

**Not statistical.** No models, no training, no scores. Every row is there because a pattern and a rule put it there, and the rules fit in a README. *Adding it back* means the output can no longer be explained by reading the conf, and a cached chart is no longer a pure function of text and conf.

**Not a renderer.** fewrd returns a tree of plain objects and a set of hidden nodes; HTML and real DOM are the consumer's. *Adding it back* means an escaping policy, markup opinions and a styling contract inside a library whose value is being small.

**Not a place for code in data.** A conf is JSON and names its resolvers; nothing in it is evaluated. *Adding it back* means a conf file becomes an attack surface and can no longer be reviewed as config.

**Not locale-aware or time-aware.** The same text and conf give the same chart everywhere, always. *Adding it back* means caching by text and conf version stops being correct.

**Not an editor that saves.** The playground and `fewrd-play` show and edit a conf live, and write nothing back. *Adding it back* means a write path on a local server and a story for conflicts with the file on disk.

## When this and the principles collide

This document decides what fewrd is and what it is for; the [design principles](principles.md) decide how it is built, and neither is overridden by a spec, a plan or convenience.
