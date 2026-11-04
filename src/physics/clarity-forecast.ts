/**
 * Water clarity a few days ahead, with a confidence band (PLAN 7.2). Extends physics/clarity.ts
 * (PLAN 6.1), which adds three attenuation terms, Kd = satellite + river plume + resuspension.
 * This module forecasts each term past the newest data and says how far to trust it. Pure, SI
 * units apart from days for satellite trends, no DOM.
 *
 * 1. Satellite term. Ocean-colour maps arrive daily but days late (the gap-filled Kd490 runs
 *    about a week behind). Work in ln Kd, where retrieval errors and natural changes are roughly
 *    symmetric. From the cell's recent days, take the median (its usual state), the newest value
 *    and the trend over the last three days. Ahead of the newest map, the trend carries on for at
 *    most TREND_MAX_D days and the departure from the median then fades with e-folding time
 *    TAU_SAT_D (anomalies in coastal ocean colour last a few days):
 *      x(L) = median + (x_last + s·min(L, TREND_MAX_D) − median)·exp(−L / TAU_SAT_D)
 *    Its 1σ spread grows from the retrieval error to the cell's own day-to-day spread:
 *      σ(L)² = SIGMA_RETRIEVAL² + σ_cell²·(1 − exp(−2L / TAU_SAT_D))
 * 2. River plume transport. A plume is carried along the coast by the surface current. Its tip is
 *    the mouth plus the mean current over the plume's rain-weighted age times that age, capped at
 *    PLUME_MAX_DRIFT_M; the plume is the Gaussian of physics/clarity.ts around the segment from
 *    the mouth to the tip, so it smears down-current instead of sitting as a disc at the mouth.
 * 3. Band. The plume and resuspension constants are rules of thumb (factor PLUME_FACTOR either
 *    way), forecast rain gets worse with lead time, and wave height is uncertain by
 *    WAVE_REL_ERR plus WAVE_REL_ERR_PER_DAY per day. Low Kd adds the low ends, high Kd the
 *    high ends, so the band is roughly the 1σ (68%) range of visibility.
 *
 * Not fitted: there are no local dive logs or turbidity records to calibrate against yet.
 */
import { plumeKd, secchiFromKd, KD_BACKGROUND } from './clarity';

const DAY_MS = 864e5;
export const TAU_SAT_D = 3;
export const TREND_MAX_D = 2;
/** ln-space retrieval error of satellite Kd490 in coastal water (about ±30%). */
export const SIGMA_RETRIEVAL = 0.3;
/** Day-to-day spread to assume where a cell has fewer than three days. */
export const SIGMA_CELL_DEFAULT = 0.4;
export const PLUME_FACTOR = 2;
/** Extra plume uncertainty per day of forecast lead (rain forecasts lose skill fast). */
export const PLUME_FACTOR_PER_DAY = 0.5;
export const WAVE_REL_ERR = 0.15;
export const WAVE_REL_ERR_PER_DAY = 0.05;
export const PLUME_MAX_DRIFT_M = 30_000;

/** A cell's satellite history, reduced to what the forecast needs (ln Kd). */
export interface SatState {
  median: number;
  last: number;
  lastMs: number;
  /** ln Kd per day over the last three days (0 with fewer). */
  slope: number;
  /** Day-to-day spread of ln Kd. */
  spread: number;
}

/** From daily (time, Kd) pairs, oldest first; non-finite or non-positive Kd skipped. Null with none. */
export function satState(times: readonly number[], kd: readonly number[]): SatState | null {
  const pts: [number, number][] = [];
  for (let i = 0; i < times.length; i++) if (kd[i] > 0 && Number.isFinite(kd[i])) pts.push([times[i], Math.log(kd[i])]);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[1]).sort((a, b) => a - b);
  const m = xs.length >> 1;
  const median = xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
  const [lastMs, last] = pts[pts.length - 1];
  // Least-squares slope over the last three days.
  const tail = pts.slice(-3);
  let slope = 0;
  if (tail.length >= 2) {
    const tm = tail.reduce((s, p) => s + p[0], 0) / tail.length;
    const xm = tail.reduce((s, p) => s + p[1], 0) / tail.length;
    let num = 0;
    let den = 0;
    for (const [t, x] of tail) (num += (t - tm) * (x - xm)), (den += (t - tm) ** 2);
    slope = den > 0 ? (num / den) * DAY_MS : 0;
  }
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const spread = xs.length >= 3 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1)) : SIGMA_CELL_DEFAULT;
  return { median, last, lastMs, slope, spread };
}

