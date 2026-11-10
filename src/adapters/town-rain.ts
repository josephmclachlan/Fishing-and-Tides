/**
 * Rain per town (PLAN 7.24 item 1): hourly rain from the four sharpest free global models through
 * Open-Meteo, at each RAIN_TOWNS point, in one multi-location call (CORS allowed, so the phone fetches
 * it through the offline cache like the weather adapter).
 *
 * Models: ECMWF IFS HRES 9 km (open data since Oct 2025), UK Met Office global 10 km, ICON and GFS
 * (seamless, ~13 km here). No storm-resolving model covers Costa Rica, so towns ~13 km apart sit in
 * neighbouring grid cells: the per-town numbers differ, but less than the real showers do.
 */
import { RAIN_TOWNS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { freshness, inRange, type Check } from '../verify/types';
import { toHourStart } from './weather';

export const TOWN_RAIN_MODELS = ['ecmwf_ifs', 'ukmo_global_deterministic_10km', 'icon_seamless', 'gfs_seamless'] as const;
export type TownRainModel = (typeof TOWN_RAIN_MODELS)[number];

export interface TownRain {
  /** Hour starts, epoch ms (shared by every town). */
  times: number[];
  /** Town id → model → rain mm in the hour starting at times[i]; NaN where the model has none. Models with no value at all are left out. */
  byTown: Record<string, Partial<Record<TownRainModel, number[]>>>;
  fetchedAt: number;
  fromCache: boolean;
}

export const townRainUrl = (towns = RAIN_TOWNS, days = 7) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${towns.map((t) => t.lngLat[1]).join(',')}&longitude=${towns.map((t) => t.lngLat[0]).join(',')}&hourly=precipitation&models=${TOWN_RAIN_MODELS.join(',')}&forecast_days=${days}&timeformat=unixtime&timezone=GMT`;

type Point = { hourly?: Record<string, (number | null)[]> };

export function parseTownRain(json: unknown, fetchedAt: number, fromCache = false, towns = RAIN_TOWNS): TownRain {
  const arr = (Array.isArray(json) ? json : [json]) as Point[];
  if (arr.length !== towns.length || !Array.isArray(arr[0]?.hourly?.time)) throw new Error(`town rain: expected ${towns.length} points`);
  const times = (arr[0].hourly!.time as number[]).map((s) => s * 1000);
  const byTown: TownRain['byTown'] = {};
  towns.forEach((t, k) => {
    const h = arr[k].hourly ?? {};
    const models: Partial<Record<TownRainModel, number[]>> = {};
    for (const m of TOWN_RAIN_MODELS) {
      const col = h[`precipitation_${m}`];
      if (!col || !col.some((x) => typeof x === 'number')) continue;
      // Open-Meteo stamps each hour's rain at its end; moved to the hour it fell in (PLAN 7.57).
      models[m] = toHourStart(times.map((_, i) => (typeof col[i] === 'number' ? (col[i] as number) : NaN)));
    }
    byTown[t.id] = models;
  });
  return { times, byTown, fetchedAt, fromCache };
}

export async function fetchTownRain(opts: { deps?: Partial<CacheDeps> } = {}): Promise<TownRain> {
  const r = await cachedFetch(townRainUrl(), { deps: opts.deps });
  const d = parseTownRain(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('townrain', d.fetchedAt, d.fromCache);
  return d;
}

/** Verify checks: every town answered with at least three models, values physical, copy fresh. */
export function townRainChecks(load: () => Promise<TownRain> = () => fetchTownRain()): Check[] {
  let cached: Promise<TownRain> | null = null;
  const need = () => (cached ??= load());
  return [
    { feed: 'townrain', kind: 'reach', label: 'Open-Meteo answers for every town with ECMWF 9 km, UK 10 km, ICON and GFS', run: async () => {
      const d = await need();
      const counts = RAIN_TOWNS.map((t) => Object.keys(d.byTown[t.id] ?? {}).length);
      const min = Math.min(...counts);
      return { status: min === TOWN_RAIN_MODELS.length ? 'pass' : min >= 2 ? 'warn' : 'fail', detail: `${min}-${Math.max(...counts)} models per town` };
    } },
    { feed: 'townrain', kind: 'fresh', label: 'Fetched within the last 3 h', run: async () => freshness(Date.now() - (await need()).fetchedAt, 1.5 * 3.6e6) },
    { feed: 'townrain', kind: 'range', label: 'Hourly rain within 0..200 mm', run: async () => {
      const d = await need();
      return inRange(Object.values(d.byTown).flatMap((m) => Object.values(m).flatMap((s) => s!.filter(Number.isFinite))), 0, 200, 'mm/h', 0.02);
    } },
  ];
}
