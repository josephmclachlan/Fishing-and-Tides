/**
 * Tide correction from the Limón gauge (PLAN 7.10). Pure. The harmonic prediction (physics/tide.ts)
 * knows only the astronomical tide; the sea also sits higher or lower for days at a time with
 * pressure, wind set-up, river outflow and seasonal warming. The gauge measures the sum, so
 *
 *   r(t)       = gauge(t) − predicted(t)                 (the residual)
 *   offset     = mean of the hourly residuals over the last 24 h
 *   σ          = their RMS spread about that mean
 *   fix(t)     = offset                       for t ≤ now
 *              = offset · exp(−(t − now) / τ) for t > now, τ = 2 days
 *
 * The 24 h mean averages out the hours where the harmonics are a little early or late (those swing
 * the residual both ways within a day). The decay is persistence: such anomalies here usually last
 * days, so the fix fades over the first days ahead rather than being carried to the end of the month.
 * Hours over MAX_RESIDUAL_M are dropped as spikes, and an offset over MAX_OFFSET_M is not applied
 * (more likely a gauge or datum fault than the sea).
 */

export interface ResidualReading {
  t: number;
  levelM: number;
  tideM: number;
}

export type FixConfidence = 'HIGH' | 'MED' | 'LOW';

export interface TideFix {
  /** Mean gauge minus prediction, m. */
  offsetM: number;
  /** RMS spread of the hourly residuals about the mean, m. */
  sigmaM: number;
  /** Hours with readings in the window. */
  hours: number;
  /** End of the window (the newest reading), epoch ms: the fix starts fading after it. */
  atMs: number;
  confidence: FixConfidence;
}

export const TIDE_FIX_WINDOW_MS = 24 * 3.6e6;
export const TIDE_FIX_TAU_MS = 2 * 864e5;
export const MIN_HOURS = 12;
export const MAX_RESIDUAL_M = 0.5;
export const MAX_OFFSET_M = 0.3;

/** The fix from the gauge readings up to `nowMs`, or null with fewer than MIN_HOURS hours or an implausible offset. */
export function tideFix(readings: readonly ResidualReading[], nowMs: number): TideFix | null {
  const bins = new Map<number, { s: number; n: number }>();
  let newest = -Infinity;
  for (const r of readings) {
    if (r.t > nowMs || r.t < nowMs - TIDE_FIX_WINDOW_MS) continue;
    const d = r.levelM - r.tideM;
    if (!Number.isFinite(d) || Math.abs(d) > MAX_RESIDUAL_M) continue;
    const h = Math.floor(r.t / 3.6e6);
    const b = bins.get(h) ?? { s: 0, n: 0 };
    b.s += d;
    b.n++;
    bins.set(h, b);
    newest = Math.max(newest, r.t);
  }
  const hourly = [...bins.values()].map((b) => b.s / b.n);
  if (hourly.length < MIN_HOURS) return null;
  const offsetM = hourly.reduce((a, b) => a + b, 0) / hourly.length;
  if (Math.abs(offsetM) > MAX_OFFSET_M) return null;
  const sigmaM = Math.sqrt(hourly.reduce((a, x) => a + (x - offsetM) ** 2, 0) / hourly.length);
  const confidence: FixConfidence = hourly.length >= 20 && sigmaM <= 0.06 ? 'HIGH' : sigmaM <= 0.12 ? 'MED' : 'LOW';
  return { offsetM, sigmaM, hours: hourly.length, atMs: newest, confidence };
}

/** The correction to add to the predicted tide at `ms`, m (0 without a fix). */
export const tideFixAt = (f: TideFix | null | undefined, ms: number): number => (!f ? 0 : ms <= f.atMs ? f.offsetM : f.offsetM * Math.exp(-(ms - f.atMs) / TIDE_FIX_TAU_MS));
