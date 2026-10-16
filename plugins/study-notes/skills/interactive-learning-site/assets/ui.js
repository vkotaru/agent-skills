/* ==========================================================================
   Shared pieces for interactive widgets.  Exposes window.UI.

   Widgets are React components that register themselves on WIDGETS by name;
   a content block {t:'widget', w:'ch02/posterior', props:{...}} mounts one.

   Two rules every widget follows:
     - maths inside a widget goes through <Tex>, never as $...$ text. The page
       typesets by rewriting the DOM after React renders, and React cannot
       update a node KaTeX has replaced.
     - plots size themselves to their container in real pixels (useWidth),
       not a scaled viewBox, so tick labels stay readable on a phone.
   ========================================================================== */
(function () {
  'use strict';
  const { useState, useEffect, useRef, useLayoutEffect, useMemo, createElement: h, Fragment } = React;

  /* ---------- KaTeX ------------------------------------------------------- */
  /* \eqt{key}{tex} marks a term as linked: hovering it lights up whatever a
     widget has bound to `key`, and the other way round.                     */
  const MACROS = { '\\eqt': '\\htmlData{eq=#1}{#2}' };
  const KATEX = {
    throwOnError: false, strict: false,
    trust: ctx => ctx.command === '\\htmlData',
    get macros() { return Object.assign({}, MACROS); }
  };

  function Tex({ src, display }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
      if (!ref.current || !window.katex) return;
      window.katex.render(src, ref.current,
        { throwOnError: false, strict: false, trust: KATEX.trust,
          macros: KATEX.macros, displayMode: !!display });
      ref.current.querySelectorAll('[data-eq]').forEach(e => { e.tabIndex = 0; e.classList.add('eqt'); });
    }, [src, display]);
    return h(display ? 'div' : 'span', { ref, className: 'tex' + (display ? ' tex-d' : '') });
  }

  /* ---------- equation <-> widget linking --------------------------------- */
  /* One global "lit" key. Equation terms carry data-eq="key" (from \eqt);
     widget elements subscribe with useEq() and bind hover with eqBind().    */
  const EQ = {
    lit: null, subs: new Set(),
    set(k) {
      if (this.lit === k) return;
      this.lit = k;
      document.querySelectorAll('[data-eq]').forEach(e => e.classList.toggle('lit', e.dataset.eq === k));
      this.subs.forEach(f => f(k));
    },
    sub(f) { this.subs.add(f); return () => this.subs.delete(f); }
  };

  // Delegated, so terms rendered at any time -- by the page typesetter or by
  // <Tex> inside a widget -- work without wiring each one.
  const termOf = e => (e.target && e.target.closest ? e.target.closest('[data-eq]') : null);
  document.addEventListener('mouseover', e => { const t = termOf(e); if (t) EQ.set(t.dataset.eq); });
  document.addEventListener('mouseout', e => {
    const t = termOf(e);
    if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) EQ.set(null);
  });
  document.addEventListener('focusin', e => { const t = termOf(e); if (t) EQ.set(t.dataset.eq); });
  document.addEventListener('focusout', e => { if (termOf(e)) EQ.set(null); });
  // touch has no hover: a tap toggles
  document.addEventListener('click', e => {
    const t = termOf(e);
    if (t && e.pointerType !== 'mouse') EQ.set(EQ.lit === t.dataset.eq ? null : t.dataset.eq);
  });

  function useEq() {
    const [k, setK] = useState(EQ.lit);
    useEffect(() => EQ.sub(setK), []);
    return k;
  }
  // spread onto any element to make hovering it light the matching term
  const eqBind = key => key ? {
    onMouseEnter: () => EQ.set(key), onMouseLeave: () => EQ.set(null)
  } : {};

  /* ---------- theme colours (canvas needs real values) -------------------- */
  const TOKENS = ['bg', 'panel', 'ink', 'ink-soft', 'ink-faint', 'rule', 'accent', 'accent-bg',
                  'c1', 'c2', 'c3', 'm1', 'm2', 'm3', 'neutral', 'unsure', 'band'];
  function readColors() {
    const cs = getComputedStyle(document.documentElement), o = {};
    TOKENS.forEach(t => { o[t.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cs.getPropertyValue('--' + t).trim(); });
    return o;
  }
  function useColors() {
    const [c, setC] = useState(readColors);
    useEffect(() => {
      const update = () => setC(readColors());
      const mo = new MutationObserver(update);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', update);
      return () => { mo.disconnect(); mq.removeEventListener('change', update); };
    }, []);
    return c;
  }
  const hexRgb = hex => {
    let m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return [128, 128, 128];
    const x = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
    const n = parseInt(x, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  /* ---------- sizing ------------------------------------------------------- */
  function useWidth(fallback = 640) {
    const ref = useRef(null);
    const [w, setW] = useState(fallback);
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (el.clientWidth) setW(el.clientWidth);
      const ro = new ResizeObserver(es => {
        const cw = Math.floor(es[0].contentRect.width);
        if (cw > 0) setW(cw);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    return [ref, w];
  }

  /* ---------- seeded randomness ------------------------------------------- */
  // [seed, reseed]: deterministic until the reader asks for new samples
  function useSeed(initial = 1) {
    const [s, setS] = useState(initial);
    return [s, () => setS(v => (v * 1103515245 + 12345) % 2147483647 || 1)];
  }

  /* ---------- ticks ------------------------------------------------------- */
  function ticks(lo, hi, want = 5) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const raw = (hi - lo) / want, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step)
      out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
    return out;
  }
  const fmt = (v, d = 2) => (Math.abs(v) < 1e-12 ? '0' : (+v.toFixed(d)).toString());

  /* ---------- Plot: axes in SVG, content via a render function ------------ */
  /* children(ctx) draws the layers. ctx = {X, Y, iw, ih, M, W, H}.
     onPointer(x, y, evt) receives data coordinates.                         */
  let clipUid = 0;
  function Plot({ xdom, ydom, height = 240, xlabel, ylabel, label, children,
                  onPointer, onPointerMove, onPointerLeave, cursor, xticks, yticks,
                  square, compact }) {
    const [ref, w] = useWidth();
    const clip = useMemo(() => 'pc' + (++clipUid), []);
    const narrow = w < 460;
    const M = { t: 10, r: 12, b: xlabel ? 40 : 26, l: ylabel ? (narrow ? 42 : 50) : 36 };
    if (compact) { M.b = xlabel ? 34 : 22; }
    const W = w;
    const iw = Math.max(40, W - M.l - M.r);
    let H = square ? iw + M.t + M.b : (narrow ? Math.round(height * 0.86) : height);
    const ih = H - M.t - M.b;
    const [x0, x1] = xdom, [y0, y1] = ydom;
    const X = v => M.l + (v - x0) / (x1 - x0) * iw;
    const Y = v => M.t + (1 - (v - y0) / (y1 - y0)) * ih;
    const ctx = { X, Y, iw, ih, M, W, H, x0, x1, y0, y1, clip };

    const toData = evt => {
      const r = evt.currentTarget.getBoundingClientRect();
      const px = evt.clientX - r.left, py = evt.clientY - r.top;
      return { x: x0 + (px - M.l) / iw * (x1 - x0), y: y0 + (1 - (py - M.t) / ih) * (y1 - y0),
               inside: px >= M.l && px <= M.l + iw && py >= M.t && py <= M.t + ih };
    };
    const xt = xticks || ticks(x0, x1, narrow ? 4 : 6);
    const yt = yticks || ticks(y0, y1, 4);

    return h('div', { ref, className: 'plot' },
      h('svg', {
        width: W, height: H, role: 'img', 'aria-label': label || '',
        style: { cursor: cursor || 'default', touchAction: onPointerMove ? 'none' : 'auto' },
        onPointerDown: onPointer ? e => { const d = toData(e); if (d.inside) onPointer(d.x, d.y, e); } : undefined,
        onPointerMove: onPointerMove ? e => { const d = toData(e); onPointerMove(d.x, d.y, e, d.inside); } : undefined,
        onPointerLeave: onPointerLeave
      },
        h('defs', null, h('clipPath', { id: clip },
          h('rect', { x: M.l, y: M.t, width: iw, height: ih }))),
        yt.map((v, i) => h(Fragment, { key: 'y' + i },
          h('line', { className: 'grid', x1: M.l, x2: M.l + iw, y1: Y(v), y2: Y(v) }),
          h('text', { className: 'tick', x: M.l - 6, y: Y(v) + 4, textAnchor: 'end' }, fmt(v)))),
        xt.map((v, i) => h(Fragment, { key: 'x' + i },
          h('line', { className: 'axis', x1: X(v), x2: X(v), y1: M.t + ih, y2: M.t + ih + 4 }),
          h('text', { className: 'tick', x: X(v), y: M.t + ih + 16, textAnchor: 'middle' }, fmt(v)))),
        h('line', { className: 'axis', x1: M.l, x2: M.l + iw, y1: M.t + ih, y2: M.t + ih }),
        xlabel ? h('text', { className: 'alabel', x: M.l + iw / 2, y: H - 5, textAnchor: 'middle' }, xlabel) : null,
        ylabel ? h('text', { className: 'alabel', x: 12, y: M.t + ih / 2, textAnchor: 'middle',
                             transform: `rotate(-90 12 ${M.t + ih / 2})` }, ylabel) : null,
        h('g', { clipPath: `url(#${clip})` }, children ? children(ctx) : null)));
  }

  // path helpers
  const linePath = (xs, ys, X, Y) =>
    xs.map((x, i) => (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(ys[i]).toFixed(1)).join(' ');
  const bandPath = (xs, lo, hi, X, Y) =>
    linePath(xs, hi, X, Y) + ' ' +
    xs.slice().reverse().map((x, i) => 'L' + X(x).toFixed(1) + ' ' + Y(lo[xs.length - 1 - i]).toFixed(1)).join(' ') + ' Z';

  /* ---------- Heatmap: canvas cells, SVG overlay for highlights ---------- */
  /* hl: [{r0, r1, c0, c1, key}] rectangles to outline (inclusive indices).  */
  function Heatmap({ M, max = 280, vmin, vmax, diverging, label, onHover, hl = [], cellLabel }) {
    const [ref, w] = useWidth(max);
    const cv = useRef(null);
    const colors = useColors();
    const n = M.length, m = M[0].length;
    const side = Math.min(w, max);
    const cw = side / m, chh = side / n;
    const flat = M.flat();
    const hi = vmax != null ? vmax : Math.max(...flat.map(Math.abs));
    const lo = vmin != null ? vmin : (diverging ? -hi : 0);
    const [hov, setHov] = useState(null);

    useEffect(() => {
      const c = cv.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(side * dpr); c.height = Math.round(side * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = hexRgb(colors.panel), pos = hexRgb(colors.accent), neg = hexRgb(colors.c1);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++) {
          const v = M[i][j];
          let rgb;
          if (diverging) {
            const t = Math.max(-1, Math.min(1, v / (hi || 1)));
            rgb = t >= 0 ? mix(base, pos, t) : mix(base, neg, -t);
          } else {
            rgb = mix(base, pos, Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1))));
          }
          g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          g.fillRect(j * cw, i * chh, Math.ceil(cw), Math.ceil(chh));
        }
    }, [M, side, colors, diverging, lo, hi]);

    const move = e => {
      const r = e.currentTarget.getBoundingClientRect();
      const j = Math.floor((e.clientX - r.left) / cw), i = Math.floor((e.clientY - r.top) / chh);
      if (i >= 0 && i < n && j >= 0 && j < m) {
        if (!hov || hov.i !== i || hov.j !== j) { setHov({ i, j }); onHover && onHover({ i, j }); }
      }
    };
    const leave = () => { setHov(null); onHover && onHover(null); };

    return h('div', { ref, className: 'heat' },
      h('div', { className: 'heat-box', style: { width: side, height: side } },
        h('canvas', { ref: cv, style: { width: side, height: side }, role: 'img', 'aria-label': label || 'matrix heatmap' }),
        h('svg', { width: side, height: side, className: 'heat-over',
                   onPointerMove: move, onPointerLeave: leave, style: { touchAction: 'none' } },
          hl.map((r, k) => h('rect', { key: k, className: 'heat-hl' + (r.cls ? ' ' + r.cls : ''),
            x: r.c0 * cw, y: r.r0 * chh, width: (r.c1 - r.c0 + 1) * cw, height: (r.r1 - r.r0 + 1) * chh })),
          hov ? h('rect', { className: 'heat-cell', x: hov.j * cw, y: hov.i * chh, width: cw, height: chh }) : null)),
      cellLabel && hov ? h('div', { className: 'heat-read' }, cellLabel(hov.i, hov.j, M[hov.i][hov.j]))
                       : h('div', { className: 'heat-read faint' }, 'hover a cell'));
  }

  /* ---------- controls ---------------------------------------------------- */
  // label is TeX; name is the plain-text accessible name
  function Slider({ label, name, value, min, max, step, log, onChange, digits = 2, eq }) {
    const lit = useEq() === eq && !!eq;
    const toPos = v => (log ? Math.log10(v) : v);
    const fromPos = p => (log ? Math.pow(10, p) : p);
    const lo = toPos(min), hi = toPos(max);
    const st = log ? (hi - lo) / 400 : (step || (max - min) / 200);
    return h('label', Object.assign({ className: 'wslider' + (lit ? ' lit' : '') }, eqBind(eq)),
      h('span', { className: 'wslider-l' }, h(Tex, { src: label })),
      h('input', { type: 'range', min: lo, max: hi, step: st, value: toPos(value),
                   'aria-label': name || label,
                   'aria-valuetext': fmt(value, digits),
                   onChange: e => onChange(fromPos(parseFloat(e.target.value))) }),
      h('span', { className: 'wslider-v' }, fmt(value, digits)));
  }

  function Seg({ options, value, onChange, name }) {
    return h('div', { className: 'wseg', role: 'group', 'aria-label': name },
      options.map(o => h('button', {
        key: o.value, type: 'button', className: value === o.value ? 'on' : '',
        'aria-pressed': value === o.value, onClick: () => onChange(o.value)
      }, o.label)));
  }

  function Toggle({ label, value, onChange }) {
    return h('label', { className: 'wtoggle' },
      h('input', { type: 'checkbox', checked: !!value, onChange: e => onChange(e.target.checked) }),
      h('span', null, label));
  }

  const Btn = ({ onClick, children, kind, disabled, title }) =>
    h('button', { type: 'button', className: 'wbtn' + (kind ? ' ' + kind : ''), onClick, disabled, title }, children);

  // label is TeX; value a string or number
  function Stat({ label, value, eq, tone, sub }) {
    const lit = useEq() === eq && !!eq;
    return h('div', Object.assign({ className: 'wstat' + (tone ? ' ' + tone : '') + (lit ? ' lit' : ''),
                                    tabIndex: eq ? 0 : undefined }, eqBind(eq)),
      h('div', { className: 'wstat-l' }, h(Tex, { src: label })),
      h('div', { className: 'wstat-v' }, typeof value === 'number' ? fmt(value, 3) : value),
      sub ? h('div', { className: 'wstat-s' }, sub) : null);
  }

  const Row = ({ children, cls }) => h('div', { className: 'wrow' + (cls ? ' ' + cls : '') }, children);
  const Panel = ({ children, title }) => h('div', { className: 'wpanel' },
    title ? h('div', { className: 'wpanel-t' }, title) : null, children);
  const Legend = ({ items }) => h('div', { className: 'wlegend' },
    items.map((it, i) => h('span', { key: i, className: 'wkey', style: { '--k': it.color } },
      h('i', { className: it.kind || 'line' }), it.label)));

  window.UI = {
    KATEX, Tex, EQ, useEq, eqBind,
    useColors, hexRgb, mix, useWidth, useSeed,
    ticks, fmt, Plot, linePath, bandPath, Heatmap,
    Slider, Seg, Toggle, Btn, Stat, Row, Panel, Legend
  };
})();
