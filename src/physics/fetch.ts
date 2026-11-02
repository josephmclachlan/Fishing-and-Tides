/**
 * Wind fetch and shelter (PLAN 6.7). Pure: no DOM.
 *
 * Fetch is the distance over open water that the wind has blown across to reach a point; the longer
 * it is, the bigger the wind waves. A point behind land in the direction the wind comes from has a
 * short fetch and is sheltered. Marched over the OSM land mask (1 = land), one `stepM` at a time.
 * Beyond the mask's edge counts as open water, so a long fetch from the open sea is never cut short.
 */
import { cellAt, type Grid } from './bathy';

const RAD = Math.PI / 180;
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;

/** Metres of open water upwind of a point, up to `maxM`. 0 if the point itself is on land. */
export function windFetchM(land: Grid, lng: number, lat: number, windFromDeg: number, maxM = 30_000, stepM = 100): number {
  if (cellAt(land, lng, lat) === 1) return 0;
  const east = Math.sin(windFromDeg * RAD);
  const north = Math.cos(windFromDeg * RAD);
  const cosLat = Math.cos(lat * RAD);
  for (let d = stepM; d <= maxM; d += stepM)
    if (cellAt(land, lng + (east * d) / (M_PER_DEG_LNG * cosLat), lat + (north * d) / M_PER_DEG_LAT) === 1) return d - stepM;
  return maxM;
}

export type Shelter = 'sheltered' | 'partial' | 'exposed';

/** Under 2 km of fetch barely builds waves; over 10 km the wind has room to raise a real sea. */
export function shelterClass(fetchM: number): Shelter {
  return fetchM < 2000 ? 'sheltered' : fetchM < 10_000 ? 'partial' : 'exposed';
}
