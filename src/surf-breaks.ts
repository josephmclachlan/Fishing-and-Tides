/** Helpers for the surf break catalog (PLAN 6.4). Pure. */
import { haversineM } from './geo';
import { SURF_BREAKS, type SurfBreak } from './data/surf-breaks';

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
/** 8-point compass name for a bearing in degrees. */
export const compass8 = (deg: number): (typeof POINTS)[number] => POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Breaks within `maxM` of a point, nearest first. */
export function breaksNear(lng: number, lat: number, maxM = 1500, breaks: readonly SurfBreak[] = SURF_BREAKS): { brk: SurfBreak; distanceM: number }[] {
  return breaks
    .map((brk) => ({ brk, distanceM: haversineM([lng, lat], brk.lngLat) }))
    .filter((x) => x.distanceM <= maxM)
    .sort((a, b) => a.distanceM - b.distanceM);
}
