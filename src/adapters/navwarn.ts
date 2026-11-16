/**
 * NAVAREA IV warnings near the coast (PLAN 7.93), relayed by the data build (scripts/forecast/navwarn.ts).
 * Shown as NOTICES in the BOAT drawer. Advisory only, and the official text is the NGA broadcast.
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { FORECAST_DIR } from './series';
import { freshness, type Check } from '../verify/types';
import { parseNavWarnings, type NavWarnData, type NavWarning } from './navwarn-parse';

export { parseNavWarnings, type NavWarnData, type NavWarning };

export interface NavWarnLoaded extends NavWarnData {
  fromCache: boolean;
}

export async function fetchNavWarn(opts: { base?: string; deps?: Partial<CacheDeps> } = {}): Promise<NavWarnLoaded> {
  const { base = import.meta.env.BASE_URL, deps } = opts;
  const r = await cachedFetch(`${base}${FORECAST_DIR}navwarn.json`, { deps });
  const d = (await r.response.json()) as NavWarnData;
  if (!Array.isArray(d.warnings) || !Date.parse(d.fetchedAt)) throw new Error('navwarn: malformed file');
  dataAge.report('navwarn', Date.parse(d.fetchedAt), r.fromCache);
  return { ...d, fromCache: r.fromCache };
}

export function navWarnChecks(load: () => Promise<NavWarnLoaded>): Check[] {
  let cached: Promise<NavWarnLoaded> | null = null;
  const data = () => (cached ??= load());
  return [
    { feed: 'navwarn', kind: 'schema', label: 'Warning list is well formed', run: async () => {
      const d = await data();
      const bad = d.warnings.filter((w) => !w.text);
      return bad.length ? { status: 'fail', detail: `${bad.length} warning(s) without text` } : { status: 'pass', detail: `${d.warnings.length} active warning(s) near the coast` };
    } },
    { feed: 'navwarn', kind: 'fresh', label: 'Relayed within the last 36 h', run: async () => freshness(Date.now() - Date.parse((await data()).fetchedAt), 12 * 3.6e6) },
  ];
}
