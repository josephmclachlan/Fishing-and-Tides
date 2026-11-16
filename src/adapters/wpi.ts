/**
 * World Port Index facts for ports near the coast (PLAN 7.94), relayed by the data build
 * (scripts/forecast/wpi.ts). Shown in the harbour INFO card. Static data: not a freshness problem,
 * so it does not report to DATA AGE. Not for navigation.
 */
import { haversineM } from '../geo';
import { cachedFetch, type CacheDeps } from './cache';
import { FORECAST_DIR } from './series';
import type { Check } from '../verify/types';
import { parseWpi, type WpiData, type WpiPort } from './wpi-parse';

export { parseWpi, type WpiData, type WpiPort };

export async function fetchWpi(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<WpiData & { fromCache: boolean }> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}wpi.json`, { deps });
  const d = (await r.response.json()) as WpiData;
  if (!Array.isArray(d.ports) || !Date.parse(d.fetchedAt)) throw new Error('wpi: malformed file');
  return { ...d, fromCache: r.fromCache };
}

/** The nearest World Port Index port within `maxM` metres of a place, or null. */
export function nearestPort(ports: readonly WpiPort[], lngLat: [number, number], maxM = 8000): WpiPort | null {
  let best: WpiPort | null = null;
  let bd = maxM;
  for (const p of ports) {
    const d = haversineM(lngLat, p.lngLat);
    if (d <= bd) (best = p), (bd = d);
  }
  return best;
}

export function wpiChecks(load: () => Promise<WpiData>): Check[] {
  return [{ feed: 'wpi', kind: 'schema', label: 'Port list has ports near the coast', run: async () => {
    const d = await load();
    return d.ports.length ? { status: 'pass', detail: `${d.ports.length} port(s)` } : { status: 'fail', detail: 'no ports' };
  } }];
}
