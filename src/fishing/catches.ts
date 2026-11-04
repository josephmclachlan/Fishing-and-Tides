/**
 * Your own catches (PLAN 7.16): the BOAT drawer's CATCH pins for the shore species, as records for the
 * habitat fit and as a check of the BITE score. Pure.
 *
 * The check compares BITE at each catch with the mean BITE over that day's daylight at the same spot
 * (both computed when the catch was logged, with the conditions known then). If the score means
 * anything, catches should sit above their day's mean; with fewer than 5 catches the gap is noise.
 */
import type { SpeciesId } from './species';

export interface CatchPin {
  kind: string;
  lng: number;
  lat: number;
  t: number;
  species?: string;
  bite?: number;
  biteDay?: number;
}

/** Your catches of one species in the [lng, lat, year] shape of the OBIS/GBIF records. */
export const catchRecords = (pins: readonly CatchPin[], id: SpeciesId): (readonly [number, number, number | null])[] =>
  pins.filter((p) => p.kind === 'catch' && p.species === id).map((p) => [p.lng, p.lat, new Date(p.t).getUTCFullYear()] as const);

/** Fewer catches than this and the BITE check says "too few to tell". */
export const MIN_CATCHES = 5;

export interface CatchStats {
  /** Catches with a stored BITE. */
  n: number;
  /** Mean BITE at the catches, and mean of their days. */
  bite: number;
  day: number;
}

/** Mean BITE at catches against their days' means; null with no scored catches. Optionally one species. */
export function catchStats(pins: readonly CatchPin[], id?: string): CatchStats | null {
  const xs = pins.filter((p) => p.kind === 'catch' && (!id || p.species === id) && Number.isFinite(p.bite) && Number.isFinite(p.biteDay));
  if (!xs.length) return null;
  const mean = (f: (p: CatchPin) => number) => xs.reduce((a, p) => a + f(p), 0) / xs.length;
  return { n: xs.length, bite: mean((p) => p.bite!), day: mean((p) => p.biteDay!) };
}
