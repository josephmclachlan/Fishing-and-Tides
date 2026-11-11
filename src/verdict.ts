/**
 * Go/no-go verdict per activity (PLAN 7.8, DESIGN §9): GO, MARGINAL or NO-GO with the top reasons
 * ("SURGE HIGH · VIS 3 M"). Pure, no DOM: main.ts gathers the inputs at the cross-hair for the
 * slider's hour, verdict-hud.ts shows them.
 *
 * This is an aggregator, not a second set of scores. Where an activity already has its own judgement,
 * the verdict reads it rather than redoing it:
 *   SNORKEL and DIVE  the outing score (physics/outing.ts, PLAN 6.9/6.10) through ratingFor:
 *                     GO, CAUTION → MARGINAL, AVOID → NO-GO, with its reasons
 *   SURF              the break's quality band (surf-quality.ts)
 *   BOAT              the sailing audit's own verdict (src/boat/verdict.ts), read by verdict-hud.ts
 * FISH has no verdict of its own elsewhere, so its wind and sea limits live here.
 *
 * Weather hazards use the shared safety cap (physics/safety.ts) so every activity agrees on them:
 * a cap of 0.25 or less (lightning, squall likely) is NO-GO, any cap below 1 (squall watch) MARGINAL.
 * A tropical storm is NO-GO inside 500 km and MARGINAL out to the 1500 km alert radius.
 * Heat (PLAN 7.58d): a real feel in the shade of 39 °C or more (the US NWS heat-index "danger" level, where
 * heat exhaustion is likely with exposure) is MARGINAL for the activities spent out of the water in the sun
 * (surf, fish); snorkel and dive keep the swimmer in the sea and already show UV with a cover-up hint.
 *
 * The verdict is the worst level any rule gives; reasons are listed worst first, then the pluses,
 * three at most. A missing input (feed not loaded) is skipped, not guessed. Advisory only: not for
 * navigation or safety decisions, which the HUD says.
 */
import type { Comfort } from './physics/sea-state';
import type { SurfBand } from './surf-quality';
import type { Confidence } from './physics/clarity-forecast';
import { SMALL_BOAT_HS_M, SMALL_BOAT_WIND_KT, STORM_MARGINAL_KM, STORM_NOGO_KM, safetyTerm, type SquallLevel } from './physics/safety';
import { ratingFor, type OutingMode, type OutingScore } from './physics/outing';
import type { Band } from './time';
import { FEELS_DANGER_C } from './weather';

export type Level = 'GO' | 'MARGINAL' | 'NO-GO';
/** The activities judged here. BOAT is the sailing audit's (verdict-hud.ts reads it). */
export type Activity = 'surf' | 'fish' | 'snorkel' | 'dive' | 'spear';
export const ACTIVITIES: readonly Activity[] = ['surf', 'fish', 'snorkel', 'dive', 'spear'];

export interface VerdictInputs {
  /** Nearest lightning flash in the alert window, km (only when looking at now). */
  lightningKm?: number | null;
  squall?: SquallLevel | null;
  heavyRain?: boolean | null;
  /** Nearest active tropical storm within the alert radius, km. */
  stormKm?: number | null;
  /** Real feel in the shade at the place and hour, °C (weather.ts feelsLikeC, PLAN 7.57). */
  feelsC?: number | null;
  windKt?: number | null;
  /** Significant wave height offshore, m. */
  hsM?: number | null;
  comfort?: Comfort | null;
  /** BITE score 0..100 (timing, PLAN 4.8). */
  bite?: number | null;
  rip?: 'LOW' | 'MOD' | 'HIGH' | null;
  /** Surf quality band at the nearest catalog break. */
  surf?: SurfBand | null;
  /** Breaker height at the nearest break, m. */
  breakerM?: number | null;
  /** Outing score for the hour at the reticle's spot, per sub-activity (dive-hud.ts). */
  outing?: Partial<Record<OutingMode, OutingScore | null>>;
  /** Slider band, and hours ahead of now, for the verdict's own confidence. */
  band?: Band;
  leadH?: number;
}

export interface Reason {
  /** i18n key of the reason text: `vd.r.*`, or `dive.r.*` for the outing score's reasons. */
  key: string;
  level: Level;
  /** Number to show with it (kt, m, km), if any. */
  value?: number;
}

export interface Verdict {
  /** Null when the inputs the activity hangs on aren't loaded: no verdict rather than a false GO. */
  level: Level | null;
  /** Worst first, then the pluses; at most three. */
  reasons: Reason[];
  /** How far ahead and in which band: the forecast behind the verdict, not the rules. */
  confidence: Confidence;
}

type Rule = (i: VerdictInputs) => Reason | Reason[] | null;
const R = (key: string, level: Level, value?: number): Reason => ({ key: `vd.r.${key}`, level, value });
const has = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);

/** Above `no` is NO-GO, above `marg` MARGINAL. */
const above = (x: number | null | undefined, marg: number, no: number, keyMarg: string, keyNo: string): Reason | null =>
  !has(x) ? null : x > no ? R(keyNo, 'NO-GO', x) : x > marg ? R(keyMarg, 'MARGINAL', x) : null;

/** Lightning is an observation, so it only counts within the first hour. */
const lightningNow = (i: VerdictInputs) => has(i.lightningKm) && (i.leadH ?? 0) <= 1;

