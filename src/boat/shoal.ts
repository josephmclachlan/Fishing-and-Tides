/**
 * Shoal alert for the BOAT drawer (PLAN 7.23 item 7). Pure, no DOM. Looks at the depth grid under the boat and at
 * eight bearings 100 m and 250 m away, plus whether any of those points is on a charted reef flat, and compares
 * with the vessel's draft:
 *
 *   DANGER   water under a point is less than draft + 0.5 m, or the boat is on a reef
 *   CAUTION  less than draft + 2 m, or a reef is within 250 m
 *   CLEAR    otherwise
 *
 * Draft is a rule of thumb per vessel type: 0.5 m for a small boat (motor trimmed up), 2 m for a sailing yacht, 0.3 m for a dinghy or kayak (centreboard up).
 * The depths are a gridded model (GEBCO and survey blends, tens of metres to hundreds of metres per cell), not a chart:
 * an estimate only. Never navigate by it.
 */
import { pointInPolygon } from '../geo';
import type { Vessel } from '../settings';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export const DRAFT_M: Readonly<Record<Vessel, number>> = { small: 0.5, yacht: 2, dinghy: 0.3 };
export const DANGER_MARGIN_M = 0.5;
export const CAUTION_MARGIN_M = 2;
export const LOOK_M: readonly number[] = [100, 250];
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;

export type ShoalLevel = 'clear' | 'caution' | 'danger';
export interface Shoal {
  level: ShoalLevel;
  /** Depth under the position, m, or null on land / outside the grid. */
  depthM: number | null;
  /** The shallowest point looked at, m, and its bearing from the position, degrees true. */
  minM: number | null;
  minBearingDeg: number | null;
  /** The position, or a point within 250 m, is on a reef. */
  reef: boolean;
}

export type Depth = (lng: number, lat: number) => number | null | undefined;
export type ReefAt = (lng: number, lat: number) => boolean;

export function shoalAlert(depthAt: Depth, reefAt: ReefAt | null, lng: number, lat: number, vessel: Vessel): Shoal {
  const draft = DRAFT_M[vessel];
  const here = depthAt(lng, lat);
  const depthM = typeof here === 'number' && Number.isFinite(here) ? here : null;
  let minM: number | null = depthM;
  let minBearingDeg: number | null = null;
  let reef = reefAt?.(lng, lat) ?? false;
  let onReef = reef;
  for (const r of LOOK_M)
    for (let k = 0; k < 8; k++) {
      const brg = k * 45;
      const rad = (brg * Math.PI) / 180;
      const p: [number, number] = [lng + (r * Math.sin(rad)) / (M_PER_DEG_LNG * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.cos(rad)) / M_PER_DEG_LAT];
      const d = depthAt(p[0], p[1]);
      // Land (no depth) is not a shoal reading here: the shore is on the map.
      if (typeof d === 'number' && Number.isFinite(d) && d > 0 && (minM === null || d < minM)) (minM = d), (minBearingDeg = brg);
      if (reefAt?.(p[0], p[1])) reef = true;
    }
  const shallow = minM;
  const level: ShoalLevel = onReef || (shallow !== null && shallow < draft + DANGER_MARGIN_M) ? 'danger' : reef || (shallow !== null && shallow < draft + CAUTION_MARGIN_M) ? 'caution' : 'clear';
  return { level, depthM, minM, minBearingDeg: minBearingDeg, reef };
}

/** Point-in-reef lookup over a reef FeatureCollection, with a bounding-box prefilter. */
export function makeReefLookup(reefs: FeatureCollection | null, classes: ReadonlySet<string>): ReefAt | null {
  if (!reefs) return null;
  const polys: { box: [number, number, number, number]; rings: [number, number][][] }[] = [];
  for (const f of reefs.features as Feature<Polygon | MultiPolygon>[]) {
    if (!classes.has(String(f.properties?.cls))) continue;
    const parts = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as [number, number][][][];
    for (const rings of parts) {
      let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
      for (const [x, y] of rings[0]) (w = Math.min(w, x)), (e = Math.max(e, x)), (s = Math.min(s, y)), (n = Math.max(n, y));
      polys.push({ box: [w, s, e, n], rings });
    }
  }
  return (lng, lat) => polys.some((p) => lng >= p.box[0] && lng <= p.box[2] && lat >= p.box[1] && lat <= p.box[3] && pointInPolygon([lng, lat], p.rings));
}
