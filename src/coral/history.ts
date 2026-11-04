/**
 * Coral heat history (PLAN 7.32): each reef's highest Degree Heating Week value per year since CRW's
 * record starts (1985), from weekly samples of NOAA Coral Reef Watch DHW. DHW is a 12-week running
 * sum, so weekly samples miss the true peak by a few hundredths at most. Built once by
 * `npm run data:coral-history` into public/data/climatology/coral-history.json (committed); the
 * current year is topped up from the live feed in the app. Pure, no imports apart from types.
 */
import type { ErddapTable } from '../adapters/coral-parse';

export interface CoralHistory {
  fetchedAt: string;
  years: number[];
  reefs: { id: string; pixel: [number, number]; peak: (number | null)[]; peakDay: (string | null)[] }[];
  licence: string;
}

const key = (x: number) => (Math.round(x * 40) / 40).toFixed(3);

/** Per-year peaks for each reef's pixel from one year's DHW table over the reef box. */
export function yearPeaks(table: ErddapTable, pixels: readonly { id: string; pixel: [number, number] }[]): Record<string, { peak: number; day: string } | null> {
  const n = table.columnNames;
  const it = n.indexOf('time'), ila = n.indexOf('latitude'), ilo = n.indexOf('longitude'), iv = n.indexOf('degree_heating_week');
  if (it < 0 || ila < 0 || ilo < 0 || iv < 0) throw new Error(`coral history: columns ${n.join(',')}`);
  // Two reefs can share a 5 km pixel (Punta Uva and Manzanillo).
  const want = new Map<string, string[]>();
  for (const p of pixels) {
    const k = `${key(p.pixel[1])}|${key(p.pixel[0])}`;
    want.set(k, [...(want.get(k) ?? []), p.id]);
  }
  const out: Record<string, { peak: number; day: string } | null> = Object.fromEntries(pixels.map((p) => [p.id, null]));
  for (const r of table.rows) {
    const v = r[iv];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    for (const id of want.get(`${key(r[ila] as number)}|${key(r[ilo] as number)}`) ?? []) {
      const cur = out[id];
      if (!cur || v > cur.peak) out[id] = { peak: Math.round(v * 100) / 100, day: String(r[it]).slice(0, 10) };
    }
  }
  return out;
}

/** The year's peak for one reef, taking the larger of the stored history and the live 84-day window. */
export function peakFor(h: CoralHistory | null, id: string, year: number, live?: { peak: number; year: number }): number | null {
  const r = h?.reefs.find((x) => x.id === id);
  const i = h ? h.years.indexOf(year) : -1;
  const stored = r && i >= 0 ? r.peak[i] : null;
  const fromLive = live && live.year === year && Number.isFinite(live.peak) ? live.peak : null;
  if (stored === null) return fromLive;
  return fromLive === null ? stored : Math.max(stored, fromLive);
}
