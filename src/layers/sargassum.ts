/**
 * SARGASSUM layer and readout (PLAN 7.1). Where the satellite last saw floating weed (amber cells,
 * stronger with more), where it could not see (faint hatching: unknown, not clear), each mat drifted
 * forward with the current plus 2% of the wind to the slider's time (dots on dim tracks), and per
 * beach the 5-day landing outlook (labels). The CONDITIONS panel reads the outlook for the beach
 * nearest the cross-hair on the slider's day. Style layer ids start with `sg-` (catalog 'sargassum').
 */
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { REGION, SPOTS } from '../region';
import { beachOutlook, forecastLandings, sampleDrift, sargLevel, type BeachOutlook, type DriftEnd, type DriftEnv, type SargLevel, type UVGrid, type VelocityAt } from '../physics/drift';
import { coverage, latestCover, sargassumSeeds, type SargassumData } from '../adapters/sargassum';
import { currentsAt, type CurrentsData } from '../adapters/currents';
import { windAt, type WindData } from '../adapters/wind';
import type { GridSeries } from '../adapters/pack';
import { nearest } from '../geo';
import { paintSea, rgbaWord, type CoastTest } from './sea-image';
import { readout } from '../hud-kit';
import { t, type Key } from '../i18n';

const HOUR = 3.6e6, DAY = 864e5;
/** Forecast window, days. */
export const OUTLOOK_DAYS = 5;
/** A landing counts for a beach within this distance of it. */
export const BEACH_RADIUS_M = 8000;
/** The most mats drifted (largest first), to keep the forecast fast on a phone. */
const MAX_SEEDS = 400;

/** A VelocityAt over hourly fields from `fieldAt`, clamped to the series' times and memoised per hour. */
export function hourlySampler(fieldAt: (ms: number) => UVGrid | null, times: readonly number[]): VelocityAt {
  const memo = new globalThis.Map<number, UVGrid | null>();
  const t0 = times[0], t1 = times[times.length - 1];
  return (lng, lat, ms, out) => {
    const h = Math.round(Math.min(t1, Math.max(t0, ms)) / HOUR) * HOUR;
    if (!memo.has(h)) memo.set(h, fieldAt(Math.min(t1, Math.max(t0, h))));
    const f = memo.get(h);
    return !!f && sampleDrift(f, lng, lat, out);
  };
}

export interface SargInputs {
  data: SargassumData;
  currents: CurrentsData;
  wind: WindData | null;
  isWater: (lng: number, lat: number) => boolean;
  now: number;
}

export interface SargForecast {
  fromMs: number;
  /** Cell states for the map: newest cover per cell (null = unknown). */
  series: GridSeries;
  /** 1 where a cell centre is sea, so only sea is hatched as unknown. */
  sea: Uint8Array;
  outlook: BeachOutlook[];
  /** The 2% windage member's tracks, for the map. */
  tracks: { path: [number, number, number][]; end: DriftEnd }[];
  seeds: number;
  /** Share of the sea in the box seen in the last 5 days: below SEEN_ENOUGH a NONE is really "unknown". */
  seen: number;
}

/** Below this share of the sea seen, the readout says CLOUD instead of NONE. */
export const SEEN_ENOUGH = 0.2;

/**
 * Drift every recent sighting to `now + OUTLOOK_DAYS` with each windage and sum the landings per
 * beach. Before the current and wind forecasts begin (sightings are 1 to 5 days old), their first
 * hour stands in: persistence, said so in docs/DATA.md.
 */
export function sargassumForecast(i: SargInputs): SargForecast | null {
  const s = i.data.series, cur = i.currents.forecast;
  if (!s || !cur) return null;
  const current = hourlySampler((ms) => currentsAt(i.currents, 'forecast', ms)?.field ?? null, cur.meta.times);
  const wf = i.wind?.forecast;
  const wind: VelocityAt = wf ? hourlySampler((ms) => windAt(i.wind!, 'forecast', ms)?.field ?? null, wf.meta.times) : () => false;
  const env: DriftEnv = { current, wind, isWater: i.isWater };
  const seeds = sargassumSeeds(s, i.now).sort((a, b) => b.amount - a.amount).slice(0, MAX_SEEDS);
  const { landings, tracks } = forecastLandings(seeds, SPOTS, env, i.now + OUTLOOK_DAYS * DAY, BEACH_RADIUS_M);
  const g = s.meta.grid;
  const sea = Uint8Array.from({ length: g.cols * g.rows }, (_, k) => (i.isWater(g.lon0 + (k % g.cols) * g.dlon, g.lat0 - Math.floor(k / g.cols) * g.dlat) ? 1 : 0));
  return {
    fromMs: i.now, series: s, sea, seeds: seeds.length, seen: coverage(s, i.now).seen,
    outlook: beachOutlook(landings, SPOTS, i.now, OUTLOOK_DAYS),
    tracks: tracks.filter((x) => x.windage === 0.02).map(({ path, end }) => ({ path, end })),
  };
}

