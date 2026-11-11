/**
 * CHLOROPHYLL map layer (PLAN 7.77, mockup G's fish preset): the newest satellite chlorophyll-a (VIIRS, gap-filled,
 * 9 km; adapters/satellite.ts) painted over the sea in the Kinetic Plus chlorophyll ramp (`--r-chl0..4`, the forecast
 * page's tokens), blended smoothly on a log scale from under 0.2 to over 1.3 mg/m³: clear blue water pale, green water deep green. Offshore fish hunt
 * the edge between the two (the FRONTS layer marks it). Drawn in two tiers like the sea temperature: the whole map, then the region finely enough to stop at the beach.
 * Style layer ids start with `ch-` (catalog 'chl').
 */
import type { ExpressionSpecification, ImageSource, Map } from 'maplibre-gl';
import type { SatelliteData } from '../adapters/satellite';
import { REGION, TIER_ZOOM } from '../region';
import { drawnCorners, extendSeaward, paintSea, rgbaWord, seaFrame, seaImage, type CoastTest, type Corners, type RegularGrid, type SeaImage } from './sea-image';
import { latOfMercY, mercY } from './seafloor-shade';
import { lifted, paintLift } from './paint';

/** The ramp's steps, mg/m³ (about even on a log scale): five colours, below the first to above the last. */
export const CHL_STEPS = [0.2, 0.35, 0.7, 1.3] as const;
const ALPHA = 0.5;

/** 0..4: the ramp colour for a concentration, mg/m³. Pure. */
export const chlTone = (mg: number) => CHL_STEPS.filter((x) => mg >= x).length;
const EDGES = [0.1, ...CHL_STEPS, 2.5];
/** 0..5 along the ramp, each step one unit wide, log-interpolated inside it (for the reading's pointer). Pure. */
export function chlIndex(mg: number): number {
  const k = chlTone(mg), a = EDGES[k], b = EDGES[k + 1];
  return Math.min(5, Math.max(0, k + (Math.log(Math.max(mg, 1e-3)) - Math.log(a)) / (Math.log(b) - Math.log(a))));
}

const hexRgb = (hex: string, fb: [number, number, number]): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};

function fillUrl(img: SeaImage) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Bilinear value of the grid at a point, skipping empty corners (NaN where all four are empty or off the grid), the
 * same blend seaImage gives each pixel. Pure.
 */
export function sampleSea(g: RegularGrid, v: ArrayLike<number>, lng: number, lat: number): number {
  const fx = (lng - g.lon0) / g.dlon, fy = (g.lat0 - lat) / g.dlat;
  if (!(fx >= -0.5 && fx <= g.cols - 0.5 && fy >= -0.5 && fy <= g.rows - 0.5)) return NaN;
  const x = Math.min(Math.max(fx, 0), g.cols - 1), y = Math.min(Math.max(fy, 0), g.rows - 1);
  const c = Math.max(0, Math.min(Math.floor(x), g.cols - 2)), r = Math.max(0, Math.min(Math.floor(y), g.rows - 2));
  const tx = g.cols > 1 ? x - c : 0, ty = g.rows > 1 ? y - r : 0;
  const k = r * g.cols + c, right = g.cols > 1 ? 1 : 0, down = g.rows > 1 ? g.cols : 0;
  let sum = 0, wt = 0;
  for (const [i, w] of [[k, (1 - tx) * (1 - ty)], [k + right, tx * (1 - ty)], [k + down, (1 - tx) * ty], [k + down + right, tx * ty]] as const) {
    const z = v[i];
    if (w > 0 && z === z) (sum += z * w), (wt += w);
  }
  return wt > 0 ? sum / wt : NaN;
}

/**
 * The coast tier's box: REGION.bounds widened to the edges of the surround image's own pixels, so the surround holed
 * there and the fine image meet without a gap or an overlap. The hole is in the image's own corners (what its pixels
 * are tested against); the box is where MapLibre will draw those pixel edges (`drawn`, see drawnCorners). Pure.
 */
export function pixelBox(img: Pick<SeaImage, 'width' | 'height' | 'coordinates'>, box: readonly [readonly [number, number], readonly [number, number]], drawn: Corners = img.coordinates) {
  const edges = (c: Corners) => {
    const [[w, n], [e], [, s]] = c;
    const yN = mercY(n), yS = mercY(s);
    return { w, e, yN, yS, lng: (i: number) => w + (i / img.width) * (e - w), lat: (j: number) => latOfMercY(yN - (j / img.height) * (yN - yS)) };
  };
  const o = edges(img.coordinates), d = edges(drawn), W = img.width, H = img.height;
  const i0 = Math.max(0, Math.floor(((box[0][0] - o.w) / (o.e - o.w)) * W)), i1 = Math.min(W, Math.ceil(((box[1][0] - o.w) / (o.e - o.w)) * W));
  const j0 = Math.max(0, Math.floor(((o.yN - mercY(box[1][1])) / (o.yN - o.yS)) * H)), j1 = Math.min(H, Math.ceil(((o.yN - mercY(box[0][1])) / (o.yN - o.yS)) * H));
  const hole: Corners = [[o.lng(i0), o.lat(j0)], [o.lng(i1), o.lat(j0)], [o.lng(i1), o.lat(j1)], [o.lng(i0), o.lat(j1)]];
  return { box: [d.lng(i0), d.lat(j1), d.lng(i1), d.lat(j0)] as [number, number, number, number], hole };
}

