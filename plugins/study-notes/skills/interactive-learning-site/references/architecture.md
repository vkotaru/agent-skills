# Architecture

## Stack

If the user has an existing site, adapt to it. Otherwise the default is a
**no-build static site**: React 18 UMD and KaTeX (+ auto-render) from a CDN,
`React.createElement` aliased to `h()` instead of JSX, plain `<script>`
tags. Nothing to install, deploys anywhere static, and any `python3 -m
http.server` previews it. Offer Vite + TypeScript instead if the user wants
types or a bundler; everything below carries over.

```
index.html            loads React, KaTeX, then lib/, widgets/, content/ in order
app.js                shell: router, sidebar, block renderer, typesetting
styles.css            site layout; @import or inline assets/widgets.css
lib/ui.js             widget toolkit          (from assets/)
lib/numerics.js       numerics, UMD           (from assets/numerics-core.js)
lib/worker.js         importScripts('numerics.js'); heavy loops
widgets/chNN.js       WIDGETS['chNN/name'] = function (props) {...}
content/chNN-slug.js  CONTENT.push({ id, number, title, sections:[...] })
companion/chNN_*.py   runnable code per chapter; writes tests/ref/chNN.json
tests/*.test.mjs      node --test: numerics vs refs, snippet sync, content loads
```

Declare `const CONTENT = [], WIDGETS = {};` in an inline script before the
widget and content files.

## The shell (`app.js`)

- **Hash router** `#/<chapter>/@<section>` so section links work on a static
  host. Scroll to the section on route change.
- **Sidebar** with chapters and numbered sections; **progress bar**;
  **prev/next** chapter links.
- **Numbered sections** (`2.3`) so recap boxes can cite them.
- **Block renderer**: one component per block type (below). Wrap each widget
  in an error boundary so one broken widget doesn't blank the page.
- **Typesetting**: after React renders, run KaTeX auto-render over the page
  with `trust: true`, the `\eqt` macro, and `ignoredClasses: ['widget']`.
  Then give every `[data-eq]` element `tabindex=0` and class `eqt`.
- **Theme toggle** setting `data-theme` on `<html>`; default follows the OS.

## Content blocks

A chapter is data. Each section is `{ id, title, blocks: [...] }`:

```js
{t:'p',      md:'Markdown with $inline$ maths.'},
{t:'math',   tex:'\\mu_* = K_*^\\top A^{-1} y'},          // display
{t:'h',      md:'Subheading'},
{t:'table',  head:[...], rows:[[...]]},
{t:'new',    md:'What this chapter adds compared with the last one.'},
{t:'recap',  from:'0.3', title:'the conditioning rule', math:'...', md:'One sentence of meaning.'},
{t:'try',    items:[{do:'Set $\\rho$ to 0.', see:'The slice stops moving.'}]},
{t:'quiz',   items:[{q:'Question?', a:'Answer, collapsed until clicked.'}]},
{t:'deeper', title:'where the rule comes from', blocks:[ /* any blocks */ ]},
{t:'widget', w:'ch02/posterior', props:{preset:'clustered'}, caption:'...'},
{t:'code',   lang:'python', src:'companion/ch02_posterior.py', fold:'show the code', md:'<verbatim snippet>'}
```

Content files are JS, so LaTeX backslashes are doubled (`\\frac`).

## Linking equations to widgets

1. KaTeX macro `\eqt` → `\htmlData{eq=#1}{#2}` (needs `trust: true`). In
   content: `\\eqt{c2.alpha}{\\alpha}`. Keys are `c<chapter>.<name>`.
2. A global hub (`UI.EQ`) holds the lit key. Delegated `mouseover`/`focusin`/
   `click` listeners on `document` set it from any `[data-eq]` element and
   toggle `.lit` on every element with the same key.
3. Widgets subscribe with `const lit = UI.useEq()` and mark their elements
   with `UI.eqBind(key)` (spreads `data-eq` + handlers), so hovering the
   widget lights the equation term too. `Slider` and `Stat` take `eq`.

## Widget toolkit (`assets/ui.js`, exposes `UI`)

- `Plot({xdom, ydom, height, xlabel, ylabel, label, square, compact,
  onPointer, onPointerMove, children: ({X, Y, iw, ih}) => ...})` — SVG,
  sized to its container in real pixels (`useWidth`), clipped plot area.
  Helpers `linePath(xs, ys, X, Y)`, `bandPath(xs, lo, hi, X, Y)`.
