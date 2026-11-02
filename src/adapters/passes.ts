/**
 * Satellite passes (PLAN 2.12): the raw SST and chlorophyll maps over Gandoca–Limón, cloud holes
 * and all, each stamped with when the satellite actually flew over (scripts/forecast/satellite.ts).
 * Where 2.4's gap-filled maps say what the sea is probably like, these say what was seen and when,
 * for LIVE OBS (2.13), the verify cross-check against the analysis, and the bias correction (7.10).
 *
 * Scatterometer wind passes are not here: every keyless ERDDAP scatterometer product (ASCAT
 * erdQM*, NCEI blended NRT) stopped in 2022–23, and the live ones (Copernicus Marine, KNMI, PO.DAAC)
 * need an account. See docs/OBSERVATIONS.md.
 */
import type { GridSeries } from './pack';
import { validateMeta } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { observedAt, type SatelliteData } from './satellite';
import { freshness, inRange, type Check, type Outcome } from '../verify/types';

export interface PassData {
  sst: GridSeries | null;
  chl: GridSeries | null;
  fetchedAt: number;
}

export async function fetchPasses(opts: LoadOptions = {}): Promise<PassData> {
  const [sst, chl] = await Promise.allSettled([loadSeries('sst-pass', opts), loadSeries('chl-pass', opts)]);
  const ages = [sst, chl].flatMap((g) => (g.status === 'fulfilled' ? [g.value.fetchedAt] : []));
  return {
    sst: sst.status === 'fulfilled' ? sst.value.series : null,
    chl: chl.status === 'fulfilled' ? chl.value.series : null,
    fetchedAt: ages.length ? Math.min(...ages) : NaN,
  };
}

export interface Pass {
  /** When the satellite flew over, epoch ms. */
  obsMs: number;
  /** Share of the sea that was seen (not cloud), 0..1. */
  clear: number;
  /** Mean of what was seen, NaN if nothing was. */
  mean: number;
  /** Source name from the manifest (e.g. afternoon or night pass). */
  source: string;
}

/**
 * Cells seen clear in at least one pass of the series. Used to count what a pass saw (land never has
 * a value, so seen cells are sea), and as the sea count when the manifest has no `seaCells`.
 */
export function seaCells(s: GridSeries, v: string): Uint8Array {
  const fs = s.values[v];
  const sea = new Uint8Array(fs[0]?.length ?? 0);
  for (const f of fs) for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) sea[i] = 1;
  return sea;
}

/** One summary per pass, oldest first: when, how much of the sea was clear, and the mean value. */
export function passList(s: GridSeries | null, v: string): Pass[] {
  if (!s || !s.values[v]) return [];
  const sea = seaCells(s, v);
  // The build counts the sea from the depth grid; without that, the cells ever seen stand in for it.
  const nSea = Math.max(s.meta.seaCells ?? 0, sea.reduce((a, b) => a + b, 0));
  return s.values[v].map((f, k) => {
    let n = 0, sum = 0;
    for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) (n++, (sum += f[i]));
    const ms = s.meta.times[k];
    const src = s.meta.sources.find((x) => ms >= x.fromMs && ms <= x.toMs) ?? s.meta.sources[0];
    return { obsMs: ms, clear: nSea ? n / nSea : 0, mean: n ? sum / n : NaN, source: src?.name ?? '' };
  });
}

/** Share of the sea clear below which a pass counts as clouded out. */
export const CLOUDED_OUT = 0.1;

/**
 * The newest pass at or before `ms` that saw this point (the cell or one of its neighbours), with
 * its value and time; null if every pass was cloudy there.
 */
export function latestSeen(s: GridSeries | null, v: string, lng: number, lat: number, ms = Date.now()): { value: number; obsMs: number } | null {
  if (!s || !s.values[v]) return null;
  const g = s.meta.grid;
  const c = Math.round((lng - g.lon0) / g.dlon), r = Math.round((g.lat0 - lat) / g.dlat);
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return null;
  for (let k = s.meta.times.length - 1; k >= 0; k--) {
    if (s.meta.times[k] > ms) continue;
    const f = s.values[v][k];
    let n = 0, sum = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= g.rows || cc >= g.cols) continue;
        const x = f[rr * g.cols + cc];
        if (Number.isFinite(x)) (n++, (sum += x));
      }
    if (n) return { value: sum / n, obsMs: s.meta.times[k] };
  }
  return null;
}

