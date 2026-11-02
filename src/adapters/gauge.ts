/**
 * Live Limón tide gauge (PLAN 2.11): IOC Sea Level Monitoring, 1-minute radar readings about
 * 10 minutes behind real time. IOC allows browser calls, so the app fetches it directly through
 * the offline cache. Readings are put on mean sea level (LIVE_GAUGE in src/region.ts) and
 * compared with the harmonic prediction: the difference is the weather's share (wind setup,
 * pressure, seasonal anomalies), which the tide alone can't know.
 */
import { LIVE_GAUGE } from '../region';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { predict } from '../physics/tide';
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { agreement, freshness, inRange, type Check } from '../verify/types';

export interface GaugeReading {
  /** Observation time, epoch ms. */
  t: number;
  /** Observed level above mean sea level, m. */
  levelM: number;
  /** Predicted tide at that time, m above MSL. */
  tideM: number;
}

export interface GaugeData {
  readings: GaugeReading[];
  /** When this phone fetched them. */
  fetchedAt: number;
  fromCache: boolean;
}

const URL = 'https://www.ioc-sealevelmonitoring.org/service.php';
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16);

/** IOC rows → readings for one sensor, oldest first. Rows look like { slevel, stime: "YYYY-MM-DD hh:mm:ss", sensor }. */
export function parseIoc(rows: unknown, sensor: string = LIVE_GAUGE.sensor, msl: number = LIVE_GAUGE.mslOnSensorM): GaugeReading[] {
  if (!Array.isArray(rows)) throw new Error('gauge: response is not a list');
  const out: GaugeReading[] = [];
  for (const r of rows as { slevel?: unknown; stime?: unknown; sensor?: unknown }[]) {
    if (r.sensor !== sensor || typeof r.slevel !== 'number' || typeof r.stime !== 'string') continue;
    const t = Date.parse(r.stime.replace(' ', 'T') + 'Z');
    if (!Number.isFinite(t) || !Number.isFinite(r.slevel)) continue;
    out.push({ t, levelM: r.slevel - msl, tideM: predict(LIMON_HARMONICS, t) });
  }
  return out.sort((a, b) => a.t - b.t);
}

export async function fetchGauge(opts: { hours?: number; now?: number; deps?: Partial<CacheDeps> } = {}): Promise<GaugeData> {
  const now = opts.now ?? Date.now();
  const hours = opts.hours ?? 24;
  // Whole minutes in the URL so the cache key is stable within a minute.
  const url = `${URL}?query=data&code=${LIVE_GAUGE.code}&timestart=${iso(now - hours * 3.6e6)}&timestop=${iso(now + 60e3)}&format=json`;
  const r = await cachedFetch(url, { deps: opts.deps });
  const readings = parseIoc(await r.response.json());
  dataAge.report('gauge', r.fetchedAt, r.fromCache);
  return { readings, fetchedAt: r.fetchedAt, fromCache: r.fromCache };
}

/** Latest reading and its departure from the predicted tide (m), or null if there are none. */
export function latest(d: GaugeData): (GaugeReading & { residualM: number }) | null {
  const r = d.readings.at(-1);
  return r ? { ...r, residualM: r.levelM - r.tideM } : null;
}

/**
 * Verify checks (DESIGN §10): the gauge reports every minute, so amber past 30 min and red
 * past an hour; levels within ±1.5 m of MSL; the shape of the last day must match the
 * prediction (RMS of the de-meaned difference under 8 cm, the weather share seen in
 * 2025–26 validation is about 4 cm), and the mean offset must stay under 25 cm, which
 * would mean a datum change at the gauge (or a real storm surge, worth a look either way).
 */
export function gaugeChecks(load: () => Promise<GaugeData> = () => fetchGauge()): Check[] {
  let cached: Promise<GaugeData> | null = null;
  const data = () => (cached ??= load());
  const need = async () => {
    const d = await data();
    if (!d.readings.length) throw new Error('no gauge readings in the last day');
    return d.readings;
  };
  return [
    { feed: 'gauge', kind: 'reach', label: 'IOC Limón gauge answers with readings', run: async () => ({ status: 'pass', detail: `${(await need()).length} readings` }) },
    { feed: 'gauge', kind: 'fresh', label: 'Latest reading within 30 min', run: async () => freshness(Date.now() - (await need()).at(-1)!.t, 15 * 60e3) },
    { feed: 'gauge', kind: 'range', label: 'Level within ±1.5 m of MSL', run: async () => inRange((await need()).map((r) => r.levelM), -1.5, 1.5, 'm') },
    { feed: 'gauge', kind: 'agree', label: 'Matches the predicted tide (shape)', run: async () => {
      const rs = await need();
      const off = rs.reduce((s, r) => s + r.levelM - r.tideM, 0) / rs.length;
      return agreement(rs.map((r) => r.levelM - off), rs.map((r) => r.tideM), 0.08, 'm');
    } },
    { feed: 'gauge', kind: 'agree', label: 'Datum offset under 25 cm', run: async () => {
      const rs = await need();
      const off = rs.reduce((s, r) => s + r.levelM - r.tideM, 0) / rs.length;
      const detail = `mean departure ${(off * 100).toFixed(0)} cm`;
      return { status: Math.abs(off) > 0.4 ? 'fail' : Math.abs(off) > 0.25 ? 'warn' : 'pass', detail };
    } },
  ];
}
