/**
 * Water clarity a few days ahead, with a confidence band (PLAN 7.2). Extends physics/clarity.ts
 * (PLAN 6.1), which adds three attenuation terms, Kd = satellite + river plume + resuspension.
 * This module forecasts each term past the newest data and says how far to trust it. Pure, SI
 * units apart from days for satellite trends, no DOM.
 *
 * 1. Satellite term (rebuilt in PLAN 7.45). The satellite says how murky the water was on the day of
 *    its newest map, not today; GlobColour's Kd490 runs about a day late, NOAA's about 10 (PLAN 7.47). So the term is the
 *    cell's clear-water baseline for the time of year (clarity-baseline.ts), plus what the newest map
 *    adds to it, but only while that map is fresh and only for the murk the model's own causes
 *    (plume and bed stirring on that day) don't already explain, so a flood or a swell is not counted twice:
 *      a = Kd_map − Kd_clear,   r = max(0, a − causes(t_map)) if a > 0, else a
 *      Kd_sat(t) = max(KD_WATER, Kd_clear + w(L)·r),   w(L) = exp(−L / SAT_FRESH_TAU_D), 0 past SAT_MAX_AGE_D
 *    with L the map's age in days at t. Coastal ocean-colour anomalies last a few days. Past
 *    SAT_MAX_AGE_D the map says nothing about today, and the term is the baseline alone. Its ln-space
 *    1σ moves from the retrieval error (fresh map) to the cell's own spread for the month,
 *    ln(median / clear):  σ² = w²·SIGMA_RETRIEVAL² + (1 − w²)·σ_clear².
 *    Without a baseline (file missing) the anchor is the median of the recent maps, as before.
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
/** E-folding time of a satellite anomaly, days. */
export const SAT_FRESH_TAU_D = 2;
/** Maps older than this, days, no longer count. */
export const SAT_MAX_AGE_D = 6;
/** Pure seawater Kd490, 1/m (Morel et al. 2007): no water is clearer. */
export const KD_WATER = 0.0166;
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
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const spread = xs.length >= 3 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1)) : SIGMA_CELL_DEFAULT;
  return { median, last, lastMs, spread };
}

/** Weight of a satellite map `ageD` days old against the baseline: 1 when new, 0 past SAT_MAX_AGE_D. */
export const satWeight = (ageD: number) => (ageD >= SAT_MAX_AGE_D ? 0 : Math.exp(-Math.max(0, ageD) / SAT_FRESH_TAU_D));

/** A cell's clear-water baseline for the time of year: the clear state and the usual (median) state, 1/m. */
export interface ClearKd {
  kd: number;
  med: number;
}

/**
 * Satellite Kd at `ms` (1/m) and its ln-space 1σ. `clear`: the cell's baseline (null: none, anchor on
 * the recent median). `causesAtMap`: the model's plume plus bed-stirring Kd at the point on the day of
 * the newest map, 1/m (what the map's murk is already explained by). Causes only explain murk: they take
 * a map's excess over the baseline down to zero at most, and leave a map clearer than the baseline as it is
 * (PLAN 7.49). Subtracting them past zero read 55 m at Playa Cocles on 2026-11-10, the bed stirring the
 * model gave a 2 m deep point on the map day pushing the term down to pure water, though the 4 km pixel's
 * water was never stirred like that.
 */
export function satKdAt(s: SatState | null, ms: number, clear: ClearKd | null = null, causesAtMap = 0): { kd: number; sigma: number } {
  const ok = clear && clear.kd > 0 && Number.isFinite(clear.kd);
  const sigmaClear = ok && clear.med > clear.kd ? Math.log(clear.med / clear.kd) : s ? s.spread : SIGMA_CELL_DEFAULT;
  if (!s) return { kd: ok ? clear.kd : KD_BACKGROUND, sigma: sigmaClear };
  const anchor = ok ? clear.kd : Math.exp(s.median);
  const w = satWeight((ms - s.lastMs) / DAY_MS);
  const a = Math.exp(s.last) - anchor;
  const r = a > 0 ? Math.max(0, a - Math.max(0, causesAtMap)) : a;
  const kd = Math.max(KD_WATER, anchor + w * r);
  const sigma = Math.sqrt(w * w * SIGMA_RETRIEVAL ** 2 + (1 - w * w) * sigmaClear ** 2);
  return { kd, sigma };
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

/** Where along the segment (0,0)–(dx, dy) the nearest point to (px, py) lies, 0 (mouth) to 1 (tip). */
export function segmentFraction(px: number, py: number, dx: number, dy: number): number {
  const len2 = dx * dx + dy * dy;
  return len2 > 0 ? Math.min(1, Math.max(0, (px * dx + py * dy) / len2)) : 0;
}

/** Distance, m, from point (px, py) to the segment (0,0)–(dx, dy), all in metres. */
export function distToSegment(px: number, py: number, dx: number, dy: number): number {
  const u = segmentFraction(px, py, dx, dy);
  return Math.hypot(px - u * dx, py - u * dy);
}

/** E-folding time of plume water once it has left the mouth (mixing and settling), s. */
export const PLUME_DILUTE_S = 24 * 3600;

/**
 * Plume Kd at a point (pxM, pyM east and north of the mouth) for a plume drifted by (dx, dy). Water
 * a fraction u of the way to the tip left the mouth u·ageS ago, so it has thinned by
 * exp(−u·ageS / PLUME_DILUTE_S) (PLAN 7.45): the tip of a day-old plume carries about a third of the
 * mouth's murk, where it used to carry all of it the whole 30 km. `ageS` 0 keeps the old uniform plume.
 */
export const driftedPlumeKd = (catchmentKm2: number, rainMm: number, pxM: number, pyM: number, drift: readonly [number, number], ageS = 0) =>
  plumeKd(catchmentKm2, rainMm, distToSegment(pxM, pyM, drift[0], drift[1])) *
  Math.exp(-(segmentFraction(pxM, pyM, drift[0], drift[1]) * Math.max(0, ageS)) / PLUME_DILUTE_S);

export interface BandInputs {
  /** Satellite Kd490 forecast and its ln-space σ. */
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
  const sat = i.sat.kd;
  const kd = sat + plume + i.res.mid;
  const kdLo = sat * Math.exp(-i.sat.sigma) + plume / pf + i.res.lo;
  const kdHi = sat * Math.exp(i.sat.sigma) + plume * pf + i.res.hi;
  const visM = secchiFromKd(kd);
  const visLo = secchiFromKd(kdHi);
  const visHi = secchiFromKd(kdLo);
  const ratio = visHi / visLo;
  return { kd, visM, visLo, visHi, confidence: ratio < 2 ? 'HIGH' : ratio < 3.5 ? 'MED' : 'LOW' };
}
