/**
 * Wind map correction from the satellite (PLAN 7.10). The wind feed is Open-Meteo best match; the
 * ASCAT passes (adapters/passes.ts, PLAN 2.14) measure the real wind over the open sea. For each pass
 * in the last 4 days the model is read at the same cells and time, and a speed scale is fitted:
 *
 *   k_raw = Σ |obs|·|model| / Σ |model|²          (least squares through the origin, on speed)
 *   k     = 1 + (k_raw − 1) · P / (P + 2)          (shrunk toward 1 by the number of passes P)
 *   k     clamped to 0.8..1.25
 *
 * The forecast wind (u, v) is multiplied by k everywhere, so the particles, readouts and scores agree.
 * A scale, not an offset, because model wind errors over sea grow with the wind. The fit uses passes,
 * not cells, as its count, since the cells of one pass share the same weather. ASCAT measures
 * equivalent-neutral wind, which runs about 0.2 m/s above true 10 m wind in these warm seas; at 6 m/s
 * that is about 3% and is left in. The climatology (OUTLOOK band) is not touched.
 */
import type { GridSeries } from './pack';
import type { WindData } from './wind';
import { cachedFetch, type CacheDeps } from './cache';
import { modelWindAt, scatModelUrl } from './passes';
import { tideFix, type FixConfidence, type ResidualReading } from '../physics/tide-fix';
import type { Check, Outcome } from '../verify/types';

export const WIND_FIX_WINDOW_MS = 4 * 864e5;
export const WIND_FIX_SHRINK_P = 2;
export const WIND_FIX_RANGE = [0.8, 1.25] as const;
/** Model points per fit (one Open-Meteo call for all of them). */
export const WIND_FIX_POINTS = 20;

export interface WindFix {
  /** Multiply the forecast wind by this. */
  scale: number;
  /** Passes and cell pairs used. */
  passes: number;
  pairs: number;
  /** RMS vector difference, satellite minus model, before and after scaling, m/s. */
  rmsBefore: number;
  rmsAfter: number;
  /** Newest pass used, epoch ms. */
  atMs: number;
  confidence: FixConfidence;
}

const inWindow = (s: GridSeries, now: number) => s.meta.times.map((t, k) => [t, k] as const).filter(([t]) => t <= now && t >= now - WIND_FIX_WINDOW_MS).map(([, k]) => k);
const finite2 = (u: number, v: number) => Number.isFinite(u) && Number.isFinite(v);

/** Cells seen by at least two passes in the window, spread evenly, up to `max`: [cell index, lng, lat]. */
export function windFixPoints(s: GridSeries, now: number, max = WIND_FIX_POINTS): [number, number, number][] {
  const g = s.meta.grid, ks = inWindow(s, now), seen = new Uint16Array(g.cols * g.rows);
  for (const k of ks) for (let i = 0; i < seen.length; i++) if (finite2(s.values.u[k][i], s.values.v[k][i])) seen[i]++;
  const cells: number[] = [];
  for (let i = 0; i < seen.length; i++) if (seen[i] >= 2) cells.push(i);
  const step = Math.max(1, cells.length / max), out: [number, number, number][] = [];
  for (let j = 0; j < cells.length && out.length < max; j += step) {
    const i = cells[Math.floor(j)];
    out.push([i, +(g.lon0 + (i % g.cols) * g.dlon).toFixed(4), +(g.lat0 - Math.floor(i / g.cols) * g.dlat).toFixed(4)]);
  }
  return out;
}

/**
 * Fit the scale from the passes and the model's answer at `pts` (Open-Meteo multi-point JSON with
 * past days covering the window). Null with fewer than two passes that share a cell with the model.
 */
