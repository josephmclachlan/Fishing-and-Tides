/**
 * Hour-by-hour surf score for the WATCH tracker, BEST TODAY and the spot-page ribbon (PLAN 7.27).
 * Pure and synchronous, so it can run for every hour of a week: the break score (`surf-quality.ts`) with the
 * breaker height ESTIMATED from the offshore swell instead of the physics worker's refraction over the seafloor.
 * Refraction turns the swell towards the shore, so the height is cut by a factor of sqrt(cos(angle off the
 * break's normal)); beyond 80° off it is 0.3. The BREAK row in CONDITIONS keeps the full model, so the two can
 * differ by a few tenths when the swell comes in at an angle.
 */
import { SURF_BREAKS, type SurfBreak } from '../data/surf-breaks';
import { haversineM } from '../geo';
import { breakerHeight } from '../physics/breaking';
import { sargLevel } from '../physics/drift';
import { tideState, type Harmonics } from '../physics/tide';
import { surfQuality } from '../surf-quality';
import type { SeaState } from '../adapters/waves';
import type { SquallLevel } from '../physics/safety';

/** A spot is scored with the break of its name, else the nearest break within this distance, km. */
export const BREAK_REACH_KM = 25;

export function breakFor(name: string, lngLat: [number, number], breaks: readonly SurfBreak[] = SURF_BREAKS): SurfBreak | null {
  const exact = breaks.find((b) => b.name === name);
  if (exact) return exact;
  let best: { b: SurfBreak; km: number } | null = null;
  for (const b of breaks) {
    const km = haversineM(lngLat, b.lngLat) / 1000;
    if (km <= BREAK_REACH_KM && (!best || km < best.km)) best = { b, km };
  }
  return best?.b ?? null;
}

const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

/** Breaker height at a break from the offshore swell, m. */
export function estimateHb(brk: Pick<SurfBreak, 'facing'>, hs: number, tp: number, fromDeg: number): number {
  const off = Math.abs(wrap(fromDeg - brk.facing));
  const kr = off < 80 ? Math.sqrt(Math.cos((off * Math.PI) / 180)) : 0.3;
  return breakerHeight(hs * Math.max(0.3, kr), tp);
}

export interface SurfHour {
  brk: SurfBreak;
  sea: SeaState;
  tide: Harmonics;
  ms: number;
  windMs: number | null;
  windFromDeg: number | null;
  gustMs: number | null;
  rainMmH: number | null;
  squall: SquallLevel | undefined;
  sargKm2: number | null;
}

/** 0..10 break score for one hour, or null when the sea or wind forecast has nothing. */
export function surfScoreAt(h: SurfHour): number | null {
  const s = h.sea;
  const swell = Number.isFinite(s.swellHs) && Number.isFinite(s.swellT) && s.swellHs > 0;
  const hs = swell ? s.swellHs : s.hs;
  const tp = swell ? s.swellT : s.tm;
  const dir = swell ? s.swellDir : s.dir;
  if (![hs, tp, dir].every(Number.isFinite) || h.windMs === null) return null;
  const ts = tideState(h.tide, h.ms);
  const part = (hs2: number, t: number, d: number) => (Number.isFinite(hs2) && Number.isFinite(t) && Number.isFinite(d) && hs2 >= 0.1 ? { Hs: hs2, Tp: t, fromDeg: d } : null);
  return surfQuality({
    brk: h.brk,
    Hb: estimateHb(h.brk, hs, tp, dir),
    Tp: tp,
    swellFromDeg: dir,
    windMs: h.windMs,
    windFromDeg: h.windFromDeg ?? h.brk.facing + 180,
    swellHs: hs,
    swell2: part(s.swell2Hs, s.swell2T, s.swell2Dir),
    windSeaHs: Number.isFinite(s.windSeaHs) ? s.windSeaHs : null,
    gustMs: h.gustMs,
    squall: h.squall,
    rainMmH: h.rainMmH,
    sarg: h.sargKm2 === null ? null : sargLevel(h.sargKm2),
    tide: { level: ts.level, rising: ts.rising },
  }).score;
}
