/**
 * Tide chart (PLAN 4.1): one local day of predicted tide at Limón as an inline SVG, with the high
 * and low waters labelled, night shaded, a cursor at the time on the slider and the live gauge
 * (PLAN 2.11) drawn over it where the day has readings. Pure: builds data and markup, no DOM, so
 * the side panel and the spot page share it and it is testable. Colours come from CSS classes
 * (`.tc-*` in style.css), which use the theme variables.
 */
import { tideFixNow } from './corrections';
import { LIMON_DATUMS, LIMON_HARMONICS } from './data/tides-limon';
import { extrema, predictSeries, type Extremum, type Harmonics } from './physics/tide';
import { sunTimes } from './physics/astro';
import { REGION, TIDE_STATION } from './region';

const HOUR_MS = 3.6e6;
const DAY_MS = 24 * HOUR_MS;

export interface TideDay {
  /** Local midnight that starts the day, epoch ms, and the end 24 h later. */
  t0: number;
  t1: number;
  /** Predicted heights every 10 min, m above mean sea level. */
  series: { t: number[]; h: number[] };
  /** High and low waters within the day. */
  extrema: Extremum[];
  /** Dark spans (sun below the horizon) within the day. */
  night: [number, number][];
}

/** Predicted tide and daylight for the local day starting at `t0` (see `localDayStart` in physics/astro.ts). */
export function tideDay(t0: number, hc: Harmonics = LIMON_HARMONICS, at: [number, number] = TIDE_STATION.lngLat, fix: (ms: number) => number = tideFixNow): TideDay {
  const t1 = t0 + DAY_MS;
  const sun = sunTimes(t0, at[1], at[0]);
  const night: [number, number][] = [];
  if (sun.sunrise !== null) night.push([t0, sun.sunrise]);
  if (sun.sunset !== null) night.push([sun.sunset, t1]);
  const s = predictSeries(hc, t0, t1, 10 * 60_000);
  // The gauge correction (PLAN 7.10) lifts the whole curve; it changes too slowly to move the turning times.
  const series = { t: s.t, h: s.h.map((h, i) => h + fix(s.t[i])) };
  return { t0, t1, series, extrema: extrema(hc, t0, t1).map((e) => ({ ...e, h: e.h + fix(e.t) })), night };
}

/** The next `n` high and low waters after `fromMs`. */
export function nextTides(fromMs: number, n = 4, hc: Harmonics = LIMON_HARMONICS, fix: (ms: number) => number = tideFixNow): Extremum[] {
  // Four turns a day on most days here (mixed tide), two on the most diurnal: scan just far enough (PLAN 5.4).
  for (let days = Math.max(1, Math.ceil(n / 3)); ; days++) {
    const ex = extrema(hc, fromMs, fromMs + days * DAY_MS).filter((e) => e.t > fromMs);
    if (ex.length >= n || days >= 4) return ex.slice(0, n).map((e) => ({ ...e, h: e.h + fix(e.t) }));
  }
}

