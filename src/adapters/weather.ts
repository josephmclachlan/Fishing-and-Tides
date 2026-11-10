/**
 * Weather adapter (PLAN 7.3, per spot since PLAN 7.57): a full traditional forecast (air temperature, dew
 * point, chance and amount of rain, cloud, UV, gusts, CAPE, pressure, mean wind) at every spot in `SPOTS`,
 * from the four sharpest free global models through Open-Meteo's multi-model endpoint in one call:
 *
 * - ECMWF IFS HRES 9 km (open data since October 2025; was the 25 km ECMWF grid, which ran 1.2 °C cold at
 *   the Limón airport over 2026-11-04..10 in the history archive, against +0.0 for GFS and ICON),
 * - UK Met Office global 10 km,
 * - DWD ICON and NOAA GFS (seamless, ~13 km here).
 *
 * Models keep separate series so the ensemble blend (PLAN 7.4, src/blend.ts) can weight them; the weights come
 * from scoring the models at the airport (adapters/weather-skill.ts) and ride along as `skill`. Missing hours
 * are NaN: each model reaches a different horizon (UK about 7 days, ICON 7.5, ECMWF 10 to 15, GFS 16).
 *
 * Chance of rain is each centre's own ensemble (Open-Meteo's `precipitation_probability`: the share of
 * members with at least 0.1 mm in the hour): ECMWF ENS 51 members, GFS GEFS 31, ICON-EPS 40, UK MOGREPS-G
 * 18. `rainChancePct` pools them as one ~140-member ensemble (each centre weighted by its members).
 *
 * UV comes from CAMS (adapters/uv.ts) where it reaches; of these four only GFS has UV, and it reads about a
 * quarter low here (clear-sky noon 8.2 against the 11.2 that CAMS and the ozone climatology give for 9.6° N
 * in November), so past the CAMS days GFS is scaled by the two clear-sky curves' ratio (src/weather.ts uvAt).
 *
 * Open-Meteo gives rain and its probability for the hour ending at each stamp; they are moved back one hour
 * here so every series is indexed by the hour that starts at `times[i]`, like the rest of the app.
 */
