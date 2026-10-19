# How fewrd works

**The chart chooses nothing.** `find` keeps every row every pattern can produce, overlapping ones included, and it depends on the text and the conf alone. So a chart can be cached by text and conf version, and any number of readings can be built from one.

**The tree is one reading.** `dom` walks the chart's rows in a fixed order, keeps those that do not cross, re-runs each composed row's search to bind its roles, resolves values bottom-up, and fills the gaps with water. No two nodes cross; the leaves cover the text exactly once.

**The fold is a policy plus three fates.** A fold is a function from a node to a boolean. What it hides, the fates tidy up: a connector goes with what it introduced, a bracket empties out, and of the separators left side by side only the strongest survives.

The parts and the boundaries are drawn in the [architecture](architecture.md); what fewrd is for, and what it deliberately is not, is in the [vision](vision.md); every christened name is in the [glossary](glossary.md).
