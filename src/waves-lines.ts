/**
 * Wave crest lines (PLAN 6.9). Pure. A swell train's crests are perpendicular to the way it travels;
 * `dir` is where the waves come FROM (degrees true), so they travel toward dir + 180 and the crest
 * runs along dir ± 90. Each sample point gets a short segment centred on it, drawn in degrees with the
 * east-west length stretched by 1/cos(lat) so it looks the same length in every direction on the map.
 */
import type { SeaState } from './adapters/waves';
import { clipLines } from './physics/bathy';

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

const ALL_WATER = () => true;
/** Crest ends are tested against the coastline at most this far apart, degrees (~55 m). */
const CLIP_STEP_DEG = 0.0005;
/** Pieces of a cut crest shorter than this share of the whole are dropped (they read as specks). */
const MIN_PIECE = 0.15;

/**
 * Crest segments over a box on a regular grid. `seaAt` returns the sea state at a point or null (no data,
 * land); `isWater` is an extra mask when a coastline is loaded: a crest is drawn only from a water point,
 * and cut where it crosses land, so a crest beside a headland stops at the shore. Segments are `fill`
 * of the grid step long.
 */
export function crestGrid(
  bounds: readonly [readonly [number, number], readonly [number, number]],
  stepDeg: number,
  seaAt: (lng: number, lat: number) => SeaState | null,
  isWater: (lng: number, lat: number) => boolean = ALL_WATER,
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
      const line = crestLine(lng, lat, tr.dir, stepDeg * fill);
      const pieces = isWater === ALL_WATER ? [line] : clipLines([line], (p) => isWater(p[0], p[1]), CLIP_STEP_DEG);
      const full = Math.hypot(line[1][0] - line[0][0], line[1][1] - line[0][1]);
      for (const p of pieces) {
        const a = p[0], b = p[p.length - 1];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < MIN_PIECE * full) continue;
        out.push({ line: [a, b], hs: tr.hs, dir: tr.dir, periodS: tr.periodS });
      }
    }
  }
  return out;
}