/** Satellite Kd at `ms` (1/m) and its ln-space 1σ. Up to the newest map it is that map's value. */
export function satKdAt(s: SatState | null, ms: number): { kd: number; sigma: number } {
  if (!s) return { kd: KD_BACKGROUND, sigma: SIGMA_CELL_DEFAULT };
  const L = Math.max(0, (ms - s.lastMs) / DAY_MS);
  const decay = Math.exp(-L / TAU_SAT_D);
  const x = s.median + (s.last + s.slope * Math.min(L, TREND_MAX_D) - s.median) * decay;
  const sigma = Math.sqrt(SIGMA_RETRIEVAL ** 2 + s.spread ** 2 * (1 - Math.exp((-2 * L) / TAU_SAT_D)));
  return { kd: Math.exp(x), sigma };
}

/**
 * Rain-weighted mean age of a plume at `ms`, s, with the same weights as `effectiveRain`
 * (exp(−age / decayS)); 0 with no rain.
 */
export function plumeAge(times: readonly number[], rainMmH: readonly number[], ms: number, decayS = 24 * 3600): number {
  let w = 0;
  let wa = 0;
  for (let i = 0; i < times.length; i++) {
    const age = (ms - times[i]) / 1000;
    if (age < 0 || age > 5 * decayS || !(rainMmH[i] > 0)) continue;
    const k = rainMmH[i] * Math.exp(-age / decayS);
    w += k;
    wa += k * age;
  }
  return w > 0 ? wa / w : 0;
}

/**
 * Plume tip offset from the mouth, metres east and north: mean surface current (m/s, east and
 * north) over the plume's age, times that age, capped at PLUME_MAX_DRIFT_M.
 */
export function plumeDrift(ageS: number, meanCurrent: readonly [number, number] | null): [number, number] {
  if (!meanCurrent || !(ageS > 0)) return [0, 0];
  let dx = meanCurrent[0] * ageS;
  let dy = meanCurrent[1] * ageS;
  const d = Math.hypot(dx, dy);
  if (d > PLUME_MAX_DRIFT_M) (dx *= PLUME_MAX_DRIFT_M / d), (dy *= PLUME_MAX_DRIFT_M / d);
  return [dx, dy];
}

/** Distance, m, from point (px, py) to the segment (0,0)–(dx, dy), all in metres. */
export function distToSegment(px: number, py: number, dx: number, dy: number): number {
  const len2 = dx * dx + dy * dy;
  const u = len2 > 0 ? Math.min(1, Math.max(0, (px * dx + py * dy) / len2)) : 0;
  return Math.hypot(px - u * dx, py - u * dy);
}

/** Plume Kd at a point (pxM, pyM east and north of the mouth) for a plume drifted by (dx, dy). */
export const driftedPlumeKd = (catchmentKm2: number, rainMm: number, pxM: number, pyM: number, drift: readonly [number, number]) =>
  plumeKd(catchmentKm2, rainMm, distToSegment(pxM, pyM, drift[0], drift[1]));

export interface BandInputs {
  /** Satellite Kd forecast and its ln-space σ. */
  sat: { kd: number; sigma: number };
  plumeKd: number;
  /** Resuspension Kd for the wave height scaled down and up by the wave error. */
  res: { lo: number; mid: number; hi: number };
  /** Forecast lead, days (0 for now or the past). */
  leadDays: number;
}

export type Confidence = 'HIGH' | 'MED' | 'LOW';

export interface ClarityBand {
  kd: number;
  visM: number;
  /** Visibility range, m (low from the high Kd end). */
  visLo: number;
  visHi: number;
  confidence: Confidence;
}

/** Wave-height factors for the resuspension band at a lead time. */
export const waveSpread = (leadDays: number) => WAVE_REL_ERR + WAVE_REL_ERR_PER_DAY * Math.max(0, leadDays);

export function clarityBand(i: BandInputs): ClarityBand {
  const pf = PLUME_FACTOR + PLUME_FACTOR_PER_DAY * Math.max(0, i.leadDays);
  const plume = Math.max(0, i.plumeKd);
  const kd = i.sat.kd + plume + i.res.mid;
  const kdLo = i.sat.kd * Math.exp(-i.sat.sigma) + plume / pf + i.res.lo;
  const kdHi = i.sat.kd * Math.exp(i.sat.sigma) + plume * pf + i.res.hi;
  const visM = secchiFromKd(kd);
  const visLo = secchiFromKd(kdHi);
  const visHi = secchiFromKd(kdLo);
  const ratio = visHi / visLo;
  return { kd, visM, visLo, visHi, confidence: ratio < 2 ? 'HIGH' : ratio < 3.5 ? 'MED' : 'LOW' };
}
