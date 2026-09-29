# Playground review

Reviewed in the browser at 1440, 1100, 900 and 480 px, light and dark, over all 21 cases, with keyboard, hover, fold ticks and three kinds of conf edit (valid, broken JSON, compile error). No console errors. Recompile and redraw take 1 to 5 ms, so speed is not an issue.

## What works

- The core idea reads at once: text on the grid, underlines below, hover to reveal. Bands line up with the characters at every width.
- The big round ‹ › and the "n / 21" counter are unmissable; arrow keys work.
- Broken JSON keeps the last good chart; a compile error still draws the tags that compiled.
- Ticking a fold box updates gist and greying in the same frame.

## What is confusing

- **The editor comes first.** Below 900 px the 60vh textarea sits above the case, so at 900 and 480 px the counter and chart start after a screen of JSON.
- **The grid overflows its column.** It is 90ch (810 px), the right column about 650 px at 1100 px wide, so lines scroll sideways inside `.fewrd-draw`, cutting text and bands (case 7). The scroll is invisible until you find it. At 480 px about 45 characters show.
- **Tree and grid are separate worlds.** A band names a tag and span; the tree lists the same pair elsewhere with no link. The grid draws every chart row, the tree only the chosen nodes, and nothing says which rows lost.
- **The tooltip goes stale.** A redraw removes the hovered band before `mouseleave` fires, so the tooltip stays on screen after an edit or a key press (cases 2 and 7).
- **Arrow keys leak.** With focus on a fold checkbox, ArrowRight still changes the case, and the redraw destroys the checkbox, so focus falls to the page.
- **No way back in the fold panel.** After a tick, "matches the case's gist" vanishes and the case's own fold cannot be restored. A conf edit silently drops ticked tags that no longer exist.
- **Titles collide.** "Short prose" is cases 8 and 21; only a small grey domain word tells them apart.

## What is visually weak

- **Hierarchy.** Headings ("tree", "fold", "conf: it-pa") are 13 px at 75% opacity and read as captions; the case name is 15 px, hardly bigger than the body. The only large element is the round buttons.
- **Light theme.** Bands are hsl(h 42% 62%) on white: washed out, 5 px, distinguishable mostly by hue, and neighbouring greens and blues blur. Greyed leaves (opacity .25 plus strike-through) nearly vanish, and the hover wash over them turns muddy.
- **Default controls.** Textarea and 31 tiny checkboxes are browser defaults, in a wrapping flow in conf key order.
- **The gist, the product's output, is a small grey box at the very bottom.** At 1440x900 it starts at y=886, half cut off; at 1100 px it is behind a 280 px tree. It has no `aria-live`.
- **Empty lanes.** A 16-lane case (7) stacks about 130 px under each text line, so lines drift far apart; a second line with no rows still reserves its height.
- **The tree.** Tag, span, `also`, value and JSON-quoted text run together in one monospace line with no guides; composed nodes and leaves look the same; the box scrolls inside a scrolling page.

## Slow and noisy

- Three scrollbars compete: page, tree box (280 px), textarea.
- The legend and the fold panel are two lists of the same tags, side by side in one column, in the same size, and not linked.
- Errors are 12 px red text under the editor, off screen on a tall page; the editor itself does not change (no red border), so a typo looks like nothing happened.

## Affordance and responsiveness

- Bands are not focusable and not tappable: keyboard and touch users cannot read any tag or span.
- Focus rings are the browser default, thin on the round buttons.
- The counter is not a control; getting to case 15 takes fourteen clicks.
- The wrap is the constant 90, not derived from the width.
