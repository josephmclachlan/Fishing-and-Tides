import { describe, expect, it } from 'vitest';
import { CN_II, curveNumber, hourlyRunoff, lagHours, REF_STORM_MM, retentionMm, riverMud, scsRunoff } from './runoff';

const peak = (xs: ArrayLike<number>) => Math.max(...Array.from(xs));
const hoursOver = (xs: ArrayLike<number>, th: number) => Array.from(xs).filter((x) => x > th).length;
/** Rain after five days that leave the ground normally wet (45 mm of light rain, then a 7 h dry gap). */
const normal = (storm: number[]) => [...Array(10).fill(0), ...Array(113).fill(0.4), ...Array(7).fill(0), ...storm, ...Array(160).fill(0)];
const dry = (storm: number[]) => [...Array(130).fill(0), ...storm, ...Array(160).fill(0)];

describe('SCS runoff', () => {
  it('matches the TR-55 worked numbers', () => {
    // CN 75: S = 3.33 in, and 5 in of rain gives 2.45 in of runoff.
    expect(retentionMm(75) / 25.4).toBeCloseTo(3.333, 3);
    expect(scsRunoff(5 * 25.4, retentionMm(75)) / 25.4).toBeCloseTo(2.45, 2);
    expect(scsRunoff(0.2 * retentionMm(75), retentionMm(75))).toBe(0);
  });
  it('moves the curve number with the 5 days before the storm', () => {
    expect(curveNumber(0)).toBeCloseTo((4.2 * CN_II) / (10 - 0.058 * CN_II));
    expect(curveNumber(36)).toBeCloseTo(CN_II);
    expect(curveNumber(53)).toBeCloseTo((23 * CN_II) / (10 + 0.13 * CN_II));
    expect(curveNumber(200)).toBeCloseTo(curveNumber(53));
    expect(curveNumber(NaN)).toBe(CN_II);
    expect(curveNumber(20)).toBeGreaterThan(curveNumber(10));
  });
  it('soaks up the start of a storm and runs off more of its end', () => {
    const q = hourlyRunoff(Array(24).fill(2.5));
    expect(q[0]).toBe(0);
    expect(q[23]).toBeGreaterThan(q[12]);
    expect(q.reduce((a, b) => a + b, 0)).toBeCloseTo(scsRunoff(60, retentionMm(CN_II)), 6);
  });
});

describe('river mud', () => {
  it('lags with catchment size: about 10 h for the Sixaola, 2 h for the Bananito', () => {
    expect(lagHours(2890)).toBeGreaterThan(8);
    expect(lagHours(2890)).toBeLessThan(12);
    expect(lagHours(110)).toBeLessThan(3);
  });
  it('makes a full plume from the reference storm on normal ground', () => {
    expect(peak(riverMud([...Array(24).fill(REF_STORM_MM / 24), ...Array(96).fill(0)], 1000).strength)).toBeCloseTo(1, 6);
  });
  it('wet ground: the same storm muddies far more after a wet week', () => {
    expect(peak(riverMud(normal([30]), 1000).strength)).toBeGreaterThan(0.3);
    expect(peak(riverMud(dry([30]), 1000).strength)).toBe(0);
  });
  it('intensity: a 1 h burst muddies more than the same rain over a day, most in a small river', () => {
    const burst = (a: number) => peak(riverMud(normal([30]), a).strength);
    const spread = (a: number) => peak(riverMud(normal(Array(24).fill(1.25)), a).strength);
    expect(burst(2890)).toBeGreaterThan(spread(2890));
    expect(burst(110) / spread(110)).toBeGreaterThan(burst(2890) / spread(2890));
  });
  it('lifetime: a bigger storm stays muddy longer, and a big river longer than a small one', () => {
    const day = riverMud(normal(Array(24).fill(2.5)), 2890).strength;
    const twoDays = riverMud(normal(Array(48).fill(150 / 48)), 2890).strength;
    expect(hoursOver(twoDays, 0.3)).toBeGreaterThan(hoursOver(day, 0.3) + 24);
    expect(hoursOver(day, 0.3)).toBeGreaterThan(hoursOver(riverMud(normal(Array(24).fill(2.5)), 110).strength, 0.3));
  });
  it('drizzle on dry ground makes none, and the mud ages as it waits at sea', () => {
    expect(peak(riverMud(dry(Array(72).fill(0.3)), 1000).strength)).toBe(0);
    const m = riverMud(normal([40]), 1000);
    const at = (h: number) => m.ageS[130 + h];
    expect(at(48)).toBeGreaterThan(at(12));
  });
});
