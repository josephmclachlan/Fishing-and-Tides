/**
 * Active tropical storms (PLAN 7.3), from NHC's CurrentStorms.json relayed by the data build
 * (scripts/forecast/storms.ts). Position, intensity and motion only; the forecast cone and track need
 * NHC's GIS files and come with the weather tracker layer (PLAN 7.5). Advisory links are kept so the
 * UI can point at the official text. Not for safety decisions: follow the national weather service (IMN).
 */
import { REGION } from '../region';
import { haversineM } from '../geo';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, type Check } from '../verify/types';
import { parseStorms, type Storm, type StormData } from './storms-parse';

export { parseStorms, type Storm, type StormData };

export interface StormsLoaded extends StormData {
  fromCache: boolean;
}

export async function fetchStorms(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<StormsLoaded> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}storms.json`, { deps });
  const d = (await r.response.json()) as StormData;
  if (!Array.isArray(d.storms) || !Date.parse(d.fetchedAt)) throw new Error('storms: malformed file');
  dataAge.report('storms', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

/** Distance from the region centre to a storm, km. */
export const stormRangeKm = (s: Storm) => haversineM(REGION.center, s.lngLat) / 1000;

/** Saffir-Simpson category from sustained wind in knots; 0 for a tropical storm or weaker. */
export const stormCategory = (windKt: number) =>
  windKt >= 137 ? 5 : windKt >= 113 ? 4 : windKt >= 96 ? 3 : windKt >= 83 ? 2 : windKt >= 64 ? 1 : 0;

export function stormsChecks(load: () => Promise<StormsLoaded>): Check[] {
  let cached: Promise<StormsLoaded> | null = null;
  const data = () => (cached ??= load());
  return [
    { feed: 'storms', kind: 'schema', label: 'Storm list is well formed', run: async () => {
      const d = await data();
      return { status: 'pass', detail: `${d.storms.length} active Atlantic storm(s)` };
    } },
    { feed: 'storms', kind: 'fresh', label: 'Relayed within the last 12 h', run: async () => freshness(Date.now() - Date.parse((await data()).fetchedAt), 6 * 3.6e6) },
  ];
}
