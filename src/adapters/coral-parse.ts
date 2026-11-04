/**
 * Coral bleaching heat stress (PLAN 7.30) from NOAA Coral Reef Watch (CRW) v3.1, daily 5 km. Pure, with
 * no imports apart from types, so the Node data build (scripts/forecast/coral.ts) and the app share it.
 *
 * CRW's products, per 0.05° pixel and day:
 *  - SST (°C), CoralTemp night-time analysis.
 *  - SST anomaly (°C) against the 1985–2012 daily climatology.
 *  - HotSpot (°C) = SST − maximum monthly mean (MMM), the warmest month's normal. Negative is cooler.
 *  - Degree Heating Weeks (°C-weeks) = Σ HotSpot/7 over the last 84 days, counting only days with
 *    HotSpot ≥ 1 °C. DHW 4: significant bleaching likely. DHW 8: severe bleaching and mortality likely.
 *  - Bleaching Alert Area (BAA), 7-day maximum: 0 no stress, 1 watch, 2 warning, 3 alert 1, 4 alert 2.
 *
 * Reference: Skirving et al. (2020), "CoralTemp and the Coral Reef Watch Coral Bleaching Heat Stress
 * Product Suite Version 3.1", Remote Sensing 12(23) 3856; https://coralreefwatch.noaa.gov/product/5km/
 */

/** One reef's daily series. Arrays line up with `CoralData.days`; null where CRW had no value that day. */
export interface CoralReef {
  id: string;
  name: string;
  /** Where the reef is, [lng, lat]. */
  lngLat: [number, number];
  /** Centre of the CRW pixel used, [lng, lat]. */
  pixel: [number, number];
  dhw: (number | null)[];
  hotspot: (number | null)[];
  sstAnomaly: (number | null)[];
  sst: (number | null)[];
  /** Bleaching Alert Area, 7-day maximum, 0..4. */
  baa: (number | null)[];
}

export interface CoralData {
  /** ISO time the build fetched it (DATA AGE). */
  fetchedAt: string;
  /** Day stamps, epoch ms (CRW stamps each day at 12:00 UTC), oldest first. */
  days: number[];
  reefs: CoralReef[];
  licence: string;
}

/** Alert levels as CRW names them, 0..4. */
export type AlertLevel = 0 | 1 | 2 | 3 | 4;
export const ALERT_KEYS = ['none', 'watch', 'warning', 'alert1', 'alert2'] as const;

/** DHW thresholds, °C-weeks. */
export const DHW_BLEACHING = 4;
export const DHW_SEVERE = 8;

/**
 * One day's CRW alert level from that day's HotSpot and DHW (CRW v3.1 definitions):
 * HotSpot ≤ 0 none; 0 < HotSpot < 1 watch; HotSpot ≥ 1 and DHW < 4 warning, 4 ≤ DHW < 8 alert 1,
 * DHW ≥ 8 alert 2. The published BAA is the 7-day maximum of this.
 */
export function alertLevel(hotspot: number, dhw: number): AlertLevel {
  if (!(hotspot > 0)) return 0;
  if (hotspot < 1) return 1;
  return dhw >= DHW_SEVERE ? 4 : dhw >= DHW_BLEACHING ? 3 : 2;
}

export interface ErddapTable {
  columnNames: string[];
  rows: unknown[][];
}

/** Values of a point table keyed by `day|lat|lon` (rounded to the 0.025° pixel centres). */
function index(table: ErddapTable, value: string): Map<string, number> {
  const n = table.columnNames;
  const it = n.indexOf('time'), ila = n.indexOf('latitude'), ilo = n.indexOf('longitude'), iv = n.indexOf(value);
  if (it < 0 || ila < 0 || ilo < 0 || iv < 0) throw new Error(`coral: ${value} table has columns ${n.join(',')}`);
  const out = new Map<string, number>();
  for (const r of table.rows) {
    const v = r[iv];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out.set(`${Date.parse(r[it] as string)}|${key(r[ila] as number)}|${key(r[ilo] as number)}`, v);
  }
  return out;
}
const key = (x: number) => (Math.round(x * 40) / 40).toFixed(3);

/** Distinct days and pixel centres in a table. */
function axes(table: ErddapTable) {
  const n = table.columnNames;
  const it = n.indexOf('time'), ila = n.indexOf('latitude'), ilo = n.indexOf('longitude');
  const days = new Set<number>(), pix = new Map<string, [number, number]>();
  for (const r of table.rows) {
    days.add(Date.parse(r[it] as string));
    const lng = r[ilo] as number, lat = r[ila] as number;
    pix.set(`${key(lat)}|${key(lng)}`, [lng, lat]);
  }
  return { days: [...days].sort((a, b) => a - b), pixels: [...pix.values()] };
}

