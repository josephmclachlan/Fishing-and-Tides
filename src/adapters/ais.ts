/**
 * AIS ships seen near the coast in the last 24 h (PLAN 7.96), relayed by the data build
 * (scripts/forecast/ais.ts) from AISStream. Positions are last known, not live tracks.
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, type Check } from '../verify/types';
import { shipClass, type AisData, type Vessel } from './ais-parse';

export { shipClass, type AisData, type Vessel };

export interface AisLoaded extends AisData {
  fromCache: boolean;
}

export async function fetchAis(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<AisLoaded> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}ais.json`, { deps });
  const d = (await r.response.json()) as AisData;
  if (!Array.isArray(d.vessels) || !Date.parse(d.fetchedAt)) throw new Error('ais: malformed file');
  dataAge.report('ais', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

export function aisChecks(load: () => Promise<AisLoaded>): Check[] {
  let cached: Promise<AisLoaded> | null = null;
  const data = () => (cached ??= load());
  return [
    { feed: 'ais', kind: 'schema', label: 'Vessel list is well formed', run: async () => {
      const d = await data();
      const bad = d.vessels.filter((v) => !Number.isFinite(v.lngLat[0]) || !Number.isFinite(v.lngLat[1]) || Math.abs(v.lngLat[1]) > 90);
      return bad.length ? { status: 'fail', detail: `${bad.length} vessel(s) without a valid position` } : { status: 'pass', detail: `${d.vessels.length} ship(s) in the last 24 h, ${d.heard} messages heard in ${d.listenedS} s` };
    } },
    { feed: 'ais', kind: 'fresh', label: 'Relayed within the last 6 h', run: async () => freshness(Date.now() - Date.parse((await data()).fetchedAt), 3 * 3.6e6) },
  ];
}
