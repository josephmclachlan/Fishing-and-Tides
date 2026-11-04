/**
 * Water term for the BITE score and BEST SPOTS (PLAN 7.11): does the water at a place suit the
 * species? Pure: no DOM, SI-ish units (m, °C, mg/m³). Rules of thumb from angling guides, NOT
 * fitted to catches.
 *
 *   fit(x)  = floor + (1 − floor) × trapezoid(x, a, b, c, d)    1 inside [b, c], `floor` outside [a, d]
 *   vis     fit of visibility (CLARITY forecast), floor 0.3. Snook and tarpon hunt stained river-mouth
 *           water; snapper and barracuda want it clear (species.ts `water.visM`).
 *   temp    fit of sea temperature (satellite SST), floor 0.5. This coast is 27 to 30 °C most of the
 *           year, so it rarely bites inshore.
 *   chl     chlorophyll as a bait sign: 0.7 in blue desert water (≤ 0.1 mg/m³), 1 from 0.3 to 3, easing to
 *           0.85 by 10 (very high is usually a muddy plume, which visibility already counts).
 *   water   = weighted mean of the terms that are known: 0.6 vis, 0.2 temp, 0.2 chl; null if none are.
 *   factor  = (0.6 + 0.4 × water) × sargassum,  sargassum = 0.85 MODERATE, 0.6 HIGH at the nearest beach
 *           (mats foul lines and block launching), else 1. Unknown water counts as 1.
 */
import { trapezoid } from './habitat';
import type { Species } from './species';

export type SargLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';

export interface WaterInputs {
  /** Visibility, m. */
  visM?: number | null;
  /** Sea surface temperature, °C. */
  sstC?: number | null;
  /** Chlorophyll-a, mg/m³. */
  chl?: number | null;
  /** Sargassum outlook at the nearest beach for the day. */
  sarg?: SargLevel | null;
}

export type WaterReason = 'murky' | 'clearwater' | 'temp' | 'sargassum' | 'goodwater';

export interface WaterTerm {
  /** 0..1, or null when nothing about the water is known. */
  water: number | null;
  /** Multiplier for the BITE score, 0.36..1. */
  factor: number;
  reasons: WaterReason[];
}

const ok = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
const lerp = (x: number, x0: number, x1: number, y0: number, y1: number) => y0 + (y1 - y0) * Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));

/** 1 inside the ideal range, `floor` beyond the outer limits, linear between. */
export function softFit(x: number, r: readonly [number, number, number, number], floor: number): number {
  if (x >= r[1] && x <= r[2]) return 1;
  return floor + (1 - floor) * trapezoid(x, ...r);
}

/** Chlorophyll as a bait sign, 0.7..1. */
export function chlFit(chl: number): number {
  return chl <= 0.3 ? lerp(chl, 0.1, 0.3, 0.7, 1) : chl <= 3 ? 1 : lerp(chl, 3, 10, 1, 0.85);
}

export const SARG_FACTOR: Record<SargLevel, number> = { NONE: 1, LOW: 1, MODERATE: 0.85, HIGH: 0.6 };

export function waterTerm(sp: Species, w: WaterInputs): WaterTerm {
  const parts: [number, number][] = [];
  const reasons: WaterReason[] = [];
  if (ok(w.visM)) {
    const v = softFit(w.visM, sp.water.visM, 0.3);
    parts.push([0.6, v]);
    if (v < 0.7) reasons.push(w.visM < sp.water.visM[1] ? 'murky' : 'clearwater');
  }
  if (ok(w.sstC)) {
    const t = softFit(w.sstC, sp.water.sstC, 0.5);
    parts.push([0.2, t]);
    if (t < 0.8) reasons.push('temp');
  }
  if (ok(w.chl)) parts.push([0.2, chlFit(w.chl)]);
  const sum = parts.reduce((a, [k]) => a + k, 0);
  const water = sum > 0 ? parts.reduce((a, [k, v]) => a + k * v, 0) / sum : null;
  const sarg = SARG_FACTOR[w.sarg ?? 'NONE'];
  if (sarg < 1) reasons.unshift('sargassum');
  if (water !== null && water >= 0.95 && ok(w.visM) && sarg === 1) reasons.push('goodwater');
  return { water, factor: (water === null ? 1 : 0.6 + 0.4 * water) * sarg, reasons };
}
