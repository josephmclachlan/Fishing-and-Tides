/**
 * Surf break quality (PLAN 6.3). Pure. Scores a catalog break (6.4) against the forecast,
 * using our own refraction and breaking (3.3, 3.4) at the break:
 *
 *   Q = 10 · size · period · window · clean · tide · wind · safety · water       (0 … 10)
 *
 *   size    breaker height Hb against the break type's working range (trapezoid):
 *           beach  0.4 → 0.8 … 1.8 → 2.8 m   (closes out above)
 *           reef   0.6 → 1.0 … 2.5 → 3.5 m
 *           point  0.5 → 0.9 … 2.5 → 3.5 m
 *   period  0.35 at 6 s → 1 at 13 s (groundswell lines up and holds shape)
 *   window  1 inside the guides' swell window (or ±60° of the facing), easing to 0.4 at 30° outside
 *   safety  lightning / squall cap (physics/safety.ts): ×0.1 with a strike near, ×0.25 squall HIGH, ×0.7 WATCH
 *   water   heavy rain and sargassum at the beach (`waterFactor`), 0.7 … 1
 *   tide    soft nudge from the break's tide preference (PLAN 7.25, `tideFactor`), 0.88 … 1
 *   clean   how tidy the surface is (PLAN 7.23): wind-sea and a crossing second swell share the energy
 *           with the main swell and put chop or a second set angle on its faces (see `cleanFactor`)
 *   wind    (with gusts, PLAN 7.23 B) the angle between the wind and the shore: offshore (blowing from land to sea) holds
 *           faces up; onshore chops them. 1 − 0.65·onshore(1.5→8 m/s) − 0.15·cross(4→10 m/s);
 *           strong offshore (> 10 m/s) costs a little (hard to paddle in)
 *
 * Bands: FLAT (Hb < 0.3 m), POOR < 3, FAIR < 5.5, GOOD < 8.5, EPIC. Same idea as the star
 * ratings of commercial forecasts, but every factor is shown so a surfer can see why.
 */
import type { SurfBreak, BreakType } from './data/surf-breaks';
import { safetyTerm, type SquallLevel } from './physics/safety';
import type { SargLevel } from './physics/drift';

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

/** A secondary wave train at the break's offshore point (waves feed partitions). */
export interface Train { Hs: number; Tp: number; fromDeg: number }

export interface SurfInput {
  brk: Pick<SurfBreak, 'type' | 'facing' | 'swellFrom'> & { tidePref?: SurfBreak['tidePref'] };
  /** Breaker height at the break, m (3.4). */
  Hb: number;
  /** Peak period, s. */
  Tp: number;
  /** Offshore swell direction FROM, compass degrees. */
  swellFromDeg: number;
  /** Wind speed m/s and direction FROM, compass degrees. */
  windMs: number;
  windFromDeg: number;
  /** Second swell train, when the feed has one. */
  swell2?: Train | null;
  /** Local wind-sea height, m, when the feed has it. */
  windSeaHs?: number | null;
  /** Main swell height, m (energy share base); defaults to Hs of the breaker's offshore sea. */
  swellHs?: number | null;
  /** Gust speed m/s (weather feed, model mean), when known (PLAN 7.23 B). */
  /** Live lightning near the break and the hour's squall level (physics/safety.ts, shared with fishing and dive). */
  lightning?: boolean;
  squall?: SquallLevel;
  /** Rain, mm/h (model mean), and the sargassum outlook at this beach. */
  rainMmH?: number | null;
  sarg?: SargLevel | null;
  /** Shown beside the score, not scored (PLAN 7.28): sea temperature °C and UV index. */
  info?: { sstC?: number | null; uv?: number | null };
  tide?: { level: number; rising: boolean } | null;
  gustMs?: number | null;
  /** The wind a few hours on (same units), to say whether the faces are about to turn. */
  windAhead?: { speedMs: number; fromDeg: number } | null;
}

export interface SurfFactors { size: number; period: number; window: number; clean: number; tide: number; wind: number; safety: number; water: number }

export interface SurfQuality {
  score: number;
  band: SurfBand;
  factors: SurfFactors;
  /** Wind relative to the shore. */
  windKind: 'offshore' | 'cross' | 'onshore' | 'calm';
  /** Where the wind is heading over the next few hours; 'steady' when unknown. */
  windTrend: WindTrend;
  /** Where the tide stands, for the readout; 'any' when the break has no preference or no tide is known. */
  tideKind: TideKind;
  /** Rip current level at the break from the physics worker (advisory, not scored); set by spot-physics. */
  ripLevel?: 'LOW' | 'MOD' | 'HIGH';
  /** Echo of the display-only inputs. */
  info?: { sstC?: number | null; uv?: number | null };
}

export type TideKind = 'low' | 'mid' | 'high' | 'none';

export type WindTrend = 'steady' | 'turnsOnshore' | 'cleaning';

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
export function windFactor(facing: number, windMs: number, windFromDeg: number, gustMs?: number | null): { f: number; kind: SurfQuality['windKind'] } {
  if (windMs < 1.5) return { f: 1, kind: 'calm' };
  // Gusty air ruffles faces even when the mean is light: up to 20% off when gusts run 3 to 8 m/s over the mean.
  const gusty = gustMs && gustMs > windMs ? 0.2 * smoothstep(3, 8, gustMs - windMs) : 0;
  const rel = wrap(windFromDeg - facing) * RAD; // 0 = straight onshore
  const onshore = windMs * Math.cos(rel);
  const cross = Math.abs(windMs * Math.sin(rel));
  const f = onshore > 0
    ? 1 - 0.65 * smoothstep(1.5, 8, onshore) - 0.15 * smoothstep(4, 10, cross)
    : 1 - 0.15 * smoothstep(4, 10, cross) - 0.2 * smoothstep(10, 15, -onshore);
  const kind = Math.abs(Math.cos(rel)) < Math.cos(60 * RAD) ? 'cross' : onshore > 0 ? 'onshore' : 'offshore';
  return { f: Math.max(0.1, f - gusty), kind };
}

