/**
 * Wind at each spot (PLAN 7.58a): the four 9-13 km weather models (ECMWF IFS 9 km, UK Met Office 10 km, ICON,
 * GFS) read over the water in front of each beach (`SPOTS[].sea`, Open-Meteo `cell_selection=sea`), in one
 * call. The map's wind layer is Open-Meteo's best-match model on a 0.25° (~27 km) grid, two cells across the
 * whole coast, which smooths out the afternoon sea breeze: over 2026-11-04..10 every model's land cell at the
 * Limón airport ran 2 to 4 kt under the airport's wind between 12:00 and 17:00 local.
 *
 * The blend (`spotWindAt`):
 *
 *   speed = Σ w_m · s_m                       (the models' speeds, weighted)
 *   dir   = atan2(Σ w_m · s_m · û_m)          (direction of the weighted mean vector)
 *
 * with w_m the wind weights from the airport scoring (adapters/weather-skill.ts, equal before it runs). Speeds
 * are averaged rather than the vectors, so two models that disagree on direction do not cancel into a calm. No
 * airport bias is taken off: that offset is measured on each model's land cell and these reads are sea cells,
 * which already blow harder. A place more than `SPOT_WIND_KM` from a spot's sea point, or an hour no model
 * covers, has no spot wind and the app falls back to the wind map.
 */
import { SPOTS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { freshness, inRange, type Check } from '../verify/types';
import { hourIndex, parseModelColumns, WEATHER_MODELS, type WeatherModel } from './weather';
import { haversineM } from '../geo';

export const SPOT_WIND_VARS = ['wind_speed_10m', 'wind_direction_10m'] as const;
type V = (typeof SPOT_WIND_VARS)[number];
/** A place reads a spot's wind within this distance of its sea point, km (a pin sits ~300 m behind it). */
export const SPOT_WIND_KM = 3;

export interface SpotWindPoint {
  name: string;
  /** The read point over the water. */
  lngLat: [number, number];
  /** model → speed m/s, direction FROM °T, hourly (NaN where missing). */
  models: Partial<Record<WeatherModel, Record<V, number[]>>>;
}

export interface SpotWind {
  times: number[];
  points: SpotWindPoint[];
  fetchedAt: number;
  fromCache: boolean;
}

export const spotWindPoints = () => SPOTS.map((s) => ({ name: s.name, lngLat: s.sea }));

export const spotWindUrl = (pts: readonly { lngLat: readonly [number, number] }[] = spotWindPoints(), days = 16) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p.lngLat[1]).join(',')}&longitude=${pts.map((p) => p.lngLat[0]).join(',')}&hourly=${SPOT_WIND_VARS.join(',')}&models=${WEATHER_MODELS.join(',')}&forecast_days=${days}&cell_selection=sea&timeformat=unixtime&timezone=GMT&wind_speed_unit=ms`;

export function parseSpotWind(json: unknown, fetchedAt: number, fromCache = false, pts: readonly { name: string; lngLat: [number, number] }[] = spotWindPoints()): SpotWind {
  const arr = Array.isArray(json) ? json : [json];
  if (arr.length !== pts.length) throw new Error(`spot wind: expected ${pts.length} points, got ${arr.length}`);
  const parsed = arr.map((j) => parseModelColumns(j, SPOT_WIND_VARS));
  return { times: parsed[0].times, points: parsed.map((p, k) => ({ name: pts[k].name, lngLat: pts[k].lngLat, models: p.models })), fetchedAt, fromCache };
}

export async function fetchSpotWind(opts: { deps?: Partial<CacheDeps> } = {}): Promise<SpotWind> {
  const r = await cachedFetch(spotWindUrl(), { deps: opts.deps });
  const d = parseSpotWind(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('spotwind', d.fetchedAt, d.fromCache);
  return d;
}

export interface SpotWindNow {
  speedMs: number;
  /** Direction the wind blows FROM, degrees true. */
  fromDeg: number;
  /** [east, north] m/s, the direction of travel at `speedMs`. */
  vec: [number, number];
  models: number;
}

const RAD = Math.PI / 180;

/** The spot sea point within SPOT_WIND_KM of [lng, lat], or null. */
export function spotWindPoint(d: SpotWind, lng: number, lat: number): SpotWindPoint | null {
  let best: SpotWindPoint | null = null, bestM = SPOT_WIND_KM * 1000;
  for (const p of d.points) {
    const m = haversineM([lng, lat], p.lngLat);
    if (m <= bestM) (best = p), (bestM = m);
  }
  return best;
}

/**
 * The blended wind at the spot near [lng, lat] for the hour containing `ms` (see the header); null away from the
 * spots or where no model covers the hour. `weights` are per-model blend weights (equal when absent).
 */
export function spotWindAt(d: SpotWind, lng: number, lat: number, ms: number, weights?: Partial<Record<WeatherModel, number>>): SpotWindNow | null {
  const p = spotWindPoint(d, lng, lat);
  const i = hourIndex(d.times, ms);
  if (!p || i < 0) return null;
  let w = 0, s = 0, ue = 0, un = 0, n = 0;
  for (const m of WEATHER_MODELS) {
    const v = p.models[m];
    const sp = v?.wind_speed_10m[i], dir = v?.wind_direction_10m[i];
    const wm = weights?.[m] ?? 1;
    if (sp === undefined || dir === undefined || !Number.isFinite(sp) || !Number.isFinite(dir) || !(wm > 0)) continue;
    w += wm;
    s += wm * sp;
    // Travel direction is FROM + 180°: east = −sin(from), north = −cos(from).
    ue -= wm * sp * Math.sin(dir * RAD);
    un -= wm * sp * Math.cos(dir * RAD);
    n++;
  }
  if (!n) return null;
  const speedMs = s / w;
  const fromDeg = (Math.atan2(-ue, -un) / RAD + 360) % 360;
  const vec: [number, number] = [-speedMs * Math.sin(fromDeg * RAD), -speedMs * Math.cos(fromDeg * RAD)];
  return { speedMs, fromDeg, vec, models: n };
}

/** Verify checks: every spot answers with the models over water, speeds physical, copy fresh. */
export function spotWindChecks(load: () => Promise<SpotWind> = () => fetchSpotWind()): Check[] {
  let cached: Promise<SpotWind> | null = null;
  const need = () => (cached ??= load());
  return [
    { feed: 'spotwind', kind: 'reach', label: 'Open-Meteo answers over the water at every spot with the four models', run: async () => {
      const d = await need();
      const counts = d.points.map((p) => Object.keys(p.models).length);
      const min = Math.min(...counts);
      return { status: min === WEATHER_MODELS.length ? 'pass' : min >= 2 ? 'warn' : 'fail', detail: `${d.points.length} spots, ${min}-${Math.max(...counts)} models each` };
    } },
    { feed: 'spotwind', kind: 'fresh', label: 'Fetched within the last 3 h', run: async () => freshness(Date.now() - (await need()).fetchedAt, 1.5 * 3.6e6) },
    { feed: 'spotwind', kind: 'range', label: 'Wind within 0..60 m/s', run: async () => {
      const d = await need();
      return inRange(d.points.flatMap((p) => Object.values(p.models).flatMap((m) => m!.wind_speed_10m.filter(Number.isFinite))), 0, 60, 'm/s', 0.02);
    } },
  ];
}
