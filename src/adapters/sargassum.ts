/**
 * Sargassum adapter (PLAN 7.1): the daily satellite detections relayed by the data build
 * (scripts/forecast/satellite.ts, `sargassum`: share of the sea surface covered by weed per 0.06°
 * cell, NaN where cloud or the coast hid the sea) and the seeds the drift forecast starts from.
 */
import type { GridSeries } from './pack';
import { validateMeta } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check, type Outcome } from '../verify/types';
import type { Seed } from '../physics/drift';

export interface SargassumData {
  series: GridSeries | null;
  fetchedAt: number;
}

export async function fetchSargassum(opts: LoadOptions = {}): Promise<SargassumData> {
  try {
    const r = await loadSeries('sargassum', opts);
    return { series: r.series, fetchedAt: r.fetchedAt };
  } catch {
    return { series: null, fetchedAt: NaN };
  }
}

const RAD = Math.PI / 180;
/** Area of a grid cell at latitude `lat`, km². */
export const cellKm2 = (dlon: number, dlat: number, lat: number) => dlon * 111.32 * Math.cos(lat * RAD) * dlat * 110.574;

/** How far back a sighting still seeds the forecast. Older ones have drifted too far to place. */
export const SEED_MAX_AGE_MS = 5 * 864e5;

export interface CellState {
  /** Newest cover seen (0..1) and when, or null if the cell was hidden all window. */
  cover: number | null;
  ms: number | null;
}

/**
 * Each cell's newest sighting at or before `now` within SEED_MAX_AGE_MS: what the satellite last saw
 * there. Row 0 north, like the grid.
 */
export function latestCover(s: GridSeries, now: number, maxAgeMs = SEED_MAX_AGE_MS): CellState[] {
  const g = s.meta.grid, n = g.cols * g.rows, frames = s.values.cover;
  const out: CellState[] = Array.from({ length: n }, () => ({ cover: null, ms: null }));
  for (let k = frames.length - 1; k >= 0; k--) {
    const ms = s.meta.times[k];
    if (ms > now || ms < now - maxAgeMs) continue;
    for (let i = 0; i < n; i++) if (out[i].cover === null && Number.isFinite(frames[k][i])) out[i] = { cover: frames[k][i], ms };
  }
  return out;
}

/** Forecast seeds: every cell whose newest sighting had mats, at its centre, with the weed area in km². */
export function sargassumSeeds(s: GridSeries | null, now: number): Seed[] {
  if (!s?.values.cover) return [];
  const g = s.meta.grid;
  return latestCover(s, now).flatMap((c, i) => {
    if (!c.cover || c.ms === null) return [];
    const lng = g.lon0 + (i % g.cols) * g.dlon, lat = g.lat0 - Math.floor(i / g.cols) * g.dlat;
    return [{ lng, lat, ms: c.ms, amount: c.cover * cellKm2(g.dlon, g.dlat, lat) }];
  });
}

/** Share of the sea seen at least once in the window (the rest is unknown), and the newest sighting. */
export function coverage(s: GridSeries, now: number): { seen: number; newestMs: number | null } {
  const st = latestCover(s, now);
  const seen = st.filter((c) => c.cover !== null).length;
  const sea = Math.max(s.meta.seaCells ?? 0, seen);
  const ms = st.reduce<number | null>((m, c) => (c.ms !== null && (m === null || c.ms > m) ? c.ms : m), null);
  return { seen: sea ? seen / sea : 0, newestMs: ms };
}

/** Verify checks: manifest, relay age, newest day, how much of the sea was seen, and the range. */
export function sargassumChecks(load: () => Promise<SargassumData>): Check[] {
  let cached: Promise<SargassumData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.series) throw new Error('no sargassum detections published');
    return d.series;
  };
  return [
    { feed: 'sargassum', kind: 'schema', label: 'Manifest is well formed', run: async (): Promise<Outcome> => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'sargassum', kind: 'fresh', label: 'Relayed within the last 24 h', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 12 * 3.6e6) },
    { feed: 'sargassum', kind: 'fresh', label: 'Newest map under 3 days old', run: async (): Promise<Outcome> => {
      const s = await need();
      const d = (Date.now() - s.meta.times[s.meta.times.length - 1]) / 864e5;
      return { status: d > 6 ? 'fail' : d > 3 ? 'warn' : 'pass', detail: `newest map ${d.toFixed(1)} d ago` };
    } },
    // Cloud is weather, not a fault: amber only.
    { feed: 'sargassum', kind: 'fresh', label: 'A fifth of the sea seen in 5 days', run: async (): Promise<Outcome> => {
      const c = coverage(await need(), Date.now());
      return { status: c.seen < 0.2 ? 'warn' : 'pass', detail: `${Math.round(100 * c.seen)}% of the sea seen` };
    } },
    { feed: 'sargassum', kind: 'range', label: 'Cover within 0..1', run: async () => inRange((await need()).values.cover.flatMap((f) => Array.from(f).filter(Number.isFinite)), 0, 1, '', 1) },
  ];
}
