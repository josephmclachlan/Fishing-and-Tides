/**
 * The corrections learnt from observations (PLAN 7.10), held once for the whole app: the tide offset
 * from the Limón gauge (physics/tide-fix.ts) and the wind scale from the satellite (adapters/wind-fix.ts).
 * Tide readers add `tideFixNow(ms)` to the harmonic prediction; the wind scale is applied to the wind data
 * where it loads (main.ts). LIVE OBS shows both with their confidence.
 */
import { tideFixAt, type TideFix } from './physics/tide-fix';
import type { WindFix } from './adapters/wind-fix';

let tide: TideFix | null = null;
let wind: WindFix | null = null;
const subs = new Set<() => void>();
const changed = () => subs.forEach((f) => f());

export const corrections = {
  tide: () => tide,
  wind: () => wind,
  setTide(f: TideFix | null) {
    tide = f;
    changed();
  },
  setWind(f: WindFix | null) {
    wind = f;
    changed();
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

/** The gauge correction to add to the predicted tide at `ms`, m. */
export const tideFixNow = (ms: number) => tideFixAt(tide, ms);
