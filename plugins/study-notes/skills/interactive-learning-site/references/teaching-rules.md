# Teaching rules

## Audience

Pin this down in the proposal: what the reader is fluent in, what they are
rusty on, what is new. Write for that person. A common and demanding case:
a strong engineer, comfortable with code and basic linear algebra, rusty on
probability, new to the topic, and easily lost when material jumps ahead or
refers back without restating.

## The rules

1. **Intuition first, then maths, always.** Every concept opens with a
   plain-language explanation and a mental picture before any equation.
2. **A small set of metaphors, reused consistently.** Choose them in the
   proposal and never swap them mid-site. Example set for Gaussian processes:
   "a recipe for smooth random curves", "a cloud of squiggles" (prior
   samples), "a rope tied down at the data" (posterior), "the similarity
   rule" (kernel), "believability" = data-fit penalty + complexity penalty.
3. **Never refer back without restating.** Every use of an earlier result
   gets a recap box citing its section number, with the formula and one
   sentence of meaning. Never "exactly like section 7" on its own.
4. **No jumps.** Each chapter opens by stating what it adds over the last.
   When the role of an object changes, say so loudly — give the change its
   own bridge chapter if needed.
5. **Tiny worked numeric examples** for every key formula, small enough to
   check by hand (2–3 points, 3–5 samples).
6. **Every equation is linked to a visual.** Hovering or focusing a term
   highlights the matching widget element, and vice versa.
7. **"Try this" under every widget**: 2–4 concrete actions, each with what
   the reader should notice.
8. **Checkpoint questions** at the end of each chapter, answers collapsed.
9. **Derivations go in collapsible "Deeper math"** so the main flow stays light.
10. **Plain, warm prose. Short paragraphs.** No walls of bullets.

## Chapter shape

"What's new" box (+ recaps) → intuition → maths with linked terms → worked
example → widget + "Try this" → … → folded code ("show the code") →
checkpoint quiz.

## Widget conventions

- Deterministic by default (seeded); a "new samples" button reseeds.
- Fixed noise vectors, so random samples morph smoothly as sliders move
  instead of jumping.
- One colour system for the whole site: fixed colours for samples, for
  groups/modes, a neutral for baseline fits, one accent for data.
- Grids of ~70–150 points keep things interactive; anything heavier runs in
  a Web Worker with a progress indicator.
- Works at ~380 px (panels stack, touch targets ≥ 36 px), in light and dark
  mode, keyboard-operable, with aria labels on plots and canvases.

## Review checklist

For each chapter:
- Any equation before its intuition?
- Any back-reference without a recap box? Any recap citing the wrong number?
- Any display equation with no linked visual?
- Any widget without "Try this"? Any chapter without a quiz?
- Any worked number not backed by a test or script?
- Captions that assume a desktop layout ("bottom left") — wrong on phones.
- Paragraphs longer than ~5 sentences; bullet walls.
- Metaphors used inconsistently; notation drifting from the table.
