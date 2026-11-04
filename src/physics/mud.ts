/**
 * MUD WEEKS (PLAN 7.39): how much light murky water has taken from a reef over the last 12 weeks,
 * built like NOAA's Degree Heating Weeks so the two read side by side. Pure, SI units (Kd in 1/m,
 * depth in m, times in ms), no DOM.
 *
 * Why light: sediment harms coral by shading it (less photosynthesis for the algae that feed it), by
 * settling on it (energy spent clearing mucus) and by smothering recruits. Satellites see the first
 * through the diffuse attenuation coefficient Kd490; settling needs traps on the reef, which is why
 * the field log records trap rates to calibrate this later.
 *
 * 1. Light left at depth z (Beer–Lambert): E(z) = E0·exp(−Kd·z). Kd490 stands in for the attenuation of
 *    photosynthetic light (PAR); in coastal water the two are close enough for a relative measure.
 * 2. The reef's own clear baseline Kd_b: the 20th percentile of its daily Kd over the whole record
 *    (2018 on). A reef next to a river mouth is judged against its own normal, not against open sea.
 * 3. Light lost on a day, relative to that baseline: L = 1 − exp(−max(0, Kd − Kd_b)·z), from 0 to 1.
 * 4. Daily dose: L on days that lose at least half the light (L ≥ LOSS_MIN), else 0. Ordinary murk
 *    does not accumulate, as HotSpots under 1 °C do not count towards DHW.
 * 5. MUD WEEKS = Σ dose over the 84 days up to and including the newest day / 7. One MUD WEEK is the
 *    light of one week lost entirely, or two weeks at half light.
 *
 * Levels (WATCH ≥ 2, HIGH ≥ 4) are rules of thumb chosen so that the 2026 wet season at Cahuita, with
 * repeated Estrella plumes, reads HIGH while Punta Mona and Limón read WATCH or below. They are NOT
 * calibrated against coral health on this coast: Secchi and sediment-trap readings in the field log
 * are the data to calibrate them. Rogers (1990) puts sedimentation above ~10 mg/cm²/day as stressful.
 */
export const MUD_WINDOW_D = 84;
/** Fraction of light lost before a day counts. */
export const LOSS_MIN = 0.5;
export const MUD_WATCH = 2;
export const MUD_HIGH = 4;
/** Depth used for a public reef area when no site depth is known, m (Cahuita's reef flat 0-3 m, fore-reef 5-10 m). */
export const REEF_DEPTH_M = 4;
/** Depths outside this are clamped, m. */
export const DEPTH_RANGE: [number, number] = [0.5, 20];
/** Baseline percentile of daily Kd. */
export const BASELINE_PCT = 0.2;

const DAY_MS = 864e5;

/** Fraction of light lost at depth `z` when Kd is above the baseline, 0..1. */
export function lightLoss(kd: number, baseKd: number, z: number): number {
  if (!Number.isFinite(kd) || !Number.isFinite(baseKd)) return 0;
  const d = Math.min(DEPTH_RANGE[1], Math.max(DEPTH_RANGE[0], z));
  return 1 - Math.exp(-Math.max(0, kd - baseKd) * d);
}

/** One day's dose: the light lost if it reached LOSS_MIN, else 0. */
export const dailyDose = (kd: number, baseKd: number, z: number) => {
  const l = lightLoss(kd, baseKd, z);
  return l >= LOSS_MIN ? l : 0;
};

/** The p-quantile (0..1) of the finite positive values, nearest-rank; NaN with none. */
export function baselineKd(values: readonly (number | null)[], p = BASELINE_PCT): number {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!xs.length) return NaN;
  return xs[Math.min(xs.length - 1, Math.max(0, Math.ceil(p * xs.length) - 1))];
}

/**
 * MUD WEEKS at day index `i` of a daily series (days may be missing; the window is by time, not by
 * count, so a gap counts as no dose). NaN if day i has no value or the baseline is unknown.
 */
export function mudWeeksAt(days: readonly number[], kd: readonly (number | null)[], baseKd: number, z: number, i = days.length - 1): number {
  if (i < 0 || !Number.isFinite(baseKd) || kd[i] === null || !Number.isFinite(kd[i] as number)) return NaN;
  const from = days[i] - (MUD_WINDOW_D - 1) * DAY_MS - DAY_MS / 2;
  let sum = 0;
  for (let j = i; j >= 0 && days[j] >= from; j--) {
    const v = kd[j];
    if (v !== null && Number.isFinite(v)) sum += dailyDose(v, baseKd, z);
  }
  return sum / 7;
}

/** MUD WEEKS for every day of the series. */
export const mudWeeksSeries = (days: readonly number[], kd: readonly (number | null)[], baseKd: number, z: number) =>
  days.map((_, i) => mudWeeksAt(days, kd, baseKd, z, i));

export type MudLevel = 'ok' | 'watch' | 'high' | 'none';
export const mudLevel = (mw: number): MudLevel => (!Number.isFinite(mw) ? 'none' : mw >= MUD_HIGH ? 'high' : mw >= MUD_WATCH ? 'watch' : 'ok');

/** Index of the newest day with a value, or -1. */
export const lastWithValue = (kd: readonly (number | null)[]) => {
  for (let i = kd.length - 1; i >= 0; i--) if (kd[i] !== null && Number.isFinite(kd[i] as number)) return i;
  return -1;
};
