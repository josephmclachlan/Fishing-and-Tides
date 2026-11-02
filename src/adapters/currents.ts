/**
 * Surface currents adapter (PLAN 2.5). From the data build (scripts/forecast/currents.ts):
 * Météo-France SMOC via Open-Meteo, about 9 days, as a 0.25° regional grid plus a 1/12°
 * Gandoca–Limón nest, overlaid into one `physics/flow.ts` VectorField (m/s, u east, v north)
 * for the current particles and the CURRENT / SET readout.
 *
 * Past the model's last hour (late LOW CONF and OUTLOOK) there is no currents climatology
 * yet, so the field is the mean of the forecast days, flagged as climatology so the HUD
 * dims it. SMOC includes tidal currents, so that mean drops the tide, as a climatology should.
 */
import type { Band } from '../time';
import type { VectorField } from '../physics/flow';
import { meanSeries, overlayFields, pickSeries, vectorAt } from './frames';
import { validateMeta, type GridSeries } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface CurrentsData {
  forecast: GridSeries | null;
  coast: GridSeries | null;
  fetchedAt: number;
}

export async function fetchCurrents(opts: LoadOptions = {}): Promise<CurrentsData> {
  const [fc, coast] = await Promise.allSettled([loadSeries('currents', opts), loadSeries('currents-coast', opts)]);
  return {
    forecast: fc.status === 'fulfilled' ? fc.value.series : null,
    coast: coast.status === 'fulfilled' ? coast.value.series : null,
    fetchedAt: fc.status === 'fulfilled' ? fc.value.fetchedAt : NaN,
  };
}

export interface CurrentsFrame {
  field: VectorField;
  kind: 'forecast' | 'climatology';
}

/** Memo of the forecast means, which are the same for every lookup. */
const means = new WeakMap<GridSeries, GridSeries>();
const meanOf = (s: GridSeries) => means.get(s) ?? (means.set(s, meanSeries(s)), means.get(s)!);

export function currentsAt(d: CurrentsData, band: Band, ms: number): CurrentsFrame | null {
  const field = (s: GridSeries | null) => {
    if (!s) return null;
    const p = pickSeries(band, ms, s, meanOf(s));
    return p ? { f: vectorAt(p.series, 'u', 'v', ms, p.kind === 'forecast' ? 3 * 3.6e6 : 0), kind: p.kind } : null;
  };
  const coarse = field(d.forecast);
  if (!coarse?.f) return null;
  const fine = field(d.coast);
  return { field: fine?.f ? overlayFields(fine.f, coarse.f) : coarse.f, kind: coarse.kind };
}

/** Verify checks: refreshed twice a day; surface currents here stay under about 3 m/s. */
export function currentsChecks(load: () => Promise<CurrentsData>): Check[] {
  let cached: Promise<CurrentsData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.forecast) throw new Error('no currents forecast published');
    return d.forecast;
  };
  const speeds = (s: GridSeries) => s.values.u.flatMap((u, t) => Array.from(u, (x, i) => Math.hypot(x, s.values.v[t][i])));
  return [
    { feed: 'currents', kind: 'schema', label: 'Forecast manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'currents', kind: 'fresh', label: 'Fetched within the last 24 h', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 12 * 3.6e6) },
    { feed: 'currents', kind: 'range', label: 'Speeds within 0..3 m/s', run: async () => inRange(speeds(await need()), 0, 3, 'm/s', 0.7) },
    { feed: 'currents', kind: 'schema', label: 'Coastal 1/12° nest published', run: async () => {
      const d = await (cached ??= load());
      return d.coast ? { status: 'pass', detail: `${d.coast.meta.grid.cols}×${d.coast.meta.grid.rows}` } : { status: 'warn', detail: 'missing; coarse grid only' };
    } },
  ];
}
