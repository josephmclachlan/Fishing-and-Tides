import { describe, expect, it } from 'vitest';
import { CRAFT, chopM, offshoreShare, paddleScore, type PaddleInputs } from './paddle';

const calm: PaddleInputs = { craft: 'kayak', windKt: 5, gustKt: 7, windFromDeg: 90, facingDeg: 90, hsM: 0.3, tpS: 8, breakerM: 0.2, rip: 'LOW', currentKt: 0.2, rainMmH: 0, feelsC: 30, uv: 5, daylight: true, hoursToSunset: 6 };

describe('paddle score', () => {
  it('a calm morning is a great day for both craft', () => {
    expect(paddleScore(calm).score).toBeGreaterThanOrEqual(85);
    expect(paddleScore({ ...calm, craft: 'sup' }).score).toBeGreaterThanOrEqual(85);
  });
  it('the same wind hurts a board more than a kayak', () => {
    const w = { ...calm, windKt: 11, gustKt: 14 };
    expect(paddleScore({ ...w, craft: 'sup' }).score).toBeLessThan(paddleScore(w).score);
  });
  it('offshore wind is worse than the same wind onshore, and capped at 20 over the limit', () => {
    const onshore = paddleScore({ ...calm, windKt: 11, gustKt: 11, windFromDeg: 90, facingDeg: 90 }).score;
    const offshore = paddleScore({ ...calm, windKt: 11, gustKt: 11, windFromDeg: 270, facingDeg: 90 });
    expect(offshore.score).toBeLessThan(onshore);
    expect(paddleScore({ ...calm, windKt: 13, gustKt: 13, windFromDeg: 270, facingDeg: 90 }).score).toBeLessThanOrEqual(20);
    expect(offshore.reasons).toContain('offshore');
  });
  it('lightning, darkness, a dumping beach and a strong current each cap it', () => {
    expect(paddleScore({ ...calm, lightning: true }).score).toBeLessThanOrEqual(3);
    expect(paddleScore({ ...calm, daylight: false }).score).toBeLessThanOrEqual(25);
    expect(paddleScore({ ...calm, breakerM: CRAFT.kayak.brkDump + 0.1 }).score).toBeLessThanOrEqual(15);
    expect(paddleScore({ ...calm, currentKt: 2.6 }).score).toBeLessThanOrEqual(25);
  });
  it('no weather forecast cannot read better than GOOD', () => {
    expect(paddleScore({ ...calm, rainMmH: null, feelsC: null, uv: null }).score).toBe(84);
  });
  it('range is zero when poor and grows with the score', () => {
    expect(paddleScore({ ...calm, lightning: true }).rangeKm).toBe(0);
    expect(paddleScore(calm).rangeKm).toBeGreaterThan(paddleScore({ ...calm, windKt: 14, gustKt: 16 }).rangeKm);
  });
  it('geometry', () => {
    expect(offshoreShare(270, 90)).toBeCloseTo(1);
    expect(offshoreShare(90, 90)).toBe(0);
    expect(chopM(15, 3000)).toBeGreaterThan(chopM(8, 3000));
  });
});