/** Outlook at one beach for the day containing `ms`: level, first arrival, agreement; null past the window. */
export function beachDay(f: SargForecast, name: string, ms: number): { level: SargLevel; km2: number; firstMs: number | null; agreement: number } | null {
  const o = f.outlook.find((b) => b.name === name);
  const k = Math.floor((ms - f.fromMs) / DAY);
  if (!o || k >= OUTLOOK_DAYS || ms < f.fromMs - DAY) return null;
  const km2 = o.byDay[Math.max(0, k)];
  return { level: sargLevel(km2), km2, firstMs: o.firstMs, agreement: o.agreement };
}

/** Position on a track at `ms` (linear between steps); null before it starts. */
export function trackAt(path: readonly [number, number, number][], ms: number): [number, number] | null {
  if (!path.length || ms < path[0][2]) return null;
  for (let k = 1; k < path.length; k++)
    if (path[k][2] >= ms) {
      const [a, b] = [path[k - 1], path[k]];
      const f = b[2] === a[2] ? 1 : (ms - a[2]) / (b[2] - a[2]);
      return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
    }
  const last = path[path.length - 1];
  return [last[0], last[1]];
}

const localDay = (ms: number) => t(`day.${new Date(ms + REGION.tzOffsetH * HOUR).getUTCDay()}` as Key);

function css(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
const rgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 176, 0];
};

export interface SargassumLayer {
  update(f: SargForecast, sliderMs: number): void;
}

/** Map layers: detection image (`sg-cells`), tracks (`sg-track`), mats at the slider time (`sg-mat`) and beach outlook labels (`sg-beach`). */
/** Detection image pixel, degrees (~220 m): fine enough to cut the 0.06° cells at the coastline. */
const SARG_PIXEL_DEG = 0.002;
/** Unknown cells are hatched: a diagonal stripe HATCH_ON pixels wide every HATCH_EVERY (about 0.09°, as before). */
const HATCH_EVERY = 45, HATCH_ON = 7;

/**
 * Map layers: detection image (`sg-cells`), tracks (`sg-track`), mats at the slider time (`sg-mat`) and beach outlook labels (`sg-beach`).
 * `coast` is where the sea is (sea-image.ts): the 6.6 km cells are cut at the coastline, so a shore cell doesn't paint the beach.
 */
