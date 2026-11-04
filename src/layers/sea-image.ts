/**
 * Sea-only raster overlays. Pure, no DOM. Several layers (CLARITY, the WATER TEMP fill) paint a
 * coarse grid of values onto the map as an image. Drawn cell for cell, the image spills onto the
 * land: a 440 m clarity cell or a 1 km SST cell whose centre is in the sea still covers the beach,
 * the headland or the town behind it, and the coarse grids put the sea in the wrong place anyway
 * (GEBCO calls parts of Cahuita village sea). So the image is drawn finer than the grid and every
 * pixel asks the coastline (the ~33 m OSM mask, then the 1′ depth grid beyond it) whether it is sea.
 *
 * Rows are spaced evenly in Web Mercator, as MapLibre's four-corner image sources need: rows evenly
 * spaced in latitude put the middle of a 5° image about 1.4 km off.
 */
import { cellAt, sample, type Grid } from '../physics/bathy';
import { latOfMercY, mercY } from './seafloor-shade';

const RAD = Math.PI / 180;

/** A regular lon/lat grid, cell-centre registered, row 0 north (bathy.Grid without values). */
export interface RegularGrid {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
}

/** Image corners for a MapLibre image source: NW, NE, SE, SW. */
export type Corners = [[number, number], [number, number], [number, number], [number, number]];

export interface SeaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  coordinates: Corners;
}

/** What the coastline says at a point: 1 land, 0 sea, 2 not known (outside every grid). */
export type CoastTest = (lng: number, lat: number) => 0 | 1 | 2;

const tests = new WeakMap<Grid, WeakMap<object, CoastTest>>();
const NONE = {};
/**
 * Coastline test from the fine land mask (1 = land) where it covers, else the elevation grid
 * (below 0 m = sea). The same function comes back for the same grids, so pixel masks are cached.
 */
export function coastTest(land: Grid, elevation?: Grid | null): CoastTest {
  let byElev = tests.get(land);
  if (!byElev) tests.set(land, (byElev = new WeakMap()));
  const key = elevation ?? NONE;
  let t = byElev.get(key);
  if (!t) {
    t = (lng, lat) => {
      const m = cellAt(land, lng, lat);
      if (m === 1 || m === 0) return m;
      if (!elevation) return 2;
      const z = sample(elevation, lng, lat);
      return Number.isNaN(z) ? 2 : z < 0 ? 0 : 1;
    };
    byElev.set(key, t);
  }
  return t;
}

/** RGBA as one 32-bit word in the platform's byte order, for writing through a Uint32Array view of the pixels. */
export const rgbaWord = (r: number, g: number, b: number, a: number) => new Uint32Array(Uint8ClampedArray.from([r, g, b, a]).buffer)[0];

/**
 * Copy of `values` with each empty cell next to a filled one given the mean of its filled
 * neighbours, `passes` times over: a sea pixel between the grid's last sea cells and the real
 * coastline then has a value to show.
 */
export function extendSeaward(values: ArrayLike<number>, cols: number, rows: number, passes = 2): Float32Array {
  let cur = Float32Array.from(values);
  for (let p = 0; p < passes; p++) {
    const next = cur.slice();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (Number.isFinite(cur[i])) continue;
        let sum = 0, n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
            const v = cur[rr * cols + cc];
            if (Number.isFinite(v)) (sum += v), n++;
          }
        if (n) next[i] = sum / n;
      }
    cur = next;
  }
  return cur;
}

const masks = new WeakMap<CoastTest, globalThis.Map<string, Uint8Array>>();
function pixelMask(coast: CoastTest, key: string, width: number, height: number, lngOf: (i: number) => number, latOf: (j: number) => number): Uint8Array {
  let byShape = masks.get(coast);
  if (!byShape) masks.set(coast, (byShape = new globalThis.Map()));
  const hit = byShape.get(key);
  if (hit) return hit;
  const px = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    const lat = latOf(j);
    for (let i = 0; i < width; i++) px[j * width + i] = coast(lngOf(i), lat);
  }
  byShape.set(key, px);
  return px;
}

export interface SeaImageOptions {
  /** Pixel size, degrees of longitude. */
  pixelDeg: number;
  /** Where the sea is. Without it every cell with a value paints (the old behaviour). */
  coast?: CoastTest | null;
  /** How many cells to carry values toward the coastline (extendSeaward). */
  extend?: number;
  /** Leave pixels inside this box clear (corners as `coordinates`), e.g. where a finer image covers. */
  hole?: Corners;
}

/**
 * `values` (NaN = no data) on grid `g` as an image cut at the coastline. Each pixel the coast test
 * calls land stays clear; each sea pixel takes the bilinear value of the finite grid corners around it
 * (values carried `extend` cells seaward, so the colour meets the beach) and `word(value)` as its RGBA
 * word (0 = clear). Where the coast isn't known only the grid's own cells paint.
 */
