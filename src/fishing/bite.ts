/**
 * BITE score: how good the timing is for fishing at a place and moment, from things that change
 * through the day. Pure: no DOM, SI units. Rule-of-thumb weights, NOT validated against catches;
 * the fishing effect of the moon is angler folklore, so solunar carries the smallest weight.
 *
 *   timing = 0.40 tide + 0.35 light + 0.15 solunar + 0.10 calm      (each term 0..1)
 *   bite   = timing × weather × (0.4 + 0.6 × habitat)
 *
 * tide    fish feed on moving water: |dh/dt| as a share of the day's fastest flow, floor 0.3 at slack.
 * light   dawn and dusk best, golden hour next, night fair (snook and tarpon feed in the dark), midday weakest.
 * solunar inside a major window 1, a minor window 0.8, else 0.5, tilted by the day rating (0..4).
 * calm    1 with light wind and small waves, falling as they build.
 * weather multiplier 0.5..1: strong wind, big seas or heavy rain keep fish and anglers down.
 * Water temperature and clarity are not in yet (they wait on PLAN 2.4, 2.12, 6.1; see 7.11).
 */
import { predict, type Harmonics } from '../physics/tide';
import { daySky, localDayStart, sunAltitude, type DaySky } from '../physics/astro';

const HOUR = 3.6e6;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export interface BiteInputs {
  /** Valid time, epoch ms. */
  tMs: number;
  lat: number;
  lng: number;
  tide: Harmonics;
  /** Wind speed m/s, if known. */
  windMs?: number | null;
  /** Significant wave height m, if known. */
  hsM?: number | null;
  /** Heavy rain falling (turbid, dangerous). */
  heavyRain?: boolean;
  /** Habitat score 0..1 at the place; omit for pure timing. */
  habitat?: number | null;
  /** Costa Rica offset, h, to find the local day. */
  tzOffsetH: number;
  /** The day's sun and moon times if already computed (they are slow to find). */
  sky?: DaySky;
}

export interface BiteTerms {
  tide: number;
  light: number;
  solunar: number;
  calm: number;
  weather: number;
  /** 0..1 timing alone. */
  timing: number;
  /** 0..100. */
  bite: number;
  /** Top reasons, strongest first, as keys for the HUD. */
  reasons: BiteReason[];
}

export type BiteReason = 'tide' | 'dawn' | 'dusk' | 'golden' | 'night' | 'major' | 'minor' | 'rough' | 'wind' | 'rain' | 'slack' | 'midday';

/** Tide term: current flow relative to the fastest in ±13 h, with a floor so slack is weak, not zero. */
export function tideTerm(h: Harmonics, tMs: number): { term: number; moving: boolean } {
  const dt = 5 * 60_000;
  const rate = (t: number) => Math.abs(predict(h, t + dt) - predict(h, t - dt)) / (2 * dt);
  let max = 0;
  for (let k = -13; k <= 13; k++) max = Math.max(max, rate(tMs + k * HOUR));
  const rel = max > 0 ? rate(tMs) / max : 0.5;
  return { term: 0.3 + 0.7 * clamp01(rel), moving: rel >= 0.6 };
}

/** Light term from the sun's height: dawn and dusk (sun -6° to +6°) best. */
export function lightTerm(altDeg: number, rising: boolean): { term: number; why: BiteReason } {
  if (altDeg >= -6 && altDeg <= 6) return { term: 1, why: rising ? 'dawn' : 'dusk' };
  if (altDeg > 6 && altDeg <= 20) return { term: 0.8, why: 'golden' };
  if (altDeg > 20) return { term: 0.45, why: 'midday' };
  return { term: 0.65, why: 'night' };
}

/** Solunar term from the windows (±1 h major, ±30 min minor) and the day rating. */
export function solunarTerm(sky: DaySky, tMs: number): { term: number; kind: 'major' | 'minor' | null } {
  const inside = sky.windows.filter((w) => tMs >= w.start && tMs <= w.end);
  const kind = inside.some((w) => w.kind === 'major') ? 'major' : inside.length ? 'minor' : null;
  const base = kind === 'major' ? 1 : kind === 'minor' ? 0.8 : 0.5;
  return { term: clamp01(base * (0.8 + 0.05 * sky.rating)), kind };
}

