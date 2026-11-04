/**
 * Tide harmonic predictor (PLAN 3.1). Pure, no DOM. Heights in metres, times as Unix ms (UTC).
 *
 * The tide is a sum of constituents (DESIGN.md §3):
 *
 *   η(t) = Z0 + Σ_j f_j(t) · H_j · cos( V_j(t) + u_j(t) − g_j )
 *
 *   H_j, g_j   amplitude (m) and Greenwich phase lag (deg) of constituent j at the station
 *   V_j(t)     equilibrium argument: Doodson numbers × the astronomical angles below
 *   f_j, u_j   nodal amplitude factor and phase correction (18.61-year lunar node cycle)
 *
 * Astronomical angles from Meeus, Astronomical Algorithms (2nd ed.) ch. 22/47, mean elements.
 * Doodson numbers and phase offsets follow Foreman (1977, IOS Manual 77-10) / Pugh &
 * Woodworth (2014, Sea-Level Science, tables 4.1–4.3). Nodal factors use Pugh & Woodworth's
 * table 4.3 series in N; compound tides take products of their parents' factors.
 * Accuracy: ±1 % in f and ±0.5° in u for the main constituents, ample for a microtidal coast.
 */

const RAD = Math.PI / 180;
const MS_PER_HOUR = 3_600_000;
/** Unix ms of J2000.0 (2000-01-01 12:00 TT ≈ UTC for tides). */
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_CENTURY = 36525 * 86_400_000;

/** Mean astronomical angles in degrees (not reduced to 0..360). */
export interface Astro {
  /** Mean lunar time, τ = T + h − s, with T = 15°·UT hours + 180°. */
  tau: number;
  /** Mean longitude of the Moon. */
  s: number;
  /** Mean longitude of the Sun. */
  h: number;
  /** Longitude of the Moon's perigee. */
  p: number;
  /** Longitude of the Moon's ascending node. */
  N: number;
  /** Longitude of the Sun's perihelion. */
  p1: number;
}

export function astro(tMs: number): Astro {
  const T = (tMs - J2000_MS) / MS_PER_CENTURY;
  const s = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const h = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const p = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T;
  const N = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  const p1 = 282.93768 + 1.7195366 * T + 0.00045688 * T * T;
  const utHours = (((tMs / MS_PER_HOUR) % 24) + 24) % 24;
  const tau = 15 * utHours + 180 + h - s;
  return { tau, s, h, p, N, p1 };
}

type NodalKind = 'none' | 'M2' | 'K1' | 'O1' | 'K2' | 'J1' | 'OO1' | 'Mm' | 'Mf';

/** Nodal factor f and phase correction u (deg) for the base groups, from N (deg). */
function nodalBase(kind: NodalKind, N: number): [number, number] {
  const n = N * RAD;
  const c1 = Math.cos(n), c2 = Math.cos(2 * n), c3 = Math.cos(3 * n);
  const s1 = Math.sin(n), s2 = Math.sin(2 * n), s3 = Math.sin(3 * n);
  switch (kind) {
    case 'none': return [1, 0];
    case 'M2': return [1.0004 - 0.0373 * c1 + 0.0002 * c2, -2.14 * s1];
    case 'K1': return [1.006 + 0.115 * c1 - 0.0088 * c2 + 0.0006 * c3, -8.86 * s1 + 0.68 * s2 - 0.07 * s3];
    case 'O1': return [1.0089 + 0.1871 * c1 - 0.0147 * c2 + 0.0014 * c3, 10.8 * s1 - 1.34 * s2 + 0.19 * s3];
    case 'K2': return [1.0241 + 0.2863 * c1 + 0.0083 * c2 - 0.0015 * c3, -17.74 * s1 + 0.68 * s2 - 0.04 * s3];
    case 'J1': return [1.0129 + 0.1676 * c1 - 0.017 * c2 + 0.0016 * c3, -12.94 * s1 + 1.34 * s2 - 0.19 * s3];
    case 'OO1': return [1.1027 + 0.6504 * c1 + 0.0317 * c2 - 0.0014 * c3, -36.68 * s1 + 4.02 * s2 - 0.57 * s3];
    case 'Mm': return [1 - 0.13 * c1 + 0.0013 * c2, 0];
    case 'Mf': return [1.0429 + 0.4135 * c1 - 0.004 * c2, -23.74 * s1 + 2.68 * s2 - 0.38 * s3];
  }
}

interface ConstituentDef {
  /** Doodson multipliers of τ, s, h, p, N′ (= −N), p1. */
  d: [number, number, number, number, number, number];
  /** Phase offset in degrees (multiples of 90°). */
  phase: number;
  /** Nodal correction: products of base groups with integer powers, e.g. M4 = M2². */
  nodal: [NodalKind, number][];
}

