/**
 * BITE score: how good the timing is for fishing at a place and moment, from things that change
 * through the day. Pure: no DOM, SI units. Rule-of-thumb weights, NOT validated against catches;
 * the fishing effect of the moon is angler folklore, so solunar carries the smallest weight.
 *
 *   timing = 0.40 tide + 0.35 light + 0.15 solunar + 0.10 calm      (each term 0..1)
 *   bite   = timing × weather × safety × water × (0.4 + 0.6 × habitat)
 *
 * tide    fish feed on moving water: |dh/dt| as a share of the day's fastest flow, floor 0.3 at slack.
 * light   dawn and dusk best, golden hour next, night fair (snook and tarpon feed in the dark), midday weakest.
 *         Overcast stretches the low-light bite into the day: in daylight, cloud above 40% lifts the
 *         term toward 1 by up to 0.4 of the gap (full at 90% cloud).
 * solunar inside a major window 1, a minor window 0.8, else 0.5, tilted by the day rating (0..4).
 * calm    1 with light wind and small waves, falling as they build.
 * weather multiplier 0.5..1: strong wind, big seas or heavy rain keep fish and anglers down. Rain
 *         counts from 2 mm/h and in full from 10 mm/h (weather.ts HEAVY_RAIN_MM_H).
 * safety  1, or a cap for conditions nobody should fish in: lightning within 25 km in the last
 *         15 min × 0.1, squall HIGH × 0.25, squall WATCH × 0.7 (weather.ts squallLevel).
 * water   the species' water factor (fishing/water.ts): clarity, temperature, chlorophyll and sargassum, 0.36..1; 1 if unknown.
 */
import { predict, type Harmonics } from '../physics/tide';
import type { WaterReason, WaterTerm } from './water';
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
  /** Heavy rain falling (turbid, dangerous); forces the full rain penalty. */
  heavyRain?: boolean;
  /** Rain rate, mm/h (mean of the weather models), if known. */
  rainMmH?: number | null;
  /** Cloud cover, %, if known. */
  cloudPct?: number | null;
  /** Squall flag for the hour (weather.ts squallLevel). */
  squall?: 'none' | 'watch' | 'high';
  /** A lightning strike close by right now (lightning.ts alert distance and age). */
  lightning?: boolean;
  /** The species' water factor at the place (fishing/water.ts waterTerm); omit when unknown. */
  water?: WaterTerm | null;
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
  /** 0..1 safety cap (1 = nothing dangerous). */
  safety: number;
  /** 0..1 timing alone. */
  timing: number;
  /** 0..100. */
  bite: number;
  /** Top reasons, strongest first, as keys for the HUD. */
  reasons: BiteReason[];
}

export type BiteReason = 'tide' | 'dawn' | 'dusk' | 'golden' | 'night' | 'major' | 'minor' | 'rough' | 'wind' | 'rain' | 'slack' | 'midday' | 'overcast' | 'squall' | 'lightning' | WaterReason;

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

/** Overcast lift for the light term: 0 in the dark or under 40% cloud, up to 0.4 of the gap to 1 at 90% cloud. */
export function overcastLift(lightTerm: number, altDeg: number, cloudPct: number | null | undefined): number {
  if (altDeg <= 6 || !Number.isFinite(cloudPct ?? NaN)) return 0;
  return 0.4 * clamp01(((cloudPct as number) - 40) / 50) * (1 - lightTerm);
}

/** How much the rain counts, 0..1: nothing below 2 mm/h, all of it from 10 mm/h; `heavy` forces 1. */
export const rainShare = (rainMmH: number | null | undefined, heavy = false): number => (heavy ? 1 : clamp01(((rainMmH ?? 0) - 2) / 8));

/** Calm term and weather multiplier from wind (m/s), waves (m) and rain (true = heavy, or a 0..1 share from rainShare). */
export function weatherTerms(windMs: number | null | undefined, hsM: number | null | undefined, rain: boolean | number): { calm: number; weather: number; wind: boolean; rough: boolean } {
  const w = windMs ?? 0, h = hsM ?? 0;
  const windBad = clamp01((w - 5) / 8); // 5 m/s fine, 13 m/s bad
  const seaBad = clamp01((h - 1) / 2); // 1 m fine, 3 m bad
  const rainBad = rain === true ? 1 : rain === false ? 0 : clamp01(rain);
  const calm = 1 - Math.max(windBad, seaBad);
  const weather = clamp01(1 - 0.35 * windBad - 0.4 * seaBad - 0.2 * rainBad) * 0.5 + 0.5;
  return { calm, weather, wind: windBad > 0.4, rough: seaBad > 0.4 };
}

