/**
 * River flow at the mouths (PLAN 7.15): daily discharge and its long-term median from GloFAS through
 * Open-Meteo's flood API (no key, CORS allowed), for each PLUME_RIVERS river at its `flowAt` main-stem cell
 * (the mouth itself snaps to a riverless coastal cell for most of them), 7 days back and 16 ahead.
 * One call covers every river, so the phone fetches it directly through the offline cache, like the
 * catchment rain. GloFAS runs on a ~5 km grid, so a small river's mouth may fall in a neighbour's cell:
 * the fishing term uses only the ratio to that cell's own median, which survives a wrong cell better
 * than the absolute flow.
 */
import { PLUME_RIVERS } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { inRange, type Check } from '../verify/types';

export interface RiverFlow {
  /** Day starts (UTC midnight), epoch ms. */
  times: number[];
  /** River name → discharge m³/s and the long-term median for that day of year, NaN where missing. */
  byRiver: Record<string, { q: number[]; median: number[] }>;
  fetchedAt: number;
  fromCache: boolean;
}

export const riverFlowUrl = () =>
  `https://flood-api.open-meteo.com/v1/flood?latitude=${PLUME_RIVERS.map((r) => r.flowAt[1]).join(',')}&longitude=${PLUME_RIVERS.map((r) => r.flowAt[0]).join(',')}&daily=river_discharge,river_discharge_median&past_days=7&forecast_days=16&timeformat=unixtime`;

type Point = { daily?: { time?: number[]; river_discharge?: (number | null)[]; river_discharge_median?: (number | null)[] } };
const num = (x: number | null | undefined) => (typeof x === 'number' ? x : NaN);

export function parseRiverFlow(json: unknown, fetchedAt: number, fromCache = false): RiverFlow {
  const arr = (Array.isArray(json) ? json : [json]) as Point[];
  if (arr.length !== PLUME_RIVERS.length || !arr[0]?.daily?.time) throw new Error(`river flow: expected ${PLUME_RIVERS.length} points`);
  const times = arr[0].daily!.time!.map((s) => s * 1000);
  const byRiver: RiverFlow['byRiver'] = {};
  PLUME_RIVERS.forEach((r, k) => {
    const d = arr[k].daily ?? {};
    byRiver[r.name] = { q: times.map((_, i) => num(d.river_discharge?.[i])), median: times.map((_, i) => num(d.river_discharge_median?.[i])) };
  });
  return { times, byRiver, fetchedAt, fromCache };
}

export async function fetchRiverFlow(opts: { deps?: Partial<CacheDeps> } = {}): Promise<RiverFlow> {
  const r = await cachedFetch(riverFlowUrl(), { deps: opts.deps });
  const d = parseRiverFlow(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('river', d.fetchedAt, d.fromCache);
  return d;
}

/** Flow as a share of the median for the day containing `ms` at one river, or null outside the series or with no median. */
export function flowRatio(d: RiverFlow, river: string, ms: number): number | null {
  const s = d.byRiver[river];
  const i = Math.floor((ms - d.times[0]) / 864e5);
  if (!s || i < 0 || i >= d.times.length) return null;
  const q = s.q[i], m = s.median[i];
  return Number.isFinite(q) && Number.isFinite(m) && m > 0 ? q / m : null;
}

/**
 * Verify checks: GloFAS answers for every river with a median, and the flows are physical. A river with no
 * median fails: its plume and fishing terms then silently drop out, which hid a wrong cell for weeks.
 */
export function riverFlowChecks(load: () => Promise<RiverFlow> = () => fetchRiverFlow()): Check[] {
  let cached: Promise<RiverFlow> | null = null;
  const need = () => (cached ??= load());
  return [
    { feed: 'river', kind: 'reach', label: 'GloFAS answers for every river', run: async () => {
      const d = await need();
      const noMedian = Object.entries(d.byRiver).filter(([, s]) => !s.median.some((x) => x > 0)).map(([n]) => n);
      return noMedian.length ? { status: 'fail', detail: `no median flow for ${noMedian.join(', ')}` } : { status: 'pass', detail: `${Object.keys(d.byRiver).length} rivers, ${d.times.length} days` };
    } },
    // The Sixaola, the biggest river here, peaks at a few thousand m³/s in floods; 20 000 is beyond any record.
    { feed: 'river', kind: 'range', label: 'Daily discharge within 0..20000 m³/s', run: async () => inRange(Object.values((await need()).byRiver).flatMap((s) => s.q), 0, 20000, 'm³/s', 0.5) },
  ];
}
