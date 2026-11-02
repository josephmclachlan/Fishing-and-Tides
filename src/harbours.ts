/** Helpers for the harbours and anchorages catalog (PLAN 6.7). Pure. */
import { haversineM } from './geo';
import { PLACES, type Place } from './data/harbours';

/** The nearest place within `maxM` of a point, with its distance, or null. */
export function nearestPlace(lng: number, lat: number, maxM = 3000, places: readonly Place[] = PLACES): { place: Place; distanceM: number } | null {
  let best: { place: Place; distanceM: number } | null = null;
  for (const place of places) {
    const distanceM = haversineM([lng, lat], place.lngLat);
    if (distanceM <= maxM && (!best || distanceM < best.distanceM)) best = { place, distanceM };
  }
  return best;
}
