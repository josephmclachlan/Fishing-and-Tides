/**
 * Lightning nowcast helpers (PLAN 7.6). Pure. A flash is [epoch ms, lng, lat] from GOES GLM.
 */
import { haversineM } from './geo';

export type Flash = readonly [number, number, number];

/** The alert fires for a flash this close to the reticle and this recent. */
export const STRIKE_ALERT_KM = 25;
export const STRIKE_ALERT_MIN = 15;

export interface Nearest {
  km: number;
  ageMin: number;
  flash: Flash;
}

/** The closest flash within the last `windowMin` minutes of `now`, or null. */
export function nearestFlash(flashes: readonly Flash[], lng: number, lat: number, now: number, windowMin = STRIKE_ALERT_MIN): Nearest | null {
  let best: Nearest | null = null;
  for (const f of flashes) {
    const ageMin = (now - f[0]) / 60000;
    if (ageMin > windowMin || ageMin < -2) continue;
    const km = haversineM([lng, lat], [f[1], f[2]]) / 1000;
    if (!best || km < best.km) best = { km, ageMin: Math.max(0, ageMin), flash: f };
  }
  return best;
}

/** Number of flashes within `km` of a point in the last `windowMin` minutes. */
export function countNear(flashes: readonly Flash[], lng: number, lat: number, now: number, km: number, windowMin = STRIKE_ALERT_MIN): number {
  let n = 0;
  for (const f of flashes) {
    const ageMin = (now - f[0]) / 60000;
    if (ageMin <= windowMin && ageMin >= -2 && haversineM([lng, lat], [f[1], f[2]]) / 1000 <= km) n++;
  }
  return n;
}