/**
 * The constituents we support. Diurnal, semidiurnal, the seasonal Sa/Ssa (large in the
 * Caribbean, mostly steric) and the shallow-water overtides that show up at Limón.
 */
export const CONSTITUENTS = {
  Sa: { d: [0, 0, 1, 0, 0, 0], phase: 0, nodal: [] },
  Ssa: { d: [0, 0, 2, 0, 0, 0], phase: 0, nodal: [] },
  Mm: { d: [0, 1, 0, -1, 0, 0], phase: 0, nodal: [['Mm', 1]] },
  MSf: { d: [0, 2, -2, 0, 0, 0], phase: 0, nodal: [['M2', 1]] },
  Mf: { d: [0, 2, 0, 0, 0, 0], phase: 0, nodal: [['Mf', 1]] },
  '2Q1': { d: [1, -3, 0, 2, 0, 0], phase: -90, nodal: [['O1', 1]] },
  Q1: { d: [1, -2, 0, 1, 0, 0], phase: -90, nodal: [['O1', 1]] },
  RHO1: { d: [1, -2, 2, -1, 0, 0], phase: -90, nodal: [['O1', 1]] },
  O1: { d: [1, -1, 0, 0, 0, 0], phase: -90, nodal: [['O1', 1]] },
  P1: { d: [1, 1, -2, 0, 0, 0], phase: -90, nodal: [] },
  S1: { d: [1, 1, -1, 0, 0, 0], phase: 180, nodal: [] },
  K1: { d: [1, 1, 0, 0, 0, 0], phase: 90, nodal: [['K1', 1]] },
  J1: { d: [1, 2, 0, -1, 0, 0], phase: 90, nodal: [['J1', 1]] },
  OO1: { d: [1, 3, 0, 0, 0, 0], phase: 90, nodal: [['OO1', 1]] },
  '2N2': { d: [2, -2, 0, 2, 0, 0], phase: 0, nodal: [['M2', 1]] },
  MU2: { d: [2, -2, 2, 0, 0, 0], phase: 0, nodal: [['M2', 1]] },
  N2: { d: [2, -1, 0, 1, 0, 0], phase: 0, nodal: [['M2', 1]] },
  NU2: { d: [2, -1, 2, -1, 0, 0], phase: 0, nodal: [['M2', 1]] },
  M2: { d: [2, 0, 0, 0, 0, 0], phase: 0, nodal: [['M2', 1]] },
  L2: { d: [2, 1, 0, -1, 0, 0], phase: 180, nodal: [['M2', 1]] },
  T2: { d: [2, 2, -3, 0, 0, 1], phase: 0, nodal: [] },
  S2: { d: [2, 2, -2, 0, 0, 0], phase: 0, nodal: [] },
  K2: { d: [2, 2, 0, 0, 0, 0], phase: 0, nodal: [['K2', 1]] },
  MK3: { d: [3, 1, 0, 0, 0, 0], phase: 90, nodal: [['M2', 1], ['K1', 1]] },
  M3: { d: [3, 0, 0, 0, 0, 0], phase: 180, nodal: [['M2', 1.5]] },
  MN4: { d: [4, -1, 0, 1, 0, 0], phase: 0, nodal: [['M2', 2]] },
  M4: { d: [4, 0, 0, 0, 0, 0], phase: 0, nodal: [['M2', 2]] },
  MS4: { d: [4, 2, -2, 0, 0, 0], phase: 0, nodal: [['M2', 1]] },
  M6: { d: [6, 0, 0, 0, 0, 0], phase: 0, nodal: [['M2', 3]] },
} satisfies Record<string, ConstituentDef>;

export type ConstituentName = keyof typeof CONSTITUENTS;
export const CONSTITUENT_NAMES = Object.keys(CONSTITUENTS) as ConstituentName[];

/** Angular speeds of τ, s, h, p, N′, p1 in degrees per hour (Doodson). */
const SPEEDS = [14.4920521, 0.5490165, 0.0410686, 0.0046418, 0.0022064, 0.0000020];

/** Angular speed in degrees per hour, e.g. M2 → 28.984. */
export function speed(name: ConstituentName): number {
  const d = CONSTITUENTS[name].d;
  return d.reduce((a, k, i) => a + k * SPEEDS[i], 0);
}

