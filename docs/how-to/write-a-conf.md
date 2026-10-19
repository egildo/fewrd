# Write a conf

How to describe what recurs in your texts as a conf, one task to a section. Every key is defined in [The conf](../reference/conf.md); for a first walk through, follow the [tutorial](../tutorial.md).

Keep a few dozen real texts at hand, and watch them in the playground as you write: see [Try a conf live](try-a-conf-live.md).

## Start a conf

1. Create a JSON file with a `version` and an empty `tags`:

   ```json
   { "version": "supplies@1", "tags": {} }
   ```

2. Raise the number after `@` whenever a change to the conf can change what it finds. A cached chart is known by its text and this version.

## Find a code by its shape

1. Add a **root tag**: a key under `tags` with an `rx`, a regular expression written as `"/source/flags"`. Double every backslash, since the pattern is a JSON string:

   ```json
   "cig-code": { "rx": "/[A-Z0-9]{10}/u" }
   ```

2. If the pattern has alternatives, write the longest first: `/protocollo|prot\\.?/iu`, never `/prot\\.?|protocollo/iu`. A match that would start or end inside a word is dropped, not retried shorter.

3. If a piece of pattern is used in several tags, name it under `patterns` and splice it in with `%{NAME}`:

   ```json
   "patterns": { "DATE": "\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{4}" },
   "tags": { "date": { "rx": "/%{DATE}/u" } }
   ```

A pattern always matches on a normalised copy of the text: every dash is `-`, quotes are straight, and every run of whitespace is one space.

## Take a label with its code

For a code that follows a word saying what it is, such as `CIG 8841203A5F`.

1. Add a root tag for the label:

   ```json
   "cig-word": { "rx": "/c\\.?i\\.?g\\.?/iu" }
   ```

2. If the conf has no separator tag yet, add one for the glue between words:

   ```json
   "sep": { "rx": "/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u", "fate": "separator" }
   ```

   It takes spaces, a comma, semicolon or colon before a space, and a dash between spaces.

3. Add a **composed tag** that grows back from the code, over an optional separator, to the label:

   ```json
   "cig": { "search": [
     { "from": "cig-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "cig-word", "as": "label" } ] }
   ] }
   ```

   `back` lists the atoms nearest first. The last one may not be optional. `as` names a role: the label's node is kept in the `cig` node's `attrs.label`.

4. Check it on real texts. This conf, folding `cig`:

   ```json
   {
     "version": "supplies@1",
     "tags": {
       "cig": { "search": [
         { "from": "cig-code", "back": [ { "tag": "sep", "optional": true }, { "tag": "cig-word", "as": "label" } ] }
       ] },
       "cig-code": { "rx": "/[A-Z0-9]{10}/u" },
       "cig-word": { "rx": "/c\\.?i\\.?g\\.?/iu" },
       "sep": { "rx": "/(?:\\s|[,;:](?=\\s|$)|(?<=^|\\s)-(?=\\s|$))+/u", "fate": "separator" }
     }
   }
   ```

   ```js
   import { compile, find, dom, gist } from 'fewrd';
   import data from './supplies.json' with { type: 'json' };

   const { conf } = compile(data);
   for (const text of ['Fornitura toner CIG 8841203A5F - saldo', 'Fornitura toner, C.I.G.: 8841203A5F', 'Fornitura toner 8841203A5F']) {
     const doc = dom(text, find(text, conf), conf);
     console.log(gist(doc, (node) => node.tag === 'cig'));
   }
   ```

   gives:

   ```output
   Fornitura toner - saldo
   Fornitura toner
   Fornitura toner 8841203A5F
   ```

A code with no label is a `cig-code` but not a `cig`, so folding `cig` leaves it in place. If unlabelled codes matter, fold `cig-code` too. No construct says "with its label if there is one" yet: see [optional-labels](../decisions/optional-labels.md).

## Add a part on the other side

For a code with parts on both sides, such as a labelled protocol number followed by its date. A search grows in one direction only, so the second side is a second composed tag.

1. Write the composed tag for the first side, as in [Take a label with its code](#take-a-label-with-its-code): here `protocol`, grown back from the number to its label.

2. Add a composed tag that grows forward from the first one:

   ```json
   "dated": { "search": [
     { "from": "protocol", "forward": [ { "tag": "sep", "optional": true }, { "tag": "date", "as": "date" } ] }
   ] }
   ```

The tree then holds a `dated` node with the `protocol` node inside it. Fold `dated` to fold both.

## Repeat a part

For a chain of the same part, such as `Re: Fwd: Re:`.

1. Write a search that takes two parts:

   ```json
   "reply-chain": { "search": [
     { "from": "reply-word", "forward": [ { "rx": "/\\s+/u" }, { "tag": "reply-word" } ] }
   ] }
   ```

2. Add a second search that grows the tag from itself by one more part:

   ```json
   { "from": "reply-chain", "forward": [ { "rx": "/\\s+/u" }, { "tag": "reply-word" } ] }
   ```

`find` keeps every length of the chain; the tree keeps the longest.

## Tidy the text around a fold

Give each tag of glue or delimiters its **fate**, the way the fold treats it:

- **separator**, for spaces, dashes and commas. Where a fold cuts, only the strongest separator survives, and none at the edge of the text.
- **connector**, for a word that joins what follows it on, such as `del` or `per il`. It folds when the next leaf after it that is not a separator folds:

  ```json
  "conn": { "rx": "/del|sul|per\\s+il/iu", "fate": "connector" }
  ```

- **bracket**, for a pair of delimiters and what they hold. It folds, delimiters included, when everything inside it folds:

  ```json
  "paren": { "rx": "/\\(.*?\\)/su", "fate": "bracket" }
  ```

The exact rules are in [The rules of the fold](../reference/fold.md).

## Give a row its value

For a row whose text is not yet the value you want, such as a date written `12/09/2026`.

1. Add `resolve` to the tag, naming a function:

   ```json
   "date": { "rx": "/%{DATE}/u", "resolve": "date" }
   ```

2. Write the function. It gets the row's text as `value`, and each role by its name. It returns the value as a string, or `null` to say the row is not this tag after all:

   ```js
   const resolvers = {
     date: (p) => {
       const [d, m, y] = p.value.split(/[/.-]/).map(Number);
       if (m < 1 || m > 12 || d < 1 || d > 31) return null;
       return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
     },
   };
   ```

3. Pass the functions to `compile`:

   ```js
   const { conf, errors } = compile(data, { resolvers });
   ```

A resolver must be pure: fewrd asks it once while finding and again while building the tree, and both times it sees the normalised text.

## Let a vague tag give way

For a tag that may cover what a more precise tag should, such as a run of capitals.

- Add `"weak": true` to the vague tag. Its rows fill only what the other tags leave.

## Choose between two overlapping tags

For two tags whose rows are equally long and overlap, where the tree should keep one.

- Move the tag you prefer above the other in `tags`. On a tie, the earlier key wins. Key order changes the tree, never the chart.

## Check the conf

1. Compile it and print the errors:

   ```js
   for (const e of errors) console.log(`${e.path} (${e.tag}): ${e.message}`);
   ```

2. Fix each error at its path, such as `tags.price.search[0].from`. A tag with an error is left out and the others keep working, so one mistake never hides the rest.

3. Open the conf with your texts in the playground, and check every gist: see [Try a conf live](try-a-conf-live.md).

Every error `compile` can report is listed in [The conf](../reference/conf.md).
