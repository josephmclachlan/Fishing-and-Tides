/**
 * CLARITY map layer and VIS readout (PLAN 6.1): estimated underwater visibility over Gandoca–Limón,
 * from the satellite Kd490 (chlorophyll where it has none), river plumes after catchment rain and
 * waves stirring the bottom (physics/clarity.ts). Green ≥ 8 m, amber 3 to 8 m, red under 3 m.
 * Rain, currents and waves come from the forecast, so the layer changes as the time slider moves;
 * the satellite part is carried forward from the newest map (PLAN 7.2, physics/clarity-forecast.ts). Style layer ids start with `cl-` (catalog 'clarity').
 */
import type { Map } from 'maplibre-gl';
import { PLUME_RIVERS, REGION } from '../region';
import { cellAt, M_PER_DEG_LAT, M_PER_DEG_LNG, sample, type Grid } from '../physics/bathy';
import { CLARITY_BANDS, clarity, effectiveRain, flowPlumeMm, kdFromChl, resuspensionKd, PLUME_SATURATION_MM, type Clarity, type ClarityLevel } from '../physics/clarity';
import { riverMud, type MudSeries } from '../physics/runoff';
import { clarityBand, driftedPlumeKd, plumeDrift, satKdAt, satState, satWeight, waveSpread, type ClarityBand, type ClearKd, type SatState } from '../physics/clarity-forecast';
import { observedAt, type SatelliteData } from '../adapters/satellite';
import { projectMonthly, scalarAt } from '../adapters/frames';
import type { GridSeries } from '../adapters/pack';
import { landOf, offshoreFill, touchesLand } from '../physics/clarity-baseline';
import { coastTest, rgbaWord, seaImage, type SeaImage } from './sea-image';
import type { CatchmentRain } from '../adapters/catchment-rain';
import { flowRatio, type RiverFlow } from '../adapters/river-flow';
import { readout } from '../hud-kit';
import { t, type Key } from '../i18n';
import { parseSeen, seenCSV, seenStats, seenStore, type VisApp } from '../vis-seen';

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
  /** Measured river discharge (GloFAS). Where it covers the hour it can raise a river's plume above what the rain proxy gives. */
  flow?: RiverFlow | null;
  /** Elevation (m, positive up) for depth, and the land mask where `land` doesn't reach. */
  elevation: Grid;
  /**
   * Coastline mask (1 = land, ~33 m cells) from the seafloor data. It decides sea or land wherever it
   * covers: the ~460 m depth grid alone puts the sea over Cahuita, Limón and every headland.
   */
  land?: Grid | null;
  /** Sea state at a point and the slider's time, or null. Sampled on a 0.05° lattice. */
  seaAt: (lng: number, lat: number, ms?: number) => { hs: number; tp: number } | null;
  /** Surface current (m/s east, north) at a point and time, for plume drift (PLAN 7.2). */
  currentAt?: (lng: number, lat: number, ms: number) => readonly [number, number] | null;
  ms: number;
  /** Now, for the forecast lead time; default Date.now(). */
  nowMs?: number;
}

/**
 * Plume rain per river at `ms`, and how far the surface current has carried the plume (PLAN 7.2):
 * the mean current at the mouth over the plume's rain-weighted age, sampled at four times.
 * `rainMm` is the weighted catchment rain (or the flow's equivalent), as the coral and runoff rows read it;
 * `plumeMm` is what makes the plume: the river mud of physics/runoff.ts (wet ground, intensity, the river's
 * lag, clearing at sea; PLAN 7.50) on the PLUME_SATURATION_MM scale, or the measured flow's, whichever is more.
 * `ageS` is the mean age of that mud, for the drift.
 */
