/**
 * CLARITY map layer and VIS readout (PLAN 6.1): estimated underwater visibility over Gandoca–Limón,
 * from the satellite Kd490 (chlorophyll where it has none), river plumes after catchment rain and
 * waves stirring the bottom (physics/clarity.ts). Green ≥ 8 m, amber 3 to 8 m, red under 3 m.
 * Rain and waves come from the forecast, so the layer changes as the time slider moves; the
 * satellite part is the newest map. Style layer ids start with `cl-` (catalog 'clarity').
 */
import type { Map } from 'maplibre-gl';
import { PLUME_RIVERS, REGION } from '../region';
import { cellAt, M_PER_DEG_LAT, M_PER_DEG_LNG, sample, type Grid } from '../physics/bathy';
import { latOfMercY, mercY } from './seafloor-shade';
import { CLARITY_BANDS, clarity, effectiveRain, plumeKd, type Clarity, type ClarityLevel } from '../physics/clarity';
import { chlAt, kd490At, type SatelliteData } from '../adapters/satellite';
import type { CatchmentRain } from '../adapters/catchment-rain';
import { readout } from '../hud-kit';
import { t, type Key } from '../i18n';

const RAD = Math.PI / 180;
/** Layer grid: REGION.bounds every 0.004° (~440 m), about 210 × 160 cells. */
export const CLARITY_STEP = 0.004;
/**
 * Map image pixel, degrees (~66 m, twice the coastline mask's cell). The physics grid above is too
 * coarse to draw a coastline with, so the image is drawn finer and cut at the coastline mask.
 */
export const CLARITY_PIXEL_DEG = 0.0006;
/** Water by the coastline mask but dry in the ~460 m depth grid is the surf zone: this deep, m (as the depth shading does). */
const SHORE_DEPTH_M = 2;

export interface ClarityContext {
  satellite: SatelliteData | null;
  rain: CatchmentRain | null;
  /** Elevation (m, positive up) for depth, and the land mask where `land` doesn't reach. */
  elevation: Grid;
  /**
   * Coastline mask (1 = land, ~33 m cells) from the seafloor data. It decides sea or land wherever it
   * covers: the ~460 m depth grid alone puts the sea over Cahuita, Limón and every headland.
   */
  land?: Grid | null;
  /** Sea state at a point and the slider's time, or null. Sampled on a 0.05° lattice. */
  seaAt: (lng: number, lat: number) => { hs: number; tp: number } | null;
  ms: number;
}

/** Plume rain per river at `ms`. */
export const riverRain = (rain: CatchmentRain | null, ms: number) =>
  PLUME_RIVERS.map((r) => ({ ...r, rainMm: rain?.byRiver[r.name] ? effectiveRain(rain.times, rain.byRiver[r.name], ms) : 0 }));

/** Water depth at a sea point, m; null on land. The coastline mask decides where it covers. */
export function seaDepthAt(c: Pick<ClarityContext, 'elevation' | 'land'>, lng: number, lat: number): number | null {
  const z = sample(c.elevation, lng, lat);
  const m = c.land ? cellAt(c.land, lng, lat) : NaN;
  if (m === 1) return null;
  if (m === 0) return Number.isFinite(z) && z < -SHORE_DEPTH_M ? -z : SHORE_DEPTH_M;
  return z < 0 ? -z : null;
}

/** Clarity at one sea point; null on land. */
export function clarityAt(c: ClarityContext, lng: number, lat: number, rivers = riverRain(c.rain, c.ms), sea = c.seaAt(lng, lat)): Clarity | null {
  const depthM = seaDepthAt(c, lng, lat);
  if (depthM === null) return null;
  const mx = M_PER_DEG_LNG * Math.cos(lat * RAD);
  let plume = 0;
  for (const r of rivers) if (r.rainMm > 0) plume += plumeKd(r.catchmentKm2, r.rainMm, Math.hypot((lng - r.mouth[0]) * mx, (lat - r.mouth[1]) * M_PER_DEG_LAT));
  const sat = c.satellite;
  return clarity({
    kd490: (sat && kd490At(sat, lng, lat, c.ms)?.value) ?? NaN,
    chl: (sat && chlAt(sat, lng, lat, c.ms)?.value) ?? NaN,
    plumeKd: plume,
    hs: sea?.hs ?? NaN,
    tp: sea?.tp ?? NaN,
    depthM,
  });
}

export interface ClarityGrid {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  step: number;
  /** Visibility, m; NaN on land. Row 0 north. */
  vis: Float32Array;
}

