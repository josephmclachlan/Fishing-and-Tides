/**
 * Which map tiles "Sync for trip" downloads (PLAN 5.1). Pure: slippy-map tile maths and the
 * per-zoom plan, no network, so the count and the size estimate are testable.
 *
 * Tile x, y at zoom z (Web Mercator, OSM scheme):
 *   x = ⌊(λ + 180°) / 360° · 2^z⌋
 *   y = ⌊(1 − ln(tan φ + sec φ) / π) / 2 · 2^z⌋
 */
import { REGION } from '../region';

export type Bounds = readonly [readonly [number, number], readonly [number, number]];

export interface TileRange {
  z: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const MAX_LAT = 85.0511287798;

export function lonToX(lon: number, z: number): number {
  const n = 2 ** z;
  return Math.min(n - 1, Math.max(0, Math.floor(((lon + 180) / 360) * n)));
}

export function latToY(lat: number, z: number): number {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n);
  return Math.min(n - 1, Math.max(0, y));
}

/** The inclusive range of tiles at zoom `z` that covers `bounds` ([[west, south], [east, north]]). */
export function tilesIn(bounds: Bounds, z: number): TileRange {
  const [[w, s], [e, n]] = bounds;
  return { z, x0: lonToX(w, z), x1: lonToX(e, z), y0: latToY(n, z), y1: latToY(s, z) };
}

export const countRange = (r: TileRange) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);

export function* eachTile(r: TileRange): Generator<[number, number, number]> {
  for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) yield [r.z, x, y];
}

/**
 * The trip plan: everything you can pan to at low zoom (REGION.viewBounds), the data area at mid
 * zoom (REGION.maxBounds), and the coast itself (REGION.bounds) down to z14, the deepest vector
 * tile OpenFreeMap serves (MapLibre over-zooms it past that). About 2,150 tiles, ~18 MB.
 */
export const TRIP_ZOOMS: readonly { bounds: Bounds; from: number; to: number }[] = [
  { bounds: REGION.viewBounds, from: 0, to: 6 },
  { bounds: REGION.maxBounds, from: 7, to: 10 },
  { bounds: REGION.bounds, from: 11, to: 14 },
];

/** Raster hillshade under the dark style: z0–6 only (its source maxzoom). */
export const RASTER_MAX_Z = 6;

export function tripPlan(zooms = TRIP_ZOOMS): TileRange[] {
  const out: TileRange[] = [];
  for (const { bounds, from, to } of zooms) for (let z = from; z <= to; z++) out.push(tilesIn(bounds, z));
  return out;
}

/**
 * Cache key for a tile URL with the planet build folded out: OpenFreeMap publishes a new
 * planet every week under a new folder (`/planet/20261025_080012_pt/14/…`), and a synced tile
 * must still be found after the style moves on. The service worker uses the same key.
 */
export const tileKey = (url: string) => url.replace(/\/planet\/[^/]+\/(\d+\/\d+\/\d+\.pbf)/, '/planet/v/$1');

/** `{z}/{x}/{y}` template → URL. */
export const tileUrl = (template: string, z: number, x: number, y: number) =>
  template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
