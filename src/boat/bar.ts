/**
 * Bar and inlet crossing advisory (PLAN 7.23 item 6). Pure, no DOM. The river mouths here and the Moín entrance
 * break when swell meets shallow water, and worst when an outgoing tide or a river in spate pushes against the
 * swell. We have no bar surveys or depths, so this is a points score from what the app knows, not a chart:
 *
 *   swell height   Hs ≥ 0.8 m: +1,  Hs ≥ 1.5 m: +2
 *   long swell     period ≥ 10 s with Hs ≥ 0.8 m: +1   (long swell steepens and breaks farther out)
 *   ebb and river  falling tide with the river at ≥ 1.5 times its median flow: +1  (river bars only)
 *   flood          river at ≥ 4 times its median flow: +1  (hard outflow, debris)
 *
 *   LOW 0 · MODERATE 1 to 2 · HIGH 3 or more
 *
 * Every entry is tagged CHECK: nobody has verified these positions or local rules. Ask the port captain or a local
 * skipper before crossing a bar; never rely on this.
 */
import { PLUME_RIVERS } from '../region';
import { PLACES } from '../data/harbours';
import { haversineM } from '../geo';

export interface Bar {
  id: string;
  name: string;
  lngLat: [number, number];
  /** River whose flow feeds the bar; none for the port entrance. */
  river?: string;
}

const moin = PLACES.find((p) => p.id === 'moin-boat-terminal');
export const BARS: readonly Bar[] = [
  ...PLUME_RIVERS.map((r) => ({ id: r.name, name: r.name, lngLat: r.mouth, river: r.name })),
  ...(moin ? [{ id: 'moin', name: 'MOÍN ENTRANCE', lngLat: moin.lngLat }] : []),
];
export const BAR_REACH_KM = 10;

export type BarLevel = 'low' | 'moderate' | 'high';
export type BarReason = 'swell' | 'long' | 'ebb' | 'flood';

export interface BarInputs {
  hsM: number;
  tpS: number;
  /** True while the tide is falling. */
  ebb: boolean;
  /** River flow over its median; null for a bar with no river or no data. */
  flowRatio: number | null;
}

export function barAdvisory(i: BarInputs): { level: BarLevel; points: number; reasons: BarReason[] } {
  const reasons: BarReason[] = [];
  let points = 0;
  if (i.hsM >= 1.5) (points += 2, reasons.push('swell'));
  else if (i.hsM >= 0.8) (points += 1, reasons.push('swell'));
  if (i.hsM >= 0.8 && i.tpS >= 10) (points += 1, reasons.push('long'));
  if (i.flowRatio !== null) {
    if (i.ebb && i.flowRatio >= 1.5) (points += 1, reasons.push('ebb'));
    if (i.flowRatio >= 4) (points += 1, reasons.push('flood'));
  }
  return { level: points >= 3 ? 'high' : points >= 1 ? 'moderate' : 'low', points, reasons };
}

/** The nearest bar within BAR_REACH_KM, with its distance. */
export function nearestBar(lng: number, lat: number, bars: readonly Bar[] = BARS): { bar: Bar; km: number } | null {
  let best: { bar: Bar; km: number } | null = null;
  for (const bar of bars) {
    const km = haversineM([lng, lat], bar.lngLat) / 1000;
    if (km <= BAR_REACH_KM && (!best || km < best.km)) best = { bar, km };
  }
  return best;
}
