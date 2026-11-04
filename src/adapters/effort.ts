/**
 * Fishing effort (PLAN 7.19): where AIS-tracked fishing boats worked over the last year, as hours
 * per 0.1° cell from Global Fishing Watch, relayed by the data build (scripts/forecast/effort.ts).
 * Pangas rarely carry AIS, so this shows the industrial boats offshore (longliners, seiners), not
 * local inshore fishing. GFW calls it "apparent fishing effort": a model's guess from vessel tracks.
 */
import type { GridSeries } from './pack';
import { validateMeta } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface EffortData {
  series: GridSeries | null;
  fetchedAt: number;
}

export async function fetchEffort(opts: LoadOptions = {}): Promise<EffortData> {
  try {
    const r = await loadSeries('effort', opts);
    return { series: r.series, fetchedAt: r.fetchedAt };
  } catch {
    return { series: null, fetchedAt: NaN };
  }
}

export interface EffortCell {
  /** Cell centre. */
  lng: number;
  lat: number;
  hours: number;
  /** 1 light, 2 moderate, 3 heavy: thirds of the busy cells, by rank. */
  level: 1 | 2 | 3;
}

/** Cells with fishing, from the one frame; levels split the cells with at least `minH` hours into thirds by rank. */
export function effortCells(s: GridSeries | null, minH = 1): EffortCell[] {
  const f = s?.values.hours?.[0];
  if (!s || !f) return [];
  const g = s.meta.grid;
  const cells: Omit<EffortCell, 'level'>[] = [];
  for (let i = 0; i < f.length; i++) if (f[i] >= minH) cells.push({ lng: g.lon0 + (i % g.cols) * g.dlon, lat: g.lat0 - Math.floor(i / g.cols) * g.dlat, hours: f[i] });
  const sorted = cells.map((c) => c.hours).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const [t1, t2] = [q(1 / 3), q(2 / 3)];
  return cells.map((c) => ({ ...c, level: c.hours >= t2 ? 3 : c.hours >= t1 ? 2 : 1 }));
}

/** Verify checks: rebuilt daily from a year of data; hours per 0.1° cell per year stay well under 3000. */
export function effortChecks(load: () => Promise<EffortData>): Check[] {
  let cached: Promise<EffortData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.series) throw new Error('no fishing effort published (is the GFW_TOKEN secret set?)');
    return d.series;
  };
  return [
    { feed: 'effort', kind: 'schema', label: 'Manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'effort', kind: 'fresh', label: 'Fetched within the last 2 days', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 24 * 3.6e6) },
    { feed: 'effort', kind: 'range', label: 'Hours per cell within 0..3000', run: async () => inRange((await need()).values.hours[0], 0, 3000, 'h') },
    { feed: 'effort', kind: 'agree', label: 'Some fishing in the box over the year', run: async () => {
      const total = Array.from((await need()).values.hours[0]).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
      return total > 0 ? { status: 'pass', detail: `${Math.round(total)} h` } : { status: 'warn', detail: 'no fishing hours at all: check the request' };
    } },
  ];
}
