import { describe, expect, it } from 'vitest';
import { bottomOrbitalVelocity } from './waves';
import { surgeAt, surgeBand, surgeProfile } from './surge';

describe('dive surge', () => {
  it('at the reference depth it is the plain linear bed velocity', () => {
    const s = surgeAt(1, 10, 10, 10);
    expect(s.H).toBeCloseTo(1, 9);
    expect(s.uMs).toBeCloseTo(bottomOrbitalVelocity(1, 10, 10), 9);
    expect(s.excursionM).toBeCloseTo((s.uMs * 10) / (2 * Math.PI), 9);
  });

  it('grows toward the surface and with period', () => {
    const p = surgeProfile(1.2, 11, 0.9, 10);
    expect(p.map((s) => s.depth)).toEqual([3, 6, 12]);
    expect(p[0].uMs).toBeGreaterThan(p[1].uMs);
    expect(p[1].uMs).toBeGreaterThan(p[2].uMs);
    expect(surgeAt(1, 10, 14, 8).uMs).toBeGreaterThan(surgeAt(1, 10, 6, 8).uMs);
  });

  it('caps the wave where it would already have broken', () => {
    expect(surgeAt(3, 10, 12, 2).H).toBeCloseTo(0.78 * 2, 9);
  });

  it('bands: a calm day is CALM at 6 m, a 2 m groundswell is DANGEROUS at 3 m', () => {
    expect(surgeProfile(0.4, 7, 0.8, 10)[1].band).toBe('CALM');
    expect(surgeProfile(2, 13, 1, 10)[0].band).toBe('DANGEROUS');
    expect([surgeBand(0.1), surgeBand(0.3), surgeBand(0.7)]).toEqual(['CALM', 'SURGY', 'DANGEROUS']);
  });
});
