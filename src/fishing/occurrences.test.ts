import { describe, expect, it } from 'vitest';
import { MAX_BOOST, occurrenceBoost, recordsFor, withEvidence } from './occurrences';

describe('occurrenceBoost', () => {
  const at: [number, number, number | null][] = [[-82.8, 9.74, 2010]];
  it('is largest on a record and fades with distance', () => {
    const on = occurrenceBoost(at, -82.8, 9.74);
    const near = occurrenceBoost(at, -82.8, 9.7509); // ~1.2 km
    expect(on).toBeCloseTo(0.1);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(on);
    expect(occurrenceBoost(at, -82.8, 9.9)).toBe(0);
  });
  it('is capped', () => {
    const many = Array.from({ length: 50 }, (): [number, number, number | null] => [-82.8, 9.74, null]);
    expect(occurrenceBoost(many, -82.8, 9.74)).toBe(MAX_BOOST);
  });
  it('never lifts a zero score and never passes 1', () => {
    expect(withEvidence(0, 0.3)).toBe(0);
    expect(withEvidence(0.9, 0.3)).toBe(1);
    expect(withEvidence(0.5, 0.2)).toBeCloseTo(0.6);
  });
  it('handles a missing file', () => {
    expect(recordsFor(null, 'snook')).toEqual([]);
  });
});
