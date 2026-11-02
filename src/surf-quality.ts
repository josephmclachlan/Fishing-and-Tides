/**
 * Surf break quality (PLAN 6.3). Pure. Scores a catalog break (6.4) against the forecast,
 * using our own refraction and breaking (3.3, 3.4) at the break:
 *
 *   Q = 10 · size · period · window · wind        (0 … 10)
 *
 *   size    breaker height Hb against the break type's working range (trapezoid):
 *           beach  0.4 → 0.8 … 1.8 → 2.8 m   (closes out above)
 *           reef   0.6 → 1.0 … 2.5 → 3.5 m
 *           point  0.5 → 0.9 … 2.5 → 3.5 m
 *   period  0.35 at 6 s → 1 at 13 s (groundswell lines up and holds shape)
 *   window  1 inside the guides' swell window (or ±60° of the facing), easing to 0.4 at 30° outside
 *   wind    the angle between the wind and the shore: offshore (blowing from land to sea) holds
 *           faces up; onshore chops them. 1 − 0.65·onshore(1.5→8 m/s) − 0.15·cross(4→10 m/s);
 *           strong offshore (> 10 m/s) costs a little (hard to paddle in)
 *
 * Bands: FLAT (Hb < 0.3 m), POOR < 3, FAIR < 5.5, GOOD < 8.5, EPIC. Same idea as the star
 * ratings of commercial forecasts, but every factor is shown so a surfer can see why.
 */
import type { SurfBreak, BreakType } from './data/surf-breaks';

const RAD = Math.PI / 180;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Wrap to (−180, 180]. */
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

export const SIZE_RANGE: Record<BreakType, [number, number, number, number]> = {
  beach: [0.4, 0.8, 1.8, 2.8],
  reef: [0.6, 1.0, 2.5, 3.5],
  point: [0.5, 0.9, 2.5, 3.5],
};

export type SurfBand = 'FLAT' | 'POOR' | 'FAIR' | 'GOOD' | 'EPIC';

export interface SurfInput {
  brk: Pick<SurfBreak, 'type' | 'facing' | 'swellFrom'>;
  /** Breaker height at the break, m (3.4). */
  Hb: number;
  /** Peak period, s. */
  Tp: number;
  /** Offshore swell direction FROM, compass degrees. */
  swellFromDeg: number;
  /** Wind speed m/s and direction FROM, compass degrees. */
  windMs: number;
  windFromDeg: number;
}

export interface SurfFactors { size: number; period: number; window: number; wind: number }

export interface SurfQuality {
  score: number;
  band: SurfBand;
  factors: SurfFactors;
  /** Wind relative to the shore. */
  windKind: 'offshore' | 'cross' | 'onshore' | 'calm';
}

export function sizeFactor(type: BreakType, Hb: number): number {
  const [a, b, c, d] = SIZE_RANGE[type];
  if (Hb <= a || Hb >= d) return 0;
  if (Hb < b) return smoothstep(a, b, Hb);
  if (Hb <= c) return 1;
  return 1 - smoothstep(c, d, Hb);
}

/** 1 inside the swell window, easing to 0.4 at 30° outside it. */
export function windowFactor(brk: SurfInput['brk'], fromDeg: number): number {
  const [lo, hi] = brk.swellFrom ?? [brk.facing - 60, brk.facing + 60];
  const mid = (lo + hi) / 2;
  const half = Math.abs(wrap(hi - lo)) / 2;
  const off = Math.max(0, Math.abs(wrap(fromDeg - mid)) - half);
  return 1 - 0.6 * smoothstep(0, 30, off);
}

/** Wind factor and kind. Offshore wind blows FROM the land, i.e. from facing + 180. */
export function windFactor(facing: number, windMs: number, windFromDeg: number): { f: number; kind: SurfQuality['windKind'] } {
  if (windMs < 1.5) return { f: 1, kind: 'calm' };
  const rel = wrap(windFromDeg - facing) * RAD; // 0 = straight onshore
  const onshore = windMs * Math.cos(rel);
  const cross = Math.abs(windMs * Math.sin(rel));
  const f = onshore > 0
    ? 1 - 0.65 * smoothstep(1.5, 8, onshore) - 0.15 * smoothstep(4, 10, cross)
    : 1 - 0.15 * smoothstep(4, 10, cross) - 0.2 * smoothstep(10, 15, -onshore);
  const kind = Math.abs(Math.cos(rel)) < Math.cos(60 * RAD) ? 'cross' : onshore > 0 ? 'onshore' : 'offshore';
  return { f: Math.max(0.1, f), kind };
}

export function surfBand(score: number, Hb: number): SurfBand {
  if (Hb < 0.3) return 'FLAT';
  if (score < 3) return 'POOR';
  if (score < 5.5) return 'FAIR';
  if (score < 8.5) return 'GOOD';
  return 'EPIC';
}

export function surfQuality(inp: SurfInput): SurfQuality {
  const w = windFactor(inp.brk.facing, inp.windMs, inp.windFromDeg);
  const factors: SurfFactors = {
    size: sizeFactor(inp.brk.type, inp.Hb),
    period: 0.35 + 0.65 * smoothstep(6, 13, inp.Tp),
    window: windowFactor(inp.brk, inp.swellFromDeg),
    wind: w.f,
  };
  const score = 10 * factors.size * factors.period * factors.window * factors.wind;
  return { score, band: surfBand(score, inp.Hb), factors, windKind: w.kind };
}
