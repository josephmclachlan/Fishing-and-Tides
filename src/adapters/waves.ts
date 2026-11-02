/**
 * Waves adapter (PLAN 2.2). The forecast grid comes from the data build
 * (scripts/forecast/waves.ts: Météo-France MFWAM to about day 9, then NOAA GFS-Wave to day 16,
 * 0.25°, 3-hourly, sea points only); the OUTLOOK band uses the monthly ERA5 climatology
 * (scripts/fetch-climatology.ts). Heights m, periods s, directions degrees true FROM.
 *
 * Offshore model values: there is no wave buoy on this coast (docs/OBSERVATIONS.md), and
 * nearshore transformation (shoaling, refraction, breaking) is Phase 3 physics on top of these.
 */
import type { Band } from '../time';
import { fromDeg } from '../physics/flow';
import { pickSeries, projectMonthly, scalarAt } from './frames';
import { validateMeta, type GridSeries } from './pack';
import { CLIMATOLOGY_DIR, loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface WavesData {
  forecast: GridSeries | null;
  climatology: GridSeries | null;
  fetchedAt: number;
}

export async function fetchWaves(opts: LoadOptions = {}): Promise<WavesData> {
  const [fc, clim] = await Promise.allSettled([loadSeries('waves', opts), loadSeries('waves-clim', { ...opts, dir: CLIMATOLOGY_DIR, report: false })]);
  return {
    forecast: fc.status === 'fulfilled' ? fc.value.series : null,
    climatology: clim.status === 'fulfilled' ? clim.value.series : null,
    fetchedAt: fc.status === 'fulfilled' ? fc.value.fetchedAt : NaN,
  };
}

export interface SeaState {
  /** Significant wave height, all components, m. */
  hs: number;
  /** Mean period, s. */
  tm: number;
  /** Mean direction, degrees true the waves come from. */
  dir: number;
  /** Primary swell partition. */
  swellHs: number;
  swellT: number;
  swellDir: number;
  /** Secondary swell partition (a second train); NaN where the data has none. */
  swell2Hs: number;
  swell2T: number;
  swell2Dir: number;
  /** Local wind sea. */
  windSeaHs: number;
  windSeaT: number;
  windSeaDir: number;
  kind: 'forecast' | 'climatology';
  /** Which model produced this hour (forecast only), e.g. "meteofrance_wave". */
  model?: string;
}

/** Sea state at a point for the slider's band and valid time; null if no data covers it (or on land). */
export function wavesAt(d: WavesData, band: Band, ms: number, lng: number, lat: number): SeaState | null {
  const clim = d.climatology ? projectMonthly(d.climatology, ms) : null;
  const pick = pickSeries(band, ms, d.forecast, clim);
  if (!pick) return null;
  const edge = pick.kind === 'forecast' ? 3 * 3.6e6 : 0;
  const at = (v: string) => scalarAt(pick.series, v, lng, lat, ms, edge);
  const hs = at('hs');
  if (!Number.isFinite(hs)) return null;
  const has = (v: string) => pick.series.meta.vars.some((x) => x.name === v);
  const swellHs = has('swh') ? at('swh') : NaN;
  const model = pick.kind === 'forecast' ? pick.series.meta.sources.find((s) => ms <= s.toMs + edge)?.id : undefined;
  return {
    hs,
    tm: at('tm'),
    dir: fromDeg(at('du'), at('dv')),
    swellHs,
    swellT: has('swt') ? at('swt') : NaN,
    swellDir: has('swu') ? fromDeg(at('swu'), at('swv')) : NaN,
    swell2Hs: has('s2h') ? at('s2h') : NaN,
    swell2T: has('s2t') ? at('s2t') : NaN,
    swell2Dir: has('s2u') ? fromDeg(at('s2u'), at('s2v')) : NaN,
    windSeaHs: has('wwh') ? at('wwh') : NaN,
    windSeaT: has('wwt') ? at('wwt') : NaN,
    windSeaDir: has('wwu') ? fromDeg(at('wwu'), at('wwv')) : NaN,
    kind: pick.kind,
    model,
  };
}

export type WaveTrain = 'swell1' | 'swell2' | 'windSea';

/** One wave train: what Surfline and Windy list as "swell 1, swell 2, wind waves". */
export interface WavePart {
  kind: WaveTrain;
  /** Height of this train alone, m (the trains add by energy: Hs² = Σ Hᵢ²). */
  hs: number;
  /** Its period, s (NaN if the model gave none). */
  t: number;
  /** Degrees true it comes from (NaN if unknown). */
  dir: number;
}

/** Below this a train is noise at the beach and not worth a row, m. */
export const MIN_PART_HS = 0.1;

/**
 * The wave trains in a sea state, biggest first, leaving out the ones under `minHs`. Empty when
 * the data has no partitions (the OUTLOOK climatology): then only the total is known.
 */
export function waveParts(s: SeaState, minHs = MIN_PART_HS): WavePart[] {
  const parts: WavePart[] = [
    { kind: 'swell1', hs: s.swellHs, t: s.swellT, dir: s.swellDir },
    { kind: 'swell2', hs: s.swell2Hs, t: s.swell2T, dir: s.swell2Dir },
    { kind: 'windSea', hs: s.windSeaHs, t: s.windSeaT, dir: s.windSeaDir },
  ];
  return parts.filter((p) => Number.isFinite(p.hs) && p.hs >= minHs).sort((a, b) => b.hs - a.hs);
}

/** Verify checks (DESIGN §10): Hs 0..8 m for this coast, periods 1..25 s, refreshed twice a day. */
export function wavesChecks(load: () => Promise<WavesData>): Check[] {
  let cached: Promise<WavesData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.forecast) throw new Error('no waves forecast published');
    return d.forecast;
  };
  const values = (s: GridSeries, v: string) => s.values[v].flatMap((f) => Array.from(f));
  return [
    { feed: 'waves', kind: 'schema', label: 'Forecast manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'waves', kind: 'fresh', label: 'Fetched within the last 24 h', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 12 * 3.6e6) },
    // Land cells are NaN by design, so allow most of the grid to be missing.
    { feed: 'waves', kind: 'range', label: 'Hs within 0..8 m', run: async () => inRange(values(await need(), 'hs'), 0, 8, 'm', 0.7) },
    // Only where there are waves: a near-calm cell has no meaningful period (models write 0 s).
    { feed: 'waves', kind: 'range', label: 'Mean period within 1..25 s where Hs ≥ 0.1 m', run: async () => {
      const s = await need();
      const hs = values(s, 'hs');
      return inRange(values(s, 'tm').filter((_, i) => hs[i] >= 0.1), 1, 25, 's', 0.7);
    } },
  ];
}