/**
 * Fill pixel sizes, degrees: ~1.1 km for the whole map when zoomed out; from the coast tier, ~110 m over the region so
 * the colour stops at the beach, and ~550 m around it. The surround is drawn unsmoothed: smoothing would fade its edge
 * pixels into the hole and leave a pale seam round the region; at 550 m its pixels are too small to see as blocks.
 */
const PIXEL_DEG = { macro: 0.01, outer: 0.005, coast: 0.001 } as const;
/**
 * A 9 km map says nothing about one beach: from the spot tier the fill steps back to a tint, so the fishing heat and
 * zones read on top of it rather than green on green.
 */
const FADE: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], TIER_ZOOM.SPOT - 1.5, 1, TIER_ZOOM.SPOT, 0.35];

export function mountChl(map: Map, d: SatelliteData, coast?: CoastTest | null) {
  const s = d.chl;
  if (!s) return null;
  const css = getComputedStyle(document.documentElement);
  const FB: [number, number, number][] = [[228, 239, 216], [183, 217, 142], [111, 179, 74], [42, 138, 30], [20, 82, 20]];
  const ramp = FB.map((fb, i) => hexRgb(css.getPropertyValue(`--r-chl${i}`), fb));
  const a = Math.round(255 * lifted(ALPHA, paintLift()));
  // A smooth ramp (log scale, one word per 1/100 of a step): the 9 km grid's steps would otherwise show as blocks.
  const N = 500;
  const lut = new Uint32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const x = Math.min(4, Math.max(0, k / 100 - 0.5)), i = Math.min(3, Math.floor(x)), t = x - i;
    const c = ramp[i].map((v, n) => Math.round(v + (ramp[i + 1][n] - v) * t)) as [number, number, number];
    lut[k] = rgbaWord(...c, a);
  }
  const word = (v: number) => (Number.isFinite(v) && v > 0 ? lut[Math.round(chlIndex(v) * 100)] : 0);
  const g = s.meta.grid;
  const z = s.values.chl?.[s.values.chl.length - 1] ?? new Float32Array(g.cols * g.rows).fill(NaN);
  const COAST = TIER_ZOOM.COAST;
  // Macro tier: the whole map, 1.1 km pixels. Coast tier: the region at 110 m, cut at the ~33 m coastline mask, with
  // a finer macro map around it (holed on its own pixel edges, so the two meet cleanly). A hard switch at the tier edge, as the sea temperature does.
  type Fill = { k: string; img: SeaImage; zoom: { minzoom?: number; maxzoom?: number }; nearest?: boolean };
  const makeFills = (c?: CoastTest | null): Fill[] => {
    const macro = { pixelDeg: PIXEL_DEG.macro, coast: c, extend: 3 };
    const around = { ...macro, pixelDeg: PIXEL_DEG.outer };
    const frame = seaFrame(g, PIXEL_DEG.outer);
    const { box, hole } = pixelBox(frame, REGION.bounds, drawnCorners(frame.coordinates));
    const near = c ? extendSeaward(z, g.cols, g.rows, 3) : z;
    return [
      { k: 'macro', img: seaImage(g, z, word, macro), zoom: { maxzoom: COAST } },
      { k: 'outer', img: seaImage(g, z, word, { ...around, hole }), zoom: { minzoom: COAST }, nearest: true },
      { k: 'coast', img: paintSea(box, PIXEL_DEG.coast, c, (lng, lat) => word(sampleSea(g, near, lng, lat))), zoom: { minzoom: COAST } },
    ];
  };
  let fills = makeFills(coast);
  const add = () => {
    if (map.getSource('ch-fill-macro')) return;
    const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : map.getLayer('grat-macro') ? 'grat-macro' : undefined;
    for (const { k, img, zoom, nearest } of fills) {
      map.addSource(`ch-fill-${k}`, { type: 'image', url: fillUrl(img), coordinates: img.coordinates });
      map.addLayer({ id: `ch-fill-${k}`, type: 'raster', source: `ch-fill-${k}`, ...zoom, paint: { 'raster-opacity': FADE, 'raster-fade-duration': 0, 'raster-resampling': nearest ? 'nearest' : 'linear' } }, below);
    }
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setCoast(c: CoastTest) {
      fills = makeFills(c);
      for (const { k, img } of fills) (map.getSource(`ch-fill-${k}`) as ImageSource | undefined)?.updateImage({ url: fillUrl(img), coordinates: img.coordinates });
    },
  };
}