export const riverRain = (rain: CatchmentRain | null, ms: number, currentAt?: ClarityContext['currentAt'], flow?: RiverFlow | null) =>
  PLUME_RIVERS.map((r) => {
    const mm = rain?.byRiver[r.name];
    const ratio = flow ? flowRatio(flow, r.name, ms) : null;
    const wet = mm ? effectiveRain(rain.times, mm, ms) : 0;
    const flowMm = ratio === null ? 0 : flowPlumeMm(ratio);
    const rainMm = Math.max(wet, flowMm);
    const mud = mm ? mudAt(rain, r.name, r.catchmentKm2, ms) : { strength: 0, ageS: 0 };
    const plumeMm = Math.max(PLUME_SATURATION_MM * mud.strength, flowMm);
    let drift: [number, number] = [0, 0];
    const ageS = plumeMm > 0 ? mud.ageS : 0;
    if (mm && plumeMm > 0 && ageS > 0 && currentAt) {
      const age = ageS;
      let u = 0, v = 0, n = 0;
      for (let k = 0; k < 4; k++) {
        const c = currentAt(r.mouth[0], r.mouth[1], ms - (k / 3) * age * 1000);
        if (c) (u += c[0]), (v += c[1]), n++;
      }
      if (n) drift = plumeDrift(age, [u / n, v / n]);
    }
    return { ...r, rainMm, plumeMm, drift, ageS };
  });

/** River mud per catchment-rain load and river, computed once (the grid asks for every hour it shows). */
const mudMemo = new WeakMap<CatchmentRain, globalThis.Map<string, MudSeries>>();
/** Dry hours added after the rain series, so a time past its end still sees the river drain and the sea clear. */
const MUD_TAIL_H = 240;

/**
 * River mud at `ms` (strength 1 = full plume, and its mean age in s), from physics/runoff.ts on the river's
 * hourly catchment rain. Each value is the state at the end of its hour; between, it is interpolated. Past
 * the series the rain is taken as stopped, for MUD_TAIL_H hours.
 */
export function mudAt(rain: CatchmentRain, river: string, areaKm2: number, ms: number): { strength: number; ageS: number } {
  let byRiver = mudMemo.get(rain);
  if (!byRiver) mudMemo.set(rain, (byRiver = new globalThis.Map()));
  let m = byRiver.get(river);
  if (!m) byRiver.set(river, (m = riverMud([...(rain.byRiver[river] ?? []), ...Array(MUD_TAIL_H).fill(0)], areaKm2)));
  const t = rain.times;
  if (!t.length) return { strength: 0, ageS: 0 };
  const f = (ms - t[0]) / 3.6e6 - 1;
  if (f < 0) return { strength: 0, ageS: 0 };
  const last = m.strength.length - 1;
  const i = Math.min(Math.floor(f), last), j = Math.min(i + 1, last), w = Math.min(1, f - i);
  return { strength: m.strength[i] + (m.strength[j] - m.strength[i]) * w, ageS: m.ageS[i] + (m.ageS[j] - m.ageS[i]) * w };
}

/** Water depth at a sea point, m; null on land. The coastline mask decides where it covers. */
export function seaDepthAt(c: Pick<ClarityContext, 'elevation' | 'land'>, lng: number, lat: number): number | null {
  const z = sample(c.elevation, lng, lat);
  const m = c.land ? cellAt(c.land, lng, lat) : NaN;
  if (m === 1) return null;
  if (m === 0) return Number.isFinite(z) && z < -SHORE_DEPTH_M ? -z : SHORE_DEPTH_M;
  return z < 0 ? -z : null;
}

/**
 * A Kd490 series with every land-touching pixel replaced by the nearest pixel offshore of it, frame by
 * frame (PLAN 7.45, physics/clarity-baseline.ts): pixels on the shore also hold beach, surf and reef flat
 * (NOAA's 2 km pixels read 2 to 4 times murkier than the water a step out; GlobColour's 4 km about 1.1
 * times). Land is where no frame has a value.
 */
export function offshoreSeries(s: GridSeries): GridSeries {
  const { cols, rows } = s.meta.grid;
  const values: Record<string, Float32Array[]> = {};
  for (const k in s.values) {
    const coast = touchesLand(landOf(s.values[k], cols * rows), cols, rows);
    values[k] = s.values[k].map((f) => offshoreFill(f, coast, cols, rows));
  }
  return { meta: s.meta, values };
}