import { REGION, SPOTS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { freshness, inRange, type Check } from '../verify/types';
import type { WeatherSkill } from './weather-skill';
import { fetchUv, type UvData } from './uv';
import { haversineM } from '../geo';

export const WEATHER_MODELS = ['ecmwf_ifs', 'ukmo_global_deterministic_10km', 'icon_seamless', 'gfs_seamless'] as const;
export type WeatherModel = (typeof WEATHER_MODELS)[number];
export const WEATHER_VARS = [
  'precipitation', 'precipitation_probability', 'cloud_cover', 'uv_index', 'uv_index_clear_sky', 'temperature_2m',
  'dew_point_2m', 'wind_gusts_10m', 'cape', 'pressure_msl', 'wind_speed_10m',
] as const;
export type WeatherVar = (typeof WEATHER_VARS)[number];
/** Open-Meteo sums these over the hour before each stamp. */
const PRECEDING_HOUR: readonly string[] = ['precipitation', 'precipitation_probability'];

/** Ensemble members behind each model's `precipitation_probability` (see the header). */
export const ENSEMBLE_MEMBERS: Record<WeatherModel, number> = { ecmwf_ifs: 51, ukmo_global_deterministic_10km: 18, icon_seamless: 40, gfs_seamless: 31 };

export type ModelSeries = Partial<Record<WeatherModel, Record<WeatherVar, number[]>>>;

export interface WeatherPoint {
  /** The spot this point is (SPOTS name). */
  name: string;
  lngLat: [number, number];
  /** model → variable → hourly values (NaN where the model has none). Rain mm in the hour, chance of rain %, cloud %, UV index, °C, gusts kt, CAPE J/kg, sea-level pressure hPa, mean wind kt. */
  models: ModelSeries;
}

export interface WeatherData {
  /** Hour starts, epoch ms (shared by every point). */
  times: number[];
  /** One entry per spot, in SPOTS order. */
  points: WeatherPoint[];
  /** CAMS UV for the coast (PLAN 7.57); absent when that call failed, and UV falls back to scaled GFS. */
  uv?: UvData;
  /** How each model did against the Limón airport lately (PLAN 7.4); absent until scored, and the blend falls back to equal weights. */
  skill?: WeatherSkill;
  /** When the bytes were fetched, epoch ms. */
  fetchedAt: number;
  fromCache: boolean;
}

export const weatherPoints = () => SPOTS.map((s) => ({ name: s.name, lngLat: s.lngLat }));

export const weatherUrl = (pts: readonly { lngLat: readonly [number, number] }[] = weatherPoints(), days = 16) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p.lngLat[1]).join(',')}&longitude=${pts.map((p) => p.lngLat[0]).join(',')}&hourly=${WEATHER_VARS.join(',')}&models=${WEATHER_MODELS.join(',')}&forecast_days=${days}&timeformat=unixtime&timezone=GMT&wind_speed_unit=kn`;

/** An hour-ending series as hour-starting: the value stamped at i + 1 belongs to the hour that starts at i. */
export const toHourStart = (xs: readonly number[]): number[] => xs.map((_, i) => (i + 1 < xs.length ? xs[i + 1] : NaN));

/**
 * Open-Meteo's multi-model `hourly` block (unixtime, keys like `precipitation_gfs_seamless`) as model → variable
 * → series. Models with no value at all are left out. Rain and its probability move to hour starts.
 */
export function parseModelColumns<V extends string>(json: unknown, vars: readonly V[]): { times: number[]; models: Partial<Record<WeatherModel, Record<V, number[]>>> } {
  const h = (json as { hourly?: Record<string, (number | null)[]> } | null)?.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('weather: no hourly block');
  const times = (h.time as number[]).map((s) => s * 1000);
  const models: Partial<Record<WeatherModel, Record<V, number[]>>> = {};
  for (const m of WEATHER_MODELS) {
    const out = {} as Record<V, number[]>;
    let any = false;
    for (const v of vars) {
      const col = h[`${v}_${m}`];
      const xs = times.map((_, i) => (col && typeof col[i] === 'number' ? (col[i] as number) : NaN));
      out[v] = PRECEDING_HOUR.includes(v) ? toHourStart(xs) : xs;
      any ||= !!col && col.some((x) => typeof x === 'number');
    }
    if (any) models[m] = out;
  }
  return { times, models };
}

/** Turn Open-Meteo's answer (one object, or one per point) into WeatherData. */
export function parseWeather(json: unknown, fetchedAt: number, fromCache = false, pts: readonly { name: string; lngLat: [number, number] }[] = weatherPoints()): WeatherData {
  const arr = Array.isArray(json) ? json : [json];
  const parsed = arr.map((j) => parseModelColumns(j, WEATHER_VARS));
  if (!parsed.length) throw new Error('weather: empty answer');
  const points = parsed.map((p, k) => ({ name: pts[k]?.name ?? `P${k}`, lngLat: pts[k]?.lngLat ?? REGION.center, models: p.models }));
  return { times: parsed[0].times, points, fetchedAt, fromCache };
}

export async function fetchWeather(opts: { deps?: Partial<CacheDeps> } = {}): Promise<WeatherData> {
  const [r, uv] = await Promise.all([cachedFetch(weatherUrl(), { deps: opts.deps }), fetchUv(opts).catch((err) => (console.warn('CAMS UV unavailable', err), undefined))]);
  const d = parseWeather(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('weather', d.fetchedAt, d.fromCache);
  return uv ? { ...d, uv } : d;
}

export interface WeatherNow {
  model: WeatherModel;
  rainMmH: number;
  cloudPct: number;
  /** The model's own UV index (only GFS has one; src/weather.ts uvAt gives the app's UV). */
  uv: number;
  tempC: number;
  gustKt: number;
  capeJkg: number;
  /** Mean sea-level pressure, hPa (NaN where the model has none). */
  pressureHpa: number;
  /** Mean 10 m wind, kt (NaN where the model has none). */
  windKt: number;
  /** Dew point, °C (PLAN 7.57). Optional so hand-made readings in tests stay valid. */
  dewC?: number;
  /** The model's ensemble chance of at least 0.1 mm in the hour, % (PLAN 7.57). */
  rainChancePct?: number;
  /** The model's clear-sky UV index (GFS only), for scaling past the CAMS days. */
  uvClear?: number;
}

/** Index of the hour containing `ms`, or -1 outside the series. */
export function hourIndex(times: readonly number[], ms: number): number {
  if (!times.length) return -1;
  const i = Math.floor((ms - times[0]) / 3.6e6);
  return i >= 0 && i < times.length ? i : -1;
}

/** The weather point nearest [lng, lat] (the region centre when not given). */
export function pointNear(d: WeatherData, at: readonly [number, number] = REGION.center): WeatherPoint | null {
  let best: WeatherPoint | null = null, bestM = Infinity;
  for (const p of d.points) {
    const m = haversineM(at as [number, number], p.lngLat);
    if (m < bestM) (best = p), (bestM = m);
  }
  return best;
}

/** Every model's reading for the hour containing `ms` at the spot nearest `at`; a model with no value for that hour is left out. */
export function weatherAt(d: WeatherData, ms: number, at?: readonly [number, number]): WeatherNow[] {
  const i = hourIndex(d.times, ms);
  const p = pointNear(d, at);
  if (i < 0 || !p) return [];
  const out: WeatherNow[] = [];
  for (const m of WEATHER_MODELS) {
    const v = p.models[m];
    if (!v || (Number.isNaN(v.precipitation[i]) && Number.isNaN(v.temperature_2m[i]))) continue;
    out.push({
      model: m, rainMmH: v.precipitation[i], cloudPct: v.cloud_cover[i], uv: v.uv_index[i], tempC: v.temperature_2m[i], gustKt: v.wind_gusts_10m[i],
      capeJkg: v.cape[i], pressureHpa: v.pressure_msl[i], windKt: v.wind_speed_10m[i], dewC: v.dew_point_2m[i], rainChancePct: v.precipitation_probability[i], uvClear: v.uv_index_clear_sky[i],
    });
  }
  return out;
}

/** Rain accumulated by one model over [fromMs, toMs) at the spot nearest `at`, mm. NaN hours count as 0; null if the model is absent. */
export function rainAccumMm(d: WeatherData, model: WeatherModel, fromMs: number, toMs: number, at?: readonly [number, number]): number | null {
  const v = pointNear(d, at)?.models[model];
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
  const all = (v: WeatherVar) => data().then((d) => d.points.flatMap((p) => Object.values(p.models).flatMap((m) => m![v].filter(Number.isFinite))));
  return [
    { feed: 'weather', kind: 'reach', label: 'Open-Meteo answers at every spot with ECMWF 9 km, UK 10 km, ICON and GFS', run: async () => {
      const d = await data();
      const counts = d.points.map((p) => Object.keys(p.models).length);
      const min = Math.min(...counts);
      const ok = d.points.length === SPOTS.length;
      return { status: ok && min === WEATHER_MODELS.length ? 'pass' : ok && min >= 2 ? 'warn' : 'fail', detail: `${d.points.length} spots, ${min}-${Math.max(...counts)} models each` };
    } },
    { feed: 'weather', kind: 'fresh', label: 'Fetched within the last 3 h', run: async () => freshness(Date.now() - (await data()).fetchedAt, 1.5 * 3.6e6) },
    { feed: 'weather', kind: 'range', label: 'Temperature within 15..40 °C', run: async () => inRange(await all('temperature_2m'), 15, 40, '°C', 0.02) },
    { feed: 'weather', kind: 'range', label: 'Dew point within 10..32 °C', run: async () => inRange(await all('dew_point_2m'), 10, 32, '°C', 0.02) },
    { feed: 'weather', kind: 'range', label: 'Rain within 0..150 mm per hour', run: async () => inRange(await all('precipitation'), 0, 150, 'mm/h', 0.02) },
    { feed: 'weather', kind: 'range', label: 'Chance of rain within 0..100 %', run: async () => inRange(await all('precipitation_probability'), 0, 100, '%', 0) },
    { feed: 'weather', kind: 'range', label: 'Gusts within 0..120 kt', run: async () => inRange(await all('wind_gusts_10m'), 0, 120, 'kt', 0.02) },
    { feed: 'weather', kind: 'range', label: 'CAPE within 0..6000 J/kg', run: async () => inRange(await all('cape'), 0, 6000, 'J/kg', 0.02) },
    { feed: 'weather', kind: 'agree', label: 'Models agree on temperature within 3 °C', run: async () => {
      const d = await data();
      const now = weatherAt(d, Date.now()).map((w) => w.tempC).filter(Number.isFinite);
      if (now.length < 2) return { status: 'warn', detail: 'fewer than two models cover now' };
      const spread = Math.max(...now) - Math.min(...now);
      return { status: spread <= 3 ? 'pass' : 'warn', detail: `${spread.toFixed(1)} °C spread` };
    } },
  ];
}
