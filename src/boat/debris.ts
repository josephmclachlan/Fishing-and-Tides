/**
 * Flood debris flag (PLAN 7.23 item 5). Pure, no DOM. After heavy rain the rivers here (Sixaola, Estrella,
 * Banano, Bananito) carry logs, trunks and trash out to sea, a real hazard for a hull at speed and at night.
 * We have no debris observation, so the flag is a proxy from the GloFAS discharge already loaded (river-flow.ts):
 *
 *   ratio  = largest daily discharge, over the day of `ms` and the day before, divided by that day's long-term median
 *   LIKELY    ratio ≥ 4  (a flood: well above the usual wet-season peaks)
 *   POSSIBLE  ratio ≥ 2.5
 *
 * and applies within REACH_KM of a river mouth (debris drifts with the current and the wind, so this is a loose
 * radius, not a track). A guess, tagged as one in the explain card; not a hazard chart.
 */
import { haversineM } from '../geo';
import { PLUME_RIVERS } from '../region';
import { flowRatio, type RiverFlow } from '../adapters/river-flow';

export type DebrisLevel = 'none' | 'possible' | 'likely';
export const DEBRIS_POSSIBLE_RATIO = 2.5;
export const DEBRIS_LIKELY_RATIO = 4;
export const DEBRIS_REACH_KM = 25;

export interface Debris {
  level: DebrisLevel;
  river: string;
  km: number;
  ratio: number;
}

export function debrisAt(flow: RiverFlow, lng: number, lat: number, ms: number, rivers: readonly { name: string; mouth: [number, number] }[] = PLUME_RIVERS): Debris | null {
  let best: Debris | null = null;
  for (const r of rivers) {
    const km = haversineM([lng, lat], r.mouth) / 1000;
    if (km > DEBRIS_REACH_KM) continue;
    const today = flowRatio(flow, r.name, ms);
    const yesterday = flowRatio(flow, r.name, ms - 864e5);
    const ratio = Math.max(today ?? -Infinity, yesterday ?? -Infinity);
    if (!Number.isFinite(ratio)) continue;
    const level: DebrisLevel = ratio >= DEBRIS_LIKELY_RATIO ? 'likely' : ratio >= DEBRIS_POSSIBLE_RATIO ? 'possible' : 'none';
    const rank = (d: Debris) => (d.level === 'likely' ? 2 : d.level === 'possible' ? 1 : 0);
    const cand = { level, river: r.name, km, ratio };
    if (!best || rank(cand) > rank(best) || (rank(cand) === rank(best) && km < best.km)) best = cand;
  }
  return best;
}