/** Nearest pixel with any DHW value to `lngLat`, within `maxDeg`; null if none (all land or cloud-free fill). */
function nearestPixel(lngLat: [number, number], pixels: [number, number][], has: (p: [number, number]) => boolean, maxDeg = 0.1): [number, number] | null {
  let best: [number, number] | null = null, bd = Infinity;
  const cos = Math.cos((lngLat[1] * Math.PI) / 180);
  for (const p of pixels) {
    const d = Math.hypot((p[0] - lngLat[0]) * cos, p[1] - lngLat[1]);
    if (d < bd && d <= maxDeg && has(p)) (bd = d, best = p);
  }
  return best;
}

/**
 * Build the per-reef feed from the five CRW ERDDAP tables over the same box and days. Each reef takes
 * the nearest pixel that has DHW values (CRW masks pixels that touch land). Days are the union of
 * every table's days, since the products are published on slightly different schedules.
 */
export function coralFromTables(
  t: { dhw: ErddapTable; hotspot: ErddapTable; sstAnomaly: ErddapTable; sst: ErddapTable; baa: ErddapTable },
  reefs: readonly { id: string; name: string; lngLat: [number, number] }[],
  fetchedAt: string,
  licence: string,
): CoralData {
  const dhw = index(t.dhw, 'degree_heating_week');
  const hs = index(t.hotspot, 'hotspot');
  const an = index(t.sstAnomaly, 'sea_surface_temperature_anomaly');
  const sst = index(t.sst, 'analysed_sst');
  const baa = index(t.baa, 'bleaching_alert_area');
  const ax = axes(t.dhw);
  const days = [...new Set([t.dhw, t.hotspot, t.sstAnomaly, t.sst, t.baa].flatMap((x) => axes(x).days))].sort((a, b) => a - b);
  const hasDhw = new Set([...dhw.keys()].map((k) => k.slice(k.indexOf('|') + 1)));
  const out: CoralReef[] = [];
  for (const r of reefs) {
    const p = nearestPixel(r.lngLat, ax.pixels, (q) => hasDhw.has(`${key(q[1])}|${key(q[0])}`));
    if (!p) continue;
    const pk = `${key(p[1])}|${key(p[0])}`;
    const col = (m: Map<string, number>, round: number) => days.map((d) => {
      const v = m.get(`${d}|${pk}`);
      return v === undefined ? null : Math.round(v * round) / round;
    });
    out.push({ id: r.id, name: r.name, lngLat: r.lngLat, pixel: [p[0], p[1]], dhw: col(dhw, 100), hotspot: col(hs, 100), sstAnomaly: col(an, 100), sst: col(sst, 100), baa: col(baa, 1) });
  }
  if (!out.length) throw new Error('coral: no reef has a CRW pixel with data');
  return { fetchedAt, days, reefs: out, licence };
}

/** Index of the newest day with a value in `xs`, or -1. */
export const lastIndex = (xs: readonly (number | null)[]) => {
  for (let i = xs.length - 1; i >= 0; i--) if (xs[i] !== null) return i;
  return -1;
};

export interface CoralNow {
  reef: CoralReef;
  /** Newest DHW and the day it is for (epoch ms), NaN if none. */
  dhw: number;
  dhwDay: number;
  hotspot: number;
  sstAnomaly: number;
  sst: number;
  /** Newest published 7-day alert (BAA), and the day it is for. */
  alert: AlertLevel | null;
  alertDay: number;
  /** Highest DHW in the feed's window (the last ~12 weeks). */
  peakDhw: number;
}

/** The newest values for one reef. Each product is read at its own newest day. */
export function coralNow(d: CoralData, reef: CoralReef): CoralNow {
  const at = (xs: (number | null)[]) => {
    const i = lastIndex(xs);
    return i < 0 ? { v: NaN, day: NaN } : { v: xs[i] as number, day: d.days[i] };
  };
  const dh = at(reef.dhw), b = at(reef.baa);
  const peak = reef.dhw.reduce<number>((m, x) => (x !== null && x > m ? x : m), -Infinity);
  return {
    reef, dhw: dh.v, dhwDay: dh.day, hotspot: at(reef.hotspot).v, sstAnomaly: at(reef.sstAnomaly).v, sst: at(reef.sst).v,
    alert: Number.isFinite(b.v) ? (Math.max(0, Math.min(4, Math.round(b.v))) as AlertLevel) : null, alertDay: b.day,
    peakDhw: Number.isFinite(peak) ? peak : NaN,
  };
}

/** The reef nearest a point (flat-earth distance is fine over this coast). */
export function nearestReef(d: CoralData, lngLat: [number, number]): CoralReef | null {
  const cos = Math.cos((lngLat[1] * Math.PI) / 180);
  let best: CoralReef | null = null, bd = Infinity;
  for (const r of d.reefs) {
    const dist = Math.hypot((r.lngLat[0] - lngLat[0]) * cos, r.lngLat[1] - lngLat[1]);
    if (dist < bd) (bd = dist, best = r);
  }
  return best;
}