/**
 * Per satellite load: the shore-corrected Kd490 and baseline, and each point's history (the grid asks for every cell).
 * `nrt` is GlobColour's Kd490, about a day late (PLAN 7.47); `kd490` NOAA's, about 10 days late, which is past
 * SAT_MAX_AGE_D and so only anchors a point with no baseline.
 */
interface SatPrep {
  nrt: GridSeries | null;
  kd490: GridSeries | null;
  clim: GridSeries | null;
  /** The monthly baseline re-stamped around a year, by that year. */
  climByYear: globalThis.Map<number, GridSeries>;
  history: globalThis.Map<string, SatState | null>;
}
const satMemo = new WeakMap<SatelliteData, SatPrep>();
function prep(sat: SatelliteData): SatPrep {
  let p = satMemo.get(sat);
  if (!p) {
    p = { nrt: sat.kd490Nrt ? offshoreSeries(sat.kd490Nrt) : null, kd490: sat.kd490 && offshoreSeries(sat.kd490), clim: sat.kd490Clim ? offshoreSeries(sat.kd490Clim) : null, climByYear: new globalThis.Map(), history: new globalThis.Map() };
    satMemo.set(sat, p);
  }
  return p;
}

/** A point's satellite Kd history: shore-corrected Kd490 from the freshest map that has the point, else chlorophyll through Morel et al. (2007). */
export function satHistory(sat: SatelliteData, lng: number, lat: number): SatState | null {
  const memo = prep(sat).history;
  const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
  if (memo.has(key)) return memo.get(key)!;
  const from = (s: SatelliteData['kd490'], name: string, toKd: (x: number) => number) => {
    if (!s) return null;
    const t = s.meta.times;
    return satState(t, t.map((ms) => toKd(observedAt(s, name, lng, lat, ms)?.value ?? NaN)));
  };
  const p = prep(sat);
  const st = from(p.nrt, 'kd490', (x) => x) ?? from(p.kd490, 'kd490', (x) => x) ?? from(sat.chl, 'chl', (x) => (Number.isFinite(x) ? kdFromChl(x) : NaN));
  memo.set(key, st);
  return st;
}

/** Clear-water baseline at a point for the time of year of `ms` (blended between mid-months); null without the file or off its grid. */
export function clearKdAt(sat: SatelliteData, lng: number, lat: number, ms: number): ClearKd | null {
  const p = prep(sat);
  if (!p.clim) return null;
  const y = new Date(ms).getUTCFullYear();
  let s = p.climByYear.get(y);
  if (!s) p.climByYear.set(y, (s = projectMonthly(p.clim, ms)));
  const kd = scalarAt(s, 'kd490', lng, lat, ms);
  if (!(kd > 0)) return null;
  const med = s.values.kd490Med ? scalarAt(s, 'kd490Med', lng, lat, ms) : NaN;
  return { kd, med: med > 0 ? med : NaN };
}

type Rivers = ReturnType<typeof riverRain>;
type SeaHere = { hs: number; tp: number } | null;

/** Plume Kd at a point from every river. */
function plumeHere(rivers: Rivers, lng: number, lat: number): number {
  const mx = M_PER_DEG_LNG * Math.cos(lat * RAD);
  let plume = 0;
  for (const r of rivers) if (r.plumeMm > 0) plume += driftedPlumeKd(r.catchmentKm2, r.plumeMm, (lng - r.mouth[0]) * mx, (lat - r.mouth[1]) * M_PER_DEG_LAT, r.drift, r.ageS);
  return plume;
}

const speed = (v: readonly [number, number] | null | undefined) => (v ? Math.hypot(v[0], v[1]) : 0);

export interface ClarityAtOptions {
  /** Current speed here at the context's time, m/s (the grid samples it per block). */
  currentMs?: number;
  /** River plumes at another time (the newest satellite map's), memoised by the grid. */
  riversAt?: (ms: number) => Rivers;
  /** Sea state and current speed at a point at another time, memoised by the grid per block. */
  seaThen?: (lng: number, lat: number, ms: number) => { sea: SeaHere; cur: number };
  /** Also return the terms behind the value (VIS SEEN, PLAN 7.48). */
  terms?: boolean;
}

