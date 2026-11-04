import { describe, expect, it } from 'vitest';
import { BARS, barAdvisory, nearestBar } from './bar';

const calm = { hsM: 0.4, tpS: 7, ebb: false, flowRatio: 1 };

describe('barAdvisory', () => {
  it('is LOW in a small short swell', () => {
    expect(barAdvisory(calm)).toEqual({ level: 'low', points: 0, reasons: [] });
  });
  it('scores swell height and period', () => {
    expect(barAdvisory({ ...calm, hsM: 1 }).level).toBe('moderate');
    expect(barAdvisory({ ...calm, hsM: 1, tpS: 11 })).toMatchObject({ points: 2, reasons: ['swell', 'long'] });
    expect(barAdvisory({ ...calm, hsM: 1.6, tpS: 11 }).level).toBe('high');
  });
  it('adds the ebb against a running river and a flood', () => {
    expect(barAdvisory({ hsM: 1, tpS: 8, ebb: true, flowRatio: 2 })).toMatchObject({ points: 2, reasons: ['swell', 'ebb'] });
    expect(barAdvisory({ hsM: 1, tpS: 8, ebb: false, flowRatio: 5 })).toMatchObject({ points: 2, reasons: ['swell', 'flood'] });
    expect(barAdvisory({ hsM: 1, tpS: 11, ebb: true, flowRatio: 5 }).level).toBe('high');
  });
  it('ignores river terms with no river', () => {
    expect(barAdvisory({ hsM: 1, tpS: 8, ebb: true, flowRatio: null })).toMatchObject({ points: 1 });
  });
});

describe('nearestBar', () => {
  it('has the four rivers and Moín', () => {
    expect(BARS.map((b) => b.name)).toContain('MOÍN ENTRANCE');
    expect(BARS.length).toBe(5);
  });
  it('finds the closest within 10 km and nothing beyond', () => {
    const e = BARS.find((b) => b.id === 'RÍO ESTRELLA')!;
    expect(nearestBar(e.lngLat[0] + 0.01, e.lngLat[1])?.bar.id).toBe('RÍO ESTRELLA');
    expect(nearestBar(-83.5, 10.5)).toBeNull();
  });
});
