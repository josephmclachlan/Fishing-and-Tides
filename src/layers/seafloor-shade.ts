/**
 * Depth-band shading raster for the seafloor layer. Pure, no DOM: returns RGBA pixels
 * the layer puts on a canvas. Rows are spaced evenly in Web Mercator so the image can be
 * pinned to four corners on the map without stretching.
 */
import { cellAt, gridBounds, hillshade, sample, type Grid } from '../physics/bathy';

const RAD = Math.PI / 180;
/** Web Mercator y (radians) of a latitude, and back. Image rows spaced evenly in y pin to four corners without stretching. */
export const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
export const latOfMercY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / RAD;

/** Index of the depth band `depthM` falls in: 0 above edges[0], edges.length beyond the last. */
export function depthBand(depthM: number, edges: readonly number[]): number {
  let i = 0;
  while (i < edges.length && depthM >= edges[i]) i++;
  return i;
}

export interface ShadeOptions {
  /** Output width, px. Height follows from the Mercator aspect. */
  width: number;
  /** Band edges, m, shallow to deep. */
  edges: readonly number[];
  /** Opacity per band (edges.length + 1 values), shallow bands brighter. */
  alphas: readonly number[];
  /** Shade colour, 0..255. */
  rgb: readonly [number, number, number];
  /** Leave pixels inside this [w, s, e, n] box empty (a finer grid covers them). */
  hole?: readonly [number, number, number, number];
  /** Depth over which shading fades in from the shoreline, m. Hides the coarse grid's coastline. */
  shoreFadeM?: number;
  /** Land mask (1 = land): no shading where it says land, whatever the depth grid says. */
  land?: Grid;
  /** Vertical exaggeration for the relief; finer grids need less. */
  relief?: number;
}

export interface ShadeImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Corners for a MapLibre image source: NW, NE, SE, SW. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/**
 * Stepped depth bands (chart-style tints, legible zoomed out) modulated by a hillshade so
 * ridges, canyons and the shelf break show as relief.
 */
export function renderShade(g: Grid, o: ShadeOptions): ShadeImage {
  const [w, s, e, n] = gridBounds(g);
  const yN = mercY(n);
  const yS = mercY(s);
  const width = Math.round(o.width);
  const height = Math.max(1, Math.round((width * (yN - yS)) / ((e - w) * RAD)));
  const shade: Grid = { ...g, z: hillshade(g, 315, 45, o.relief ?? 12) };
  const flat = Math.sin(45 * RAD);
  const fade = o.shoreFadeM ?? 3;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let j = 0; j < height; j++) {
    const lat = latOfMercY(yN - ((j + 0.5) / height) * (yN - yS));
    for (let i = 0; i < width; i++) {
      const lng = w + ((i + 0.5) / width) * (e - w);
      if (o.hole && lng >= o.hole[0] && lng <= o.hole[2] && lat >= o.hole[1] && lat <= o.hole[3]) continue;
      let depth = -sample(g, lng, lat);
      if (o.land) {
        const land = cellAt(o.land, lng, lat);
        if (land === 1) continue;
        // Water by the mask but dry in the coarse grid: the surf zone. Tint it as the shallowest band.
        if (land === 0 && depth <= 2) depth = 2;
      }
      if (!(depth > 1)) continue; // land, shoreline or no data
      const hs = sample(shade, lng, lat);
      // Relief: brighter on slopes facing the NW light, darker in their lee; 1 on the flat.
      const relief = Number.isFinite(hs) ? Math.min(1.8, Math.max(0.35, hs / flat)) : 1;
      const a = o.alphas[depthBand(depth, o.edges)] * relief * Math.min(1, (depth - 1) / fade);
      const k = (j * width + i) * 4;
      data[k] = o.rgb[0];
      data[k + 1] = o.rgb[1];
      data[k + 2] = o.rgb[2];
      data[k + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  return { width, height, data, coordinates: [[w, n], [e, n], [e, s], [w, s]] };
}
