# Tutorial: your first conf

In this tutorial we write a conf for help-desk subject lines, one tag at a time, and watch what fewrd finds and what it folds away. We start from this subject:

> Re: Printer on floor 3 jammed again - ticket #4521

and finish with its gist, `Printer on floor 3 jammed again`, with the ticket number still at hand as data.

You need Node 22 or later and a terminal.

## Set up a project

1. Make a folder for the tutorial and go into it:

   ```bash
   mkdir fewrd-tutorial
   cd fewrd-tutorial
   ```

2. Install fewrd:

   ```bash
   npm install fewrd
   ```

We work in two files: `tickets.json`, the conf, and `read.mjs`, a script that reads the subject with it.

## Find the ticket number

A conf names **tags**, the kinds of thing to find. Our first tag, `number`, is a **root tag**: a regular expression finds it.

1. Create `tickets.json`:

   ```json
   {
     "version": "tickets@1",
     "tags": {
       "number": { "rx": "/#\\d+/u" }
     }
   }
   ```

2. Create `read.mjs`:

   ```js
   import { compile, find } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data);
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const chart = find(text, conf);
   console.log(chart.spans('number'));
   ```

3. Run it:

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   [ [ 45, 50 ] ]
   ```

The empty list says the conf has no errors. The second line is where `number` was found: the **span** from 45 to 50, which is `#4521`.

## Fold it away

Now we ask fewrd for the gist of the subject with `number` folded away.

1. Replace `read.mjs` with:

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data);
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const fold = ['number'];
   const doc = dom(text, find(text, conf), conf);
   console.log(JSON.stringify(gist(doc, (node) => fold.includes(node.tag))));
   ```

2. Run it:

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   "Re: Printer on floor 3 jammed again - ticket "
   ```

The number is gone, but the word `ticket` and the dash before it stay behind. fewrd folds only what the conf names, so the conf has to say that the word belongs to the number.

## Take the word with the number

A **composed tag** grows from what another tag found. We make `ticket` grow back from `number`, over an optional space, to the word `ticket`.

1. Replace `tickets.json` with:

   ```json
   {
     "version": "tickets@2",
     "tags": {
       "ticket": { "search": [ { "from": "number", "back": [ { "tag": "sep", "optional": true }, { "tag": "ticket-word", "as": "label" } ] } ] },
       "number": { "rx": "/#\\d+/u" },
       "ticket-word": { "rx": "/ticket/iu" },
       "sep": { "rx": "/[\\s-]+/u" }
     }
   }
   ```

   We also changed `version`. A cached chart is known by its text and its conf's version, so the version changes whenever the conf can find something new.

2. In `read.mjs`, fold `ticket` instead of `number`:

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data);
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const fold = ['ticket'];
   const doc = dom(text, find(text, conf), conf);
   console.log(JSON.stringify(gist(doc, (node) => fold.includes(node.tag))));
   ```

3. Run it:

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   "Re: Printer on floor 3 jammed again - "
   ```

The whole of `ticket #4521` is folded. Only the dash is left dangling.

## Tidy the dash

The `sep` tag finds the spaces and dashes between words. Its **fate**, `separator`, tells the fold to keep only the strongest of the separators left side by side, and none at the end of the text.

1. Replace `tickets.json` with:

   ```json
   {
     "version": "tickets@3",
     "tags": {
       "ticket": { "search": [ { "from": "number", "back": [ { "tag": "sep", "optional": true }, { "tag": "ticket-word", "as": "label" } ] } ] },
       "number": { "rx": "/#\\d+/u" },
       "ticket-word": { "rx": "/ticket/iu" },
       "sep": { "rx": "/[\\s-]+/u", "fate": "separator" }
     }
   }
   ```

2. Run `read.mjs` again. It is the same as in the last section:

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data);
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const fold = ['ticket'];
   const doc = dom(text, find(text, conf), conf);
   console.log(JSON.stringify(gist(doc, (node) => fold.includes(node.tag))));
   ```

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   "Re: Printer on floor 3 jammed again"
   ```

## Keep the number as data

Folding hides text but never loses it. A **resolver** turns what a tag found into a value: here, the digits of the ticket.

1. Replace `tickets.json` with:

   ```json
   {
     "version": "tickets@4",
     "tags": {
       "ticket": { "resolve": "digits", "search": [ { "from": "number", "back": [ { "tag": "sep", "optional": true }, { "tag": "ticket-word", "as": "label" } ] } ] },
       "number": { "rx": "/#\\d+/u" },
       "ticket-word": { "rx": "/ticket/iu" },
       "sep": { "rx": "/[\\s-]+/u", "fate": "separator" }
     }
   }
   ```

   `"resolve": "digits"` names a function. The conf cannot hold the function itself, since a conf is only data.

2. Replace `read.mjs` with this version, which gives `compile` the `digits` function and prints the ticket's value:

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data, { resolvers: { digits: (p) => p.value.replace(/\D/g, '') } });
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const fold = ['ticket'];
   const doc = dom(text, find(text, conf), conf);
   console.log(JSON.stringify(gist(doc, (node) => fold.includes(node.tag))));

   const ticket = doc.children.find((node) => node.tag === 'ticket');
   console.log(ticket.value);
   ```

3. Run it:

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   "Re: Printer on floor 3 jammed again"
   4521
   ```

## Fold the reply prefix

Last, the `Re:` at the start. It gets a root tag of its own, and we fold it with the ticket.

1. Replace `tickets.json` with:

   ```json
   {
     "version": "tickets@5",
     "tags": {
       "ticket": { "resolve": "digits", "search": [ { "from": "number", "back": [ { "tag": "sep", "optional": true }, { "tag": "ticket-word", "as": "label" } ] } ] },
       "reply": { "rx": "/(?:re|fwd?):/iu" },
       "number": { "rx": "/#\\d+/u" },
       "ticket-word": { "rx": "/ticket/iu" },
       "sep": { "rx": "/[\\s-]+/u", "fate": "separator" }
     }
   }
   ```

2. In `read.mjs`, fold `reply` as well:

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './tickets.json' with { type: 'json' };

   const { conf, errors } = compile(data, { resolvers: { digits: (p) => p.value.replace(/\D/g, '') } });
   console.log(errors);

   const text = 'Re: Printer on floor 3 jammed again - ticket #4521';
   const fold = ['reply', 'ticket'];
   const doc = dom(text, find(text, conf), conf);
   console.log(JSON.stringify(gist(doc, (node) => fold.includes(node.tag))));

   const ticket = doc.children.find((node) => node.tag === 'ticket');
   console.log(ticket.value);
   ```

3. Run it:

   ```bash
   node read.mjs
   ```

   The output is:

   ```output
   []
   "Printer on floor 3 jammed again"
   4521
   ```

## What we built

We wrote a conf with two root tags, one composed tag, a separator and a resolver, and folded a subject line down to its gist while keeping its ticket number as data.

- To write a conf for your own texts, see [Write a conf](how-to/write-a-conf.md).
- To watch a conf at work as you edit it, see [Try a conf live](how-to/try-a-conf-live.md).
- For every key a conf can hold, see [The conf](reference/conf.md).
- For why fewrd finds everything first and chooses later, see [How fewrd works](how-it-works.md).