/** Calm term and weather multiplier from wind (m/s), waves (m) and rain. */
export function weatherTerms(windMs: number | null | undefined, hsM: number | null | undefined, rain: boolean): { calm: number; weather: number; wind: boolean; rough: boolean } {
  const w = windMs ?? 0, h = hsM ?? 0;
  const windBad = clamp01((w - 5) / 8); // 5 m/s fine, 13 m/s bad
  const seaBad = clamp01((h - 1) / 2); // 1 m fine, 3 m bad
  const calm = 1 - Math.max(windBad, seaBad);
  const weather = clamp01(1 - 0.35 * windBad - 0.4 * seaBad - (rain ? 0.2 : 0)) * 0.5 + 0.5;
  return { calm, weather, wind: windBad > 0.4, rough: seaBad > 0.4 };
}

export function bite(i: BiteInputs): BiteTerms {
  const day = localDayStart(i.tMs, i.tzOffsetH);
  const sky = i.sky ?? daySky(day, i.lat, i.lng);
  const tide = tideTerm(i.tide, i.tMs);
  const alt = sunAltitude(i.tMs, i.lat, i.lng);
  const rising = alt > sunAltitude(i.tMs - 10 * 60_000, i.lat, i.lng);
  const light = lightTerm(alt, rising);
  const sol = solunarTerm(sky, i.tMs);
  const wx = weatherTerms(i.windMs, i.hsM, !!i.heavyRain);
  const timing = 0.4 * tide.term + 0.35 * light.term + 0.15 * sol.term + 0.1 * wx.calm;
  const hab = i.habitat == null ? 1 : clamp01(i.habitat);
  const score = timing * wx.weather * (0.4 + 0.6 * hab);
  const reasons: BiteReason[] = [];
  if (wx.rough) reasons.push('rough');
  if (wx.wind) reasons.push('wind');
  if (i.heavyRain) reasons.push('rain');
  if (light.why === 'dawn' || light.why === 'dusk' || light.why === 'golden') reasons.push(light.why);
  if (tide.moving) reasons.push('tide');
  else if (tide.term < 0.5) reasons.push('slack');
  if (sol.kind) reasons.push(sol.kind);
  if (light.why === 'midday' || light.why === 'night') reasons.push(light.why);
  return { tide: tide.term, light: light.term, solunar: sol.term, calm: wx.calm, weather: wx.weather, timing, bite: Math.round(clamp01(score) * 100), reasons: reasons.slice(0, 3) };
}

export interface BiteWindow { start: number; end: number; peak: number; reasons: BiteReason[] }

/** The best windows of a local day: 10-minute steps, contiguous runs above `threshold` (default 0.8 of the day's best), best first, at most `n`. */
export function bestWindows(i: Omit<BiteInputs, 'tMs'>, dayStart: number, n = 3, threshold = 0.8): { series: { t: number; bite: number }[]; windows: BiteWindow[] } {
  const step = 10 * 60_000;
  const sky = daySky(dayStart, i.lat, i.lng);
  const series: { t: number; bite: number; reasons: BiteReason[] }[] = [];
  for (let t = dayStart; t < dayStart + 24 * HOUR; t += step) {
    const b = bite({ ...i, sky, tMs: t });
    series.push({ t, bite: b.bite, reasons: b.reasons });
  }
  const max = Math.max(...series.map((s) => s.bite));
  const cut = Math.max(1, max * threshold);
  const windows: BiteWindow[] = [];
  let run: typeof series = [];
  const flush = () => {
    if (!run.length) return;
    const top = run.reduce((a, b) => (b.bite > a.bite ? b : a));
    windows.push({ start: run[0].t, end: run[run.length - 1].t + step, peak: top.bite, reasons: top.reasons });
    run = [];
  };
  for (const s of series) (s.bite >= cut ? run.push(s) : flush());
  flush();
  windows.sort((a, b) => b.peak - a.peak);
  return { series: series.map(({ t, bite: b }) => ({ t, bite: b })), windows: windows.slice(0, n).sort((a, b) => a.start - b.start) };
}
