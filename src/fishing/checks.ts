/**
 * Verify checks for the species-record feeds (PLAN 4.7; DESIGN.md §10): can we reach OBIS and
 * GBIF, is our built file fresh, does it parse, and are the coordinates and years sane.
 * The daily Action (2.8) and the SYSTEM CHECK panel (2.9) run this list.
 */
import { cachedFetch, type CacheDeps } from '../adapters/cache';
import { freshness, inRange, type Check } from '../verify/types';
import type { OccurrenceFile } from './occurrence-taxa';

const DAY = 86_400_000;
const FILE = 'data/fishing/occurrences.json';

export function occurrenceChecks(base: string, deps?: Partial<CacheDeps>): Check[] {
  const load = async () => (await (await cachedFetch(`${base}${FILE}`, { deps })).response.json()) as OccurrenceFile;
  const ping = (feed: string, url: string): Check => ({
    feed,
    kind: 'reach',
    label: `${feed} answers a species query`,
    async run() {
      const r = await (deps?.fetch ?? fetch)(url, { signal: AbortSignal.timeout(20_000) });
      return r.ok ? { status: 'pass', detail: `HTTP ${r.status}` } : { status: 'fail', detail: `HTTP ${r.status}` };
    },
  });
  return [
    ping('obis', 'https://api.obis.org/v3/occurrence?scientificname=Megalops%20atlanticus&size=1'),
    ping('gbif', 'https://api.gbif.org/v1/occurrence/search?scientificName=Megalops%20atlanticus&limit=1'),
    {
      feed: 'occurrences',
      kind: 'fresh',
      label: 'record file rebuilt within 6 months',
      async run() {
        // Records change slowly: a 90-day cadence, amber at 6 months, red at a year.
        return freshness(Date.now() - Date.parse((await load()).fetchedAt), 90 * DAY);
      },
    },
    {
      feed: 'occurrences',
      kind: 'schema',
      label: 'record file has [lng, lat, year] triples per species',
      async run() {
        const f = await load();
        const bad = Object.entries(f.species).filter(([, pts]) => !Array.isArray(pts) || pts.some((p) => !Array.isArray(p) || p.length !== 3 || typeof p[0] !== 'number' || typeof p[1] !== 'number'));
        return bad.length ? { status: 'fail', detail: `bad records for ${bad.map(([k]) => k).join(', ')}` } : { status: 'pass', detail: `${Object.keys(f.species).length} species` };
      },
    },
    {
      feed: 'occurrences',
      kind: 'range',
      label: 'records inside the search box, years 1800 to now',
      async run() {
        const f = await load();
        const [w, s, e, n] = f.box;
        const all = Object.values(f.species).flat();
        const outside = all.filter(([x, y]) => x < w || x > e || y < s || y > n).length;
        if (outside) return { status: 'fail', detail: `${outside} of ${all.length} records outside the box` };
        return inRange(all.map((p) => p[2] ?? NaN), 1800, new Date().getUTCFullYear(), 'year', 0.9);
      },
    },
  ];
}
