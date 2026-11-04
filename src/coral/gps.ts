/**
 * Choosing a GPS fix for a new coral site (PLAN 7.38). Phones report a rough fix first and tighten it
 * over a few seconds, so NEW SITE HERE watches the position and keeps the best one until it is
 * good enough or time runs out. Pure.
 */
export interface Fix {
  lng: number;
  lat: number;
  /** Horizontal accuracy (68% radius), m. */
  accuracy: number;
  t: number;
}

/** Stop waiting once a fix is this good, m. A reef site needs to be findable from a boat. */
export const GOOD_FIX_M = 15;
/** Give up waiting after this long and use the best fix so far, ms. */
export const FIX_TIMEOUT_MS = 20_000;
/** A fix worse than this is not used at all, m (the map centre is as good). */
export const USELESS_FIX_M = 500;

/** The most accurate usable fix, the newest on a tie, or null. */
export function bestFix(fixes: readonly Fix[]): Fix | null {
  let best: Fix | null = null;
  for (const f of fixes) {
    if (!Number.isFinite(f.accuracy) || f.accuracy > USELESS_FIX_M || !Number.isFinite(f.lat) || !Number.isFinite(f.lng)) continue;
    if (!best || f.accuracy < best.accuracy || (f.accuracy === best.accuracy && f.t > best.t)) best = f;
  }
  return best;
}

/** Whether to stop waiting: a good fix arrived, or the time is up. */
export const doneWaiting = (best: Fix | null, startedAt: number, now: number) => (best !== null && best.accuracy <= GOOD_FIX_M) || now - startedAt >= FIX_TIMEOUT_MS;
