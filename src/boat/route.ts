/**
 * ROUTE tool (PLAN 7.23 item 8). Pure, no DOM. Two points give a straight leg: distance, bearing, and for the
 * chosen speed the passage time. Along it we ask the BOAT verdict forecast (window.ts verdictAt) at the place the
 * boat will be at each hour, so the leg shows the worst conditions it will meet and when, and the wind angle for
 * the point of sail. The leg is a great-circle line: it ignores land, reefs and bars, so the skipper must plan the
 * real track. A planning aid, not a navigation route.
 */
import { bearingDeg, haversineM } from '../geo';
import type { MetricEnv } from '../metrics/registry';
import type { Vessel } from '../settings';
import { verdictAt } from './window';
import type { Verdict } from './verdict';

export const M_PER_NM = 1852;
/** Default cruising speed, kn, per vessel. */
export const DEFAULT_SPEED_KT: Readonly<Record<Vessel, number>> = { small: 15, yacht: 5, dinghy: 4 };
export const SPEED_STEP_KT = 1;
export const MIN_SPEED_KT = 2;
export const MAX_SPEED_KT = 30;

export interface Leg {
  distanceNm: number;
  bearingDeg: number;
}

export function leg(a: [number, number], b: [number, number]): Leg {
  return { distanceNm: haversineM(a, b) / M_PER_NM, bearingDeg: bearingDeg(a, b) };
}

/** Passage time, ms, at a constant speed over the ground. */
export const passageMs = (distanceNm: number, speedKt: number) => (speedKt > 0 ? (distanceNm / speedKt) * 3.6e6 : Infinity);

export type PointOfSail = 'headToWind' | 'closeHauled' | 'closeReach' | 'beamReach' | 'broadReach' | 'run';

/**
 * Angle between the course and the wind, 0 (head to wind) to 180 (dead downwind), and the point of sail a yacht
 * would be on. A sailing yacht cannot point closer than about 40° to the wind (the no-go zone), so under 40° it
 * must tack and the leg is longer than the straight line. Rules of thumb; the bands are the usual textbook ones.
 */
export function windAngle(courseDeg: number, windFromDeg: number): { twa: number; sail: PointOfSail } {
  let d = Math.abs(((windFromDeg - courseDeg) % 360) + 360) % 360;
  if (d > 180) d = 360 - d;
  const sail: PointOfSail = d < 40 ? 'headToWind' : d < 60 ? 'closeHauled' : d < 80 ? 'closeReach' : d < 110 ? 'beamReach' : d < 150 ? 'broadReach' : 'run';
  return { twa: d, sail };
}

export interface RouteRead {
  leg: Leg;
  durationMs: number;
  arriveMs: number;
  /** Worst verdict met along the leg, when, and the wind and waves there. null when the forecast has no data. */
  worst: { verdict: Verdict; atMs: number; windKt: number | null; hsM: number | null } | null;
  /** Wind angle at the start, for the point of sail; null with no wind direction. */
  sail: { twa: number; sail: PointOfSail } | null;
}

const RANK: Record<Verdict, number> = { go: 0, marginal: 1, nogo: 2 };
export const ROUTE_SAMPLES = 8;

export function readRoute(env: MetricEnv, vessel: Vessel, a: [number, number], b: [number, number], speedKt: number, startMs: number): RouteRead {
  const l = leg(a, b);
  const durationMs = passageMs(l.distanceNm, speedKt);
  let worst: RouteRead['worst'] = null;
  const n = Number.isFinite(durationMs) ? ROUTE_SAMPLES : 1;
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    const lng = a[0] + (b[0] - a[0]) * f;
    const lat = a[1] + (b[1] - a[1]) * f;
    const atMs = startMs + (Number.isFinite(durationMs) ? durationMs * f : 0);
    const v = verdictAt(env, vessel, lng, lat, Math.floor(atMs / 3.6e6) * 3.6e6);
    if (v && (!worst || RANK[v.verdict] > RANK[worst.verdict])) worst = { verdict: v.verdict, atMs, windKt: v.windKt, hsM: v.hsM };
  }
  const dir = env.windDirDeg?.((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, startMs);
  return { leg: l, durationMs, arriveMs: startMs + durationMs, worst, sail: typeof dir === 'number' && Number.isFinite(dir) ? windAngle(l.bearingDeg, dir) : null };
}
