/**
 * Shore and kayak fishing cells (PLAN 4.5). Pure: no DOM, no network.
 *
 * A lattice over Gandoca–Limón, `STEP` degrees apart (~220 m). A cell is kept when it is open water
 * within `REACH_M` of the coast (a paddle or a long cast from the beach) and shallower than the
 * deepest species range. Each kept cell gets the features habitat.ts scores: depth, distance to the
 * nearest river mouth, how much of the nearby bottom is reef or rock, and the bottom slope.
 */
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { pointInPolygon } from '../geo';
import { cellAt, sample, type Grid } from '../physics/bathy';
import type { CellFeatures } from './habitat';

export const STEP = 0.002;
/** How far from the coast a kayak or a long cast reaches, m. */
export const REACH_M = 1500;
const MAX_DEPTH_M = 50;
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320;
const RAYS = 16;
const RAY_STEP_M = 100;

export interface Mouth { name: string; rank: number; at: [number, number] }
export interface FishingInput {
  /** GEBCO elevation, 15″ (negative = below sea level). */
  region: Grid;
  /** 1 = land, 0 = water, ~33 m cells. */
  land: Grid;
  /** Allen Coral Atlas polygons { layer: 'zone' | 'bottom', cls }. */
  reefs: FeatureCollection;
  mouths: readonly Mouth[];
  /** [west, south, east, north] to cover. */
  bounds: [number, number, number, number];
}

export interface Cell { lng: number; lat: number; f: CellFeatures; /** Distance to the shore, m. */ coastM: number }

/** Allen Atlas classes that hold fish: reef structure and hard or living bottom. */
export const REEFISH = new Set(['REEF CREST', 'OUTER REEF FLAT', 'INNER REEF FLAT', 'TERRESTRIAL REEF FLAT', 'BACK REEF SLOPE', 'REEF SLOPE', 'SHELTERED REEF SLOPE', 'PLATEAU', 'CORAL/ALGAE', 'ROCK']);

export interface Lattice { lon0: number; lat0: number; cols: number; rows: number }
export const latticeFor = ([w, s, e, n]: FishingInput['bounds']): Lattice => ({ lon0: w, lat0: n, cols: Math.ceil((e - w) / STEP), rows: Math.ceil((n - s) / STEP) });
const lngOf = (l: Lattice, c: number) => l.lon0 + (c + 0.5) * STEP;
const latOf = (l: Lattice, r: number) => l.lat0 - (r + 0.5) * STEP;

/** 1 where the cell centre is inside a reef-ish polygon. */
function reefMask(l: Lattice, reefs: FeatureCollection): Uint8Array {
  const mask = new Uint8Array(l.cols * l.rows);
  for (const f of reefs.features as Feature<Polygon | MultiPolygon>[]) {
    if (!REEFISH.has(String(f.properties?.cls))) continue;
    const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as [number, number][][][];
    for (const rings of polys) {
      let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
      for (const [x, y] of rings[0]) (w = Math.min(w, x)), (e = Math.max(e, x)), (s = Math.min(s, y)), (n = Math.max(n, y));
      const c0 = Math.max(0, Math.floor((w - l.lon0) / STEP)), c1 = Math.min(l.cols - 1, Math.ceil((e - l.lon0) / STEP));
      const r0 = Math.max(0, Math.floor((l.lat0 - n) / STEP)), r1 = Math.min(l.rows - 1, Math.ceil((l.lat0 - s) / STEP));
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) if (!mask[r * l.cols + c] && pointInPolygon([lngOf(l, c), latOf(l, r)], rings)) mask[r * l.cols + c] = 1;
    }
  }
  return mask;
}

/** Share of mask cells set within `rad` cells of (c, r). */
function share(mask: Uint8Array, l: Lattice, c: number, r: number, rad: number): number {
  let on = 0, n = 0;
  for (let dr = -rad; dr <= rad; dr++)
    for (let dc = -rad; dc <= rad; dc++) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= l.cols || rr >= l.rows) continue;
      n++;
      on += mask[rr * l.cols + cc];
    }
  return n ? on / n : 0;
}

/** Distance from the point to the nearest land along `RAYS` bearings, m, or Infinity if none within REACH_M. */
export function coastDistanceM(land: Grid, lng: number, lat: number, reach = REACH_M): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (let k = 0; k < RAYS; k++) {
    const a = (k / RAYS) * 2 * Math.PI;
    for (let d = RAY_STEP_M; d <= Math.min(reach, best); d += RAY_STEP_M)
      if (cellAt(land, lng + (Math.sin(a) * d) / (M_PER_DEG_LNG * cosLat), lat + (Math.cos(a) * d) / M_PER_DEG_LAT) === 1) {
        best = Math.min(best, d);
        break;
      }
  }
  return best;
}

