/**
 * UV index from CAMS (PLAN 7.57): the Copernicus Atmosphere Monitoring Service global forecast (ECMWF, 0.4°,
 * about 5 days), through Open-Meteo's air-quality endpoint (CORS allowed, no key), at one point on the coast.
 * CAMS models ozone, aerosol and the IFS clouds, so it is the best free UV forecast here; the weather models'
 * own UV is GFS only, and GFS reads about a quarter low on this coast (see adapters/weather.ts).
 *
 * `uv` is the UV index with cloud, `clear` the same sky without cloud. CAMS values are instantaneous at each
 * stamp (the curve peaks at local solar noon, about 11:15), so they are not shifted like the hourly rain sums.
 */
import { UV_POINT } from '../region';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { freshness, inRange, type Check } from '../verify/types';

export interface UvData {
  /** Hour starts, epoch ms. */
  times: number[];
  uv: number[];
  clear: number[];
  fetchedAt: number;
  fromCache: boolean;
}

export const uvUrl = (point: readonly [number, number] = UV_POINT, days = 5) =>
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${point[1]}&longitude=${point[0]}&hourly=uv_index,uv_index_clear_sky&forecast_days=${days}&timeformat=unixtime&timezone=GMT`;

export function parseUv(json: unknown, fetchedAt: number, fromCache = false): UvData {
  const h = (json as { hourly?: { time?: number[]; uv_index?: (number | null)[]; uv_index_clear_sky?: (number | null)[] } } | null)?.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('uv: no hourly block');
  const col = (c: (number | null)[] | undefined) => h.time!.map((_, i) => (c && typeof c[i] === 'number' ? (c[i] as number) : NaN));
  return { times: h.time.map((s) => s * 1000), uv: col(h.uv_index), clear: col(h.uv_index_clear_sky), fetchedAt, fromCache };
}

export async function fetchUv(opts: { deps?: Partial<CacheDeps> } = {}): Promise<UvData> {
  const r = await cachedFetch(uvUrl(), { deps: opts.deps });
  const d = parseUv(await r.response.json(), r.fetchedAt, r.fromCache);
  dataAge.report('uv', d.fetchedAt, d.fromCache);
  return d;
}

/** Verify checks: CAMS answers with values for the next days, in range, fetched lately. */
export function uvChecks(load: () => Promise<UvData> = () => fetchUv()): Check[] {
  let cached: Promise<UvData> | null = null;
  const need = () => (cached ??= load());
  return [
    { feed: 'uv', kind: 'reach', label: 'CAMS UV answers for at least 3 days', run: async () => {
      const d = await need();
      const n = d.uv.filter(Number.isFinite).length;
      return { status: n >= 72 ? 'pass' : n ? 'warn' : 'fail', detail: `${n} hours` };
    } },
    { feed: 'uv', kind: 'fresh', label: 'Fetched within the last 3 h', run: async () => freshness(Date.now() - (await need()).fetchedAt, 1.5 * 3.6e6) },
    { feed: 'uv', kind: 'range', label: 'UV index within 0..16', run: async () => inRange((await need()).uv.filter(Number.isFinite), 0, 16, '', 0) },
  ];
}