/**
 * Surface tidiness from the wave trains, by energy share (Hs² adds). Wind-sea above ~15% of the energy
 * costs up to 45% (it is the chop on the faces); a second swell more than 30° off the main one costs up
 * to 30% when it carries 10–50% of the energy (crossed sets, closeouts), nothing when it lines up.
 * No partition data (outlook, old feed) gives 1.
 */
export function cleanFactor(main: Train & { Hs: number }, swell2?: Train | null, windSeaHs?: number | null): number {
  const e1 = main.Hs * main.Hs;
  const e2 = swell2 && swell2.Hs > 0 ? swell2.Hs * swell2.Hs : 0;
  const ew = windSeaHs && windSeaHs > 0 ? windSeaHs * windSeaHs : 0;
  const tot = e1 + e2 + ew;
  if (!(tot > 0)) return 1;
  const cross = swell2 ? smoothstep(30, 90, Math.abs(wrap(swell2.fromDeg - main.fromDeg))) : 0;
  return 1 - 0.45 * smoothstep(0.15, 0.6, ew / tot) - 0.3 * smoothstep(0.1, 0.5, e2 / tot) * cross;
}

/**
 * Soft tide nudge, 0.88 … 1. `level` is 0 at low water and 1 at high (physics/tide.ts). 'high' reefs lose up to 12%
 * at low water; 'mid' beaches lose up to 12% at either extreme. The Limón tide is small (about 0.6 m range), so this
 * stays a nudge.
 */
export function tideFactor(pref: SurfBreak['tidePref'], level: number | undefined): number {
  if (!pref || pref === 'any' || level === undefined) return 1;
  const miss = pref === 'high' ? 1 - smoothstep(0, 0.6, level) : smoothstep(0.5, 1, Math.abs(level - 0.5) * 2);
  return 1 - 0.12 * miss;
}

/**
 * Water quality at the beach, 0.7 … 1: heavy rain (brown runoff from the rivers, 3 mm/h easing to 12 mm/h) takes up to
 * 15% and sargassum on the beach takes 5% (LOW is ignored), 12% (MODERATE) or 20% (HIGH): weed in the lineup and a foul water.
 */
export function waterFactor(rainMmH?: number | null, sarg?: SargLevel | null): number {
  const rain = rainMmH && rainMmH > 0 ? 0.15 * smoothstep(3, 12, rainMmH) : 0;
  const weed = sarg === 'HIGH' ? 0.2 : sarg === 'MODERATE' ? 0.12 : 0;
  return 1 - rain - weed;
}

/** Onshore part of the wind, m/s (negative = offshore). */
const onshoreMs = (facing: number, speedMs: number, fromDeg: number) => speedMs * Math.cos(wrap(fromDeg - facing) * RAD);

/** Over the next hours: the onshore part rising 3 m/s or more turns it, falling 3 m/s or more cleans it up. */
export function windTrend(facing: number, now: { speedMs: number; fromDeg: number }, ahead?: { speedMs: number; fromDeg: number } | null): WindTrend {
  if (!ahead) return 'steady';
  const d = onshoreMs(facing, ahead.speedMs, ahead.fromDeg) - onshoreMs(facing, now.speedMs, now.fromDeg);
  return d >= 3 ? 'turnsOnshore' : d <= -3 ? 'cleaning' : 'steady';
}

export function surfBand(score: number, Hb: number): SurfBand {
  if (Hb < 0.3) return 'FLAT';
  if (score < 3) return 'POOR';
  if (score < 5.5) return 'FAIR';
  if (score < 8.5) return 'GOOD';
  return 'EPIC';
}

export function surfQuality(inp: SurfInput): SurfQuality {
  const w = windFactor(inp.brk.facing, inp.windMs, inp.windFromDeg, inp.gustMs);
  const factors: SurfFactors = {
    size: sizeFactor(inp.brk.type, inp.Hb),
    period: 0.35 + 0.65 * smoothstep(6, 13, inp.Tp),
    window: windowFactor(inp.brk, inp.swellFromDeg),
    clean: cleanFactor({ Hs: inp.swellHs ?? inp.Hb, Tp: inp.Tp, fromDeg: inp.swellFromDeg }, inp.swell2, inp.windSeaHs),
    tide: tideFactor(inp.brk.tidePref, inp.tide?.level),
    wind: w.f,
    safety: safetyTerm(inp.lightning, inp.squall),
    water: waterFactor(inp.rainMmH, inp.sarg),
  };
  const score = 10 * factors.size * factors.period * factors.window * factors.clean * factors.tide * factors.wind * factors.safety * factors.water;
  return { score, band: surfBand(score, inp.Hb), factors, info: inp.info, windKind: w.kind, tideKind: !inp.tide || !inp.brk.tidePref || inp.brk.tidePref === 'any' ? 'none' : inp.tide.level < 0.33 ? 'low' : inp.tide.level > 0.67 ? 'high' : 'mid', windTrend: windTrend(inp.brk.facing, { speedMs: inp.windMs, fromDeg: inp.windFromDeg }, inp.windAhead) };
}
