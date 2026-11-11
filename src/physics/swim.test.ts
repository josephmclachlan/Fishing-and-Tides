import { describe, expect, it } from 'vitest';
import { shoreAt, swimScore, swimTone, type ShoreBase } from './swim';

const base: ShoreBase = { HbAll: 0.8, hb: 1.0, Hb: 0.8, breakAngleDeg: 5, slope: 0.03, normalDeg: 40, hs0: 1.0, knownChannel: false };

describe('shore at an hour', () => {
  it('scales the breaker with the swell as Hs^0.8', () => {
    expect(shoreAt(base, { hs: 1.0, tp: 9, tideLevel: 0.5 }).breakerM).toBeCloseTo(0.8, 9);
    expect(shoreAt(base, { hs: 2.0, tp: 9, tideLevel: 0.5 }).breakerM).toBeCloseTo(0.8 * 2 ** 0.8, 9);
  });
  it('raises the rip risk at low tide, with onshore wind and at a known channel', () => {
    const mid = shoreAt(base, { hs: 1.2, tp: 10, tideLevel: 0.5 }).rip.score;
    expect(shoreAt(base, { hs: 1.2, tp: 10, tideLevel: 0 }).rip.score).toBeGreaterThan(mid);
    expect(shoreAt(base, { hs: 1.2, tp: 10, tideLevel: 0.5, windMs: 8, windFromDeg: 40 }).rip.score).toBeGreaterThan(mid);
    expect(shoreAt({ ...base, knownChannel: true }, { hs: 1.2, tp: 10, tideLevel: 0.5 }).rip.score).toBeGreaterThan(mid);
  });
  it('calls a calm day low risk', () => {
    expect(shoreAt(base, { hs: 0.3, tp: 6, tideLevel: 0.7 }).rip.level).toBe('LOW');
  });
});

const calm = { rip: 'LOW' as const, breakerM: 0.3, daylight: true, windKt: 6, rainMmH: 0, feelsC: 30, sstC: 29, uv: 6, cloudPct: 30 };

describe('swim score', () => {
  it('scores a calm sunny day full marks', () => {
    expect(swimScore(calm)).toEqual({ score: 100, reasons: [] });
    expect(swimTone(100)).toBe('green');
  });
  it('caps for safety: storms, a high rip risk, big shore break', () => {
    // After dark it is scored on the conditions (night swimming), without the sun's factors; ×0.85 for the dark.
    expect(swimScore({ ...calm, daylight: false })).toEqual({ score: 85, reasons: ['dark'] });
    expect(swimScore({ ...calm, daylight: false, uv: 11, cloudPct: 100 }).score).toBe(85);
    expect(swimScore({ ...calm, daylight: false, rip: 'HIGH' }).score).toBe(15);
    expect(swimScore({ ...calm, lightning: true }).score).toBe(5);
    expect(swimScore({ ...calm, rip: 'HIGH' })).toEqual({ score: 15, reasons: ['rip'] });
    expect(swimScore({ ...calm, breakerM: 1.6 }).reasons[0]).toBe('surf');
  });
  it('cuts for a moderate rip, wind, rain, heat, cold water, strong UV and sargassum, worst first', () => {
    expect(swimScore({ ...calm, rip: 'MOD' }).score).toBe(55);
    const r = swimScore({ ...calm, windKt: 18, rainMmH: 1, uv: 11, sarg: 'HIGH' });
    expect(r.reasons[0]).toBe('sargassum');
    expect(r.reasons).toEqual(expect.arrayContaining(['wind', 'rain', 'uv']));
    expect(swimScore({ ...calm, feelsC: 40 }).score).toBe(60);
    expect(swimScore({ ...calm, sstC: 22 }).score).toBe(75);
    expect(swimTone(55)).toBe('amber');
    expect(swimTone(20)).toBe('red');
  });
  it('wants the sun up: the first and last hour and a half of daylight score less', () => {
    expect(swimScore({ ...calm, sunHours: 0.25 })).toMatchObject({ reasons: ['lowsun'] });
    expect(swimScore({ ...calm, sunHours: 0.25 }).score).toBe(75);
    expect(swimScore({ ...calm, sunHours: 3 }).score).toBe(100);
  });
  it('leaves out what it does not know', () => {
    expect(swimScore({ rip: 'LOW', breakerM: 0.2, daylight: true }).score).toBe(100);
  });
});
