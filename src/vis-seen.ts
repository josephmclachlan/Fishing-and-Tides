/**
 * VIS SEEN (PLAN 7.48): the visibility you saw in the water, logged next to what the app said at the
 * same place and moment, with the model's terms behind it. The clarity model (PLAN 7.45) is built from
 * physics with no fitted constants; these entries are the data that can later test and tune its
 * rules of thumb (the Secchi factor, plume strength, KD_RESUSPENSION). One entry is a check, not a
 * calibration. Pure apart from the storage wrapper; on this device only.
 */

/** What the app said at the entry's place and moment. */
export interface VisApp {
  visM: number;
  visLo: number;
  visHi: number;
  cause: string;
  confidence: string;
  /** The model's terms, 1/m, and the inputs behind them. NaN or missing when unknown. */
  satKd?: number;
  plumeKd?: number;
  resKd?: number;
  /** Age of the newest satellite map at the entry, days. */
  satAgeD?: number;
  hs?: number;
  tp?: number;
  depthM?: number;
  currentMs?: number;
}

export interface VisSeen {
  id: string;
  /** When it was logged, epoch ms. */
  t: number;
  lng: number;
  lat: number;
  /** Seen, m: the low end of a range, or the bound of "15+". */
  seenM: number;
  /** The high end of a range; absent for a single value. */
  seenHiM?: number;
  /** "15+": at least this much (the far edge wasn't visible). */
  atLeast?: boolean;
  app: VisApp | null;
}

/** "15", "15+", "15-25" or "15–25" (comma decimals too) to metres; null for anything else or outside 0.1..80 m. */
export function parseSeen(s: string): Pick<VisSeen, 'seenM' | 'seenHiM' | 'atLeast'> | null {
  const m = s.trim().replace(/,/g, '.').replace(/\s*m$/i, '').match(/^(\d+(?:\.\d+)?)\s*(?:(\+)|[-–]\s*(\d+(?:\.\d+)?))?$/);
  if (!m) return null;
  const lo = Number(m[1]), hi = m[3] === undefined ? NaN : Number(m[3]);
  const ok = (x: number) => x >= 0.1 && x <= 80;
  if (!ok(lo) || (m[3] !== undefined && !(ok(hi) && hi >= lo))) return null;
  if (m[2]) return { seenM: lo, atLeast: true };
  return m[3] !== undefined && hi > lo ? { seenM: lo, seenHiM: hi } : { seenM: lo };
}

/** The entry as typed: "15", "15+" or "15-25". */
export const seenText = (e: Pick<VisSeen, 'seenM' | 'seenHiM' | 'atLeast'>) =>
  `${e.seenM}${e.atLeast ? '+' : e.seenHiM !== undefined ? `-${e.seenHiM}` : ''}`;

/** One number for a range: its geometric middle (visibility errors are multiplicative). */
export const seenMid = (e: Pick<VisSeen, 'seenM' | 'seenHiM'>) => (e.seenHiM !== undefined ? Math.sqrt(e.seenM * e.seenHiM) : e.seenM);

export interface VisSeenStats {
  /** Entries with an app value to compare. */
  n: number;
  /** Median of seen / app over them (a "15+" counts at its bound, so this leans low). */
  factor: number;
  /** Entries whose seen value or range overlaps the app's likely range. */
  inRange: number;
}

export function seenStats(xs: readonly VisSeen[]): VisSeenStats | null {
  const ok = xs.filter((e) => e.app && e.app.visM > 0 && Number.isFinite(e.app.visM));
  if (!ok.length) return null;
  const r = ok.map((e) => Math.log(seenMid(e) / e.app!.visM)).sort((a, b) => a - b);
  const k = r.length >> 1;
  const med = r.length % 2 ? r[k] : (r[k - 1] + r[k]) / 2;
  const inRange = ok.filter((e) => {
    const lo = e.seenM, hi = e.atLeast ? Infinity : e.seenHiM ?? e.seenM;
    return hi >= e.app!.visLo && lo <= e.app!.visHi;
  }).length;
  return { n: ok.length, factor: Math.exp(med), inRange };
}

const COLS = ['logged_utc', 'lat', 'lng', 'seen_m', 'seen_hi_m', 'at_least', 'app_vis_m', 'app_lo_m', 'app_hi_m', 'app_cause', 'app_confidence', 'sat_kd', 'plume_kd', 'stir_kd', 'sat_age_d', 'hs_m', 'tp_s', 'depth_m', 'current_ms'] as const;

/** All entries as CSV, oldest first, one row each. */
export function seenCSV(xs: readonly VisSeen[]): string {
  const n = (x: number | undefined, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '');
  const rows = [...xs].sort((a, b) => a.t - b.t).map((e) => {
    const a = e.app;
    return [new Date(e.t).toISOString(), e.lat.toFixed(5), e.lng.toFixed(5), String(e.seenM), e.seenHiM === undefined ? '' : String(e.seenHiM), e.atLeast ? '1' : '0',
      n(a?.visM, 1), n(a?.visLo, 1), n(a?.visHi, 1), a?.cause ?? '', a?.confidence ?? '',
      n(a?.satKd, 4), n(a?.plumeKd, 4), n(a?.resKd, 4), n(a?.satAgeD, 2), n(a?.hs, 2), n(a?.tp, 1), n(a?.depthM, 1), n(a?.currentMs, 2)].join(',');
  });
  return [COLS.join(','), ...rows].join('\n') + '\n';
}

export const SEEN_KEY = 'vis.seen.v1';

/** Entries in localStorage (or any Storage). A broken or missing value reads as none; writes that fail (private mode) are dropped. */
export function seenStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage) {
  const list = (): VisSeen[] => {
    try {
      const v = JSON.parse(storage?.getItem(SEEN_KEY) ?? '[]');
      return Array.isArray(v) ? v.filter((e) => e && typeof e.seenM === 'number' && typeof e.t === 'number') : [];
    } catch {
      return [];
    }
  };
  const save = (xs: VisSeen[]) => {
    try {
      storage?.setItem(SEEN_KEY, JSON.stringify(xs));
    } catch {
      /* private mode or full */
    }
  };
  return {
    list,
    add(e: VisSeen) {
      save([...list(), e]);
    },
  };
}
