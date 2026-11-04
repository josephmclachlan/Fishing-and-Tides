/**
 * A name for an unnamed fishing spot (J5): the nearest named place (beach, town, surf break, river
 * mouth, harbour), with how far it is. Pure; distances by haversine, km.
 */
import { haversineM } from '../geo';

export interface Landmark {
  name: string;
  lngLat: [number, number];
}

/** Under this a spot is "AT" the landmark rather than "NEAR" it, km. */
export const AT_KM = 0.6;

export function nearestName(lng: number, lat: number, marks: readonly Landmark[]): { name: string; km: number; at: boolean } | null {
  let best: { name: string; km: number } | null = null;
  for (const m of marks) {
    const km = haversineM([lng, lat], m.lngLat) / 1000;
    if (!best || km < best.km) best = { name: m.name, km };
  }
  return best ? { ...best, at: best.km < AT_KM } : null;
}

/** One entry per name, the first position wins (the lists overlap: SPOTS, surf breaks, towns). */
export function uniqueMarks(...lists: readonly (readonly Landmark[])[]): Landmark[] {
  const seen = new Set<string>();
  const out: Landmark[] = [];
  for (const l of lists) for (const m of l) if (!seen.has(m.name)) (seen.add(m.name), out.push({ name: m.name, lngLat: m.lngLat }));
  return out;
}
