/**
 * CLARITY map layer and VIS readout (PLAN 6.1): estimated underwater visibility over Gandoca–Limón,
 * from the satellite Kd490 (chlorophyll where it has none), river plumes after catchment rain and
 * waves stirring the bottom (physics/clarity.ts). Green ≥ 8 m, amber 3 to 8 m, red under 3 m.
 * Rain and waves come from the forecast, so the layer changes as the time slider moves; the
 * satellite part is the newest map. Style layer ids start with `cl-` (catalog 'clarity').
 */
import type { Map } from 'maplibre-gl';
import { PLUME_RIVERS, REGION } from '../region';
import { M_PER_DEG_LAT, M_PER_DEG_LNG, sample, type Grid } from '../physics/bathy';
import { clarity, clarityLevel, effectiveRain, plumeKd, type Clarity, type ClarityLevel } from '../physics/clarity';
import { chlAt, kd490At, type SatelliteData } from '../adapters/satellite';
import type { CatchmentRain } from '../adapters/catchment-rain';
import { readout } from '../hud-kit';
import { t, type Key } from '../i18n';

const RAD = Math.PI / 180;
/** Layer grid: REGION.bounds every 0.004° (~440 m), about 210 × 160 cells. */
export const CLARITY_STEP = 0.004;

export interface ClarityContext {
  satellite: SatelliteData | null;
  rain: CatchmentRain | null;
  /** Elevation (m, positive up) for depth and the land mask. */
  elevation: Grid;
  /** Sea state at a point and the slider's time, or null. Sampled on a 0.05° lattice. */
  seaAt: (lng: number, lat: number) => { hs: number; tp: number } | null;
  ms: number;
}

/** Plume rain per river at `ms`. */
export const riverRain = (rain: CatchmentRain | null, ms: number) =>
  PLUME_RIVERS.map((r) => ({ ...r, rainMm: rain?.byRiver[r.name] ? effectiveRain(rain.times, rain.byRiver[r.name], ms) : 0 }));

/** Clarity at one sea point; null on land. */
export function clarityAt(c: ClarityContext, lng: number, lat: number, rivers = riverRain(c.rain, c.ms), sea = c.seaAt(lng, lat)): Clarity | null {
  const z = sample(c.elevation, lng, lat);
  if (!(z < 0)) return null;
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
    depthM: -z,
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
  let coords: [[number, number], [number, number], [number, number], [number, number]] | null = null;
  const draw = (g: ClarityGrid) => {
    canvas.width = g.cols;
    canvas.height = g.rows;
    const img = new ImageData(g.cols, g.rows);
    for (let i = 0; i < g.vis.length; i++) {
      const v = g.vis[i];
      if (!Number.isFinite(v)) continue;
      const lvl = clarityLevel(v);
      const [r, gg, b] = colours[lvl];
      img.data.set([r, gg, b, Math.round(255 * ALPHA[lvl])], i * 4);
    }
    canvas.getContext('2d')!.putImageData(img, 0, 0);
    const h = g.step / 2;
    const w = g.lon0 - h, n = g.lat0 + h, e = g.lon0 + (g.cols - 1) * g.step + h, s = g.lat0 - (g.rows - 1) * g.step - h;
    coords = [[w, n], [e, n], [e, s], [w, s]];
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
  let pending: ClarityContext | null = null;
  return {
    update(c) {
      const first = pending === null;
      pending = c;
      if (!first) return;
      requestAnimationFrame(() => {
        const ctx = pending!;
        pending = null;
        draw(clarityGrid(ctx));
      });
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
