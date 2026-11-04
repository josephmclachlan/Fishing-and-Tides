/**
 * Weather adapter (PLAN 7.3): rain, cloud, UV and air temperature from GFS, ECMWF IFS and ICON through
 * Open-Meteo's multi-model endpoint, for one point at the region centre (the region is ~90 km wide, well
 * inside one 0.25° model cell pair, so a point is honest for the HUD; a grid comes with the radar layer).
 * Models keep separate series so the ensemble blend (PLAN 7.4) can weight them. Missing hours are NaN:
 * each model reaches a different horizon and ECMWF has no UV.
 */
import { REGION } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { freshness, inRange, type Check } from '../verify/types';

export const WEATHER_MODELS = ['gfs_seamless', 'ecmwf_ifs025', 'icon_seamless'] as const;
export type WeatherModel = (typeof WEATHER_MODELS)[number];
export const WEATHER_VARS = ['precipitation', 'cloud_cover', 'uv_index', 'temperature_2m', 'wind_gusts_10m', 'cape', 'pressure_msl'] as const;
export type WeatherVar = (typeof WEATHER_VARS)[number];

export interface WeatherData {
  /** Hour starts, epoch ms. */
  times: number[];
  /** model → variable → hourly values (NaN where the model has none). Rain mm per hour, cloud %, UV index, °C, gusts kt, CAPE J/kg, sea-level pressure hPa. */
  models: Partial<Record<WeatherModel, Record<WeatherVar, number[]>>>;
  /** When the bytes were fetched, epoch ms. */
  fetchedAt: number;
  fromCache: boolean;
}

export const weatherUrl = (point: readonly [number, number] = REGION.center, days = 16) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${point[1]}&longitude=${point[0]}&hourly=${WEATHER_VARS.join(',')}&models=${WEATHER_MODELS.join(',')}&forecast_days=${days}&timeformat=unixtime&wind_speed_unit=kn`;

/** Turn Open-Meteo's `hourly` block (unixtime, keys like `precipitation_gfs_seamless`) into WeatherData. */
export function parseWeather(json: unknown, fetchedAt: number, fromCache = false): WeatherData {
  const h = (json as { hourly?: Record<string, (number | null)[]> } | null)?.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('weather: no hourly block');
  const times = (h.time as number[]).map((s) => s * 1000);
  const models: WeatherData['models'] = {};
  for (const m of WEATHER_MODELS) {
    const vars = {} as Record<WeatherVar, number[]>;
    let any = false;
    for (const v of WEATHER_VARS) {
      const col = h[`${v}_${m}`];
      vars[v] = times.map((_, i) => (col && typeof col[i] === 'number' ? (col[i] as number) : NaN));
      any ||= !!col && col.some((x) => typeof x === 'number');
    }
    if (any) models[m] = vars;
  }
  return { times, models, fetchedAt, fromCache };
}

export async function fetchWeather(opts: { deps?: Partial<CacheDeps>; point?: readonly [number, number] } = {}): Promise<WeatherData> {
  const r = await cachedFetch(weatherUrl(opts.point), { deps: opts.deps });
  const d = parseWeather(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('weather', d.fetchedAt, d.fromCache);
  return d;
}

export interface WeatherNow {
  model: WeatherModel;
  rainMmH: number;
  cloudPct: number;
  uv: number;
  tempC: number;
  gustKt: number;
  capeJkg: number;
  /** Mean sea-level pressure, hPa (NaN where the model has none). */
  pressureHpa: number;
}

/** Index of the hour containing `ms`, or -1 outside the series. */
function hourIndex(d: WeatherData, ms: number): number {
  if (!d.times.length) return -1;
  const i = Math.floor((ms - d.times[0]) / 3.6e6);
  return i >= 0 && i < d.times.length ? i : -1;
}

/** Every model's reading for the hour containing `ms`; a model with no value for that hour is left out. */
export function weatherAt(d: WeatherData, ms: number): WeatherNow[] {
  const i = hourIndex(d, ms);
  if (i < 0) return [];
  const out: WeatherNow[] = [];
  for (const m of WEATHER_MODELS) {
    const v = d.models[m];
    if (!v || Number.isNaN(v.precipitation[i])) continue;
    out.push({ model: m, rainMmH: v.precipitation[i], cloudPct: v.cloud_cover[i], uv: v.uv_index[i], tempC: v.temperature_2m[i], gustKt: v.wind_gusts_10m[i], capeJkg: v.cape[i], pressureHpa: v.pressure_msl[i] });
  }
  return out;
}

/** Rain accumulated by one model over [fromMs, toMs), mm. NaN hours count as 0; null if the model is absent. */
export function rainAccumMm(d: WeatherData, model: WeatherModel, fromMs: number, toMs: number): number | null {
  const v = d.models[model];
  if (!v) return null;
  let sum = 0;
  d.times.forEach((t, i) => {
    if (t >= fromMs && t < toMs && Number.isFinite(v.precipitation[i])) sum += v.precipitation[i];
  });
  return sum;
}

/** Verify checks (DESIGN §10). The browser fetches live, so freshness is of the cached copy. */
export function weatherChecks(load: () => Promise<WeatherData> = () => fetchWeather()): Check[] {
  let cached: Promise<WeatherData> | null = null;
  const data = () => (cached ??= load());
  const all = (v: WeatherVar) => data().then((d) => Object.values(d.models).flatMap((m) => m![v].filter(Number.isFinite)));
  return [
    { feed: 'weather', kind: 'reach', label: 'Open-Meteo answers with GFS, ECMWF and ICON', run: async () => {
      const d = await data();
      const have = Object.keys(d.models);
      return { status: have.length === 3 ? 'pass' : have.length ? 'warn' : 'fail', detail: have.join(', ') || 'no model' };
    } },
    { feed: 'weather', kind: 'fresh', label: 'Fetched within the last 3 h', run: async () => freshness(Date.now() - (await data()).fetchedAt, 1.5 * 3.6e6) },
    { feed: 'weather', kind: 'range', label: 'Temperature within 15..40 °C', run: async () => inRange(await all('temperature_2m'), 15, 40, '°C', 0.02) },
    { feed: 'weather', kind: 'range', label: 'Rain within 0..150 mm per hour', run: async () => inRange(await all('precipitation'), 0, 150, 'mm/h', 0.02) },
    { feed: 'weather', kind: 'range', label: 'Gusts within 0..120 kt', run: async () => inRange(await all('wind_gusts_10m'), 0, 120, 'kt', 0.02) },
    { feed: 'weather', kind: 'range', label: 'CAPE within 0..6000 J/kg', run: async () => inRange(await all('cape'), 0, 6000, 'J/kg', 0.02) },
    { feed: 'weather', kind: 'range', label: 'UV index within 0..16', run: async () => inRange(await all('uv_index'), 0, 16, '', 0.02) },
    { feed: 'weather', kind: 'agree', label: 'Models agree on temperature within 3 °C', run: async () => {
      const d = await data();
      const now = weatherAt(d, Date.now()).map((w) => w.tempC).filter(Number.isFinite);
      if (now.length < 2) return { status: 'warn', detail: 'fewer than two models cover now' };
      const spread = Math.max(...now) - Math.min(...now);
      return { status: spread <= 3 ? 'pass' : 'warn', detail: `${spread.toFixed(1)} °C spread` };
    } },
  ];
}