/** Distance in km to the nearest mouth, each divided by its rank so a creek counts as farther than a river. */
export function mouthKm(mouths: readonly Mouth[], lng: number, lat: number): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const m of mouths) {
    const d = Math.hypot((m.at[0] - lng) * M_PER_DEG_LNG * cosLat, (m.at[1] - lat) * M_PER_DEG_LAT) / 1000 / (m.rank || 1);
    if (d < best) best = d;
  }
  return best;
}

export function buildCells(input: FishingInput): { lattice: Lattice; cells: Cell[]; index: Int32Array } {
  const l = latticeFor(input.bounds);
  const mask = reefMask(l, input.reefs);
  const index = new Int32Array(l.cols * l.rows).fill(-1);
  const cells: Cell[] = [];
  const depthAt = (lng: number, lat: number) => -sample(input.region, lng, lat);
  const dLng = 0.004;
  for (let r = 0; r < l.rows; r++)
    for (let c = 0; c < l.cols; c++) {
      const lng = lngOf(l, c), lat = latOf(l, r);
      const depthM = depthAt(lng, lat);
      if (!(depthM > 0 && depthM <= MAX_DEPTH_M) || cellAt(input.land, lng, lat) === 1) continue;
      const coastM = coastDistanceM(input.land, lng, lat);
      if (!Number.isFinite(coastM)) continue;
      // Steepest of the four neighbours ~440 m away, in m of depth per km.
      let slope = 0;
      for (const [dx, dy] of [[dLng, 0], [-dLng, 0], [0, dLng], [0, -dLng]]) {
        const d2 = depthAt(lng + dx, lat + dy);
        if (Number.isFinite(d2)) slope = Math.max(slope, (Math.abs(d2 - depthM) / ((dLng * M_PER_DEG_LAT) / 1000)));
      }
      index[r * l.cols + c] = cells.length;
      cells.push({ lng, lat, f: { depthM, mouthKm: mouthKm(input.mouths, lng, lat), reef: share(mask, l, c, r, 2), slopeMPerKm: slope }, coastM });
    }
  return { lattice: l, cells, index };
}

/** Index of the cell containing the point, or -1. */
export function cellIndexAt(l: Lattice, index: Int32Array, lng: number, lat: number): number {
  const c = Math.floor((lng - l.lon0) / STEP), r = Math.floor((l.lat0 - lat) / STEP);
  return c < 0 || r < 0 || c >= l.cols || r >= l.rows ? -1 : index[r * l.cols + c];
}

/**
 * A cell's shape on the map, cut at the coastline: the whole square in open water, or, where the
 * coastline mask (1 = land) crosses it, only its water, as rectangles on a sub-grid about as fine as
 * the mask. A cell is kept by its centre, so without this a shore cell paints up to half a cell
 * (~110 m) of beach or headland.
 */
export function cellGeometry(land: Grid | null | undefined, lng: number, lat: number): Polygon | MultiPolygon {
  const square: Polygon = { type: 'Polygon', coordinates: [cellRing(lng, lat)] };
  if (!land) return square;
  const n = Math.max(1, Math.ceil(STEP / Math.min(land.dlon, land.dlat)));
  const d = STEP / n;
  const w = lng - STEP / 2, north = lat + STEP / 2;
  const wet: boolean[] = [];
  let dry = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const isWet = cellAt(land, w + (c + 0.5) * d, north - (r + 0.5) * d) !== 1;
      wet.push(isWet);
      if (!isWet) dry++;
    }
  if (!dry) return square;
  // Runs of water along each row, then stacked rows with the same run joined into one rectangle.
  const rects: { c0: number; c1: number; r0: number; r1: number }[] = [];
  let open: typeof rects = [];
  for (let r = 0; r < n; r++) {
    const runs: [number, number][] = [];
    for (let c = 0; c < n; c++) {
      if (!wet[r * n + c]) continue;
      if (runs.length && runs[runs.length - 1][1] === c) runs[runs.length - 1][1] = c + 1;
      else runs.push([c, c + 1]);
    }
    const next: typeof rects = [];
    for (const [c0, c1] of runs) {
      const above = open.find((o) => o.c0 === c0 && o.c1 === c1);
      if (above) (above.r1 = r + 1), next.push(above);
      else {
        const rect = { c0, c1, r0: r, r1: r + 1 };
        rects.push(rect);
        next.push(rect);
      }
    }
    open = next;
  }
  const ring = (o: (typeof rects)[number]): [number, number][] => {
    const x0 = w + o.c0 * d, x1 = w + o.c1 * d, y0 = north - o.r1 * d, y1 = north - o.r0 * d;
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  };
  return { type: 'MultiPolygon', coordinates: rects.map((o) => [ring(o)]) };
}

/** Square polygon of a cell for the map. */
export const cellRing = (lng: number, lat: number): [number, number][] => {
  const h = STEP / 2;
  return [[lng - h, lat - h], [lng + h, lat - h], [lng + h, lat + h], [lng - h, lat + h], [lng - h, lat - h]];
};