export function fitWindFix(s: GridSeries, pts: readonly [number, number, number][], modelJson: unknown, now: number): WindFix | null {
  let so = 0, mm = 0, passes = 0, pairs = 0, atMs = -Infinity;
  const used: { o: [number, number]; m: [number, number] }[] = [];
  for (const k of inWindow(s, now)) {
    const t = s.meta.times[k], model = modelWindAt(modelJson, t);
    let any = false;
    pts.forEach(([i], j) => {
      const o: [number, number] = [s.values.u[k][i], s.values.v[k][i]], m = model[j];
      if (!m || !finite2(...o) || !finite2(m[0], m[1])) return;
      const ho = Math.hypot(...o), hm = Math.hypot(m[0], m[1]);
      so += ho * hm;
      mm += hm * hm;
      used.push({ o, m: [m[0], m[1]] });
      pairs++;
      any = true;
    });
    if (any) (passes++, (atMs = Math.max(atMs, t)));
  }
  if (passes < 2 || mm <= 0) return null;
  const raw = so / mm;
  const scale = Math.min(WIND_FIX_RANGE[1], Math.max(WIND_FIX_RANGE[0], 1 + (raw - 1) * (passes / (passes + WIND_FIX_SHRINK_P))));
  const rms = (f: number) => Math.sqrt(used.reduce((a, p) => a + (p.o[0] - f * p.m[0]) ** 2 + (p.o[1] - f * p.m[1]) ** 2, 0) / used.length);
  const rmsBefore = rms(1), rmsAfter = rms(scale);
  const confidence: FixConfidence = passes >= 4 && rmsAfter <= 2.5 ? 'HIGH' : rmsAfter <= 4 ? 'MED' : 'LOW';
  return { scale, passes, pairs, rmsBefore, rmsAfter, atMs, confidence };
}

/** The scale to apply: 1 without a fix or when it is LOW (the satellite and model disagree in pattern, not just strength). */
export const appliedScale = (f: WindFix | null | undefined) => (f && f.confidence !== 'LOW' ? f.scale : 1);

/** The wind data with the forecast frames scaled by `k` (climatology untouched). */
export function scaleWind(d: WindData, k: number): WindData {
  if (!d.forecast || k === 1) return d;
  const f = d.forecast;
  const mul = (frames: Float32Array[]) => frames.map((a) => a.map((x) => x * k));
  return { ...d, forecast: { ...f, values: { ...f.values, u: mul(f.values.u), v: mul(f.values.v) } } };
}

/** Fetch the model at the pass cells and fit. Null when there are too few passes to fit. */
export async function fetchWindFix(s: GridSeries | null | undefined, now = Date.now(), deps?: Partial<CacheDeps>): Promise<WindFix | null> {
  if (!s?.values.u) return null;
  const pts = windFixPoints(s, now);
  if (!pts.length) return null;
  const ks = inWindow(s, now);
  const url = scatModelUrl(pts.map(([, lng, lat]) => [lng, lat]), Math.min(...ks.map((k) => s.meta.times[k])), now);
  const r = await cachedFetch(url, { key: 'https://api.open-meteo.com/wind-fix', deps });
  return fitWindFix(s, pts, await r.response.json(), now);
}

/**
 * Verify checks for the corrections (PLAN 7.10). Amber, never red: a large or unfitted correction is
 * worth a look (a gauge datum jump, a model having a bad week, or too few passes), not a broken feed.
 */
export function correctionChecks(loadScat: () => Promise<GridSeries | null | undefined>, loadGauge: () => Promise<readonly ResidualReading[]>): Check[] {
  return [
    { feed: 'scat-pass', kind: 'agree', label: 'Wind map speed scale from satellite passes', run: async (): Promise<Outcome> => {
      const f = await fetchWindFix(await loadScat());
      if (!f) return { status: 'warn', detail: 'fewer than two passes in 4 days: no correction' };
      const edge = f.scale <= WIND_FIX_RANGE[0] + 1e-6 || f.scale >= WIND_FIX_RANGE[1] - 1e-6;
      const detail = `×${f.scale.toFixed(2)} from ${f.passes} passes (${f.pairs} cells), RMS ${f.rmsBefore.toFixed(1)} → ${f.rmsAfter.toFixed(1)} m/s`;
      return { status: edge ? 'warn' : 'pass', detail: edge ? `at the limit: ${detail}` : detail };
    } },
    { feed: 'gauge', kind: 'agree', label: 'Gauge minus predicted tide over 24 h within ±0.15 m', run: async (): Promise<Outcome> => {
      const f = tideFix(await loadGauge(), Date.now());
      if (!f) return { status: 'warn', detail: 'under 12 h of plausible readings: no correction' };
      const detail = `${f.offsetM >= 0 ? '+' : ''}${f.offsetM.toFixed(2)} m over ${f.hours} h, spread ${f.sigmaM.toFixed(2)} m`;
      return { status: Math.abs(f.offsetM) <= 0.15 && f.confidence !== 'LOW' ? 'pass' : 'warn', detail };
    } },
  ];
}
