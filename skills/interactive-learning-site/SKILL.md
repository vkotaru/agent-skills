---
name: interactive-learning-site
description: Build an interactive learning website — a textbook-style site that teaches a technical topic chapter by chapter, pairing plain-language intuition, the maths (KaTeX), and interactive widgets tied directly to the equations, with worked numbers, "try this" experiments, checkpoint quizzes, and an optional runnable code companion whose outputs are tested against the page. Use when the user wants to learn or teach a topic as an interactive textbook/explainer site (e.g. "build an interactive site teaching Kalman filters", "an explorable explanation of diffusion models"), or to add chapters to such a site.
argument-hint: <topic> [audience] [existing site path]
---

# Interactive learning site

Builds a static site that teaches a topic the way a good tutor would:
intuition first, then the maths, and every equation tied to something the
reader can move. Each chapter is data (content blocks); widgets are small
React components; numerics live in one tested module shared by the page,
Web Workers, and tests.

Request: $ARGUMENTS

## Work in gated stages

Never run past a gate without the user's go-ahead.

1. **Propose, then wait.** Ask (or infer from the request) the audience and
   what they already know. Propose: chapter outline (each chapter's new idea,
   key formulas, widgets), notation table (resolve symbol clashes up front),
   the 4–8 metaphors the whole site will reuse, file layout, and stack. If the
   user already has a site, adapt to its stack and conventions instead of
   bringing a new one.
2. **Scaffold + numerics with tests + first 2–3 chapters, then stop** for a
   review of teaching style and widgets. Their feedback shapes the rest.
3. **Remaining chapters in order**, running tests and companion scripts after
   each. Verify every reference (authors, year, venue) before citing it.
4. **Review pass** of every chapter against the checklist in
   `references/teaching-rules.md`; fix, then report what changed.

## Bundled files (relative to this skill's directory)

- `references/teaching-rules.md` — the ten teaching rules, chapter shape,
  widget conventions, review checklist. These are the point of the site.
- `references/architecture.md` — site structure, content-block schema,
  equation↔widget linking, numerics + tests, companion code, verification,
  and gotchas that each cost real debugging time.
- `assets/ui.js` — widget toolkit (Plot, Heatmap, Slider, Seg, Toggle, Btn,
  Stat, Panel, Legend, `Tex`, the `EQ` link hub, `useSeed`, `useColors`).
- `assets/widgets.css` — light/dark colour tokens and styles for the
  teaching blocks and widget controls; pairs with `ui.js`.
- `assets/numerics-core.js` — UMD: seeded RNG, Box–Muller, Cholesky with
  jitter, triangular solves, log-det, log-sum-exp.
- `scripts/snap.mjs` — headless-Chrome screenshots of page elements, with
  optional JS steps, plus a console-error report.

Copy the assets into the site and extend them; don't rewrite them.

## Definition of done for a chapter

- Unit tests pass; numerics match hand values and the companion's reference
  output; every displayed code snippet is a verbatim substring of a script
  that was actually run.
- Every worked number in the prose came from a test or a script — never from
  mental arithmetic.
- Screenshotted at desktop width, ~380 px, and dark mode with no console
  errors; linked equation terms light up their widget elements.
- Nothing committed, pushed, or deployed unless the user asked.