/** Visibility over REGION.bounds at the context's time. */
export function clarityGrid(c: ClarityContext): ClarityGrid {
  const [[w, s], [e, n]] = REGION.bounds;
  const cols = Math.round((e - w) / CLARITY_STEP) + 1, rows = Math.round((n - s) / CLARITY_STEP) + 1;
  const vis = new Float32Array(cols * rows).fill(NaN);
  const rivers = riverRain(c.rain, c.ms);
  // The wave grid is 0.25° (nest 1/12°), so one sea state per 0.05° block is plenty.
  const seaMemo = new globalThis.Map<string, { hs: number; tp: number } | null>();
  const seaFor = (lng: number, lat: number) => {
    const k = `${Math.round(lng * 20)},${Math.round(lat * 20)}`;
    if (!seaMemo.has(k)) seaMemo.set(k, c.seaAt(Math.round(lng * 20) / 20, Math.round(lat * 20) / 20));
    return seaMemo.get(k)!;
  };
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++) {
      const lng = w + col * CLARITY_STEP, lat = n - r * CLARITY_STEP;
      const x = clarityAt(c, lng, lat, rivers, seaFor(lng, lat));
      if (x) vis[r * cols + col] = x.visM;
    }
  return { cols, rows, lon0: w, lat0: n, step: CLARITY_STEP, vis };
}

/** Fill opacity per level: muddier water shows stronger. */
const ALPHA: Record<ClarityLevel, number> = { GOOD: 0.07, FAIR: 0.26, POOR: 0.42 };

export interface ClarityImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Corners for a MapLibre image source: NW, NE, SE, SW. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/**
 * Copy of `vis` with each land cell next to the sea given the mean of its sea neighbours, `passes`
 * times over, so a water pixel between the coarse sea cells and the real coastline has a value.
 */
export function extendSeaward(vis: Float32Array, cols: number, rows: number, passes = 2): Float32Array {
  let cur = vis;
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

/** Per pixel, what the coastline mask says there: 1 land, 0 water, 2 outside the mask. Cached per mask and image shape. */
const maskCache = new WeakMap<Grid, { key: string; px: Uint8Array }>();
function pixelMask(land: Grid, key: string, width: number, height: number, lngOf: (i: number) => number, latOf: (j: number) => number): Uint8Array {
  const hit = maskCache.get(land);
  if (hit?.key === key) return hit.px;
  const px = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    const lat = latOf(j);
    for (let i = 0; i < width; i++) {
      const m = cellAt(land, lngOf(i), lat);
      px[j * width + i] = m === 1 ? 1 : m === 0 ? 0 : 2;
    }
  }
  maskCache.set(land, { key, px });
  return px;
}

/**
 * The visibility grid as an RGBA image cut at the coastline: pixels the mask calls land stay empty
 * however the coarse grid reads there. Rows are evenly spaced in Web Mercator, so the four-corner image
 * source puts every pixel where it belongs. Pure (no DOM); `colours` are 0..255 RGB per level.
 * Inside the mask, water near the shore takes the nearest sea value (bilinear over the finite corners);
 * outside it, only the grid's own sea cells draw.
 */
export function clarityImage(g: ClarityGrid, land: Grid | null | undefined, colours: Record<ClarityLevel, readonly [number, number, number]>, pixelDeg = CLARITY_PIXEL_DEG): ClarityImage {
  const h = g.step / 2;
  const w = g.lon0 - h, n = g.lat0 + h, e = g.lon0 + (g.cols - 1) * g.step + h, s = g.lat0 - (g.rows - 1) * g.step - h;
  const yN = mercY(n), yS = mercY(s);
  const width = Math.max(1, Math.round((e - w) / pixelDeg));
  const height = Math.max(1, Math.round((width * (yN - yS)) / ((e - w) * RAD)));
  const lngOf = (i: number) => w + ((i + 0.5) / width) * (e - w);
  const latOf = (j: number) => latOfMercY(yN - ((j + 0.5) / height) * (yN - yS));
  const mask = land ? pixelMask(land, `${w},${n},${e},${s},${width},${height}`, width, height, lngOf, latOf) : null;
  const near = land ? extendSeaward(g.vis, g.cols, g.rows) : g.vis;
  // Bilinear corners and weights per column and per row (the grid is regular in both).
  const col0 = new Int32Array(width), tx = new Float32Array(width);
  for (let i = 0; i < width; i++) {
    const fx = Math.min(Math.max((lngOf(i) - g.lon0) / g.step, 0), g.cols - 1);
    col0[i] = Math.min(Math.floor(fx), g.cols - 2);
    tx[i] = fx - col0[i];
  }
  // One RGBA word per level, written through a 32-bit view (in the platform's byte order).
  const data = new Uint8ClampedArray(width * height * 4);
  const words = new Uint32Array(data.buffer);
  const rgba = (lvl: ClarityLevel) => new Uint32Array(Uint8ClampedArray.from([...colours[lvl], Math.round(255 * ALPHA[lvl])]).buffer)[0];
  const [good, fair, poor] = [rgba('GOOD'), rgba('FAIR'), rgba('POOR')];
  const { good: goodM, fair: fairM } = CLARITY_BANDS;
  for (let j = 0; j < height; j++) {
    const fy = Math.min(Math.max((g.lat0 - latOf(j)) / g.step, 0), g.rows - 1);
    const r = Math.min(Math.floor(fy), g.rows - 2), ty = fy - r;
    for (let i = 0; i < width; i++) {
      const p = j * width + i;
      const m = mask ? mask[p] : 2;
      if (m === 1) continue;
      const vis = m === 0 ? near : g.vis;
      const k0 = r * g.cols + col0[i], t = tx[i];
      let sum = 0, wt = 0;
      const a = vis[k0], b = vis[k0 + 1], c = vis[k0 + g.cols], d = vis[k0 + g.cols + 1];
      const wa = (1 - t) * (1 - ty), wb = t * (1 - ty), wc = (1 - t) * ty, wd = t * ty;
      if (wa > 0 && a === a) (sum += a * wa), (wt += wa);
      if (wb > 0 && b === b) (sum += b * wb), (wt += wb);
      if (wc > 0 && c === c) (sum += c * wc), (wt += wc);
      if (wd > 0 && d === d) (sum += d * wd), (wt += wd);
      if (!(wt > 0)) continue;
      const v = sum / wt; // clarityLevel, inlined
      words[p] = v >= goodM ? good : v >= fairM ? fair : poor;
    }
  }
  return { width, height, data, coordinates: [[w, n], [e, n], [e, s], [w, s]] };
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
const rgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 176, 0];
};

