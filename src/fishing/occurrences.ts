/**
 * Species records folded into the habitat score (PLAN 4.7). Pure: no DOM, no network.
 *
 * OBIS and GBIF hold tens of records per species here, collected where scientists and divers
 * happened to look, so they are weak evidence. Each record near a cell nudges that species' score
 * up by 10% (fading over ~2 km), capped at +30%, and never lifts a cell the habitat model
 * scored zero (wrong depth). The same records also fit the habitat weights (PLAN 4.4, fit.ts);
 * the nudge stays as a local term for spots the four habitat components don't explain.
 */
import { haversineM } from '../geo';
import type { OccurrenceFile } from './occurrence-taxa';

export const RECORD_RADIUS_M = 2000;
export const BOOST_PER_RECORD = 0.1;
export const MAX_BOOST = 0.3;

type Pts = readonly (readonly [number, number, number | null])[];

/** Fractional boost 0..MAX_BOOST from the records near a point. */
export function occurrenceBoost(points: Pts, lng: number, lat: number): number {
  let sum = 0;
  for (const [x, y] of points) {
    // Cheap box test before the great-circle distance.
    if (Math.abs(x - lng) > 0.03 || Math.abs(y - lat) > 0.03) continue;
    const d = haversineM([lng, lat], [x, y]);
    sum += Math.exp(-((d / RECORD_RADIUS_M) ** 2));
  }
  return Math.min(MAX_BOOST, BOOST_PER_RECORD * sum);
}

/** A score with the records' nudge applied; zero stays zero. */
export const withEvidence = (score: number, boost: number): number => Math.min(1, score * (1 + boost));

/** Records for a species id, or none. */
export const recordsFor = (file: OccurrenceFile | null, id: string): Pts => file?.species[id] ?? [];