/** Safety cap: lightning close by, or a squall in the hour. */
export function safetyTerm(lightning: boolean | undefined, squall: BiteInputs['squall']): number {
  if (lightning) return 0.1;
  return squall === 'high' ? 0.25 : squall === 'watch' ? 0.7 : 1;
}

export function bite(i: BiteInputs): BiteTerms {
  const day = localDayStart(i.tMs, i.tzOffsetH);
  const sky = i.sky ?? daySky(day, i.lat, i.lng);
  const tide = tideTerm(i.tide, i.tMs);
  const alt = sunAltitude(i.tMs, i.lat, i.lng);
  const rising = alt > sunAltitude(i.tMs - 10 * 60_000, i.lat, i.lng);
  const light = lightTerm(alt, rising);
  const lift = overcastLift(light.term, alt, i.cloudPct);
  const lightT = light.term + lift;
  const sol = solunarTerm(sky, i.tMs);
  const rain = rainShare(i.rainMmH, !!i.heavyRain);
  const wx = weatherTerms(i.windMs, i.hsM, rain);
  const safety = safetyTerm(i.lightning, i.squall);
  const timing = 0.4 * tide.term + 0.35 * lightT + 0.15 * sol.term + 0.1 * wx.calm;
  const hab = i.habitat == null ? 1 : clamp01(i.habitat);
  const score = timing * wx.weather * safety * (i.water?.factor ?? 1) * (0.4 + 0.6 * hab);
  const reasons: BiteReason[] = [];
  if (i.lightning) reasons.push('lightning');
  else if (i.squall && i.squall !== 'none') reasons.push('squall');
  if (wx.rough) reasons.push('rough');
  if (wx.wind) reasons.push('wind');
  if (rain >= 0.5) reasons.push('rain');
  for (const w of i.water?.reasons ?? []) if (w !== 'goodwater') reasons.push(w);
  if (light.why === 'dawn' || light.why === 'dusk' || light.why === 'golden') reasons.push(light.why);
  if (lift >= 0.15) reasons.push('overcast');
  if (tide.moving) reasons.push('tide');
  else if (tide.term < 0.5) reasons.push('slack');
  if (i.water?.reasons.includes('goodwater')) reasons.push('goodwater');
  if (sol.kind) reasons.push(sol.kind);
  if ((light.why === 'midday' && lift < 0.15) || light.why === 'night') reasons.push(light.why);
  return { tide: tide.term, light: lightT, solunar: sol.term, calm: wx.calm, weather: wx.weather, safety, timing, bite: Math.round(clamp01(score) * 100), reasons: reasons.slice(0, 3) };
}

export interface BiteWindow { start: number; end: number; peak: number; reasons: BiteReason[] }

/** The changing conditions at a moment: the forecast wind, waves and weather, and live hazards. */
export type BiteWx = Pick<BiteInputs, 'windMs' | 'hsM' | 'rainMmH' | 'cloudPct' | 'squall' | 'lightning' | 'heavyRain'>;

/**
 * The best windows of a local day: 10-minute steps, contiguous runs above `threshold` (default 0.8 of
 * the day's best), best first, at most `n`. `wxAt` gives the forecast for each step (cache it by the
 * hour: it is called 144 times); without it the day is timing only.
 */
export function bestWindows(i: Omit<BiteInputs, 'tMs'>, dayStart: number, n = 3, threshold = 0.8, wxAt?: (ms: number) => BiteWx): { series: { t: number; bite: number }[]; windows: BiteWindow[] } {
  const step = 10 * 60_000;
  const sky = daySky(dayStart, i.lat, i.lng);
  const series: { t: number; bite: number; reasons: BiteReason[] }[] = [];
  for (let t = dayStart; t < dayStart + 24 * HOUR; t += step) {
    const b = bite({ ...i, ...wxAt?.(t), sky, tMs: t });
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
