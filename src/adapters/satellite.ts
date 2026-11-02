/**
 * Satellite sea surface temperature and ocean colour (PLAN 2.4), relayed from NOAA CoastWatch
 * ERDDAP by the data build (scripts/forecast/satellite.ts) as the last week of daily maps:
 *
 *  - `sst` (0.05°, macro view) and `sst-coast` (0.01°, Gandoca–Limón): MUR SST, °C.
 *  - `chl`: chlorophyll-a, mg/m³, gap-filled VIIRS, 9 km.
 *  - `kd490`: diffuse attenuation at 490 nm, 1/m, gap-filled VIIRS + OLCI, 2 km over the coast.
 *
 * These are observations, not forecasts: a valid time inside the week blends the two days
 * either side, and any later time (the whole forecast) uses the newest map, which is how the
 * sea temperature is usually forecast a few days out anyway (it changes slowly). Each reading
 * says when it was observed so the HUD can show its age.
 */
import { scalarAt } from './frames';
import { validateMeta, type GridSeries } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check, type Outcome } from '../verify/types';

export interface SatelliteData {
  sst: GridSeries | null;
  sstCoast: GridSeries | null;
  chl: GridSeries | null;
  kd490: GridSeries | null;
  /** Oldest build fetch time of what loaded, epoch ms; NaN if nothing did. */
  fetchedAt: number;
}

export async function fetchSatellite(opts: LoadOptions = {}): Promise<SatelliteData> {
  const names = ['sst', 'sst-coast', 'chl', 'kd490'] as const;
  const got = await Promise.allSettled(names.map((n) => loadSeries(n, opts)));
  const s = (i: number) => (got[i].status === 'fulfilled' ? got[i].value.series : null);
  const ages = got.flatMap((g) => (g.status === 'fulfilled' ? [g.value.fetchedAt] : []));
  return { sst: s(0), sstCoast: s(1), chl: s(2), kd490: s(3), fetchedAt: ages.length ? Math.min(...ages) : NaN };
}

export interface Reading {
  value: number;
  /** When the map behind this value was observed, epoch ms (daily products are stamped at the day's 09:00 or 12:00 UTC). */
  obsMs: number;
}

/** Newest observation at or before `ms`, blending between days inside the series; clamped to its ends. */
export function observedAt(s: GridSeries | null, name: string, lng: number, lat: number, ms: number): Reading | null {
  if (!s) return null;
  const t = s.meta.times;
  const at = Math.min(Math.max(ms, t[0]), t[t.length - 1]);
  const value = scalarAt(s, name, lng, lat, at);
  return Number.isFinite(value) ? { value, obsMs: at } : null;
}

/** Sea surface temperature, °C: the 0.01° coast nest where it has sea, else the 0.05° macro grid. */
export const sstAt = (d: SatelliteData, lng: number, lat: number, ms: number): Reading | null =>
  observedAt(d.sstCoast, 'sst', lng, lat, ms) ?? observedAt(d.sst, 'sst', lng, lat, ms);
/** Chlorophyll-a, mg/m³. */
export const chlAt = (d: SatelliteData, lng: number, lat: number, ms: number) => observedAt(d.chl, 'chl', lng, lat, ms);
/** Kd490, 1/m (coast only). */
export const kd490At = (d: SatelliteData, lng: number, lat: number, ms: number) => observedAt(d.kd490, 'kd490', lng, lat, ms);

/** How late each product normally is, and when to call it stale (days): amber past `warn`, red past `fail`. */
export const OBS_LAG_DAYS: Record<'sst' | 'chl' | 'kd490', { warn: number; fail: number }> = {
  sst: { warn: 4, fail: 8 },
  chl: { warn: 6, fail: 12 },
  // Science-quality gap-filled Kd490 runs about 10 days behind.
  kd490: { warn: 16, fail: 24 },
};

export function obsLag(s: GridSeries, warn: number, fail: number, now = Date.now()): Outcome {
  const days = (now - s.meta.times[s.meta.times.length - 1]) / 864e5;
  const detail = `newest map ${days.toFixed(1)} d old`;
  return { status: days > fail ? 'fail' : days > warn ? 'warn' : 'pass', detail };
}

/** Verify checks: build freshness, how old the newest map is, schema and physical ranges. */
export function satelliteChecks(load: () => Promise<SatelliteData>): Check[] {
  let cached: Promise<SatelliteData> | null = null;
  const need = async (k: 'sst' | 'chl' | 'kd490') => {
    const s = (await (cached ??= load()))[k];
    if (!s) throw new Error(`no ${k} published`);
    return s;
  };
  const values = (s: GridSeries, v: string) => s.values[v].flatMap((f) => Array.from(f));
  const schema = (k: 'sst' | 'chl' | 'kd490') => async (): Promise<Outcome> => {
    const p = validateMeta((await need(k)).meta);
    return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
  };
  const checks: Check[] = [];
  const add = (k: 'sst' | 'chl' | 'kd490', range: [number, number, string]) => {
    checks.push(
      { feed: k, kind: 'schema', label: 'Manifest is well formed', run: schema(k) },
      { feed: k, kind: 'fresh', label: 'Relayed within the last day', run: async () => freshness(Date.now() - Date.parse((await need(k)).meta.fetchedAt), 12 * 3.6e6) },
      { feed: k, kind: 'fresh', label: `Newest map under ${OBS_LAG_DAYS[k].warn} days old`, run: async () => obsLag(await need(k), OBS_LAG_DAYS[k].warn, OBS_LAG_DAYS[k].fail) },
      // Land is no data in every map; past 80% missing the sea is gone too.
      { feed: k, kind: 'range', label: `Values within ${range[0]}..${range[1]} ${range[2]}`, run: async () => inRange(values(await need(k), k), range[0], range[1], range[2], 0.8) },
    );
  };
  add('sst', [15, 35, '°C']);
  add('chl', [0, 100, 'mg/m³']);
  add('kd490', [0.01, 6, '1/m']);
  checks.push({ feed: 'sst', kind: 'agree', label: 'Coast nest matches the macro grid', run: async () => {
    const d = await (cached ??= load());
    if (!d.sst || !d.sstCoast) return { status: 'warn', detail: 'coast nest missing' };
    return nestAgreement(d.sst, d.sstCoast);
  } });
  return checks;
}

/** Mean |coast − macro| SST over the nest's sea cells on the newest day: same analysis, so it should be within a few tenths. */
export function nestAgreement(macro: GridSeries, coast: GridSeries): Outcome {
  const g = coast.meta.grid;
  const ms = coast.meta.times[coast.meta.times.length - 1];
  let s = 0, n = 0;
  // About 400 sample points whatever the nest size.
  const step = Math.max(1, Math.floor(Math.min(g.cols, g.rows) / 20));
  for (let r = 0; r < g.rows; r += step)
    for (let c = 0; c < g.cols; c += step) {
      const lng = g.lon0 + c * g.dlon, lat = g.lat0 - r * g.dlat;
      const a = scalarAt(coast, 'sst', lng, lat, ms), b = observedAt(macro, 'sst', lng, lat, ms)?.value ?? NaN;
      if (Number.isFinite(a) && Number.isFinite(b)) (s += Math.abs(a - b)), n++;
    }
  if (!n) return { status: 'warn', detail: 'no overlapping sea cells' };
  const m = s / n;
  return { status: m > 1 ? 'fail' : m > 0.4 ? 'warn' : 'pass', detail: `mean diff ${m.toFixed(2)} °C over ${n}` };
}
