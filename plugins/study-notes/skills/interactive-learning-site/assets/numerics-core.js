/* ==========================================================================
   Core numerics for widgets. Exposes NUM.

   One UMD file, three hosts: the page (window.NUM), a Web Worker
   (importScripts) and node's test runner (require). No dependencies.
   Matrices are plain arrays of rows: sizes are at most a few hundred, and
   readable beats fast. Add topic-specific functions below the core and
   mirror each one in the companion scripts, so tests can compare the two.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ---------- seeded randomness ------------------------------------------ */
  /* mulberry32: a 32-bit generator, plenty for drawing pictures. Same seed,
     same picture, on every device.                                         */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Box–Muller: two uniforms in, two independent standard normals out. The
     second is kept for the next call.                                       */
  function normalGen(rand) {
    let spare = null;
    return function () {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u = 0;
      while (u === 0) u = rand();            // log(0) is -inf
      const v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }

  function randn(seed, n) {
    const g = normalGen(mulberry32(seed));
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = g();
    return out;
  }

  /* ---------- small dense linear algebra --------------------------------- */
  const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  const eye = n => { const I = zeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  const transpose = A => A[0].map((_, j) => A.map(row => row[j]));

  function matmul(A, B) {
    const n = A.length, m = B[0].length, k = B.length;
    const C = zeros(n, m);
    for (let i = 0; i < n; i++)
      for (let p = 0; p < k; p++) {
        const a = A[i][p];
        if (a === 0) continue;
        for (let j = 0; j < m; j++) C[i][j] += a * B[p][j];
      }
    return C;
  }

  const matvec = (A, x) => A.map(row => row.reduce((s, a, j) => s + a * x[j], 0));
  const dot = (x, y) => x.reduce((s, a, i) => s + a * y[i], 0);

  /* Cholesky: A = L Lᵀ with L lower-triangular. Throws if A is not (numerically)
     positive definite -- choleskyJitter below is what callers normally want.  */
  function cholesky(A) {
    const n = A.length, L = zeros(n, n);
    for (let j = 0; j < n; j++) {
      let s = A[j][j];
      for (let k = 0; k < j; k++) s -= L[j][k] * L[j][k];
      if (!(s > 0)) throw new Error('cholesky: not positive definite at ' + j);
      const d = Math.sqrt(s);
      L[j][j] = d;
      for (let i = j + 1; i < n; i++) {
        let t = A[i][j];
        for (let k = 0; k < j; k++) t -= L[i][k] * L[j][k];
        L[i][j] = t / d;
      }
    }
    return L;
  }

  /* Add a tiny multiple of the identity until the factorisation succeeds.
     Kernel matrices on close-together inputs are singular in exact arithmetic
     and indefinite in floating point; 1e-10 of jitter is invisible in a plot. */
  function choleskyJitter(A, start = 1e-10, tries = 8) {
    try { return { L: cholesky(A), jitter: 0 }; } catch (e) { /* add jitter */ }
    const scale = Math.max(1e-12, A.reduce((s, r, i) => s + r[i], 0) / A.length);
    let j = start * scale;
    for (let t = 0; t < tries; t++, j *= 10) {
      const Aj = A.map((r, i) => r.map((v, k) => (i === k ? v + j : v)));
      try { return { L: cholesky(Aj), jitter: j }; } catch (e) { /* more */ }
    }
    throw new Error('cholesky: failed even with jitter ' + j);
  }

  /* L x = b (forward) and Lᵀ x = b (back). b may be a vector or a matrix of
     column right-hand sides.                                                */
  function solveLower(L, b) {
    if (Array.isArray(b[0])) return transpose(transpose(b).map(col => solveLower(L, col)));
    const n = L.length, x = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }

  function solveLowerT(L, b) {
    if (Array.isArray(b[0])) return transpose(transpose(b).map(col => solveLowerT(L, col)));
    const n = L.length, x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }

  /* A⁻¹ b from the Cholesky factor of A: two triangular solves, no inverse. */
  const choSolve = (L, b) => solveLowerT(L, solveLower(L, b));

  /* log|A| = 2 Σ log Lᵢᵢ */
  const logdetChol = L => 2 * L.reduce((s, r, i) => s + Math.log(r[i]), 0);

  /* log Σ exp(xᵢ) without overflow: pull the largest term out first. */
  function logsumexp(xs) {
    const m = Math.max(...xs);
    if (m === -Infinity) return -Infinity;
    return m + Math.log(xs.reduce((s, x) => s + Math.exp(x - m), 0));
  }

  const NUM = { mulberry32, normalGen, randn, zeros, eye, transpose, matmul, matvec, dot,
                cholesky, choleskyJitter, solveLower, solveLowerT, choSolve, logdetChol, logsumexp };
  if (typeof module !== 'undefined' && module.exports) module.exports = NUM;
  else root.NUM = NUM;
})(typeof self !== 'undefined' ? self : this);