/** Pass SST minus the MUR analysis over every clear cell of the newest usable passes: mean bias and count. */
export function passBias(p: GridSeries, analysis: SatelliteData, passes = 4): { bias: number; n: number } {
  const g = p.meta.grid;
  let s = 0, n = 0;
  const frames = p.values.sst;
  for (let k = Math.max(0, frames.length - passes); k < frames.length; k++) {
    const ms = p.meta.times[k];
    for (let r = 0; r < g.rows; r += 2)
      for (let c = 0; c < g.cols; c += 2) {
        const x = frames[k][r * g.cols + c];
        if (!Number.isFinite(x)) continue;
        const lng = g.lon0 + c * g.dlon, lat = g.lat0 - r * g.dlat;
        const a = observedAt(analysis.sstCoast, 'sst', lng, lat, ms)?.value ?? observedAt(analysis.sst, 'sst', lng, lat, ms)?.value;
        if (a === undefined || !Number.isFinite(a)) continue;
        s += x - a;
        n++;
      }
  }
  return { bias: n ? s / n : NaN, n };
}

/** Days since the newest pass that saw at least CLOUDED_OUT of the sea. */
function lastClear(list: Pass[], now: number): number {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].clear >= CLOUDED_OUT) return (now - list[i].obsMs) / 864e5;
  return Infinity;
}

/** Verify checks: manifest, relay age, newest pass, the newest clear pass, range, and pass SST against the MUR analysis. */
export function passChecks(load: () => Promise<PassData>, loadAnalysis?: () => Promise<SatelliteData>): Check[] {
  let cached: Promise<PassData> | null = null;
  const need = async (k: 'sst' | 'chl') => {
    const s = (await (cached ??= load()))[k];
    if (!s) throw new Error(`no ${k} passes published`);
    return s;
  };
  const feed = (k: 'sst' | 'chl') => `${k}-pass`;
  const lag = (k: 'sst' | 'chl', warn: number, fail: number) => async (): Promise<Outcome> => {
    const s = await need(k);
    const d = (Date.now() - s.meta.times[s.meta.times.length - 1]) / 864e5;
    return { status: d > fail ? 'fail' : d > warn ? 'warn' : 'pass', detail: `newest pass ${d.toFixed(1)} d ago` };
  };
  // Cloud is weather, not a fault: a week with no clear pass is amber, never red.
  const clear = (k: 'sst' | 'chl', v: string, warn: number) => async (): Promise<Outcome> => {
    const list = passList(await need(k), v);
    const d = lastClear(list, Date.now());
    const share = list.length ? Math.round(100 * list[list.length - 1].clear) : 0;
    return { status: d > warn ? 'warn' : 'pass', detail: `${Number.isFinite(d) ? `last clear pass ${d.toFixed(1)} d ago` : 'no clear pass this week'}; newest ${share}% clear` };
  };
  const schema = (k: 'sst' | 'chl') => async (): Promise<Outcome> => {
    const p = validateMeta((await need(k)).meta);
    return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
  };
  const all = (s: GridSeries, v: string) => s.values[v].flatMap((f) => Array.from(f));
  const checks: Check[] = [
    { feed: feed('sst'), kind: 'schema', label: 'Manifest is well formed', run: schema('sst') },
    { feed: feed('sst'), kind: 'fresh', label: 'Relayed within the last 12 h', run: async () => freshness(Date.now() - Date.parse((await need('sst')).meta.fetchedAt), 6 * 3.6e6) },
    { feed: feed('sst'), kind: 'fresh', label: 'Newest pass under 2 days old', run: lag('sst', 2, 4) },
    { feed: feed('sst'), kind: 'fresh', label: 'A clear pass in the last 3 days', run: clear('sst', 'sst', 3) },
    // Cloudy cells are NaN, so allow up to 100% missing; the clear-pass check covers that.
    { feed: feed('sst'), kind: 'range', label: 'Values within 15..35 °C', run: async () => inRange(all(await need('sst'), 'sst'), 15, 35, '°C', 1) },
    { feed: feed('chl'), kind: 'schema', label: 'Manifest is well formed', run: schema('chl') },
    { feed: feed('chl'), kind: 'fresh', label: 'Newest pass under 5 days old', run: lag('chl', 5, 10) },
    { feed: feed('chl'), kind: 'fresh', label: 'A clear pass in the last 7 days', run: clear('chl', 'chl', 7) },
  ];
  if (loadAnalysis)
    checks.push({ feed: feed('sst'), kind: 'agree', label: 'Pass SST matches the MUR analysis', run: async () => {
      const { bias, n } = passBias(await need('sst'), await loadAnalysis());
      if (!n) return { status: 'warn', detail: 'no clear cells to compare' };
      // Afternoon skin SST runs a few tenths warm of the foundation analysis on calm days.
      const a = Math.abs(bias);
      return { status: a > 1.5 ? 'fail' : a > 0.8 ? 'warn' : 'pass', detail: `mean pass − MUR ${bias >= 0 ? '+' : ''}${bias.toFixed(2)} °C over ${n} cells` };
    } });
  return checks;
}
