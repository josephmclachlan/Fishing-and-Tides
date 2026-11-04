/**
 * MUD WEEKS feed (PLAN 7.39): daily Kd490 at each reef's pixel (CORAL_REEFS kdPixel) for the last ~90
 * days, relayed by the data build from NOAA CoastWatch (gap-filled VIIRS + OLCI, 2 km, science
 * quality, about 10 days late), plus the history file's per-reef baseline and yearly peaks. Pure.
 */
import type { ErddapTable } from './coral-parse';

export interface MudReef {
  id: string;
  /** Pixel centre, [lng, lat]. */
  pixel: [number, number];
  /** Daily Kd490, 1/m, lined up with `days`; null where missing. */
  kd: (number | null)[];
}

export interface MudData {
  /** ISO time the build fetched it (DATA AGE). */
  fetchedAt: string;
  /** Day stamps, epoch ms, oldest first (the product skips some days). */
  days: number[];
  reefs: MudReef[];
  licence: string;
}

export interface MudHistory {
  fetchedAt: string;
  /** Record used for the baselines, ISO days. */
  from: string;
  to: string;
  years: number[];
  reefs: { id: string; pixel: [number, number]; baselineKd: number; peak: (number | null)[]; peakDay: (string | null)[] }[];
  method: string;
  licence: string;
}

/** Kd490 values this far apart are the same pixel (the grid step is 1/48°). */
const SAME = 1e-3;
/** Valid Kd490 range: the product's valid_max is 6 m⁻¹ and its fill reads +6.5534. */
export const KD_RANGE: [number, number] = [0.01, 6];

/** Pick each reef's pixel column out of an ERDDAP Kd490 table (time, altitude?, latitude, longitude, kd_490). */
export function mudFromTable(table: ErddapTable, reefs: readonly { id: string; kdPixel: [number, number] }[], fetchedAt: string, licence: string): MudData {
  const n = table.columnNames;
  const it = n.indexOf('time'), ila = n.indexOf('latitude'), ilo = n.indexOf('longitude'), iv = n.indexOf('kd_490');
  if (it < 0 || ila < 0 || ilo < 0 || iv < 0) throw new Error(`mud: columns ${n.join(',')}`);
  const dayIdx = new Map<number, number>();
  for (const r of table.rows) {
    const t = Date.parse(String(r[it]));
    if (Number.isFinite(t) && !dayIdx.has(t)) dayIdx.set(t, 0);
  }
  const days = [...dayIdx.keys()].sort((a, b) => a - b);
  days.forEach((d, i) => dayIdx.set(d, i));
  const out: MudReef[] = reefs.map((r) => ({ id: r.id, pixel: r.kdPixel, kd: days.map(() => null) }));
  for (const row of table.rows) {
    const la = row[ila] as number, lo = row[ilo] as number, v = row[iv];
    const i = dayIdx.get(Date.parse(String(row[it])));
    if (i === undefined || typeof v !== 'number' || v < KD_RANGE[0] || v > KD_RANGE[1]) continue;
    for (const r of out) if (Math.abs(r.pixel[1] - la) < SAME && Math.abs(r.pixel[0] - lo) < SAME) r.kd[i] = Math.round(v * 1e4) / 1e4;
  }
  return { fetchedAt, days, reefs: out, licence };
}

/** A griddap Kd490 query over the box around the reef pixels for the last `n` time steps, or a date range. */
export function mudQuery(reefs: readonly { kdPixel: [number, number] }[], time: string): string {
  const pad = 0.012;
  const lat = reefs.map((r) => r.kdPixel[1]), lng = reefs.map((r) => r.kdPixel[0]);
  const n = Math.max(...lat) + pad, s = Math.min(...lat) - pad, w = Math.min(...lng) - pad, e = Math.max(...lng) + pad;
  // The dataset stores latitude north to south.
  const sel = `kd_490[${time}][0][(${n.toFixed(4)}):1:(${s.toFixed(4)})][(${w.toFixed(4)}):1:(${e.toFixed(4)})]`;
  return `https://coastwatch.noaa.gov/erddap/griddap/${MUD_DATASET}.json?${sel.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
}
export const MUD_DATASET = 'noaacwNPPN20S3AkdSCIDINEOF2kmDaily';
export const MUD_LICENCE = 'NOAA CoastWatch ERDDAP (VIIRS + OLCI Kd490, gap-filled DINEOF, 2 km), public domain; credit NOAA/NESDIS';