/** Equilibrium argument V (deg), nodal factor f and correction u (deg) at time t. */
export function argument(name: ConstituentName, a: Astro): { V: number; f: number; u: number } {
  const c: ConstituentDef = CONSTITUENTS[name];
  const [i1, i2, i3, i4, i5, i6] = c.d;
  const V = i1 * a.tau + i2 * a.s + i3 * a.h + i4 * a.p - i5 * a.N + i6 * a.p1 + c.phase;
  let f = 1;
  let u = 0;
  for (const [kind, pow] of c.nodal) {
    const [fb, ub] = nodalBase(kind, a.N);
    f *= fb ** pow;
    u += ub * pow;
  }
  return { V, f, u };
}

/** One station's harmonic constants. */
export interface Harmonics {
  /** Mean sea level over the fit, metres above the reference datum. */
  z0: number;
  /** Amplitude H (m) and Greenwich phase lag g (deg) per constituent. */
  constituents: Partial<Record<ConstituentName, { H: number; g: number }>>;
}

/** Tide height (m above the harmonics' datum) at time t. */
export function predict(hc: Harmonics, tMs: number): number {
  const a = astro(tMs);
  let eta = hc.z0;
  for (const name in hc.constituents) {
    const k = hc.constituents[name as ConstituentName]!;
    const { V, f, u } = argument(name as ConstituentName, a);
    eta += f * k.H * Math.cos((V + u - k.g) * RAD);
  }
  return eta;
}

/**
 * Tide height in metres above the harmonics' datum (mean sea level for Limón) at t, plus a correction in metres
 * (the live gauge's, physics/tide-fix.ts). This is what adds to a chart depth; `tideState().level` is only the
 * position within the cycle (0..1) and must never be added to a depth.
 */
export function tideHeightM(hc: Harmonics, tMs: number, fixM = 0): number {
  return predict(hc, tMs) + (Number.isFinite(fixM) ? fixM : 0);
}

/** Heights every `stepMs` from t0 (inclusive) to t1 (inclusive). */
export function predictSeries(hc: Harmonics, t0: number, t1: number, stepMs: number): { t: number[]; h: number[] } {
  const t: number[] = [];
  const h: number[] = [];
  for (let x = t0; x <= t1; x += stepMs) {
    t.push(x);
    h.push(predict(hc, x));
  }
  return { t, h };
}

export interface Extremum { t: number; h: number; type: 'high' | 'low' }

/**
 * High and low waters between t0 and t1: scan at `stepMs`, then refine each turning point
 * by golden-section search to about a minute. Turns smaller than `minRange` (m) from the
 * previous kept one are dropped, so tiny shallow-water wiggles near a stand don't show as
 * extra tides.
 */
export function extrema(hc: Harmonics, t0: number, t1: number, stepMs = 10 * 60_000, minRange = 0.005): Extremum[] {
  const out: Extremum[] = [];
  let tPrev = t0 - stepMs;
  let hPrev = predict(hc, tPrev);
  let hCur = predict(hc, t0);
  for (let t = t0; t <= t1; t += stepMs) {
    const tNext = t + stepMs;
    const hNext = predict(hc, tNext);
    const isMax = hCur > hPrev && hCur >= hNext;
    const isMin = hCur < hPrev && hCur <= hNext;
    if (isMax || isMin) {
      const e = refine(hc, t - stepMs, t + stepMs, isMax);
      if (e.t >= t0 && e.t <= t1) {
        const last = out[out.length - 1];
        const type = isMax ? 'high' : 'low';
        if (last && Math.abs(e.h - last.h) < minRange) {
          // Too small a swing: drop the pair's earlier member if it was the opposite type.
          if (last.type !== type) out.pop();
        } else if (last && last.type === type) {
          // Two highs (or lows) in a row after dropping a wiggle: keep the more extreme.
          if ((isMax && e.h > last.h) || (!isMax && e.h < last.h)) out[out.length - 1] = { ...e, type };
        } else out.push({ ...e, type });
      }
    }
    tPrev = t;
    hPrev = hCur;
    hCur = hNext;
  }
  return out;
}

function refine(hc: Harmonics, a: number, b: number, max: boolean): { t: number; h: number } {
  const sign = max ? -1 : 1;
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = sign * predict(hc, c);
  let fd = sign * predict(hc, d);
  while (b - a > 30_000) {
    if (fc < fd) {
      b = d; d = c; fd = fc; c = b - g * (b - a); fc = sign * predict(hc, c);
    } else {
      a = c; c = d; fc = fd; d = a + g * (b - a); fd = sign * predict(hc, d);
    }
  }
  const t = (a + b) / 2;
  return { t, h: predict(hc, t) };
}

