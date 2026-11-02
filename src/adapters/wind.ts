/**
 * Wind adapter (PLAN 2.3). The 16-day forecast grid comes from the data build
 * (scripts/forecast/wind.ts: Open-Meteo best match, 0.25°, hourly to day 7 then 3-hourly);
 * the OUTLOOK band uses the monthly climatology (scripts/fetch-climatology.ts: NOAA NCEI
 * blended winds 2015–2024). Both are `physics/flow.ts` VectorFields in m/s, u east, v north.
 */
import type { Band } from '../time';
import type { VectorField } from '../physics/flow';
import { pickSeries, projectMonthly, vectorAt } from './frames';
import { validateMeta, type GridSeries } from './pack';
import { CLIMATOLOGY_DIR, loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface WindData {
  forecast: GridSeries | null;
  /** Monthly means, 12 frames (re-stamped per lookup). */
  climatology: GridSeries | null;
  /** When the forecast was fetched by the data build, epoch ms (NaN if none). */
  fetchedAt: number;
}

/** Load whatever is available; either half may be missing (offline first run, dev without a data build). */
export async function fetchWind(opts: LoadOptions = {}): Promise<WindData> {
  const [fc, clim] = await Promise.allSettled([loadSeries('wind', opts), loadSeries('wind-clim', { ...opts, dir: CLIMATOLOGY_DIR, report: false })]);
  return {
    forecast: fc.status === 'fulfilled' ? fc.value.series : null,
    climatology: clim.status === 'fulfilled' ? clim.value.series : null,
    fetchedAt: fc.status === 'fulfilled' ? fc.value.fetchedAt : NaN,
  };
}

export interface WindFrame {
  field: VectorField;
  kind: 'forecast' | 'climatology';
}

/** The wind field for the slider's band and valid time, or null if no data covers it. */
export function windAt(d: WindData, band: Band, ms: number): WindFrame | null {
  const clim = d.climatology ? projectMonthly(d.climatology, ms) : null;
  // Climatology frames are a month apart, so any date within the projected years is covered.
  const pick = pickSeries(band, ms, d.forecast, clim);
  if (!pick) return null;
  const edge = pick.kind === 'forecast' ? 3 * 3.6e6 : 0;
  const field = vectorAt(pick.series, 'u', 'v', ms, edge);
  return field ? { field, kind: pick.kind } : null;
}

/** Verify checks (DESIGN §10): the data build runs every 6 h, so amber past 12 h, red past 24 h. */
export function windChecks(load: () => Promise<WindData>): Check[] {
  let cached: Promise<WindData> | null = null;
  const data = () => (cached ??= load());
  const need = async () => {
    const d = await data();
    if (!d.forecast) throw new Error('no wind forecast published');
    return d.forecast;
  };
  return [
    { feed: 'wind', kind: 'schema', label: 'Forecast manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'wind', kind: 'fresh', label: 'Fetched within the last 12 h', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 6 * 3.6e6) },
    { feed: 'wind', kind: 'range', label: 'Speeds within 0..60 m/s', run: async () => {
      const s = await need();
      const speeds: number[] = [];
      s.values.u.forEach((u, t) => u.forEach((x, i) => speeds.push(Math.hypot(x, s.values.v[t][i]))));
      return inRange(speeds, 0, 60, 'm/s', 0.05);
    } },
    { feed: 'wind', kind: 'range', label: 'Forecast reaches at least 7 days', run: async () => {
      const s = await need();
      const days = (s.meta.sources[0]?.toMs - s.meta.times[0]) / 86400000;
      return { status: days >= 7 ? 'pass' : days >= 3 ? 'warn' : 'fail', detail: `${days.toFixed(1)} days` };
    } },
  ];
}
