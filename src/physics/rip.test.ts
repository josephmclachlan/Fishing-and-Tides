import { describe, expect, it } from 'vitest';
import { onshoreWind, ripLengthBand, ripLevel, ripRisk, ripStrength, type RipInput } from './rip';

const base: RipInput = { Hb: 1, hb: 1.2, Tp: 10, angleDeg: 0, slope: 0.02, tideLevel: 0.5 };

describe('rip risk score', () => {
  it('is calibrated to NWS practice', () => {
    expect(ripRisk({ ...base, Hb: 0.4 }).level).toBe('LOW');
    expect(ripRisk(base).level).toBe('MOD');
    expect(ripRisk({ ...base, Hb: 1.5, hb: 1.8, Tp: 12 }).level).toBe('HIGH');
    // Flat calm: nothing.
    expect(ripRisk({ ...base, Hb: 0, hb: 0 })).toMatchObject({ score: 0, level: 'LOW', speedMs: 0, lengthM: 0 });
  });

  it('rises with height and period', () => {
    expect(ripRisk({ ...base, Hb: 1.4 }).score).toBeGreaterThan(ripRisk(base).score);
    expect(ripRisk({ ...base, Tp: 13 }).score).toBeGreaterThan(ripRisk({ ...base, Tp: 6 }).score);
  });

  it('is worst with shore-normal waves, at low tide, with onshore wind and at known channels', () => {
    expect(ripRisk({ ...base, angleDeg: 40 }).score).toBeLessThan(ripRisk(base).score);
    expect(ripRisk({ ...base, angleDeg: -40 }).score).toBeCloseTo(ripRisk({ ...base, angleDeg: 40 }).score, 12);
    expect(ripRisk({ ...base, tideLevel: 0 }).score).toBeGreaterThan(ripRisk({ ...base, tideLevel: 1 }).score);
    expect(ripRisk({ ...base, onshoreWindMs: 9 }).score).toBeGreaterThan(ripRisk(base).score);
    expect(ripRisk({ ...base, onshoreWindMs: -9 }).score).toBeCloseTo(ripRisk(base).score, 12);
    expect(ripRisk({ ...base, knownChannel: true }).score).toBeGreaterThan(ripRisk(base).score);
  });

  it('gives a speed and reach in the observed range', () => {
    const r = ripRisk(base);
    expect(r.speedMs).toBeGreaterThan(0.3);
    expect(r.speedMs).toBeLessThan(0.8);
    expect(r.strength).toBe('MODERATE');
    // Surf zone 1.2 m / 0.02 = 60 m wide, so the rip reaches ~90 m.
    expect(r.lengthM).toBeCloseTo(90, 6);
    expect(r.length).toBe('MEDIUM');
    expect(ripRisk({ ...base, Hb: 2.5, hb: 3, tideLevel: 0 }).strength).toBe('STRONG');
    // Steep reef: short; flat sand: long; capped.
    expect(ripRisk({ ...base, slope: 0.1 }).length).toBe('SHORT');
    expect(ripRisk({ ...base, slope: 0.002 }).lengthM).toBe(600);
  });
});

describe('bands', () => {
  it('thresholds', () => {
    expect([ripLevel(0.1), ripLevel(0.3), ripLevel(0.6)]).toEqual(['LOW', 'MOD', 'HIGH']);
    expect([ripStrength(0.2), ripStrength(0.5), ripStrength(0.8), ripStrength(1.2)]).toEqual(['WEAK', 'MODERATE', 'STRONG', 'VERY_STRONG']);
    expect([ripLengthBand(50), ripLengthBand(100), ripLengthBand(300)]).toEqual(['SHORT', 'MEDIUM', 'LONG']);
  });

  it('onshore wind component', () => {
    // Shore faces 045°: a wind from 045° blows straight on, from 225° straight off.
    expect(onshoreWind(10, 45, 45)).toBeCloseTo(10, 9);
    expect(onshoreWind(10, 225, 45)).toBeCloseTo(-10, 9);
    expect(onshoreWind(10, 135, 45)).toBeCloseTo(0, 9);
  });
});
