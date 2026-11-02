/**
 * Rain over the river catchments (PLAN 6.1), for the clarity layer's plume term: hourly rainfall
 * for the last 3 days and the next 16 at one point inside each PLUME_RIVERS catchment, from
 * Open-Meteo's best-match forecast (CORS allowed; one call for all the points, so the phone fetches
 * it directly through the offline cache, like the weather adapter).
 */
import { PLUME_RIVERS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { inRange, type Check } from '../verify/types';

export interface CatchmentRain {
  /** Hour starts, epoch ms. */
  times: number[];
  /** River name → rain mm per hour, NaN where missing. */
  byRiver: Record<string, number[]>;
  fetchedAt: number;
  fromCache: boolean;
}

/** The distinct rain points (two rivers can share one). */
export const rainPoints = (): [number, number][] => [...new Map(PLUME_RIVERS.map((r) => [r.rainAt.join(','), r.rainAt])).values()];

export const catchmentRainUrl = (pts = rainPoints()) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p[1]).join(',')}&longitude=${pts.map((p) => p[0]).join(',')}&hourly=precipitation&past_days=3&forecast_days=16&timeformat=unixtime&timezone=GMT`;

export function parseCatchmentRain(json: unknown, fetchedAt: number, fromCache = false): CatchmentRain {
  const pts = rainPoints();
  const arr = (Array.isArray(json) ? json : [json]) as { hourly?: { time?: number[]; precipitation?: (number | null)[] } }[];
  if (arr.length !== pts.length || !arr[0]?.hourly?.time) throw new Error(`catchment rain: expected ${pts.length} points`);
  const times = arr[0].hourly!.time!.map((s) => s * 1000);
  const series = arr.map((p) => times.map((_, i) => (typeof p.hourly?.precipitation?.[i] === 'number' ? (p.hourly.precipitation[i] as number) : NaN)));
  const byRiver: Record<string, number[]> = {};
  for (const r of PLUME_RIVERS) byRiver[r.name] = series[pts.findIndex((p) => p[0] === r.rainAt[0] && p[1] === r.rainAt[1])];
  return { times, byRiver, fetchedAt, fromCache };
}

export async function fetchCatchmentRain(opts: { deps?: Partial<CacheDeps> } = {}): Promise<CatchmentRain> {
  const r = await cachedFetch(catchmentRainUrl(), { deps: opts.deps });
  const d = parseCatchmentRain(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('rain', d.fetchedAt, d.fromCache);
  return d;
}

/** Verify checks: Open-Meteo answers for every catchment and the hourly rain is physical. */
export function catchmentRainChecks(load: () => Promise<CatchmentRain> = () => fetchCatchmentRain()): Check[] {
  let cached: Promise<CatchmentRain> | null = null;
  const need = () => (cached ??= load());
  return [
    { feed: 'rain', kind: 'reach', label: 'Open-Meteo answers for every catchment', run: async () => {
      const d = await need();
      return { status: 'pass', detail: `${Object.keys(d.byRiver).length} rivers, ${d.times.length} h` };
    } },
    // The wettest hours on this coast reach about 100 mm; 200 is beyond any record here.
    { feed: 'rain', kind: 'range', label: 'Hourly rain within 0..200 mm', run: async () => inRange(Object.values((await need()).byRiver).flat(), 0, 200, 'mm/h', 0.5) },
  ];
}