export function mountSargassum(map: Map, coast: () => CoastTest | null = () => null): SargassumLayer {
  const canvas = document.createElement('canvas');
  let drawnFor: GridSeries | null = null;
  let drawnAt = -1;
  let drawnCoast: CoastTest | null = null;
  const ready = () => map.isStyleLoaded() || !!map.getLayer('grat-macro');

  const drawCells = (f: SargForecast) => {
    const s = f.series, g = s.meta.grid;
    const [r0, g0, b0] = rgb(css('--amber', '#ffb000'));
    const st = latestCover(s, f.fromMs);
    const hatch = rgbaWord(r0, g0, b0, Math.round(255 * 0.12));
    const h = g.dlon / 2, v = g.dlat / 2;
    const box = [g.lon0 - h, g.lat0 - (g.rows - 1) * g.dlat - v, g.lon0 + (g.cols - 1) * g.dlon + h, g.lat0 + v] as const;
    drawnCoast = coast();
    const img = paintSea(box, SARG_PIXEL_DEG, drawnCoast, (lng, lat, i, j) => {
      const col = Math.round((lng - g.lon0) / g.dlon), row = Math.round((g.lat0 - lat) / g.dlat);
      if (col < 0 || row < 0 || col >= g.cols || row >= g.rows) return 0;
      const k = row * g.cols + col;
      const c = st[k];
      // Unknown: faint diagonal hatching. Mats: amber, stronger with more cover.
      if (c.cover === null) return f.sea[k] && (i + j) % HATCH_EVERY < HATCH_ON ? hatch : 0;
      return c.cover > 0 ? rgbaWord(r0, g0, b0, Math.round(255 * Math.min(0.85, 0.35 + 25 * c.cover))) : 0;
    });
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    const coordinates = img.coordinates;
    const url = canvas.toDataURL('image/png');
    const src = map.getSource('sg') as { updateImage?: (o: { url: string; coordinates: typeof coordinates }) => void } | undefined;
    if (src?.updateImage) src.updateImage({ url, coordinates });
    else {
      map.addSource('sg', { type: 'image', url, coordinates });
      const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : map.getLayer('grat-macro') ? 'grat-macro' : undefined;
      map.addLayer({ id: 'sg-cells', type: 'raster', source: 'sg', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } }, below);
    }
  };

  const vectors = (f: SargForecast, ms: number): { tracks: FeatureCollection; points: FeatureCollection } => {
    const tracks: FeatureCollection = {
      type: 'FeatureCollection',
      features: f.tracks.filter((x) => x.path.length > 1).map((x) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: x.path.map((p) => [p[0], p[1]]) } })),
    };
    const mats = f.tracks.flatMap((x) => {
      const p = trackAt(x.path, ms);
      return p ? [{ type: 'Feature' as const, properties: { kind: 'mat', ashore: x.end.fate === 'beached' && ms >= x.end.ms ? 1 : 0, label: '' }, geometry: { type: 'Point' as const, coordinates: p } }] : [];
    });
    const beaches = SPOTS.flatMap((b) => {
      const d = beachDay(f, b.name, ms);
      if (!d || d.level === 'NONE') return [];
      return [{ type: 'Feature' as const, properties: { kind: 'beach', level: d.level, label: `${t('sarg.short')} ${t(`sarg.level.${d.level}` as Key)}` }, geometry: { type: 'Point' as const, coordinates: [...b.lngLat] } }];
    });
    return { tracks, points: { type: 'FeatureCollection', features: [...mats, ...beaches] } };
  };

  const ensureVectors = (v: { tracks: FeatureCollection; points: FeatureCollection }) => {
    const ts = map.getSource('sg-t') as { setData?: (d: FeatureCollection) => void } | undefined;
    if (ts?.setData) {
      ts.setData(v.tracks);
      (map.getSource('sg-p') as unknown as { setData(d: FeatureCollection): void }).setData(v.points);
      return;
    }
    const amber = css('--amber', '#ffb000'), red = css('--red', '#ff3b2f');
    map.addSource('sg-t', { type: 'geojson', data: v.tracks });
    map.addSource('sg-p', { type: 'geojson', data: v.points });
    map.addLayer({ id: 'sg-track', type: 'line', source: 'sg-t', paint: { 'line-color': amber, 'line-width': 1, 'line-opacity': 0.35, 'line-dasharray': [2, 2] } });
    map.addLayer({ id: 'sg-mat', type: 'circle', source: 'sg-p', filter: ['==', ['get', 'kind'], 'mat'], paint: { 'circle-radius': 2.5, 'circle-color': amber, 'circle-opacity': ['case', ['==', ['get', 'ashore'], 1], 0.4, 0.9] } });
    map.addLayer({
      id: 'sg-beach', type: 'symbol', source: 'sg-p', filter: ['==', ['get', 'kind'], 'beach'], minzoom: 8,
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': ['match', ['get', 'level'], 'HIGH', red, amber], 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };

  let last: { f: SargForecast; ms: number } | null = null;
  let queued = false;
  const render = () => {
    queued = false;
    if (!last || !ready()) return;
    if (drawnFor !== last.f.series || drawnAt !== last.f.fromMs || drawnCoast !== coast()) {
      drawCells(last.f);
      drawnFor = last.f.series;
      drawnAt = last.f.fromMs;
    }
    ensureVectors(vectors(last.f, last.ms));
  };
  map.on('style.load', () => {
    drawnFor = null;
    render();
  });
  return {
    update(f, ms) {
      last = { f, ms };
      if (!queued) (queued = true), requestAnimationFrame(render);
    },
  };
}

const TONE: Record<SargLevel, string> = { NONE: 'green', LOW: 'amber', MODERATE: 'amber', HIGH: 'red' };

/** SARG readout in the side panel under VIS: the outlook at the beach nearest the cross-hair on the slider's day. */
export function mountSargassumHud(root: HTMLElement, map: Map, get: () => { f: SargForecast | null; ms: number }) {
  const side = root.querySelector<HTMLElement>('.side');
  const after = side?.querySelector('#vis')?.parentElement ?? side?.querySelector('#sst')?.parentElement;
  if (!side || !after) return null;
  after.insertAdjacentHTML('afterend', readout(t('sarg.label'), 'sarg', ''));
  const el = side.querySelector<HTMLElement>('#sarg')!;
  const unit = el.nextElementSibling as HTMLElement;
  const update = () => {
    const { f, ms } = get();
    const c = map.getCenter();
    const b = nearest([c.lng, c.lat], SPOTS);
    const d = f && b && b.distanceM < 30000 ? beachDay(f, b.point.name, ms) : null;
    // Nothing seen coming, but the satellite barely saw the sea: unknown, not clear.
    if (d && d.level === 'NONE' && f!.seen < SEEN_ENOUGH) {
      el.textContent = '--';
      el.className = 'seg';
      unit.textContent = t('sarg.cloud');
      return;
    }
    el.textContent = d ? t(`sarg.level.${d.level}` as Key) : '--';
    el.className = 'seg ' + (d ? TONE[d.level] : '');
    unit.textContent = !d ? '' : d.level === 'NONE' ? '' : d.firstMs !== null && d.firstMs <= f!.fromMs ? t('sarg.ashore') : d.firstMs !== null ? `${t('sarg.from')} ${localDay(d.firstMs)}` : '';
  };
  let queued = false;
  map.on('move', () => {
    if (!queued) (queued = true), requestAnimationFrame(() => ((queued = false), update()));
  });
  update();
  return { refresh: update };
}