/** The shared weather cap as a level: 0.25 or less is NO-GO, anything under 1 MARGINAL. */
export function hazardLevel(cap: number): Level {
  return cap <= 0.25 ? 'NO-GO' : cap < 1 ? 'MARGINAL' : 'GO';
}

const HAZARD: Rule = (i) => {
  const lightning = lightningNow(i);
  const level = hazardLevel(safetyTerm(lightning, i.squall ?? undefined));
  if (level === 'GO') return null;
  return lightning ? R('lightning', level, i.lightningKm!) : R(i.squall === 'high' ? 'squall' : 'squallWatch', level);
};
export { STORM_NOGO_KM };
const STORM: Rule = (i) => (!has(i.stormKm) || i.stormKm > STORM_MARGINAL_KM ? null : i.stormKm < STORM_NOGO_KM ? R('storm', 'NO-GO', i.stormKm) : R('stormFar', 'MARGINAL', i.stormKm));

/** Real feel at which the sun activities turn MARGINAL, °C: the same danger band the WEATHER panel shows red. */
export const HEAT_MARGINAL_C = FEELS_DANGER_C;
const HEAT: Rule = (i) => (has(i.feelsC) && i.feelsC >= HEAT_MARGINAL_C ? R('heat', 'MARGINAL', Math.round(i.feelsC)) : null);

const OUTING_LEVEL = { GO: 'GO', CAUTION: 'MARGINAL', AVOID: 'NO-GO' } as const;
/** The outing score's rating, its reasons as `dive.r.*`. Its weather cap is already in the score. */
const OUTING = (m: OutingMode): Rule => (i) => {
  const o = i.outing?.[m];
  if (!o) return null;
  const level: Level = OUTING_LEVEL[ratingFor(o.score)];
  if (level === 'GO') return R('outingGood', 'GO', o.score);
  // HAZARD names the weather itself, so the outing's own STORM RISK would only repeat it.
  const rs = o.reasons.filter((r) => r !== 'storm').map((r): Reason => ({ key: `dive.r.${r}`, level }));
  return rs.length ? rs : R('outing', level, o.score);
};

export const RULES: Record<Activity, readonly Rule[]> = {
  // Worth paddling out: the break's quality, and not too big or rippy for most.
  surf: [
    HAZARD, STORM, HEAT,
    (i) => (i.surf === 'FLAT' || i.surf === 'POOR' ? R('surfFlat', 'NO-GO') : i.surf === 'FAIR' ? R('surfFair', 'MARGINAL') : i.surf ? R('surfGood', 'GO') : null),
    (i) => (has(i.breakerM) && i.breakerM > 3 ? R('surfBig', 'MARGINAL', i.breakerM) : null),
    (i) => (i.rip === 'HIGH' ? R('ripHigh', 'MARGINAL') : null),
  ],
  // Small open boat or shore: wind over 20 kt or seas over 2 m keep pangas in.
  fish: [
    HAZARD, STORM, HEAT,
    (i) => (i.heavyRain ? R('rain', 'MARGINAL') : null),
    (i) => above(i.windKt, ...SMALL_BOAT_WIND_KT, 'wind', 'windHigh'),
    (i) => above(i.hsM, ...SMALL_BOAT_HS_M, 'seas', 'seasHigh'),
    (i) => (i.comfort === 'uncomfortable' ? R('uncomfortable', 'NO-GO') : i.comfort === 'rough' ? R('rough', 'MARGINAL') : i.comfort === 'comfortable' ? R('calmSea', 'GO') : null),
    (i) => (!has(i.bite) ? null : i.bite < 30 ? R('biteSlow', 'MARGINAL', i.bite) : i.bite >= 60 ? R('biteGood', 'GO', i.bite) : null),
  ],
  snorkel: [HAZARD, STORM, OUTING('snorkel')],
  dive: [HAZARD, STORM, OUTING('dive')],
  // Spearing is judged on the spear bands, and is a NO-GO (reason NO SPEARING) where the law bans it.
  spear: [HAZARD, STORM, OUTING('spear')],
};

/** The inputs without which an activity gets no verdict. */
export const ESSENTIAL: Record<Activity, (i: VerdictInputs) => boolean> = {
  surf: (i) => !!i.surf,
  fish: (i) => has(i.windKt) || has(i.hsM),
  snorkel: (i) => !!i.outing?.snorkel,
  dive: (i) => !!i.outing?.dive,
  spear: (i) => !!i.outing?.spear,
};

const RANK: Record<Level, number> = { GO: 0, MARGINAL: 1, 'NO-GO': 2 };

/** Confidence of the forecast behind it: HIGH to day 3, MED to day 7, LOW in LOW CONF and OUTLOOK. */
export function verdictConfidence(band: Band | undefined, leadH: number | undefined): Confidence {
  if (band === 'lowconf' || band === 'outlook') return 'LOW';
  return (leadH ?? 0) <= 72 ? 'HIGH' : 'MED';
}

export function verdict(a: Activity, i: VerdictInputs): Verdict {
  const hits = RULES[a].flatMap((r) => r(i) ?? []);
  const confidence = verdictConfidence(i.band, i.leadH);
  const reasons = [...hits].sort((x, y) => RANK[y.level] - RANK[x.level]).slice(0, 3);
  if (!ESSENTIAL[a](i) && !hits.some((r) => r.level === 'NO-GO')) return { level: null, reasons, confidence };
  const level = hits.reduce<Level>((w, r) => (RANK[r.level] > RANK[w] ? r.level : w), 'GO');
  return { level, reasons, confidence };
}
