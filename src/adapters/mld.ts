/**
 * Mixed-layer depth (PLAN 7.18): how deep the warm, stirred surface layer reaches before the
 * thermocline, from the Copernicus Marine global ocean model (daily means at 1/12°, about 10 days
 * ahead), relayed by the data build (scripts/mld.py, packed by scripts/forecast/satellite.ts).
 *
 * Offshore fish hold at or just under its base, where the water cools and bait gathers. A shallow
 * layer (under about 30 m) pushes them up to trolling depth; a deep one (60 m and more) lets them
 * spread down. Daily means are stamped at 00 UTC; a time between days blends them, and a time past
 * the last day uses the last day.
 */
import { scalarAt } from './frames';
import { validateMeta, type GridSeries } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface MldData {
  series: GridSeries | null;
  fetchedAt: number;
}

export async function fetchMld(opts: LoadOptions = {}): Promise<MldData> {
  try {
    const r = await loadSeries('mld', opts);
    return { series: r.series, fetchedAt: r.fetchedAt };
  } catch {
    return { series: null, fetchedAt: NaN };
  }
}

/** Mixed-layer depth, m, at a place and time (clamped to the series' days), or null on land or with no data. */
export function mldAt(d: MldData | null, lng: number, lat: number, ms: number): number | null {
  const s = d?.series;
  if (!s) return null;
  const t = s.meta.times;
  const v = scalarAt(s, 'mld', lng, lat, Math.min(Math.max(ms, t[0]), t[t.length - 1]));
  return Number.isFinite(v) ? v : null;
}

/** Rough reading for the boat drawer: where offshore fish are likely to sit. */
export type MldLevel = 'shallow' | 'mid' | 'deep';
export const mldLevel = (m: number): MldLevel => (m < 30 ? 'shallow' : m < 60 ? 'mid' : 'deep');

/** Verify checks: the model runs daily; the tropical mixed layer is a few metres to about 150 m. */
export function mldChecks(load: () => Promise<MldData>): Check[] {
  let cached: Promise<MldData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.series) throw new Error('no mixed-layer depth published');
    return d.series;
  };
  return [
    { feed: 'mld', kind: 'schema', label: 'Manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'mld', kind: 'fresh', label: 'Fetched within the last 2 days', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 24 * 3.6e6) },
    { feed: 'mld', kind: 'fresh', label: 'Reaches at least 3 days ahead', run: async () => {
      const t = (await need()).meta.times;
      const aheadD = (t[t.length - 1] - Date.now()) / 864e5;
      return { status: aheadD >= 3 ? 'pass' : aheadD >= 0 ? 'warn' : 'fail', detail: `${aheadD.toFixed(1)} days ahead` };
    } },
    { feed: 'mld', kind: 'range', label: 'Depths within 0..300 m', run: async () => inRange((await need()).values.mld.flatMap((f) => Array.from(f)), 0, 300, 'm', 0.8) },
  ];
}