export interface TideState {
  /** Height now, m above datum. */
  h: number;
  /** Rate of change, m/h (positive = rising / flooding). */
  rate: number;
  rising: boolean;
  /** The low and high water bracketing t (previous and next turning points). */
  prev: Extremum;
  next: Extremum;
  /**
   * Where t sits between the bracketing low and high, by height: 0 at low water, 1 at high
   * water. Used by the rip score (3.5): low tide over bars is the worst.
   */
  level: number;
}

/** Height, trend and position in the current tide cycle at t. */
export function tideState(hc: Harmonics, tMs: number): TideState {
  const span = 16 * MS_PER_HOUR;
  const ex = extrema(hc, tMs - span, tMs + span);
  let prev = ex[0];
  let next = ex[ex.length - 1];
  for (const e of ex) {
    if (e.t <= tMs) prev = e;
    else { next = e; break; }
  }
  const h = predict(hc, tMs);
  const dt = 5 * 60_000;
  const rate = ((predict(hc, tMs + dt) - predict(hc, tMs - dt)) / (2 * dt)) * MS_PER_HOUR;
  const lo = Math.min(prev.h, next.h);
  const hi = Math.max(prev.h, next.h);
  const level = hi - lo > 1e-6 ? Math.min(1, Math.max(0, (h - lo) / (hi - lo))) : 0.5;
  return { h, rate, rising: rate > 0, prev, next, level };
}

/**
 * Least-squares harmonic analysis: fit H and g for `names` (plus Z0) to observed heights.
 * Model is the predictor's own, so nodal factors are applied per sample and any record
 * length works; constituents closer in speed than the Rayleigh criterion (1 cycle per
 * record length) can't be separated, so pick `names` to suit the record.
 * Solves the normal equations by Cholesky decomposition.
 */
export function fitHarmonics(t: ArrayLike<number>, h: ArrayLike<number>, names: readonly ConstituentName[]): Harmonics & { rms: number } {
  const m = 1 + 2 * names.length;
  const AtA = new Float64Array(m * m);
  const Atb = new Float64Array(m);
  const row = new Float64Array(m);
  for (let i = 0; i < t.length; i++) {
    if (!Number.isFinite(h[i])) continue;
    const a = astro(t[i]);
    row[0] = 1;
    names.forEach((n, j) => {
      const { V, f, u } = argument(n, a);
      const x = (V + u) * RAD;
      // f·H·cos(x − g) = f·cos x · (H cos g) + f·sin x · (H sin g)
      row[1 + 2 * j] = f * Math.cos(x);
      row[2 + 2 * j] = f * Math.sin(x);
    });
    for (let r = 0; r < m; r++) {
      Atb[r] += row[r] * h[i];
      for (let c = 0; c <= r; c++) AtA[r * m + c] += row[r] * row[c];
    }
  }
  const x = choleskySolve(AtA, Atb, m);
  const constituents: Harmonics['constituents'] = {};
  names.forEach((n, j) => {
    const A = x[1 + 2 * j];
    const B = x[2 + 2 * j];
    constituents[n] = { H: Math.hypot(A, B), g: (((Math.atan2(B, A) / RAD) % 360) + 360) % 360 };
  });
  const hc: Harmonics = { z0: x[0], constituents };
  let ss = 0;
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    if (!Number.isFinite(h[i])) continue;
    ss += (h[i] - predict(hc, t[i])) ** 2;
    n++;
  }
  return { ...hc, rms: Math.sqrt(ss / Math.max(n, 1)) };
}

/** Solve A x = b for symmetric positive-definite A (lower triangle filled), size m. */
function choleskySolve(A: Float64Array, b: Float64Array, m: number): Float64Array {
  const L = new Float64Array(m * m);
  for (let i = 0; i < m; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i * m + j];
      for (let k = 0; k < j; k++) s -= L[i * m + k] * L[j * m + k];
      if (i === j) {
        if (!(s > 1e-12 * A[i * m + i])) throw new Error('fitHarmonics: normal matrix not positive definite (constituents not separable with this record)');
        L[i * m + i] = Math.sqrt(s);
      } else L[i * m + j] = s / L[j * m + j];
    }
  const y = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * m + k] * y[k];
    y[i] = s / L[i * m + i];
  }
  const x = new Float64Array(m);
  for (let i = m - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < m; k++) s -= L[k * m + i] * x[k];
    x[i] = s / L[i * m + i];
  }
  return x;
}

/** Root-mean-square difference between predicted and observed heights (NaNs skipped). */
export function rmsError(hc: Harmonics, t: ArrayLike<number>, h: ArrayLike<number>): number {
  let ss = 0;
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    if (!Number.isFinite(h[i])) continue;
    ss += (h[i] - predict(hc, t[i])) ** 2;
    n++;
  }
  return Math.sqrt(ss / Math.max(n, 1));
}