/** The model's terms at a point, 1/m, and what drove them; the satellite map's age in days (NaN without one). */
export interface ClarityTerms {
  satKd: number;
  plumeKd: number;
  resKd: number;
  satAgeD: number;
  hs: number;
  tp: number;
  depthM: number;
  currentMs: number;
}

export type ClarityAt = Clarity & ClarityBand & { terms?: ClarityTerms };

/** Clarity at one sea point, with its band; null on land. */
export function clarityAt(
  c: ClarityContext, lng: number, lat: number,
  rivers = riverRain(c.rain, c.ms, c.currentAt, c.flow), sea: SeaHere = c.seaAt(lng, lat, c.ms), opts: ClarityAtOptions = {},
): ClarityAt | null {
  const depthM = seaDepthAt(c, lng, lat);
  if (depthM === null) return null;
  const plume = plumeHere(rivers, lng, lat);
  const cur = opts.currentMs ?? speed(c.currentAt?.(lng, lat, c.ms));
  const hs = sea?.hs ?? NaN, tp = sea?.tp ?? NaN;
  // Satellite term (PLAN 7.45): the clear baseline, plus the newest map's murk while it is fresh and only the part
  // that the plume and bed stirring on the map's day don't explain.
  const hist = c.satellite ? satHistory(c.satellite, lng, lat) : null;
  let causes = 0;
  if (hist && satWeight((c.ms - hist.lastMs) / 864e5) > 0) {
    const then = hist.lastMs;
    const x = opts.seaThen ? opts.seaThen(lng, lat, then) : { sea: c.seaAt(lng, lat, then), cur: speed(c.currentAt?.(lng, lat, then)) };
    causes = plumeHere(opts.riversAt ? opts.riversAt(then) : riverRain(c.rain, then, c.currentAt, c.flow), lng, lat)
      + (x.sea ? resuspensionKd(x.sea.hs, x.sea.tp, depthM, x.cur) : 0);
  }
  const sat = satKdAt(hist, c.ms, c.satellite ? clearKdAt(c.satellite, lng, lat, c.ms) : null, causes);
  const leadDays = Math.max(0, (c.ms - (c.nowMs ?? Date.now())) / 864e5);
  const w = waveSpread(leadDays);
  const mid = clarity({ kd490: sat.kd, chl: NaN, plumeKd: plume, hs, tp, depthM, currentMs: cur });
  const band = clarityBand({
    sat, plumeKd: plume, leadDays,
    res: { lo: resuspensionKd(hs * (1 - w), tp, depthM, cur), mid: resuspensionKd(hs, tp, depthM, cur), hi: resuspensionKd(hs * (1 + w), tp, depthM, cur) },
  });
  if (!opts.terms) return { ...mid, ...band };
  const terms = { satKd: sat.kd, plumeKd: plume, resKd: resuspensionKd(hs, tp, depthM, cur), satAgeD: hist ? (c.ms - hist.lastMs) / 864e5 : NaN, hs, tp, depthM, currentMs: cur };
  return { ...mid, ...band, terms };
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
  const rivers = riverRain(c.rain, c.ms, c.currentAt, c.flow);
  const riversMemo = new globalThis.Map<number, Rivers>();
  const riversAt = (ms: number) => {
    let x = riversMemo.get(ms);
    if (!x) riversMemo.set(ms, (x = riverRain(c.rain, ms, c.currentAt, c.flow)));
    return x;
  };
  // The wave grid is 0.25° (nest 1/12°) and the currents are coarser than the layer, so one sea state and current per 0.05° block is plenty.
  const seaMemo = new globalThis.Map<string, { sea: SeaHere; cur: number }>();
  const seaFor = (lng: number, lat: number, ms?: number) => {
    const k = `${Math.round(lng * 20)},${Math.round(lat * 20)},${ms ?? ''}`;
    let x = seaMemo.get(k);
    if (!x) {
      const [bl, bt] = [Math.round(lng * 20) / 20, Math.round(lat * 20) / 20];
      seaMemo.set(k, (x = { sea: ms === undefined ? c.seaAt(bl, bt) : c.seaAt(bl, bt, ms), cur: speed(c.currentAt?.(bl, bt, ms ?? c.ms)) }));
    }
    return x;
  };
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++) {
      const lng = w + col * CLARITY_STEP, lat = n - r * CLARITY_STEP;
      const here = seaFor(lng, lat);
      const x = clarityAt(c, lng, lat, rivers, here.sea, { currentMs: here.cur, riversAt, seaThen: seaFor });
      if (x) vis[r * cols + col] = x.visM;
    }
  return { cols, rows, lon0: w, lat0: n, step: CLARITY_STEP, vis };
}

