/**
 * Shared weather-safety cap for every activity score (fishing BITE, snorkel and dive outing, and any
 * later verdict). A multiplier on the score, 1 = no cap. Pure, no DOM.
 * Lightning within the alert distance in the last 15 min × 0.1, squall HIGH × 0.25, squall WATCH × 0.7
 * (squall levels from weather.ts squallLevel; the lightning flag from lightning.ts).
 */
export type SquallLevel = 'none' | 'watch' | 'high';

export function safetyTerm(lightning: boolean | undefined, squall: SquallLevel | undefined): number {
  if (lightning) return 0.1;
  return squall === 'high' ? 0.25 : squall === 'watch' ? 0.7 : 1;
}