export function seaImage(g: RegularGrid, values: ArrayLike<number>, word: (v: number) => number, o: SeaImageOptions): SeaImage {
  const w = g.lon0 - g.dlon / 2, n = g.lat0 + g.dlat / 2;
  const e = g.lon0 + (g.cols - 0.5) * g.dlon, s = g.lat0 - (g.rows - 0.5) * g.dlat;
  const yN = mercY(n), yS = mercY(s);
  const width = Math.max(1, Math.round((e - w) / o.pixelDeg));
  const height = Math.max(1, Math.round((width * (yN - yS)) / ((e - w) * RAD)));
  const lngOf = (i: number) => w + ((i + 0.5) / width) * (e - w);
  const latOf = (j: number) => latOfMercY(yN - ((j + 0.5) / height) * (yN - yS));
  const mask = o.coast ? pixelMask(o.coast, `${w},${n},${e},${s},${width},${height}`, width, height, lngOf, latOf) : null;
  const near = o.coast ? extendSeaward(values, g.cols, g.rows, o.extend ?? 2) : values;
  const hole = o.hole;
  // Bilinear corners and weights per column (the grid is regular, so per row below).
  const col0 = new Int32Array(width), tx = new Float32Array(width), inHoleX = new Uint8Array(width), colN = new Int32Array(width);
  for (let i = 0; i < width; i++) {
    const lng = lngOf(i);
    const fx = Math.min(Math.max((lng - g.lon0) / g.dlon, 0), g.cols - 1);
    col0[i] = Math.max(0, Math.min(Math.floor(fx), g.cols - 2));
    tx[i] = g.cols > 1 ? fx - col0[i] : 0;
    colN[i] = Math.round(fx);
    inHoleX[i] = hole && lng > hole[0][0] && lng < hole[1][0] ? 1 : 0;
  }
  const data = new Uint8ClampedArray(width * height * 4);
  const words = new Uint32Array(data.buffer);
  const right = g.cols > 1 ? 1 : 0, down = g.rows > 1 ? g.cols : 0;
  for (let j = 0; j < height; j++) {
    const lat = latOf(j);
    const holeRow = hole && lat < hole[0][1] && lat > hole[2][1];
    const fy = Math.min(Math.max((g.lat0 - lat) / g.dlat, 0), g.rows - 1);
    const r = Math.max(0, Math.min(Math.floor(fy), g.rows - 2)), ty = g.rows > 1 ? fy - r : 0;
    const rowN = Math.round(fy) * g.cols;
    for (let i = 0; i < width; i++) {
      if (holeRow && inHoleX[i]) continue;
      const p = j * width + i;
      const m = mask ? mask[p] : 2;
      if (m === 1) continue;
      // Coast unknown: only inside the grid's own cells with a value, as a cell-for-cell image would.
      if (m === 2 && !(values[rowN + colN[i]] === values[rowN + colN[i]])) continue;
      const v = m === 0 ? near : values;
      const k0 = r * g.cols + col0[i], t = tx[i];
      const a = v[k0], b = v[k0 + right], c = v[k0 + down], d = v[k0 + down + right];
      const wa = (1 - t) * (1 - ty), wb = t * (1 - ty), wc = (1 - t) * ty, wd = t * ty;
      let sum = 0, wt = 0;
      if (wa > 0 && a === a) (sum += a * wa), (wt += wa);
      if (wb > 0 && b === b) (sum += b * wb), (wt += wb);
      if (wc > 0 && c === c) (sum += c * wc), (wt += wc);
      if (wd > 0 && d === d) (sum += d * wd), (wt += wd);
      if (wt > 0) words[p] = word(sum / wt);
    }
  }
  return { width, height, data, coordinates: [[w, n], [e, n], [e, s], [w, s]] };
}

/**
 * A free-form sea-only image over `box` ([west, south, east, north]): `word(lng, lat, i, j)` gives
 * each sea pixel's RGBA word (0 = clear; i, j are the pixel's column and row). Pixels the coast
 * test calls land are never asked. For categorical cells (sargassum detections, fishing effort)
 * that are drawn as blocks, so a block on the shore keeps only its sea part.
 */
export function paintSea(box: readonly [number, number, number, number], pixelDeg: number, coast: CoastTest | null | undefined, word: (lng: number, lat: number, i: number, j: number) => number): SeaImage {
  const [w, s, e, n] = box;
  const yN = mercY(n), yS = mercY(s);
  const width = Math.max(1, Math.round((e - w) / pixelDeg));
  const height = Math.max(1, Math.round((width * (yN - yS)) / ((e - w) * RAD)));
  const lngOf = (i: number) => w + ((i + 0.5) / width) * (e - w);
  const latOf = (j: number) => latOfMercY(yN - ((j + 0.5) / height) * (yN - yS));
  const mask = coast ? pixelMask(coast, `${w},${n},${e},${s},${width},${height}`, width, height, lngOf, latOf) : null;
  const data = new Uint8ClampedArray(width * height * 4);
  const words = new Uint32Array(data.buffer);
  const lngs = Float64Array.from({ length: width }, (_, i) => lngOf(i));
  for (let j = 0; j < height; j++) {
    const lat = latOf(j);
    for (let i = 0; i < width; i++) {
      const p = j * width + i;
      if (mask && mask[p] === 1) continue;
      words[p] = word(lngs[i], lat, i, j);
    }
  }
  return { width, height, data, coordinates: [[w, n], [e, n], [e, s], [w, s]] };
}
