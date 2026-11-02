/**
 * Wave crest lines (PLAN 6.9). Pure. A swell train's crests are perpendicular to the way it travels;
 * `dir` is where the waves come FROM (degrees true), so they travel toward dir + 180 and the crest
 * runs along dir ± 90. Each sample point gets a short segment centred on it, drawn in degrees with the
 * east-west length stretched by 1/cos(lat) so it looks the same length in every direction on the map.
 */
import type { SeaState } from './adapters/waves';

const RAD = Math.PI / 180;

export interface Crest {
  /** [lng, lat] pairs, the segment ends. */
  line: [[number, number], [number, number]];
  hs: number;
  dir: number;
  /** Mean period of the train drawn, s (NaN if unknown). */
  periodS: number;
}

/** Crest segment centred on (lng, lat), `lenDeg` long in latitude degrees, along dir ± 90. */
export function crestLine(lng: number, lat: number, dirFromDeg: number, lenDeg: number): [[number, number], [number, number]] {
  const along = (dirFromDeg + 90) * RAD; // bearing of the crest line
  const dx = (Math.sin(along) * lenDeg) / 2 / Math.cos(lat * RAD);
  const dy = (Math.cos(along) * lenDeg) / 2;
  return [[lng - dx, lat - dy], [lng + dx, lat + dy]];
}

/** Which train to draw: the swell when it carries at least half the height, else the mean sea. */
export function dominantTrain(s: SeaState): { hs: number; dir: number; periodS: number } {
  const swell = Number.isFinite(s.swellHs) && Number.isFinite(s.swellDir) && s.swellHs >= 0.5 * s.hs;
  return swell ? { hs: s.swellHs, dir: s.swellDir, periodS: s.swellT } : { hs: s.hs, dir: s.dir, periodS: s.tm };
}

/**
 * Crest segments over a box on a regular grid. `seaAt` returns the sea state at a point or null (no data,
 * land); `isWater` is an extra mask when a coastline is loaded. Segments are `fill` of the grid step long.
 */
export function crestGrid(
  bounds: readonly [readonly [number, number], readonly [number, number]],
  stepDeg: number,
  seaAt: (lng: number, lat: number) => SeaState | null,
  isWater: (lng: number, lat: number) => boolean = () => true,
  fill = 0.7,
): Crest[] {
  const [[w, s], [e, n]] = bounds;
  const out: Crest[] = [];
  for (let lat = s + stepDeg / 2; lat < n; lat += stepDeg) {
    for (let lng = w + stepDeg / 2; lng < e; lng += stepDeg) {
      if (!isWater(lng, lat)) continue;
      const sea = seaAt(lng, lat);
      if (!sea || !Number.isFinite(sea.hs)) continue;
      const tr = dominantTrain(sea);
      if (!Number.isFinite(tr.hs) || !Number.isFinite(tr.dir)) continue;
      out.push({ line: crestLine(lng, lat, tr.dir, stepDeg * fill), hs: tr.hs, dir: tr.dir, periodS: tr.periodS });
    }
  }
  return out;
}