/** Local clock time HH:MM (Costa Rica). */
export function localClock(ms: number, tzOffsetH: number = REGION.tzOffsetH): string {
  const d = new Date(ms + tzOffsetH * HOUR_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Signed height in m, two decimals: "+0.21", "-0.08". */
export const signedM = (h: number) => (h >= 0 ? '+' : '−') + Math.abs(h).toFixed(2);

export interface ChartOptions {
  /** Cursor time (the slider), drawn when inside the day. */
  cursor?: number;
  /** Gauge readings, m above MSL; only those inside the day are drawn. */
  observed?: readonly { t: number; levelM: number }[];
  /** viewBox size; the SVG scales to its box. */
  width?: number;
  height?: number;
  /** Accessible name. */
  label?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * SVG markup for a tide day. The height axis is fixed to the station's astronomical range
 * (LAT to HAT, widened if the gauge goes past it), so a small-tide day looks small.
 */
export function tideChartSvg(day: TideDay, opts: ChartOptions = {}): string {
  const W = opts.width ?? 240;
  const H = opts.height ?? 84;
  const top = 14; // room for the high-water labels
  const bottom = H - 12; // and the hour ticks
  const obs = (opts.observed ?? []).filter((r) => r.t >= day.t0 && r.t <= day.t1 && Number.isFinite(r.levelM));
  let lo = LIMON_DATUMS.lat - 0.03;
  let hi = LIMON_DATUMS.hat + 0.03;
  for (const r of obs) (lo = Math.min(lo, r.levelM)), (hi = Math.max(hi, r.levelM));
  const x = (t: number) => ((t - day.t0) / (day.t1 - day.t0)) * W;
  const y = (h: number) => bottom - ((h - lo) / (hi - lo)) * (bottom - top);
  const f = (n: number) => n.toFixed(1);
  const path = (pts: [number, number][]) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${f(px)} ${f(py)}`).join('');

  const parts: string[] = [];
  for (const [a, b] of day.night) parts.push(`<rect class="tc-night" x="${f(x(a))}" y="0" width="${f(x(b) - x(a))}" height="${bottom}"/>`);
  parts.push(`<line class="tc-msl" x1="0" x2="${W}" y1="${f(y(0))}" y2="${f(y(0))}"/>`);
  for (let hr = 0; hr <= 24; hr += 6) {
    const px = Math.min(W - 0.5, Math.max(0.5, x(day.t0 + hr * HOUR_MS)));
    parts.push(`<line class="tc-tick" x1="${f(px)}" x2="${f(px)}" y1="${bottom}" y2="${bottom + 3}"/>`);
    if (hr < 24) parts.push(`<text class="tc-hr" x="${f(px + 2)}" y="${H - 1}">${String(hr).padStart(2, '0')}</text>`);
  }
  // Area under the curve, then the curve.
  const curve = day.series.t.map((t, i) => [x(t), y(day.series.h[i])] as [number, number]);
  parts.push(`<path class="tc-fill" d="${path(curve)}L${f(W)} ${bottom}L0 ${bottom}Z"/>`);
  parts.push(`<path class="tc-curve" d="${path(curve)}"/>`);
  if (obs.length > 1) parts.push(`<path class="tc-obs" d="${path(obs.map((r) => [x(r.t), y(r.levelM)]))}"/>`);
  for (const e of day.extrema) {
    const px = x(e.t);
    const py = y(e.h);
    const anchor = px < 30 ? 'start' : px > W - 30 ? 'end' : 'middle';
    const ty = e.type === 'high' ? py - 4 : Math.min(bottom - 2, py + 10);
    parts.push(`<circle class="tc-ex" cx="${f(px)}" cy="${f(py)}" r="2"/>`);
    parts.push(`<text class="tc-lbl" x="${f(px)}" y="${f(Math.max(9, ty))}" text-anchor="${anchor}">${localClock(e.t)}</text>`);
  }
  if (opts.cursor !== undefined && opts.cursor >= day.t0 && opts.cursor <= day.t1) {
    const px = f(x(opts.cursor));
    parts.push(`<line class="tc-cursor" x1="${px}" x2="${px}" y1="0" y2="${bottom}"/>`);
  }
  const label = opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ' aria-hidden="true"';
  return `<svg class="tide-chart" viewBox="0 0 ${W} ${H}"${label}>${parts.join('')}</svg>`;
}

/**
 * Mean level per `binMs` window (default 10 min), so the 1-minute gauge readings, which carry
 * seiche and wave noise of a few cm, draw as a clean line. Returns [{ t: bin centre, levelM }].
 */
export function binReadings(readings: readonly { t: number; levelM: number }[], binMs = 10 * 60_000): { t: number; levelM: number }[] {
  const bins = new Map<number, { s: number; n: number }>();
  for (const r of readings) {
    if (!Number.isFinite(r.levelM)) continue;
    const k = Math.floor(r.t / binMs);
    const b = bins.get(k) ?? { s: 0, n: 0 };
    b.s += r.levelM;
    b.n++;
    bins.set(k, b);
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([k, b]) => ({ t: (k + 0.5) * binMs, levelM: b.s / b.n }));
}

/** Hours ahead of `baseMs` for a tap at fraction `fx` (0..1) across the chart of the day starting `t0`. */
export function offsetForTap(fx: number, t0: number, baseMs: number): number {
  const t = t0 + Math.min(1, Math.max(0, fx)) * DAY_MS;
  return Math.round((t - baseMs) / HOUR_MS);
}
