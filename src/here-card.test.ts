import { describe, expect, it } from 'vitest';
import { compass, hereRows } from './here-card';

describe('here card', () => {
  it('names compass points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(95)).toBe('E');
    expect(compass(-10)).toBe('N');
    expect(compass(350)).toBe('N');
  });
  it('lists sea rows in reading order and skips what is missing', () => {
    const rows = hereRows({ land: false, depthM: 12.4, swell: { hs: 1.2, tp: 9, fromDeg: 80 }, sea: { hs: 1.4, tm: 6 }, wind: { ms: 5, fromDeg: 45 }, visM: 25 });
    expect(rows.map((r) => r[0])).toEqual(['SWELL', 'SEA', 'WIND', 'DEPTH', 'VISIBILITY']);
    expect(rows[2][1]).toBe('10 kt from NE');
    expect(rows[4][1]).toBe('20+ m');
    expect(hereRows({ land: false }).length).toBe(0);
  });
  it('shows only wind on land', () => {
    const rows = hereRows({ land: true, wind: { ms: 3, fromDeg: 90 }, swell: { hs: 1, tp: 8, fromDeg: 90 }, depthM: 5 });
    expect(rows.map((r) => r[0])).toEqual(['LAND', 'WIND']);
  });
});
