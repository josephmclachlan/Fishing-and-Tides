/**
 * Shared weather-safety cap for every activity score (fishing BITE, snorkel and dive outing, and any
 * later verdict). A multiplier on the score, 1 = no cap. Pure, no DOM.
 * Lightning within the alert distance in the last 15 min × 0.1, squall HIGH × 0.25, squall WATCH × 0.7
 * (squall levels from weather.ts squallLevel; the lightning flag from lightning.ts).
 */
/**
 * One set of limits for every verdict (activity chips and the BOAT verdict; audit I). A tropical storm is NO-GO
 * closer than STORM_NOGO_KM and MARGINAL out to STORM_MARGINAL_KM (the storm alert radius). A small open boat
 * (FISH, SMALL BOAT) is MARGINAL from the first figure and NO-GO from the second: rules of thumb for pangas here.
 */
export const STORM_NOGO_KM = 500;
export const STORM_MARGINAL_KM = 1500;
export const SMALL_BOAT_WIND_KT = [14, 20] as const;
export const SMALL_BOAT_HS_M = [1.3, 2] as const;

export type SquallLevel = 'none' | 'watch' | 'high';

export function safetyTerm(lightning: boolean | undefined, squall: SquallLevel | undefined): number {
  if (lightning) return 0.1;
  return squall === 'high' ? 0.25 : squall === 'watch' ? 0.7 : 1;
}
