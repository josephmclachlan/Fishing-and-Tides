/**
 * Rain over the river catchments (PLAN 6.1), for the clarity layer's plume term: hourly rainfall
 * for the last 7 days (5 of them say how wet the ground is, PLAN 7.50) and the next 16 at one point inside each PLUME_RIVERS catchment, from
 * Open-Meteo's best-match forecast (CORS allowed; one call for all the points, so the phone fetches
 * it directly through the offline cache, like the weather adapter).
 *
 * The past hours come from NASA's IMERG satellite rain averaged over each catchment where it has them
 * (PLAN 7.51, data/forecast/rain-imerg.json, about 5 h behind): what fell over the whole basin, not a
 * model's hindcast at one point. The model fills the hours after the satellite's last and any it
 * missed. Without the satellite file the model alone is used, as before.
 */
import { PLUME_RIVERS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, inRange, type Check } from '../verify/types';
import { imergHourly, type RainImerg } from './imerg-parse';
import { toHourStart } from './weather';

export interface CatchmentRain {
  /** Hour starts, epoch ms. */
  times: number[];
  /** River name → rain mm per hour, NaN where missing. */
  byRiver: Record<string, number[]>;
  fetchedAt: number;
  fromCache: boolean;
  /** River name → how many hours of `byRiver` are IMERG satellite rain (PLAN 7.51); absent without it. */
  satHours?: Record<string, number>;
  /** End of the newest satellite hour, epoch ms; absent without it. */
  satUntil?: number;
}

/** The distinct rain points (two rivers can share one). */
export const rainPoints = (): [number, number][] => [...new Map(PLUME_RIVERS.map((r) => [r.rainAt.join(','), r.rainAt])).values()];

export const catchmentRainUrl = (pts = rainPoints()) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p[1]).join(',')}&longitude=${pts.map((p) => p[0]).join(',')}&hourly=precipitation&past_days=7&forecast_days=16&timeformat=unixtime&timezone=GMT`;

export function parseCatchmentRain(json: unknown, fetchedAt: number, fromCache = false): CatchmentRain {
  const pts = rainPoints();
  const arr = (Array.isArray(json) ? json : [json]) as { hourly?: { time?: number[]; precipitation?: (number | null)[] } }[];
  if (arr.length !== pts.length || !arr[0]?.hourly?.time) throw new Error(`catchment rain: expected ${pts.length} points`);
  const times = arr[0].hourly!.time!.map((s) => s * 1000);
  // Open-Meteo stamps each hour's rain at its end; IMERG and the runoff model index hours by their start (PLAN 7.57).
  const series = arr.map((p) => toHourStart(times.map((_, i) => (typeof p.hourly?.precipitation?.[i] === 'number' ? (p.hourly.precipitation[i] as number) : NaN))));
  const byRiver: Record<string, number[]> = {};
  for (const r of PLUME_RIVERS) byRiver[r.name] = series[pts.findIndex((p) => p[0] === r.rainAt[0] && p[1] === r.rainAt[1])];
  return { times, byRiver, fetchedAt, fromCache };
}

/**
 * The model's hours replaced by the satellite's wherever it has a whole hour (both half hours), up to
 * the end of its newest; the satellite never reaches into the forecast. Returns a new object.
 */
export function withSatellite(model: CatchmentRain, sat: Pick<RainImerg, 'times' | 'byRiver'> | null): CatchmentRain {
  if (!sat || !sat.times.length) return model;
  const h = imergHourly(sat);
  const at = new Map(h.times.map((t, k) => [t, k]));
  const satHours: Record<string, number> = {};
  let satUntil = -Infinity;
  const byRiver: Record<string, number[]> = {};
  for (const [name, xs] of Object.entries(model.byRiver)) {
    const s = h.byRiver[name];
    let n = 0;
    byRiver[name] = xs.map((x, i) => {
      const k = at.get(model.times[i]);
      const v = s && k !== undefined ? s[k] : NaN;
      if (!Number.isFinite(v)) return x;
      n++;
      satUntil = Math.max(satUntil, model.times[i] + 3.6e6);
      return v;
    });
    satHours[name] = n;
  }
  return Number.isFinite(satUntil) ? { ...model, byRiver, satHours, satUntil } : model;
}

/** The published IMERG catchment rain; reports its age as `rain-imerg`. */
export async function fetchRainImerg(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<RainImerg & { fromCache: boolean }> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}rain-imerg.json`, { deps });
  const d = (await r.response.json()) as RainImerg;
  if (!Array.isArray(d.times) || !d.byRiver || !Date.parse(d.fetchedAt)) throw new Error('rain-imerg: malformed file');
  dataAge.report('rain-imerg', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

export async function fetchCatchmentRain(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<CatchmentRain> {
  const [r, sat] = await Promise.all([
    cachedFetch(catchmentRainUrl(), { deps: opts.deps }),
    fetchRainImerg(opts).catch((err) => (console.warn('satellite catchment rain unavailable', err), null)),
  ]);
  const d = parseCatchmentRain(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('rain', d.fetchedAt, d.fromCache);
  return withSatellite(d, sat);
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

/** Verify checks for the IMERG catchment rain: the build ran, IMERG is keeping up, and the rates are physical. */
export function rainImergChecks(load: () => Promise<RainImerg>): Check[] {
  let cached: Promise<RainImerg> | null = null;
  const need = () => (cached ??= load());
  return [
    // The build reads it every hourly run.
    { feed: 'rain-imerg', kind: 'fresh', label: 'Built within the last few hours', run: async () => freshness(Date.now() - Date.parse((await need()).fetchedAt), 1.5 * 3.6e6) },
    // IMERG Early is about 5 h behind; past 12 h it has stalled (or the login has failed and the old file was kept).
    { feed: 'rain-imerg', kind: 'fresh', label: 'Newest half hour within 12 h', run: async () => {
      const t = (await need()).times;
      return freshness(t.length ? Date.now() - t[t.length - 1] - 1800e3 : NaN, 3 * 3.6e6);
    } },
    { feed: 'rain-imerg', kind: 'range', label: 'Catchment rain rates within 0..150 mm/h', run: async () =>
      inRange(Object.values((await need()).byRiver).flat().map((x) => (x === null ? NaN : x)), 0, 150, 'mm/h', 0.5) },
  ];
}
