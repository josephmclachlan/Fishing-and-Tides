/**
 * Loader for the packed forecast grids the data build publishes (PLAN 2.1).
 * `loadSeries('wind')` reads data/forecast/wind.json and its .i16 through the offline cache
 * and reports the age to DATA AGE. See docs/DATA.md for the pipeline.
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { decodeSeries, validateMeta, type GridSeries, type SeriesMeta } from './pack';

export const FORECAST_DIR = 'data/forecast/';

export interface Loaded {
  series: GridSeries;
  /** When the data build fetched it from the model (from the manifest), epoch ms. */
  fetchedAt: number;
  /** True when the phone is offline and this is the last copy it had. */
  fromCache: boolean;
}

export async function loadSeries(name: string, base: string = import.meta.env.BASE_URL, deps?: Partial<CacheDeps>): Promise<Loaded> {
  const url = (f: string) => `${base}${FORECAST_DIR}${f}`;
  const m = await cachedFetch(url(`${name}.json`), { deps });
  const meta = (await m.response.json()) as SeriesMeta;
  const problems = validateMeta(meta);
  if (problems.length) throw new Error(`${name}: ${problems.join('; ')}`);
  const bin = await cachedFetch(url(meta.file), { deps });
  const series = decodeSeries(meta, new Int16Array(await bin.response.arrayBuffer()));
  // The age that matters is how old the model data is, not when this phone downloaded it.
  const fetchedAt = Date.parse(meta.fetchedAt);
  dataAge.report(meta.feed, fetchedAt, m.fromCache);
  return { series, fetchedAt, fromCache: m.fromCache };
}
