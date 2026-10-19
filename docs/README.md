# Documentation

fewrd's documents, sorted by what you need from them. The kinds are those of [Diátaxis](https://diataxis.fr/): every page is a tutorial, a how-to guide, reference or explanation, never two at once. There is no tutorial yet; the README's [quick start](../README.md#quick-start) is the nearest thing.

## How-to guides

For a task you already have in mind.

- [Render the tree as HTML](how-to/render-html.md)
- [Try a conf live](how-to/try-a-conf-live.md), in the playground or with `fewrd-play`

## Reference

What each part does, exactly.

- [The conf](reference/conf.md): what a conf holds, its reserved names and its compile errors
- [The rules of finding](reference/finding.md): what `find` does, and the chart it returns
- [The tree](reference/tree.md): the `Node` type, and how selection makes one reading of the chart
- [The rules of the fold](reference/fold.md): what `hidden` and `gist` drop, and how the fates tidy the cuts
- [Glossary](glossary.md): every name fewrd uses, one name per thing
- [Writing style](style.md): how these documents are written

## Explanation

Why fewrd is the way it is.

- [How fewrd works](how-it-works.md): the two halves, in three paragraphs
- [Vision](vision.md): what fewrd is for, and what it deliberately is not
- [Design principles](principles.md): how fewrd decides things
- [Architecture](architecture.md): the modules, what crosses each boundary, the ceilings
- [Decisions](decisions/): one file for each design decision, settled or open
- [The playground's design](playground.md)

## Working on fewrd

[CONTRIBUTING.md](../CONTRIBUTING.md) has the loop, the tests and how to add a domain. The rounds that built fewrd are recorded in [specs/](../specs/).
