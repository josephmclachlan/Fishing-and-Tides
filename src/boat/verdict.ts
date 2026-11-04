/**
 * BOAT go / no-go verdict (PLAN 7.8, 7.23). Pure, no DOM. Judgement thresholds, not a safety system:
 * the wind, gust and sea limits below are rule-of-thumb figures for a small open boat and for a
 * sailing yacht (a yacht carries more sea and wind, and gusts run about 1.35 times the mean wind).
 *
 *   NO-GO     any one of: lightning close, a storm near, a squall likely, wind / gust / seas / comfort past the NO-GO line
 *   MARGINAL  any one past the MARGINAL line, a squall watch, heavy rain, or a storm within range
 *   GO        otherwise
 *
 * Lightning and squall use the cap the other activities share (physics/safety.ts): a cap below
 * SAFETY_NOGO_BELOW is NO-GO, any cap at all is at least MARGINAL.
 *
 * The reasons are the conditions that set the verdict, worst first.
 */
import { safetyTerm, type SquallLevel } from '../physics/safety';
import type { Vessel } from '../settings';

export type Verdict = 'go' | 'marginal' | 'nogo';
export type VerdictReason = 'lightning' | 'storm' | 'squallHigh' | 'squall' | 'wind' | 'gust' | 'sea' | 'comfort' | 'rain';

/** [MARGINAL at or above, NO-GO at or above] per vessel. Comfort is a score, so it is [MARGINAL below, NO-GO below]. */
export const LIMITS: Readonly<Record<Vessel, { windKt: readonly [number, number]; gustKt: readonly [number, number]; hsM: readonly [number, number]; comfort: readonly [number, number] }>> = {
  small: { windKt: [15, 20], gustKt: [20, 27], hsM: [1.2, 2], comfort: [50, 25] },
  yacht: { windKt: [20, 28], gustKt: [27, 37], hsM: [2, 3], comfort: [35, 15] },
};

/** A storm this close (km) is NO-GO; within STORM_MARGINAL_KM it is MARGINAL. */
export const STORM_NOGO_KM = 300;
export const STORM_MARGINAL_KM = 1000;
export const HEAVY_RAIN_MM_H = 10;
/** A shared safety cap (multiplier on a score) under this means stay ashore. */
export const SAFETY_NOGO_BELOW = 0.5;

export interface VerdictInputs {
  vessel: Vessel;
  windKt?: number;
  gustKt?: number;
  /** Combined wave height, m. */
  hsM?: number;
  /** Sea comfort score 0..100 (physics/sea-state.ts). */
  comfort?: number;
  squall?: SquallLevel;
  /** A strike within 25 km in the last 15 min. */
  lightning?: boolean;
  /** Distance to the nearest active tropical storm, km. */
  stormKm?: number | null;
  rainMmH?: number;
}

export interface BoatVerdict {
  verdict: Verdict;
  reasons: { id: VerdictReason; level: 'marginal' | 'nogo'; value?: number }[];
}

const finite = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

export function boatVerdict(i: VerdictInputs): BoatVerdict {
  const L = LIMITS[i.vessel];
  const reasons: BoatVerdict['reasons'] = [];
  const up = (id: VerdictReason, v: number | undefined, [m, n]: readonly [number, number]) => {
    if (!finite(v)) return;
    if (v >= n) reasons.push({ id, level: 'nogo', value: v });
    else if (v >= m) reasons.push({ id, level: 'marginal', value: v });
  };
  if (i.lightning) reasons.push({ id: 'lightning', level: 'nogo' });
  if (finite(i.stormKm)) {
    if (i.stormKm <= STORM_NOGO_KM) reasons.push({ id: 'storm', level: 'nogo', value: i.stormKm });
    else if (i.stormKm <= STORM_MARGINAL_KM) reasons.push({ id: 'storm', level: 'marginal', value: i.stormKm });
  }
  if (i.squall && i.squall !== 'none') {
    const nogo = safetyTerm(false, i.squall) < SAFETY_NOGO_BELOW;
    reasons.push({ id: nogo ? 'squallHigh' : 'squall', level: nogo ? 'nogo' : 'marginal' });
  }
  up('wind', i.windKt, L.windKt);
  up('gust', i.gustKt, L.gustKt);
  up('sea', i.hsM, L.hsM);
  if (finite(i.comfort)) {
    if (i.comfort < L.comfort[1]) reasons.push({ id: 'comfort', level: 'nogo' });
    else if (i.comfort < L.comfort[0]) reasons.push({ id: 'comfort', level: 'marginal' });
  }
  if (finite(i.rainMmH) && i.rainMmH >= HEAVY_RAIN_MM_H) reasons.push({ id: 'rain', level: 'marginal', value: i.rainMmH });
  reasons.sort((a, b) => (a.level === b.level ? 0 : a.level === 'nogo' ? -1 : 1));
  const verdict: Verdict = reasons.some((r) => r.level === 'nogo') ? 'nogo' : reasons.length ? 'marginal' : 'go';
  return { verdict, reasons };
}