/**
 * Fill opacity per level: muddier water shows stronger. The whole layer fades to about half from zoom 11 to 13: at a beach
 * the cell covers the whole screen, and a full-strength red wash hid the reef and the shore (clarity review CL18).
 */
const ALPHA: Record<ClarityLevel, number> = { GOOD: 0.07, FAIR: 0.26, POOR: 0.42 };

/**
 * The visibility grid as an RGBA image cut at the coastline (sea-image.ts): pixels the mask calls land
 * stay empty however the coarse grid reads there, and sea pixels up to the beach take the nearest sea
 * value. Pure (no DOM); `colours` are 0..255 RGB per level.
 */
export function clarityImage(g: ClarityGrid, land: Grid | null | undefined, colours: Record<ClarityLevel, readonly [number, number, number]>, pixelDeg = CLARITY_PIXEL_DEG): SeaImage {
  const word = (l: ClarityLevel) => rgbaWord(...colours[l], Math.round(255 * ALPHA[l]));
  const [good, fair, poor] = [word('GOOD'), word('FAIR'), word('POOR')];
  const { good: goodM, fair: fairM } = CLARITY_BANDS;
  return seaImage(
    { cols: g.cols, rows: g.rows, lon0: g.lon0, lat0: g.lat0, dlon: g.step, dlat: g.step },
    g.vis,
    (v) => (v >= goodM ? good : v >= fairM ? fair : poor), // clarityLevel, inlined: this runs per pixel
    { pixelDeg, coast: land ? coastTest(land) : null, extend: 2 },
  );
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
      map.addLayer({ id: 'cl-fill', type: 'raster', source: 'cl', minzoom: 7, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 1, 11, 1, 13, 0.45], 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, below);
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

/** Local noon (Costa Rica) of the day `k` days after the one containing `ms`. */
export function noonAhead(ms: number, k: number, tzOffsetH: number = REGION.tzOffsetH): number {
  const H = 3.6e6;
  const local = ms + tzOffsetH * H;
  return Math.floor(local / 864e5) * 864e5 + 12 * H - tzOffsetH * H + k * 864e5;
}

const visText = (v: number) => (v >= 20 ? '20+' : v.toFixed(v < 3 ? 1 : 0));

/**
 * VIS SEEN row (PLAN 7.48): LOG asks for the visibility you saw at the cross-hair and stores it with what the
 * app says there now and the terms behind it; the row then shows how many, the median seen / app factor and
 * how many fell in the app's range. CSV downloads them. On this device only.
 */
function mountSeen(side: HTMLElement, map: Map, ctx: () => ClarityContext | null) {
  const store = seenStore();
  const stat = side.querySelector<HTMLElement>('#vis-stat')!;
  const show = () => {
    const s = seenStats(store.list());
    const n = store.list().length;
    const v = s ? { n: s.n, f: s.factor.toFixed(1), k: s.inRange } : null;
    stat.textContent = v ? t('clarity.seen.stat', v) : n ? String(n) : '--';
    stat.title = v ? t('clarity.seen.statTitle', v) : '';
  };
  side.querySelector('#vis-log')!.addEventListener('click', () => {
    const p = map.getCenter();
    const c = ctx();
    const now = Date.now();
    const x = c ? clarityAt({ ...c, ms: now }, p.lng, p.lat, undefined, undefined, { terms: true }) : null;
    const said = x ? `${visText(x.visM)} ${t('unit.m')} (${visText(x.visLo)}–${visText(x.visHi)})` : '--';
    const typed = window.prompt(t('clarity.seen.ask', { app: said }));
    if (typed === null) return;
    const seen = parseSeen(typed);
    if (!seen) return void window.alert(t('clarity.seen.bad'));
    const app: VisApp | null = x ? { visM: x.visM, visLo: x.visLo, visHi: x.visHi, cause: x.cause, confidence: x.confidence, ...x.terms } : null;
    store.add({ id: crypto.randomUUID?.() ?? String(now), t: now, lng: p.lng, lat: p.lat, ...seen, app });
    show();
  });
  side.querySelector('#vis-csv')!.addEventListener('click', () => {
    const xs = store.list();
    if (!xs.length) return void window.alert(t('clarity.seen.empty'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([seenCSV(xs)], { type: 'text/csv' }));
    a.download = `vis-seen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  show();
}

/**
 * VIS readout in the side panel under SST: visibility at the cross-hair, coloured by level, with
 * its likely range and the main cause (PLAN 6.1, 7.2). Under it, VIS DAYS: midday visibility for
 * the next three days, with how sure each is.
 */
export function mountClarityHud(root: HTMLElement, map: Map, ctx: () => ClarityContext | null) {
  const side = root.querySelector<HTMLElement>('.side');
  const sst = side?.querySelector('#sst')?.parentElement;
  if (!side || !sst) return null;
  sst.insertAdjacentHTML(
    'afterend',
    `${readout(t('clarity.vis'), 'vis', t('unit.m'))}<div class="ro"><span class="lbl">${t('clarity.days')}</span><span class="seg sm" id="vis-days">--</span></div>`
      + `<div class="ro"><span class="lbl">${t('clarity.seen')}</span><span class="seg sm" id="vis-seen"><button type="button" class="tab" id="vis-log">${t('clarity.seen.log')}</button><span id="vis-stat">--</span><button type="button" class="tab" id="vis-csv">${t('clarity.seen.csv')}</button></span></div>`,
  );
  mountSeen(side, map, ctx);
  const el = side.querySelector<HTMLElement>('#vis')!;
  const unit = el.nextElementSibling as HTMLElement;
  const days = side.querySelector<HTMLElement>('#vis-days')!;
  const TONE: Record<ClarityLevel, string> = { GOOD: 'green', FAIR: 'amber', POOR: 'red' };
  let queued = false;
  const update = () => {
    queued = false;
    const c = ctx();
    const p = map.getCenter();
    const x = c ? clarityAt(c, p.lng, p.lat) : null;
    el.textContent = x ? visText(x.visM) : '--';
    el.className = 'seg ' + (x ? TONE[x.level] : '');
    unit.textContent = x
      ? `${t('unit.m')} ${visText(x.visLo)}–${visText(x.visHi)} ${x.cause === 'clear' ? '' : t(`clarity.cause.${x.cause}` as Key)}`.trim()
      : t('unit.m');
    el.title = x ? t('clarity.conf', { c: t(`clarity.conf.${x.confidence}` as Key) }) : '';
    // Next three middays at the cross-hair: "+1 6 · +2 9 · +3 12?", ? for low confidence.
    if (!c || !x) {
      days.textContent = '--';
      return;
    }
    const now = c.nowMs ?? Date.now();
    days.innerHTML = [1, 2, 3]
      .map((k) => {
        const ms = noonAhead(now, k);
        const d = clarityAt({ ...c, ms }, p.lng, p.lat);
        if (!d) return '';
        const mark = d.confidence === 'LOW' ? '?' : '';
        return `<span class="${TONE[d.level]}">+${k} ${visText(d.visM)}${mark}</span>`;
      })
      .filter(Boolean)
      .join(' ');
  };
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(update);
  });
  update();
  return { refresh: update };
}
