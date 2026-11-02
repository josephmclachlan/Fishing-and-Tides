/** Mock conditions until Phase 2 adapters land. Shape mirrors what adapters will return. */
export interface Conditions {
  fetchedAt: number;
  swellHeightM: number;
  swellPeriodS: number;
  swellDirDeg: number;
  windKt: number;
  windDirDeg: number;
  waterTempC: number;
  tideM: number;
  tideRising: boolean;
  ripRisk: 'LOW' | 'MOD' | 'HIGH';
}

export function mockConditions(now = Date.now()): Conditions {
  // Fake semidiurnal-ish tide so the readout moves.
  const t = now / 3.6e6;
  const tide = 0.18 * Math.sin((2 * Math.PI * t) / 12.42) + 0.06 * Math.sin((2 * Math.PI * t) / 24);
  const tideNext = 0.18 * Math.sin((2 * Math.PI * (t + 0.1)) / 12.42) + 0.06 * Math.sin((2 * Math.PI * (t + 0.1)) / 24);
  return {
    fetchedAt: now - 3 * 3.6e6,
    swellHeightM: 1.4,
    swellPeriodS: 11,
    swellDirDeg: 40,
    windKt: 12,
    windDirDeg: 70,
    waterTempC: 28.6,
    tideM: tide,
    tideRising: tideNext > tide,
    ripRisk: 'MOD',
  };
}