export interface ClarityLayer {
  update(c: ClarityContext): void;
}

export function mountClarity(map: Map): ClarityLayer {
  const colours: Record<ClarityLevel, [number, number, number]> = {
    GOOD: rgb(cssColour('--green', '#39ff7a')),
    FAIR: rgb(cssColour('--amber', '#ffb000')),
    POOR: rgb(cssColour('--red', '#ff3b2f')),
  };
  const canvas = document.createElement('canvas');
  const draw = (g: ClarityGrid, land: Grid | null | undefined) => {
    const img = clarityImage(g, land, colours);
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    const coords = img.coordinates;
    const url = canvas.toDataURL('image/png');
    const src = map.getSource('cl') as { updateImage?: (o: { url: string; coordinates: typeof coords }) => void } | undefined;
    if (src?.updateImage) src.updateImage({ url, coordinates: coords });
    else if (map.isStyleLoaded() || map.getLayer('grat-macro')) {
      map.addSource('cl', { type: 'image', url, coordinates: coords });
      // Under the contours and labels, like the other area fills.
      const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : map.getLayer('grat-macro') ? 'grat-macro' : undefined;
      map.addLayer({ id: 'cl-fill', type: 'raster', source: 'cl', minzoom: 7, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 1], 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, below);
    }
  };
  // A redraw costs a few tens of ms (the fine coastline cut and the PNG), so while the slider is
  // dragged it runs at most every MIN_GAP_MS, always ending on the latest hour.
  const MIN_GAP_MS = 150;
  let pending: ClarityContext | null = null;
  let scheduled = false;
  let last = -Infinity;
  const run = () => {
    scheduled = false;
    const ctx = pending;
    if (!ctx) return;
    pending = null;
    last = performance.now();
    draw(clarityGrid(ctx), ctx.land);
  };
  return {
    update(c) {
      pending = c;
      if (scheduled) return;
      scheduled = true;
      const wait = Math.max(0, last + MIN_GAP_MS - performance.now());
      setTimeout(() => requestAnimationFrame(run), wait);
    },
  };
}

/** VIS readout in the side panel under SST: visibility at the cross-hair, coloured by level, with the main cause. */
export function mountClarityHud(root: HTMLElement, map: Map, ctx: () => ClarityContext | null) {
  const side = root.querySelector<HTMLElement>('.side');
  const sst = side?.querySelector('#sst')?.parentElement;
  if (!side || !sst) return null;
  sst.insertAdjacentHTML('afterend', readout(t('clarity.vis'), 'vis', t('unit.m')));
  const el = side.querySelector<HTMLElement>('#vis')!;
  const unit = el.nextElementSibling as HTMLElement;
  const TONE: Record<ClarityLevel, string> = { GOOD: 'green', FAIR: 'amber', POOR: 'red' };
  let queued = false;
  const update = () => {
    queued = false;
    const c = ctx();
    const p = map.getCenter();
    const x = c ? clarityAt(c, p.lng, p.lat) : null;
    el.textContent = x ? (x.visM >= 20 ? '20+' : x.visM.toFixed(x.visM < 3 ? 1 : 0)) : '--';
    el.className = 'seg ' + (x ? TONE[x.level] : '');
    unit.textContent = x ? `${t('unit.m')} ${x.cause === 'clear' ? '' : t(`clarity.cause.${x.cause}` as Key)}` : t('unit.m');
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
  return { refresh: update };
}
