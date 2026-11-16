/**
 * One scale for the waves breaking at the water's edge (the "shore break"), shared by the swim score, the
 * outing score, the cards, the chips and the explainers, so no screen can call the same wave easy and dangerous.
 *
 *   under 0.5 m      easy     getting in and out is simple
 *   0.5 to 1.3 m     timed    waves reach the waterline; wait for a lull between sets before wading in or out
 *   over 1.3 m       dump     waves dump on the sand; stay out
 *
 * 0.5 m is where the scores start to fall, and 1.3 m is where the swim score is capped. Rule of thumb, not a
 * measurement. SI units: metres.
 */
export const SHORE_EASY_M = 0.5;
export const SHORE_DUMP_M = 1.3;

export type ShoreBand = 'easy' | 'timed' | 'dump';

export function shoreBand(breakerM: number): ShoreBand {
  return breakerM > SHORE_DUMP_M ? 'dump' : breakerM >= SHORE_EASY_M ? 'timed' : 'easy';
}
