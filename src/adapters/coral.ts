/**
 * Coral heat stress adapter (PLAN 7.23): NOAA Coral Reef Watch DHW, HotSpot, SST, SST anomaly and the
 * 7-day bleaching alert for each reef in CORAL_REEFS, relayed daily by the data build
 * (scripts/forecast/coral.ts). Shared by the CORAL overlay and the DIVE panel's heat card:
 *
 *   const d = await fetchCoral();
 *   const reef = nearestReef(d, lngLat);
 *   const now = reef && coralNow(d, reef); // now.dhw, now.alert, now.dhwDay, d.fetchedAt
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, inRange, type Check } from '../verify/types';
import { coralNow, lastIndex, type CoralData } from './coral-parse';

export * from './coral-parse';

export interface CoralLoaded extends CoralData {
  fromCache: boolean;
}

export async function fetchCoral(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<CoralLoaded> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}coral.json`, { deps });
  const d = (await r.response.json()) as CoralData;
  if (!Array.isArray(d.reefs) || !Array.isArray(d.days) || !Date.parse(d.fetchedAt)) throw new Error('coral: malformed file');
  dataAge.report('coral', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

const DAY = 864e5;

export function coralChecks(load: () => Promise<CoralLoaded>): Check[] {
  let cached: Promise<CoralLoaded> | null = null;
  const data = () => (cached ??= load());
  const all = async (k: 'dhw' | 'hotspot' | 'sst' | 'baa') => (await data()).reefs.flatMap((r) => r[k].map((x) => (x === null ? NaN : x)));
  return [
    { feed: 'coral', kind: 'schema', label: 'Every reef has a series', run: async () => {
      const d = await data();
      const short = d.reefs.filter((r) => r.dhw.length !== d.days.length);
      if (short.length) return { status: 'fail', detail: `${short.map((r) => r.id).join(', ')} misaligned` };
      return { status: d.reefs.length ? 'pass' : 'fail', detail: `${d.reefs.length} reefs × ${d.days.length} days` };
    } },
    { feed: 'coral', kind: 'fresh', label: 'Relayed within the last 2 days', run: async () => freshness(Date.now() - Date.parse((await data()).fetchedAt), DAY) },
    // CRW is a few days behind real time; past 10 days the NOAA side has stalled.
    { feed: 'coral', kind: 'fresh', label: 'Newest DHW day within 10 days', run: async () => {
      const d = await data();
      const now = d.reefs.map((r) => coralNow(d, r).dhwDay).filter(Number.isFinite);
      if (!now.length) return { status: 'fail', detail: 'no DHW values' };
      return freshness(Date.now() - Math.max(...now), 2.5 * DAY);
    } },
    { feed: 'coral', kind: 'range', label: 'DHW within 0..40 °C-weeks', run: async () => inRange(await all('dhw'), 0, 40, '°C-wk', 0.5) },
    { feed: 'coral', kind: 'range', label: 'SST within 20..35 °C', run: async () => inRange(await all('sst'), 20, 35, '°C', 0.5) },
    { feed: 'coral', kind: 'range', label: 'Alert level within 0..4', run: async () => {
      const d = await data();
      const missing = d.reefs.filter((r) => lastIndex(r.baa) < 0).map((r) => r.id);
      if (missing.length) return { status: 'warn', detail: `no alert level at ${missing.join(', ')}` };
      return inRange(await all('baa'), 0, 4, '');
    } },
  ];
}