- `Heatmap({M, max, vmin, vmax, diverging, label, onHover, hl, cellLabel})`
  — canvas with an SVG overlay for hover/highlight.
- Controls: `Slider({label (TeX), name, value, min, max, step, log,
  onChange, digits, eq})`, `Seg({options, value, onChange})`, `Toggle`,
  `Btn`, `Stat({label, value, eq, tone, sub})`, `Row({cls:'split'})`
  (side-by-side, stacks under 720 px), `Panel({title})`, `Legend({items})`.
- `Tex({src, display})` — renders with `katex.render` into a ref.
- `useSeed(initial)` → `[seed, reseed]`; `useColors()` reads the CSS tokens
  and re-reads on theme change (needed for canvas); `fmt`, `ticks`.

SVG for anything the reader hovers or drags; canvas for dense grids.

## Numerics

One UMD file (`assets/numerics-core.js` → `NUM`) loaded by the page, a
Worker (`importScripts`) and node tests (`require`). Matrices are arrays of
rows. Add topic functions below the core; keep maths out of widgets.
Use Cholesky solves, never explicit inverses; jitter on failure.

## Companion code and tests

- One runnable script per chapter, building up incrementally (later chapters
  import earlier ones). For JAX: `jax_enable_x64`, log-parameterised
  hyperparameters, `value_and_grad`, `jit`, `vmap` where natural. Pin deps in
  `requirements.txt`, and actually run every script.
- Each script prints the chapter's worked numbers and writes
  `tests/ref/chNN.json`.
- Tests (`node --test tests/*.test.mjs` — the bare directory form fails):
  1. numerics vs hand-computed values, then vs the reference JSON;
  2. every content file loads in `vm` with a stub `CONTENT`, section ids are
     unique, every `widget` block names a registered widget;
  3. every `code` block's `md` is a verbatim substring of its `src` file —
     order the script so each displayed piece is contiguous.

```js
// tests/snippets.test.mjs (sketch)
for (const f of readdirSync('content')) test(f, () => {
  const ctx = { CONTENT: [] }; vm.runInNewContext(readFileSync(`content/${f}`, 'utf8'), ctx);
  for (const b of walk(ctx.CONTENT[0])) {
    if (b.t === 'widget') assert.ok(registered.has(b.w), b.w);
    if (b.t === 'code' && b.src) assert.ok(readFileSync(b.src, 'utf8').includes(b.md));
  }
});
```

## Verifying

Serve the folder (`python3 -m http.server 8000`), then screenshot with the
bundled script (Node 22+, `google-chrome` on PATH):

```bash
node <skill-dir>/scripts/snap.mjs 'http://127.0.0.1:8000/#/ch02' out/ch02 1400 \
  '[{"sel":"#sec-many","out":"many"},
    {"js":"document.querySelector(\"[data-eq=\\\"c2.alpha\\\"]\").dispatchEvent(new MouseEvent(\"mouseover\",{bubbles:true}))",
     "sel":"#sec-bumps","out":"lit"}]'
```

Args: URL, output prefix, viewport width (380 for phone), JSON steps
`{sel, js?, out, maxh?, wait?}`. It prints console errors. Use a `js` step
to set `data-theme="dark"` for dark mode. Then look at every PNG.
If a browser extension can't reach localhost, this works from the shell.

## Gotchas

- **Never put `$...$` text inside a widget.** The page typesetter rewrites
  DOM that React owns, and the next render crashes or goes stale. Use `Tex`.
- KaTeX `\htmlData` needs `trust: true` on both auto-render and `katex.render`.
- Uppercase CSS (`text-transform`) on titles mangles rendered maths.
- Colour parsing must accept 3-digit hex (`#fff`), or canvas colours go grey.
- Labels drawn over curves need a halo (`paint-order: stroke` with a
  background-coloured stroke) to stay readable.
- Periodic or rough kernels/samples need ≥ ~120 grid points or they look jagged.
- Captions saying "left/right" are wrong once panels stack on a phone.
- Selection/annotation handlers on the page should ignore events inside
  `.widget`, or dragging a slider selects text.
- Hand arithmetic in prose goes wrong; generate the numbers.
