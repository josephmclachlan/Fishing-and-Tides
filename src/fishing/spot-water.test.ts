import { describe, expect, it } from 'vitest';
import { fishScore, spotWater, WATER_SHARE } from './spot-water';

describe('spot water', () => {
  const cells = [
    { lng: 0, lat: 0 },
    { lng: 0.005, lat: 0 }, // ~0.56 km east
    { lng: 0.01, lat: 0 }, // ~1.1 km
    { lng: 0.05, lat: 0 }, // ~5.6 km: out of reach
  ];
  it('averages the best cells within reach, skipping empty ones', () => {
    expect(spotWater(cells, [0.2, 0.8, 0.6, 1], 0, 0, 1.5, 2)).toBeCloseTo(0.7);
    expect(spotWater(cells, [0.2, NaN, 0.6, 1], 0, 0, 1.5, 6)).toBeCloseTo(0.4);
    expect(spotWater(cells, [0.2, 0.8, 0.6, 1], 1, 1)).toBeNull();
  });
  it('blends BITE with the water, and keeps BITE alone without it', () => {
    expect(fishScore(56, null)).toBe(56);
    expect(fishScore(56, undefined)).toBe(56);
    expect(fishScore(56, 1)).toBe(Math.round((1 - WATER_SHARE) * 56 + WATER_SHARE * 100));
    expect(fishScore(56, 0)).toBe(Math.round((1 - WATER_SHARE) * 56));
    expect(fishScore(56, 0.9)).toBeGreaterThan(fishScore(56, 0.4));
    expect(fishScore(50, 2)).toBe(fishScore(50, 1));
  });
});
